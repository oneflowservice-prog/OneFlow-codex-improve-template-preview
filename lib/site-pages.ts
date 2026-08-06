import { unstable_cache } from "next/cache";
import { getPrisma } from "@/lib/prisma";

export const SITE_PAGE_SLUGS = [
  "about-us",
  "privacy-policy",
  "terms",
] as const;

export type SitePageSlug = (typeof SITE_PAGE_SLUGS)[number];

export type SitePageBlock =
  | {
      id: string;
      type: "heading";
      content: string;
    }
  | {
      id: string;
      type: "paragraph";
      content: string;
    }
  | {
      id: string;
      type: "bullets";
      items: string[];
    };

export type SitePageBlockTranslation =
  | {
      id: string;
      type: "heading";
      content?: string;
    }
  | {
      id: string;
      type: "paragraph";
      content?: string;
    }
  | {
      id: string;
      type: "bullets";
      items?: string[];
    };

export type SitePageLocaleOverrides = {
  title?: string;
  summary?: string;
  content?: string;
  blocks?: SitePageBlockTranslation[];
};

export type SitePageTranslations = {
  tr?: SitePageLocaleOverrides;
};

export type SitePage = {
  slug: SitePageSlug;
  title: string;
  summary: string;
  content: string;
  blocks: SitePageBlock[];
  translations?: SitePageTranslations;
};

const BLOCK_CONTENT_PREFIX = "__ONEFLOW_BLOCKS__:";

function createPageBlockId(type: SitePageBlock["type"], index: number) {
  return `${type}-${index + 1}`;
}

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeOptionalText(value: unknown) {
  const text = sanitizeText(value);
  return text || undefined;
}

function normalizeBlock(
  value: unknown,
  index: number,
): SitePageBlock | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const type = raw.type;

  if (type === "heading" || type === "paragraph") {
    const content = sanitizeText(raw.content);

    if (!content) return null;

    return {
      id:
        typeof raw.id === "string" && raw.id.trim()
          ? raw.id.trim()
          : createPageBlockId(type, index),
      type,
      content,
    };
  }

  if (type === "bullets") {
    const items = Array.isArray(raw.items)
      ? raw.items.map((item) => sanitizeText(item)).filter(Boolean)
      : [];

    if (items.length === 0) return null;

    return {
      id:
        typeof raw.id === "string" && raw.id.trim()
          ? raw.id.trim()
          : createPageBlockId("bullets", index),
      type: "bullets",
      items,
    };
  }

  return null;
}

function normalizeTranslatedBlock(
  value: unknown,
  fallback: SitePageBlock,
): SitePageBlockTranslation | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id =
    typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : fallback.id;

  if (fallback.type === "heading" || fallback.type === "paragraph") {
    const content = sanitizeOptionalText(raw.content);

    if (!content) return null;

    return {
      id,
      type: fallback.type,
      content,
    };
  }

  const items = Array.isArray(raw.items)
    ? raw.items.map((item) =>
        typeof item === "string" ? item.trim() : "",
      )
    : [];

  if (!items.some(Boolean)) return null;

  return {
    id,
    type: "bullets",
    items,
  };
}

