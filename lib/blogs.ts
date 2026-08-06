import { unstable_cache } from "next/cache";
import { getPrisma } from "@/lib/prisma";

export type BlogPostLocaleOverrides = {
  title?: string;
  category?: string;
  author?: string;
  readTime?: string;
  date?: string;
  excerpt?: string;
  content?: string;
};

export type BlogPostTranslations = {
  tr?: BlogPostLocaleOverrides;
};

export type BlogPostView = {
  id: string;
  slug: string;
  title: string;
  category: string;
  image: string;
  author: string;
  readTime: string;
  date: string;
  excerpt: string | null;
  content: string | null;
  translations?: BlogPostTranslations;
  createdAt: Date;
  updatedAt: Date;
};

export type BlogContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string };

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeBlogTranslations(value: unknown): BlogPostTranslations | undefined {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as Record<string, unknown>;
  const trRaw = raw.tr;

  if (!trRaw || typeof trRaw !== "object") return undefined;

  const trSource = trRaw as Record<string, unknown>;
  const tr: BlogPostLocaleOverrides = {
    ...(normalizeOptionalString(trSource.title)
      ? { title: normalizeOptionalString(trSource.title) }
      : {}),
    ...(normalizeOptionalString(trSource.category)
      ? { category: normalizeOptionalString(trSource.category) }
      : {}),
    ...(normalizeOptionalString(trSource.author)
      ? { author: normalizeOptionalString(trSource.author) }
      : {}),
    ...(normalizeOptionalString(trSource.readTime)
      ? { readTime: normalizeOptionalString(trSource.readTime) }
      : {}),
    ...(normalizeOptionalString(trSource.date)
      ? { date: normalizeOptionalString(trSource.date) }
      : {}),
    ...(normalizeOptionalString(trSource.excerpt)
      ? { excerpt: normalizeOptionalString(trSource.excerpt) }
      : {}),
    ...(normalizeOptionalString(trSource.content)
      ? { content: normalizeOptionalString(trSource.content) }
      : {}),
  };

  return Object.keys(tr).length > 0 ? { tr } : undefined;
}

function normalizeBlogRow(
  row: {
    id: string;
    slug: string;
    title: string;
    category: string;
    image: string;
    author: string;
    readTime: string;
    date: string;
    excerpt: string | null;
    content: string | null;
    createdAt: Date;
    updatedAt: Date;
    translations?: unknown;
  },
): BlogPostView {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    image: row.image,
    author: row.author,
    readTime: row.readTime,
    date: row.date,
    excerpt: row.excerpt,
    content: row.content,
    translations: normalizeBlogTranslations(row.translations),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function isMissingBlogPostTranslationsColumnError(error: unknown) {
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
    (maybePrismaError.meta?.column === "BlogPost.translations" ||
      message.includes("BlogPost.translations"))
  );
}

function buildFallbackDate() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function normalizeBlogInput(payload: unknown) {
  const raw = (payload ?? {}) as Record<string, unknown>;
  const title = normalizeOptionalString(raw.title);

  if (!title) {
    throw new Error("Blog title is required.");
  }

  let slug = normalizeOptionalString(raw.slug);
  if (!slug) {
    slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  return {
    title,
    slug,
    category: normalizeOptionalString(raw.category) ?? "Uncategorized",
    image: normalizeOptionalString(raw.image) ?? "",
    author: normalizeOptionalString(raw.author) ?? "Admin",
    readTime: normalizeOptionalString(raw.readTime) ?? "5 mins",
    date: normalizeOptionalString(raw.date) ?? buildFallbackDate(),
    excerpt: normalizeNullableString(raw.excerpt),
    content: normalizeNullableString(raw.content),
    translations: normalizeBlogTranslations(raw.translations),
  };
}

export function resolveBlogPostForLocale(
  post: BlogPostView,
  locale: "en" | "tr",
): BlogPostView {
  if (locale !== "tr") {
    return post;
  }

  const tr = post.translations?.tr;

  if (!tr) {
    return post;
  }

  return {
    ...post,
    title: tr.title ?? post.title,
    category: tr.category ?? post.category,
    author: tr.author ?? post.author,
    readTime: tr.readTime ?? post.readTime,
    date: tr.date ?? post.date,
    excerpt: tr.excerpt ?? post.excerpt,
    content: tr.content ?? post.content,
  };
}

function extractBlockNoteText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => extractBlockNoteText(item)).join("");
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const raw = value as Record<string, unknown>;
  const current = typeof raw.text === "string" ? raw.text : "";
  const nested = extractBlockNoteText(raw.content);

  return `${current}${nested}`;
}

export function parseBlogContent(content: string | null | undefined): BlogContentBlock[] {
  if (!content?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(content) as unknown;

    if (!Array.isArray(parsed)) {
      return [{ type: "paragraph", text: content }];
    }

    return parsed.flatMap<BlogContentBlock>((block) => {
      if (!block || typeof block !== "object") {
        return [];
      }

      const raw = block as Record<string, unknown>;
      const type = typeof raw.type === "string" ? raw.type : "paragraph";
      const text = extractBlockNoteText(raw.content).trim();
      if (!text) return [];

      if (type.includes("heading")) {
        return [{ type: "heading", text }];
      }

      if (type.includes("bullet")) {
        return [{ type: "bullet", text }];
      }

      return [{ type: "paragraph", text }];
    });
  } catch {
    return content
      .split(/\n\s*\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((text) => ({ type: "paragraph" as const, text }));
  }
}

const loadCachedBlogPosts = unstable_cache(
  async (): Promise<BlogPostView[]> => {
    const prisma = getPrisma();

    try {
      const rows = await prisma.blogPost.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
          image: true,
          author: true,
          readTime: true,
          date: true,
          excerpt: true,
          content: true,
          translations: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return rows.map(normalizeBlogRow);
    } catch (error) {
      if (!isMissingBlogPostTranslationsColumnError(error)) {
        throw error;
      }

      const rows = await prisma.blogPost.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
          image: true,
          author: true,
          readTime: true,
          date: true,
          excerpt: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return rows.map((row) => normalizeBlogRow(row));
    }
  },
  ["blog-posts"],
  { tags: ["blog-posts"] },
);

export async function getBlogPosts() {
  return loadCachedBlogPosts();
}

export async function getBlogPostBySlug(slug: string) {
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}
