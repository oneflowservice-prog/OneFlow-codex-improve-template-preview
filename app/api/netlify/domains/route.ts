import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  getNetlifyDnsForSite,
  getNetlifySite,
  provisionNetlifySsl,
  updateNetlifySite,
} from "@/lib/netlify";
import { getAccessibleChatContext } from "@/lib/team-projects";

function normalizeDomain(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim().toLowerCase().replace(/^https?:\/\//, "");
  if (!trimmed) return null;

  return trimmed.replace(/\/+$/, "");
}

function getHostnameFromUrl(value: string | null | undefined) {
  if (!value) return null;

  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return normalizeDomain(value);
  }
}

const COMMON_MULTI_PART_TLDS = new Set([
  "co.uk",
  "org.uk",
  "gov.uk",
  "ac.uk",
  "co.ke",
  "or.ke",
  "ac.ke",
  "co.za",
  "com.au",
  "net.au",
  "org.au",
  "co.nz",
  "com.br",
  "com.mx",
  "com.sg",
]);

function getBaseDomain(hostname: string) {
  const segments = hostname.split(".").filter(Boolean);
  if (segments.length <= 2) {
    return hostname;
  }

  const trailingPair = segments.slice(-2).join(".");
  if (segments.length >= 3 && COMMON_MULTI_PART_TLDS.has(trailingPair)) {
    return segments.slice(-3).join(".");
  }

  return segments.slice(-2).join(".");
}

function getRecordHost(hostname: string) {
  const baseDomain = getBaseDomain(hostname);
  if (hostname === baseDomain) {
    return "@";
  }

  return hostname.slice(0, -(baseDomain.length + 1));
}

type DomainDnsRecord = {
  type: string;
  host: string;
  value: string;
  note?: string;
  source: "recommended" | "netlify";
};

type SerializedDomain = {
  hostname: string;
  isPrimary: boolean;
  dnsRecords: DomainDnsRecord[];
};

type NetlifyDnsZone = {
  id?: string;
  domain?: string;
  records?: Array<{
    hostname?: string;
    type?: string;
    value?: string;
  }>;
};

function buildRecommendedDnsRecords(
  hostname: string,
  netlifyTarget: string | null,
): DomainDnsRecord[] {
  const recordHost = getRecordHost(hostname);
  const isApexDomain = recordHost === "@";

  if (isApexDomain) {
    return [
      {
        type: "A",
        host: "@",
        value: "75.2.60.5",
        note: "Fallback apex record for Netlify.",
        source: "recommended",
      },
      {
        type: "A",
        host: "@",
        value: "99.83.190.102",
        note: "Second Netlify load balancer IP for apex domains.",
        source: "recommended",
      },
    ];
  }

  return [
    {
      type: "CNAME",
      host: recordHost,
      value: netlifyTarget || "<your-site>.netlify.app",
      note: "Point this subdomain at your Netlify site host.",
      source: "recommended",
    },
  ];
}

function buildManagedDnsRecords(
  hostname: string,
  dnsZones: NetlifyDnsZone[],
): DomainDnsRecord[] {
  const zone = dnsZones.find((candidate) => {
    const zoneDomain = normalizeDomain(candidate.domain);
    return zoneDomain ? hostname === zoneDomain || hostname.endsWith(`.${zoneDomain}`) : false;
  });

  if (!zone?.records?.length) {
    return [];
  }

  return zone.records
    .filter((record) => {
      const recordHostname = normalizeDomain(record.hostname);
      return recordHostname === hostname;
    })
    .map((record) => ({
      type: record.type || "DNS",
      host: getRecordHost(hostname),
      value: record.value || "",
      source: "netlify" as const,
    }))
    .filter((record) => Boolean(record.value));
}