function normalizeSitePageLocaleOverrides(
  value: unknown,
  fallbackBlocks: SitePageBlock[],
): SitePageLocaleOverrides | undefined {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as Record<string, unknown>;
  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks
        .slice(0, fallbackBlocks.length)
        .map((block, index) => {
          const fallbackBlock = fallbackBlocks[index];
          return fallbackBlock
            ? normalizeTranslatedBlock(block, fallbackBlock)
            : null;
        })
    : [];

  const normalized: SitePageLocaleOverrides = {
    ...(sanitizeOptionalText(raw.title) ? { title: sanitizeOptionalText(raw.title) } : {}),
    ...(sanitizeOptionalText(raw.summary)
      ? { summary: sanitizeOptionalText(raw.summary) }
      : {}),
    ...(sanitizeOptionalText(raw.content)
      ? { content: sanitizeOptionalText(raw.content) }
      : {}),
    ...(blocks.some(Boolean)
      ? {
          blocks: blocks.filter(
            (block): block is SitePageBlockTranslation => block !== null,
          ),
        }
      : {}),
  };

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeSitePageTranslations(
  value: unknown,
  fallbackBlocks: SitePageBlock[],
): SitePageTranslations | undefined {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as Record<string, unknown>;
  const tr = normalizeSitePageLocaleOverrides(raw.tr, fallbackBlocks);

  if (!tr) return undefined;

  return { tr };
}

export function createBlocksFromPlainContent(content: string): SitePageBlock[] {
  const chunks = content
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return chunks.map((chunk, index) => {
    const lines = chunk
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const isBulletList =
      lines.length > 1 &&
      lines.every((line) => line.startsWith("- ") || line.startsWith("* "));

    if (isBulletList) {
      return {
        id: createPageBlockId("bullets", index),
        type: "bullets",
        items: lines.map((line) => line.replace(/^[-*]\s+/, "").trim()),
      };
    }

    return {
      id: createPageBlockId("paragraph", index),
      type: "paragraph",
      content: chunk.replace(/\n+/g, " ").trim(),
    };
  });
}

export function parseSitePageBlocks(content: string): SitePageBlock[] {
  const trimmed = content.trim();

  if (trimmed.startsWith(BLOCK_CONTENT_PREFIX)) {
    try {
      const parsed = JSON.parse(
        trimmed.slice(BLOCK_CONTENT_PREFIX.length),
      ) as { blocks?: unknown };

      if (Array.isArray(parsed.blocks)) {
        const blocks = parsed.blocks
          .map((block, index) => normalizeBlock(block, index))
          .filter((block): block is SitePageBlock => block !== null);

        if (blocks.length > 0) {
          return blocks;
        }
      }
    } catch {
      // Fall through to plain content parsing.
    }
  }

  return createBlocksFromPlainContent(content);
}

export function serializeSitePageBlocks(blocks: SitePageBlock[]) {
  const normalized = blocks
    .map((block, index) => normalizeBlock(block, index))
    .filter((block): block is SitePageBlock => block !== null);

  return `${BLOCK_CONTENT_PREFIX}${JSON.stringify({
    version: 1,
    blocks: normalized,
  })}`;
}

export function blocksToPlainText(blocks: SitePageBlock[]) {
  return blocks
    .map((block) => {
      if (block.type === "bullets") {
        return block.items.map((item) => `- ${item}`).join("\n");
      }

      return block.content;
    })
    .join("\n\n")
    .trim();
}

function translateBlocks(
  blocks: SitePageBlock[],
  translations?: SitePageBlockTranslation[],
) {
  if (!translations || translations.length === 0) {
    return blocks;
  }

  return blocks.map((block, index) => {
    const translated = translations[index];

    if (!translated || translated.type !== block.type) {
      return block;
    }

    if (block.type === "bullets") {
      const translatedItems =
        translated.type === "bullets" ? translated.items : undefined;

      return {
        ...block,
        items: block.items.map(
          (item, itemIndex) => translatedItems?.[itemIndex] || item,
        ),
      };
    }

    const translatedContent =
      translated.type === "heading" || translated.type === "paragraph"
        ? translated.content
        : undefined;

    return {
      ...block,
      content: translatedContent ?? block.content,
    };
  });
}

export const DEFAULT_SITE_PAGES: Record<SitePageSlug, SitePage> = {
  "about-us": {
    slug: "about-us",
    title: "About Us",
    summary:
      "Learn about our mission, what we build, and how we help teams move faster with AI.",
    content: `Welcome to OneFlow.

We built OneFlow to help teams turn ideas into working software with less friction. Our platform brings planning, generation, iteration, and shipping into one focused workflow so builders can stay in motion.

We believe AI should make product development clearer, faster, and more collaborative. That means giving teams tools that help them explore ideas, refine details, and keep shipping.

If you have questions about our company or how we work, reach out through the channels listed on the site.`,
    blocks: createBlocksFromPlainContent(`Welcome to OneFlow.

We built OneFlow to help teams turn ideas into working software with less friction. Our platform brings planning, generation, iteration, and shipping into one focused workflow so builders can stay in motion.

We believe AI should make product development clearer, faster, and more collaborative. That means giving teams tools that help them explore ideas, refine details, and keep shipping.

If you have questions about our company or how we work, reach out through the channels listed on the site.`),
    translations: {},
  },
  "privacy-policy": {
    slug: "privacy-policy",
    title: "Privacy Policy",
    summary:
      "Understand what information we collect, how we use it, and the choices available to you.",
    content: serializeSitePageBlocks([
      { id: "privacy-heading-1", type: "heading", content: "Overview" },
      {
        id: "privacy-paragraph-1",
        type: "paragraph",
        content:
          "This Privacy Policy explains how OneFlow collects, uses, and protects your information.",
      },
      {
        id: "privacy-heading-2",
        type: "heading",
        content: "Information we collect",
      },
      {
        id: "privacy-bullets-1",
        type: "bullets",
        items: [
          "Account details",
          "Usage activity",
          "Billing details",
          "Support communications",
          "Technical data needed to operate the service",
        ],
      },
      {
        id: "privacy-heading-3",
        type: "heading",
        content: "How we use information",
      },
      {
        id: "privacy-paragraph-2",
        type: "paragraph",
        content:
          "We use this information to provide the product, secure accounts, improve performance, process payments, respond to support requests, and meet legal obligations.",
      },
      {
        id: "privacy-heading-4",
        type: "heading",
        content: "Sharing and requests",
      },
      {
        id: "privacy-bullets-2",
        type: "bullets",
        items: [
          "We do not sell your personal information.",
          "We may share information with trusted service providers that help us operate the platform, process payments, host infrastructure, or comply with the law.",
          "You can contact us if you need help accessing, updating, or deleting your information.",
        ],
      },
    ]),
    blocks: [
      { id: "privacy-heading-1", type: "heading", content: "Overview" },
      {
        id: "privacy-paragraph-1",
        type: "paragraph",
        content:
          "This Privacy Policy explains how OneFlow collects, uses, and protects your information.",
      },
      {
        id: "privacy-heading-2",
        type: "heading",
        content: "Information we collect",
      },
      {
        id: "privacy-bullets-1",
        type: "bullets",
        items: [
          "Account details",
          "Usage activity",
          "Billing details",
          "Support communications",
          "Technical data needed to operate the service",
        ],
      },
      {
        id: "privacy-heading-3",
        type: "heading",
        content: "How we use information",
      },
      {
        id: "privacy-paragraph-2",
        type: "paragraph",
        content:
          "We use this information to provide the product, secure accounts, improve performance, process payments, respond to support requests, and meet legal obligations.",
      },
      {
        id: "privacy-heading-4",
        type: "heading",
        content: "Sharing and requests",
      },
      {
        id: "privacy-bullets-2",
        type: "bullets",
        items: [
          "We do not sell your personal information.",
          "We may share information with trusted service providers that help us operate the platform, process payments, host infrastructure, or comply with the law.",
          "You can contact us if you need help accessing, updating, or deleting your information.",
        ],
      },
    ],
    translations: {},
  },
  terms: {
    slug: "terms",
    title: "Terms and Conditions",
    summary:
      "Review the rules, responsibilities, and usage terms for accessing this platform.",
    content: serializeSitePageBlocks([
      { id: "terms-heading-1", type: "heading", content: "Agreement" },
      {
        id: "terms-paragraph-1",
        type: "paragraph",
        content:
          "By using OneFlow, you agree to these Terms and Conditions.",
      },
      {
        id: "terms-heading-2",
        type: "heading",
        content: "Account responsibilities",
      },
      {
        id: "terms-bullets-1",
        type: "bullets",
        items: [
          "You are responsible for keeping your account secure.",
          "You are responsible for any activity that happens under your account.",
        ],
      },
      {
        id: "terms-heading-3",
        type: "heading",
        content: "Acceptable use",
      },
      {
        id: "terms-paragraph-2",
        type: "paragraph",
        content:
          "You agree not to misuse the service, interfere with its operation, attempt unauthorized access, or use the platform in ways that violate applicable law.",
      },
      {
        id: "terms-heading-4",
        type: "heading",
        content: "Changes and enforcement",
      },
      {
        id: "terms-bullets-2",
        type: "bullets",
        items: [
          "Features, pricing, and availability may change over time.",
          "We may suspend or terminate access when necessary to protect the platform, comply with legal requirements, or address abuse.",
          "If you do not agree with these terms, please do not use the service.",
        ],
      },
    ]),
    blocks: [
      { id: "terms-heading-1", type: "heading", content: "Agreement" },
      {
        id: "terms-paragraph-1",
        type: "paragraph",
        content:
          "By using OneFlow, you agree to these Terms and Conditions.",
      },
      {
        id: "terms-heading-2",
        type: "heading",
        content: "Account responsibilities",
      },
      {
        id: "terms-bullets-1",
        type: "bullets",
        items: [
          "You are responsible for keeping your account secure.",
          "You are responsible for any activity that happens under your account.",
        ],
      },
      {
        id: "terms-heading-3",
        type: "heading",
        content: "Acceptable use",
      },
      {
        id: "terms-paragraph-2",
        type: "paragraph",
        content:
          "You agree not to misuse the service, interfere with its operation, attempt unauthorized access, or use the platform in ways that violate applicable law.",
      },
      {
        id: "terms-heading-4",
        type: "heading",
        content: "Changes and enforcement",
      },
      {
        id: "terms-bullets-2",
        type: "bullets",
        items: [
          "Features, pricing, and availability may change over time.",
          "We may suspend or terminate access when necessary to protect the platform, comply with legal requirements, or address abuse.",
          "If you do not agree with these terms, please do not use the service.",
        ],
      },
    ],
    translations: {},
  },
};

function isMissingSitePagesTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybePrismaError = error as {
    code?: unknown;
    meta?: { table?: unknown } | null;
  };

  return (
    maybePrismaError.code === "P2021" &&
    maybePrismaError.meta?.table === "public.SitePage"
  );
}

function isMissingSitePageTranslationsColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybePrismaError = error as {
    code?: unknown;
    meta?: { column?: unknown } | null;
    message?: unknown;
  };
  const message =
    typeof maybePrismaError.message === "string" ? maybePrismaError.message : "";

  return (
    maybePrismaError.code === "P2022" &&
    (maybePrismaError.meta?.column === "SitePage.translations" ||
      message.includes("SitePage.translations"))
  );
}

export function normalizeSitePagesInput(payload: unknown) {
  const raw = (payload ?? {}) as Record<string, unknown>;

  return SITE_PAGE_SLUGS.reduce<Record<SitePageSlug, SitePage>>(
    (pages, slug) => {
      const page = (raw[slug] ?? {}) as Record<string, unknown>;
      const title = sanitizeText(page.title) || DEFAULT_SITE_PAGES[slug].title;
      const summary =
        sanitizeText(page.summary) || DEFAULT_SITE_PAGES[slug].summary;
      const explicitBlocks = Array.isArray(page.blocks)
        ? page.blocks
            .map((block, index) => normalizeBlock(block, index))
            .filter((block): block is SitePageBlock => block !== null)
        : null;
      const fallbackContent = sanitizeText(page.content) || DEFAULT_SITE_PAGES[slug].content;
      const blocks =
        explicitBlocks && explicitBlocks.length > 0
          ? explicitBlocks
          : parseSitePageBlocks(fallbackContent);
      const content =
        explicitBlocks && explicitBlocks.length > 0
          ? serializeSitePageBlocks(explicitBlocks)
          : fallbackContent;
      const translations = normalizeSitePageTranslations(
        page.translations,
        blocks,
      );

      if (!summary) {
        throw new Error(`A summary is required for ${title}.`);
      }

      if (!content) {
        throw new Error(`Content is required for ${title}.`);
      }

      pages[slug] = { slug, title, summary, content, blocks, translations };
      return pages;
    },
    {} as Record<SitePageSlug, SitePage>,
  );
}

