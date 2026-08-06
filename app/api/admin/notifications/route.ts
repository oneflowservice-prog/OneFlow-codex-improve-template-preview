import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  createAdminBroadcastNotifications,
  deleteAdminBroadcastNotifications,
  type NotificationAudience,
  updateAdminBroadcastNotifications,
} from "@/lib/notifications";

function normalizeAudience(value: unknown): NotificationAudience {
  return value === "admins_only" || value === "non_admin_users" || value === "all_users"
    ? value
    : "all_users";
}

function normalizeOptionalLink(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getAdminFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? getUserBySessionToken(token) : null;
}

export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as
      | {
          title?: unknown;
          body?: unknown;
          linkUrl?: unknown;
          audience?: unknown;
        }
      | null;

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const message = typeof body?.body === "string" ? body.body.trim() : "";
    const audience = normalizeAudience(body?.audience);
    const linkUrl = normalizeOptionalLink(body?.linkUrl);

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const result = await createAdminBroadcastNotifications({
      actorId: admin.id,
      title,
      body: message,
      linkUrl,
      audience,
    });

    return NextResponse.json({
      deliveredCount: result.deliveredCount,
      audience,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not send notifications.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await getAdminFromRequest(request);

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as
      | {
          broadcastId?: unknown;
          actorId?: unknown;
          title?: unknown;
          body?: unknown;
          linkUrl?: unknown;
          createdAt?: unknown;
        }
      | null;

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const message = typeof body?.body === "string" ? body.body.trim() : "";
    const linkUrl = normalizeOptionalLink(body?.linkUrl);
    const actorId = typeof body?.actorId === "string" ? body.actorId : null;
    const broadcastId =
      typeof body?.broadcastId === "string" ? body.broadcastId.trim() : null;
    const createdAtValue =
      typeof body?.createdAt === "string" ? new Date(body.createdAt) : null;

    if (!title || !message || !createdAtValue || Number.isNaN(createdAtValue.getTime())) {
      return NextResponse.json(
        { error: "A valid notification payload is required." },
        { status: 400 },
      );
    }

    const result = await deleteAdminBroadcastNotifications({
      broadcastId,
      actorId,
      title,
      body: message,
      linkUrl,
      createdAt: createdAtValue,
    });

    return NextResponse.json({ deletedCount: result.deletedCount });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not delete notifications.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminFromRequest(request);

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as
      | {
          broadcastId?: unknown;
          actorId?: unknown;
          originalTitle?: unknown;
          originalBody?: unknown;
          originalLinkUrl?: unknown;
          createdAt?: unknown;
          title?: unknown;
          body?: unknown;
          linkUrl?: unknown;
        }
      | null;

    const originalTitle =
      typeof body?.originalTitle === "string" ? body.originalTitle.trim() : "";
    const originalMessage =
      typeof body?.originalBody === "string" ? body.originalBody.trim() : "";
    const originalLinkUrl = normalizeOptionalLink(body?.originalLinkUrl);
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const message = typeof body?.body === "string" ? body.body.trim() : "";
    const linkUrl = normalizeOptionalLink(body?.linkUrl);
    const actorId = typeof body?.actorId === "string" ? body.actorId : null;
    const broadcastId =
      typeof body?.broadcastId === "string" ? body.broadcastId.trim() : null;
    const createdAtValue =
      typeof body?.createdAt === "string" ? new Date(body.createdAt) : null;

    if (
      !originalTitle ||
      !originalMessage ||
      !title ||
      !message ||
      !createdAtValue ||
      Number.isNaN(createdAtValue.getTime())
    ) {
      return NextResponse.json(
        { error: "A valid notification payload is required." },
        { status: 400 },
      );
    }

    const result = await updateAdminBroadcastNotifications({
      broadcastId,
      actorId,
      originalTitle,
      originalBody: originalMessage,
      originalLinkUrl,
      createdAt: createdAtValue,
      title,
      body: message,
      linkUrl,
    });

    return NextResponse.json({ updatedCount: result.updatedCount });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not update notifications.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
