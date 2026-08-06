import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { normalizeCommunityProjectNiche } from "@/lib/community-projects";
import {
  getAdminSiteSettings,
  normalizeHomepageChromeInput,
  upsertSiteSettings,
} from "@/lib/site-settings";
import { getPrisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return getUserBySessionToken(token);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await requireAdmin(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing project id" }, { status: 400 });
  }

  const payload = (await request.json().catch(() => null)) as {
    selected?: boolean;
    niche?: unknown;
  } | null;

  if (typeof payload?.selected !== "boolean") {
    return NextResponse.json(
      { error: "A boolean selected value is required." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const project = await prisma.chat.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const settings = await getAdminSiteSettings();
  const currentIds = settings.homepageChrome.communityProjectIds;
  const currentNiches = settings.homepageChrome.communityProjectNiches;
  const nextNiches = { ...currentNiches };
  const nextIds = payload.selected
    ? [id, ...currentIds.filter((projectId) => projectId !== id)].slice(0, 200)
    : currentIds.filter((projectId) => projectId !== id);

  if (payload.selected) {
    nextNiches[id] = normalizeCommunityProjectNiche(
      typeof payload.niche === "string" ? payload.niche : currentNiches[id],
    );
  } else {
    delete nextNiches[id];
  }

  const homepageChrome = normalizeHomepageChromeInput({
    ...settings.homepageChrome,
    communityProjectIds: nextIds,
    communityProjectNiches: nextNiches,
  });

  if (payload.selected) {
    await prisma.chat.update({
      where: { id },
      data: { isTemplate: true },
    });
  }

  await upsertSiteSettings({
    ...settings,
    homepageChrome,
  });
  revalidateTag("site-settings", "max");
  revalidatePath("/community");
  revalidatePath("/");

  return NextResponse.json({
    ok: true,
    id,
    selected: payload.selected,
    isTemplate: payload.selected ? true : undefined,
    niche: nextNiches[id] ?? null,
  });
}
