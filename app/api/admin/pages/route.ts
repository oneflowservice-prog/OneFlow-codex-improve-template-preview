import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  getSitePages,
  normalizeSitePagesInput,
  upsertSitePages,
} from "@/lib/site-pages";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pages = await getSitePages();
  return NextResponse.json({ pages });
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pages = normalizeSitePagesInput(await request.json().catch(() => null));
    await upsertSitePages(pages);
    revalidateTag("site-pages", "max");

    return NextResponse.json({ pages });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save site pages.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