const loadCachedSitePages = unstable_cache(
  async (): Promise<Record<SitePageSlug, SitePage>> => {
    try {
      const prisma = getPrisma();
      let rows: Array<{
        slug: string;
        title: string;
        summary: string;
        content: string;
        translations?: unknown;
      }>;

      try {
        rows = await prisma.sitePage.findMany({
          where: { slug: { in: [...SITE_PAGE_SLUGS] } },
          select: {
            slug: true,
            title: true,
            summary: true,
            content: true,
            translations: true,
          },
        });
      } catch (error) {
        if (!isMissingSitePageTranslationsColumnError(error)) {
          throw error;
        }

        rows = await prisma.sitePage.findMany({
          where: { slug: { in: [...SITE_PAGE_SLUGS] } },
          select: {
            slug: true,
            title: true,
            summary: true,
            content: true,
          },
        });
      }

      const rowMap = new Map(rows.map((row) => [row.slug, row]));

      return SITE_PAGE_SLUGS.reduce<Record<SitePageSlug, SitePage>>(
        (pages, slug) => {
          const row = rowMap.get(slug);
          pages[slug] = row
            ? {
                slug,
                title: row.title,
                summary: row.summary,
                content: row.content,
                blocks: parseSitePageBlocks(row.content),
                translations: normalizeSitePageTranslations(
                  "translations" in row ? row.translations : undefined,
                  parseSitePageBlocks(row.content),
                ),
              }
            : DEFAULT_SITE_PAGES[slug];
          return pages;
        },
        {} as Record<SitePageSlug, SitePage>,
      );
    } catch (error) {
      if (isMissingSitePagesTableError(error)) {
        return DEFAULT_SITE_PAGES;
      }

      throw error;
    }
  },
  ["site-pages"],
  { tags: ["site-pages"] },
);