async function getAuthorizedNetlifyContext(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = token ? await getUserBySessionToken(token) : null;
  if (!sessionUser) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const chatId = request.nextUrl.searchParams.get("chatId");
  if (!chatId) {
    return { error: NextResponse.json({ error: "Missing chatId" }, { status: 400 }) };
  }

  const prisma = getPrisma();
  const [user, chat, access] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        netlifyAccessToken: true,
      },
    }),
    prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        userId: true,
        netlifySiteId: true,
        netlifySiteName: true,
      },
    }),
    getAccessibleChatContext(prisma, chatId, sessionUser.id),
  ]);

  if (!user?.netlifyAccessToken) {
    return {
      error: NextResponse.json(
        { error: "Connect Netlify before managing domains." },
        { status: 400 },
      ),
    };
  }

  if (!chat) {
    return { error: NextResponse.json({ error: "Chat not found" }, { status: 404 }) };
  }

  if (!access?.canManage) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  if (!chat.netlifySiteId) {
    return {
      error: NextResponse.json(
        { error: "Publish this site first before adding a custom domain." },
        { status: 400 },
      ),
    };
  }

  return {
    accessToken: user.netlifyAccessToken,
    chat,
  };
}

function serializeDomains(site: {
  name?: string;
  ssl_url?: string;
  url?: string;
  custom_domain?: string | null;
  domain_aliases?: string[] | null;
  managed_dns?: boolean;
}, dnsZones: NetlifyDnsZone[] = []) {
  const customDomain = normalizeDomain(site.custom_domain);
  const aliases = (site.domain_aliases || [])
    .map((domain) => normalizeDomain(domain))
    .filter((domain): domain is string => Boolean(domain));
  const netlifyTarget = getHostnameFromUrl(site.ssl_url || site.url);

  const allDomains: SerializedDomain[] = [
    ...(customDomain
      ? [
          {
            hostname: customDomain,
            isPrimary: true,
            dnsRecords:
              buildManagedDnsRecords(customDomain, dnsZones).length > 0
                ? buildManagedDnsRecords(customDomain, dnsZones)
                : buildRecommendedDnsRecords(customDomain, netlifyTarget),
          },
        ]
      : []),
    ...aliases
      .filter((domain) => domain !== customDomain)
      .map((domain) => ({
        hostname: domain,
        isPrimary: false,
        dnsRecords:
          buildManagedDnsRecords(domain, dnsZones).length > 0
            ? buildManagedDnsRecords(domain, dnsZones)
            : buildRecommendedDnsRecords(domain, netlifyTarget),
      })),
  ];

  return {
    siteName: site.name || null,
    netlifyUrl: site.ssl_url || site.url || null,
    customDomain,
    managedDns: site.managed_dns ?? false,
    domains: allDomains,
  };
}

