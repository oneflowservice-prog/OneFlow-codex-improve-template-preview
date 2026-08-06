import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  ensureUptimeHubMonitor,
  listUptimeHubMonitors,
} from "@/lib/uptimehub";

const createMonitorSchema = z.object({
  name: z.string().trim().min(1, "Monitor name is required."),
  target: z.string().trim().url("Target must be a valid URL."),
});

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return null;
  }

  return admin;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const monitors = await listUptimeHubMonitors();
    return NextResponse.json({ monitors });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not load UptimeHub monitors.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = createMonitorSchema.safeParse(
      await request.json().catch(() => null),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request." },
        { status: 400 },
      );
    }

    const result = await ensureUptimeHubMonitor(parsed.data);

    return NextResponse.json({
      id: result.id,
      created: result.created,
      monitors: result.monitors,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not create UptimeHub monitor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
