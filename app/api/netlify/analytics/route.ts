import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getAccessibleChatContext } from "@/lib/team-projects";

export const runtime = "nodejs";

const NETLIFY_ANALYTICS_BASE = "https://analytics.services.netlify.com/v2";

type AnalyticsPoint = {
  timestamp: number;
  value: number;
};

type AnalyticsRanking = {
  resource: string;
  count: number;
};

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeTimeSeries(payload: unknown): AnalyticsPoint[] {
  const data =
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : [];

  return data
    .map((item) => {
      if (Array.isArray(item)) {
        return {
          timestamp: getNumber(item[0]),
          value: getNumber(item[1]),
        };
      }

      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return {
          timestamp: getNumber(record.start ?? record.timestamp ?? record.date),
          value: getNumber(
            record.value ??
              record.count ??
              record.pageviews ??
              record.visitors ??
              record.siteBandwidth,
          ),
        };
      }

      return null;
    })
    .filter((point): point is AnalyticsPoint => Boolean(point?.timestamp));
}

function normalizeRanking(payload: unknown): AnalyticsRanking[] {
  const data =
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : [];

  return data
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const resource =
        typeof record.resource === "string" && record.resource.trim()
          ? record.resource.trim()
          : "Direct";
      return {
        resource,
        count: getNumber(record.count),
      };
    })
    .filter((item): item is AnalyticsRanking => Boolean(item));
}

async function fetchAnalyticsEndpoint({
  accessToken,
  siteId,
  endpoint,
  from,
  to,
  timezone,
  params,
}: {
  accessToken: string;
  siteId: string;
  endpoint: string;
  from: number;
  to: number;
  timezone: string;
  params?: Record<string, string>;
}) {
  const url = new URL(
    `${NETLIFY_ANALYTICS_BASE}/${encodeURIComponent(siteId)}/${endpoint}`,
  );
  url.searchParams.set("from", String(from));
  url.searchParams.set("to", String(to));
  url.searchParams.set("timezone", timezone);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object"
        ? String(
            (payload as Record<string, unknown>).message ||
              (payload as Record<string, unknown>).error ||
              "",
          )
        : "";
    throw new Error(message || "Netlify Analytics is not available.");
  }

  return payload;
}

function sumSeries(points: AnalyticsPoint[]) {
  return points.reduce((total, point) => total + point.value, 0);
}

function formatTimezoneOffset(date = new Date()) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  return `${sign}${hours}${minutes}`;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = token ? await getUserBySessionToken(token) : null;
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chatId = request.nextUrl.searchParams.get("chatId");
  if (!chatId) {
    return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
  }

  const daysParam = Number(request.nextUrl.searchParams.get("days") || 30);
  const days = [1, 7, 30].includes(daysParam) ? daysParam : 30;
  const prisma = getPrisma();
  const [user, chat, access] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        netlifyAccessToken: true,
      },
    }),
    prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        netlifySiteId: true,
        netlifySiteName: true,
        netlifyDeployUrl: true,
        netlifyDeployStatus: true,
        netlifyDeployReadyAt: true,
      },
    }),
    getAccessibleChatContext(prisma, chatId, sessionUser.id),
  ]);

  if (!access?.canRead) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!user?.netlifyAccessToken) {
    return NextResponse.json(
      { error: "Connect Netlify before viewing analytics." },
      { status: 400 },
    );
  }

  if (!chat?.netlifySiteId) {
    return NextResponse.json(
      { error: "Publish this app to Netlify before viewing analytics." },
      { status: 400 },
    );
  }

  const deployStatus = chat.netlifyDeployStatus?.toLowerCase();
  const isReady =
    Boolean(chat.netlifyDeployReadyAt || chat.netlifyDeployUrl) &&
    (!deployStatus || deployStatus === "ready");
  if (!isReady) {
    return NextResponse.json(
      {
        error:
          "Wait for the Netlify publish to finish before viewing analytics.",
      },
      { status: 409 },
    );
  }

  const now = new Date();
  const to = Math.floor(now.getTime() / 1000);
  const from = Math.floor((now.getTime() - days * 24 * 60 * 60 * 1000) / 1000);
  const timezone = formatTimezoneOffset(now);

  try {
    const [pageviews, visitors, pages, sources, bandwidth] = await Promise.all([
      fetchAnalyticsEndpoint({
        accessToken: user.netlifyAccessToken,
        siteId: chat.netlifySiteId,
        endpoint: "pageviews",
        from,
        to,
        timezone,
        params: { resolution: days === 1 ? "hour" : "day" },
      }),
      fetchAnalyticsEndpoint({
        accessToken: user.netlifyAccessToken,
        siteId: chat.netlifySiteId,
        endpoint: "visitors",
        from,
        to,
        timezone,
        params: { resolution: days === 1 ? "hour" : "day" },
      }).catch(() => ({ data: [] })),
      fetchAnalyticsEndpoint({
        accessToken: user.netlifyAccessToken,
        siteId: chat.netlifySiteId,
        endpoint: "ranking/pages",
        from,
        to,
        timezone,
        params: { limit: "5" },
      }).catch(() => ({ data: [] })),
      fetchAnalyticsEndpoint({
        accessToken: user.netlifyAccessToken,
        siteId: chat.netlifySiteId,
        endpoint: "ranking/sources",
        from,
        to,
        timezone,
        params: { limit: "5" },
      }).catch(() => ({ data: [] })),
      fetchAnalyticsEndpoint({
        accessToken: user.netlifyAccessToken,
        siteId: chat.netlifySiteId,
        endpoint: "bandwidth",
        from,
        to,
        timezone,
        params: { resolution: days === 1 ? "hour" : "day" },
      }).catch(() => ({ data: [] })),
    ]);

    const pageviewSeries = normalizeTimeSeries(pageviews);
    const visitorSeries = normalizeTimeSeries(visitors);
    const bandwidthSeries = normalizeTimeSeries(bandwidth);

    return NextResponse.json({
      ok: true,
      siteId: chat.netlifySiteId,
      siteName: chat.netlifySiteName,
      days,
      range: { from, to, timezone },
      totals: {
        pageviews: sumSeries(pageviewSeries),
        visitors: sumSeries(visitorSeries),
        bandwidth: sumSeries(bandwidthSeries),
      },
      series: {
        pageviews: pageviewSeries,
        visitors: visitorSeries,
        bandwidth: bandwidthSeries,
      },
      topPages: normalizeRanking(pages),
      topSources: normalizeRanking(sources),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Netlify Analytics is not available for this site.",
      },
      { status: 502 },
    );
  }
}