export async function GET(request: NextRequest) {
  const context = await getAuthorizedNetlifyContext(request);
  if ("error" in context) {
    return context.error;
  }

  try {
    const [site, dnsZones] = await Promise.all([
      getNetlifySite({
        accessToken: context.accessToken,
        siteId: context.chat.netlifySiteId!,
      }),
      getNetlifyDnsForSite({
        accessToken: context.accessToken,
        siteId: context.chat.netlifySiteId!,
      }).catch(() => []),
    ]);

    return NextResponse.json(serializeDomains(site, dnsZones));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Netlify domains.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const context = await getAuthorizedNetlifyContext(request);
  if ("error" in context) {
    return context.error;
  }

  const body = await request.json().catch(() => null);
  const domain = normalizeDomain(body?.domain);
  if (!domain) {
    return NextResponse.json(
      { error: "Enter a valid domain to continue." },
      { status: 400 },
    );
  }

  try {
    const existingSite = await getNetlifySite({
      accessToken: context.accessToken,
      siteId: context.chat.netlifySiteId!,
    });

    const primaryDomain = normalizeDomain(existingSite.custom_domain);
    const existingAliases = (existingSite.domain_aliases || [])
      .map((item) => normalizeDomain(item))
      .filter((item): item is string => Boolean(item));

    if (domain === primaryDomain || existingAliases.includes(domain)) {
      return NextResponse.json({
        ...serializeDomains(existingSite),
        message: "That domain is already connected to this site.",
      });
    }

    const updatedSite = await updateNetlifySite({
      accessToken: context.accessToken,
      siteId: context.chat.netlifySiteId!,
      customDomain: primaryDomain ?? domain,
      domainAliases:
        primaryDomain === null
          ? existingAliases
          : Array.from(new Set([...existingAliases, domain])),
    });

    try {
      await provisionNetlifySsl({
        accessToken: context.accessToken,
        siteId: context.chat.netlifySiteId!,
      });
    } catch {
      // SSL can be provisioned only after DNS is configured; keep the domain saved anyway.
    }

    return NextResponse.json({
      ...serializeDomains(updatedSite),
      message:
        primaryDomain === null
          ? "Primary custom domain added. Finish the DNS step at your registrar so Netlify can verify it."
          : "Custom domain added. Finish the DNS step at your registrar so Netlify can verify it.",
      settingsUrl: context.chat.netlifySiteName
        ? `https://app.netlify.com/projects/${context.chat.netlifySiteName.toLowerCase()}/domain-management`
        : null,
      registrarHint:
        primaryDomain === null
          ? "Point the domain to Netlify in your DNS provider, then wait for verification."
          : "Point this domain or subdomain to Netlify in your DNS provider, then wait for verification.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to add the custom domain.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const context = await getAuthorizedNetlifyContext(request);
  if ("error" in context) {
    return context.error;
  }

  const body = await request.json().catch(() => null);
  const domain = normalizeDomain(body?.domain);
  if (!domain) {
    return NextResponse.json(
      { error: "Choose a domain to delete." },
      { status: 400 },
    );
  }

  try {
    const existingSite = await getNetlifySite({
      accessToken: context.accessToken,
      siteId: context.chat.netlifySiteId!,
    });

    const primaryDomain = normalizeDomain(existingSite.custom_domain);
    const existingAliases = (existingSite.domain_aliases || [])
      .map((item) => normalizeDomain(item))
      .filter((item): item is string => Boolean(item));

    if (domain !== primaryDomain && !existingAliases.includes(domain)) {
      return NextResponse.json(
        { error: "That domain is not connected to this site." },
        { status: 404 },
      );
    }

    const nextAliases = existingAliases.filter((item) => item !== domain);
    const nextPrimaryDomain =
      domain === primaryDomain ? nextAliases[0] ?? null : primaryDomain;
    const updatedAliases =
      domain === primaryDomain ? nextAliases.slice(1) : nextAliases;

    const updatedSite = await updateNetlifySite({
      accessToken: context.accessToken,
      siteId: context.chat.netlifySiteId!,
      customDomain: nextPrimaryDomain,
      domainAliases: updatedAliases,
    });

    return NextResponse.json({
      ...serializeDomains(updatedSite),
      message:
        domain === primaryDomain
          ? "Primary domain deleted. Netlify kept the remaining domain list in sync."
          : "Domain deleted.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete the custom domain.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const context = await getAuthorizedNetlifyContext(request);
  if ("error" in context) {
    return context.error;
  }

  const body = await request.json().catch(() => null);
  const domain = normalizeDomain(body?.domain);
  if (!domain) {
    return NextResponse.json(
      { error: "Choose a domain to verify." },
      { status: 400 },
    );
  }

  try {
    const existingSite = await getNetlifySite({
      accessToken: context.accessToken,
      siteId: context.chat.netlifySiteId!,
    });
    const connectedDomains = [
      normalizeDomain(existingSite.custom_domain),
      ...(existingSite.domain_aliases || []).map((item) => normalizeDomain(item)),
    ].filter((item): item is string => Boolean(item));

    if (!connectedDomains.includes(domain)) {
      return NextResponse.json(
        { error: "That domain is not connected to this site." },
        { status: 404 },
      );
    }

    await provisionNetlifySsl({
      accessToken: context.accessToken,
      siteId: context.chat.netlifySiteId!,
    });

    const refreshedSite = await getNetlifySite({
      accessToken: context.accessToken,
      siteId: context.chat.netlifySiteId!,
    });

    return NextResponse.json({
      ...serializeDomains(refreshedSite),
      message:
        "Verification requested. If the DNS records are correct, Netlify should finish validating the domain shortly.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to verify the custom domain.",
      },
      { status: 500 },
    );
  }
}