export async function getSitePages() {
  return loadCachedSitePages();
}

export async function getSitePage(slug: SitePageSlug) {
  const pages = await getSitePages();
  return pages[slug];
}

export function resolveSitePageForLocale(
  page: SitePage,
  locale: "en" | "tr",
): SitePage {
  if (locale !== "tr") {
    return page;
  }

  const tr = page.translations?.tr;

  if (!tr) {
    return page;
  }

  const localizedContent = tr.content ?? page.content;
  const blocks = tr.blocks?.length
    ? translateBlocks(page.blocks, tr.blocks)
    : tr.content
      ? parseSitePageBlocks(tr.content)
      : page.blocks;

  return {
    ...page,
    title: tr.title ?? page.title,
    summary: tr.summary ?? page.summary,
    content: localizedContent,
    blocks,
  };
}

export async function upsertSitePages(pages: Record<SitePageSlug, SitePage>) {
  const prisma = getPrisma();

  try {
    await prisma.$transaction(
      SITE_PAGE_SLUGS.map((slug) =>
        prisma.sitePage.upsert({
          where: { slug },
          create: {
            slug,
            title: pages[slug].title,
            summary: pages[slug].summary,
            content: pages[slug].content,
            translations: pages[slug].translations,
          },
          update: {
            title: pages[slug].title,
            summary: pages[slug].summary,
            content: pages[slug].content,
            translations: pages[slug].translations,
          },
        }),
      ),
    );
  } catch (error) {
    if (!isMissingSitePageTranslationsColumnError(error)) {
      throw error;
    }

    await prisma.$transaction(
      SITE_PAGE_SLUGS.map((slug) =>
        prisma.sitePage.upsert({
          where: { slug },
          create: {
            slug,
            title: pages[slug].title,
            summary: pages[slug].summary,
            content: pages[slug].content,
          },
          update: {
            title: pages[slug].title,
            summary: pages[slug].summary,
            content: pages[slug].content,
          },
        }),
      ),
    );
  }

  return pages;
}
