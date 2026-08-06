import { getPrisma } from "@/lib/prisma";

export type AppPopupTarget = "onboarding" | "logged_in" | "preview";

export type AppPopupSummary = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  target: AppPopupTarget;
  isActive: boolean;
  dismissible: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeTarget(value: unknown): AppPopupTarget {
  if (value === "onboarding") return "onboarding";
  if (value === "preview") return "preview";
  return "logged_in";
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePopup(row: any): AppPopupSummary {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    ctaLabel: row.ctaLabel,
    ctaUrl: row.ctaUrl,
    imageUrl: row.imageUrl,
    videoUrl: row.videoUrl,
    target: normalizeTarget(row.target),
    isActive: Boolean(row.isActive),
    dismissible: Boolean(row.dismissible),
    sortOrder: Number(row.sortOrder ?? 0),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function parsePopupPayload(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const message = typeof body.body === "string" ? body.body.trim() : "";
  const ctaLabel =
    typeof body.ctaLabel === "string" && body.ctaLabel.trim()
      ? body.ctaLabel.trim()
      : "Let’s get started";
  const sortOrder =
    typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
      ? Math.trunc(body.sortOrder)
      : Number.parseInt(String(body.sortOrder ?? "0"), 10) || 0;

  if (!title) throw new Error("Title is required.");
  if (!message) throw new Error("Message is required.");

  return {
    title,
    body: message,
    ctaLabel,
    ctaUrl: normalizeOptionalText(body.ctaUrl),
    imageUrl: normalizeOptionalText(body.imageUrl),
    videoUrl: normalizeOptionalText(body.videoUrl),
    target: normalizeTarget(body.target),
    isActive: body.isActive !== false,
    dismissible: body.dismissible !== false,
    sortOrder,
  };
}

export async function listAdminPopups() {
  const prisma = getPrisma() as any;
  const rows = await prisma.appPopup.findMany({
    orderBy: [{ target: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return rows.map(normalizePopup);
}

export async function createPopup(data: ReturnType<typeof parsePopupPayload>) {
  const prisma = getPrisma() as any;
  return normalizePopup(await prisma.appPopup.create({ data }));
}

export async function updatePopup(
  id: string,
  data: ReturnType<typeof parsePopupPayload>,
) {
  const prisma = getPrisma() as any;
  return normalizePopup(await prisma.appPopup.update({ where: { id }, data }));
}

export async function deletePopup(id: string) {
  const prisma = getPrisma() as any;
  await prisma.appPopup.delete({ where: { id } });
}

export async function listActivePreviewCards() {
  const prisma = getPrisma() as any;
  const rows = await prisma.appPopup.findMany({
    where: { target: "preview", isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 12,
  });

  return rows.map(normalizePopup);
}

export async function getPendingPopupForUser(userId: string) {
  const prisma = getPrisma() as any;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });

  if (!user) return null;

  const where = {
    isActive: true,
    dismissals: {
      none: { userId },
    },
    OR: [
      { target: "logged_in" },
      {
        target: "onboarding",
        createdAt: { lte: user.createdAt },
      },
    ],
  };

  const rows = await prisma.appPopup.findMany({
    where,
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "desc" },
    ],
    take: 12,
  });

  const row = rows.sort((a: any, b: any) => {
    if (a.target === b.target) return 0;
    return a.target === "onboarding" ? -1 : 1;
  })[0];

  return row ? normalizePopup(row) : null;
}

export async function dismissPopupForUser(userId: string, popupId: string) {
  const prisma = getPrisma() as any;
  await prisma.userPopupDismissal.upsert({
    where: { userId_popupId: { userId, popupId } },
    update: {},
    create: { userId, popupId },
  });
}
