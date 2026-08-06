import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { getCurrentUser } from "@/app/api/settings/shared";

const profileSchema = z.object({
  section: z.literal("profile"),
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_]+$/),
  name: z.string().trim().max(80).optional().default(""),
  location: z.string().trim().max(80).optional().default(""),
  avatarUrl: z.string().trim().url().optional().or(z.literal("")),
  bannerUrl: z.string().trim().url().optional().or(z.literal("")),
});

const preferencesSchema = z.object({
  section: z.literal("preferences"),
  chatSuggestions: z.boolean(),
  generationSound: z.enum(["first_generation", "always", "never"]),
  autoAcceptInvitations: z.boolean(),
  pushNotifications: z.boolean(),
  pushOnAgentAction: z.boolean(),
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reauthenticate") }),
  z.object({ action: z.literal("unlink_vercel") }),
  z.object({ action: z.literal("unlink_netlify") }),
  z.object({ action: z.literal("unlink_github") }),
]);

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      location: true,
      avatarUrl: true,
      bannerUrl: true,
      chatSuggestions: true,
      generationSound: true,
      autoAcceptInvitations: true,
      pushNotifications: true,
      pushOnAgentAction: true,
      lastReauthenticatedAt: true,
      passwordHash: true,
      vercelAuthSub: true,
      vercelConnectedAt: true,
      netlifyAccessToken: true,
      netlifyConnectedAt: true,
      githubAccessToken: true,
      githubConnectedAt: true,
    },
  });

  if (!record) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    settings: {
      id: record.id,
      email: record.email,
      username: record.username,
      name: record.name,
      location: record.location,
      avatarUrl: record.avatarUrl,
      bannerUrl: record.bannerUrl,
      chatSuggestions: record.chatSuggestions,
      generationSound: record.generationSound,
      autoAcceptInvitations: record.autoAcceptInvitations,
      pushNotifications: record.pushNotifications,
      pushOnAgentAction: record.pushOnAgentAction,
      lastReauthenticatedAt: record.lastReauthenticatedAt,
      linkedAccounts: {
        password: Boolean(record.passwordHash),
        vercel: Boolean(record.vercelAuthSub),
        vercelConnectedAt: record.vercelConnectedAt,
        netlify: Boolean(record.netlifyAccessToken),
        netlifyConnectedAt: record.netlifyConnectedAt,
        github: Boolean(record.githubAccessToken),
        githubConnectedAt: record.githubConnectedAt,
      },
    },
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const profileParsed = profileSchema.safeParse(body);
  const preferencesParsed = preferencesSchema.safeParse(body);
  const prisma = getPrisma();

  if (profileParsed.success) {
    const username = profileParsed.data.username.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existing && existing.id !== user.id) {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        username,
        name: profileParsed.data.name || null,
        location: profileParsed.data.location || null,
        avatarUrl: profileParsed.data.avatarUrl || null,
        bannerUrl: profileParsed.data.bannerUrl || null,
      },
      select: {
        username: true,
        name: true,
        location: true,
        avatarUrl: true,
        bannerUrl: true,
      },
    });

    return NextResponse.json({ ok: true, profile: updated });
  }

  if (preferencesParsed.success) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        chatSuggestions: preferencesParsed.data.chatSuggestions,
        generationSound: preferencesParsed.data.generationSound,
        autoAcceptInvitations: preferencesParsed.data.autoAcceptInvitations,
        pushNotifications: preferencesParsed.data.pushNotifications,
        pushOnAgentAction: preferencesParsed.data.pushNotifications
          ? preferencesParsed.data.pushOnAgentAction
          : false,
      },
      select: {
        chatSuggestions: true,
        generationSound: true,
        autoAcceptInvitations: true,
        pushNotifications: true,
        pushOnAgentAction: true,
      },
    });

    return NextResponse.json({ ok: true, preferences: updated });
  }

  return NextResponse.json({ error: "Invalid settings payload." }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const prisma = getPrisma();

  if (parsed.data.action === "reauthenticate") {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { lastReauthenticatedAt: new Date() },
      select: { lastReauthenticatedAt: true },
    });

    return NextResponse.json({ ok: true, lastReauthenticatedAt: updated.lastReauthenticatedAt });
  }

  if (parsed.data.action === "unlink_vercel") {
    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true, vercelAuthSub: true },
    });

    if (!existing?.vercelAuthSub) {
      return NextResponse.json({ error: "Vercel is not linked." }, { status: 400 });
    }

    if (!existing.passwordHash) {
      return NextResponse.json(
        { error: "Add an email password login before unlinking Vercel." },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        vercelAuthSub: null,
        vercelAvatarUrl: null,
        vercelAccessToken: null,
        vercelTeamId: null,
        vercelScope: null,
        vercelConnectedAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "unlink_github") {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        githubLogin: null,
        githubAvatarUrl: null,
        githubAccessToken: null,
        githubScope: null,
        githubConnectedAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      netlifyAccessToken: null,
      netlifyScope: null,
      netlifyConnectedAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    await tx.chat.deleteMany({
      where: { userId: user.id },
    });
    await tx.projectFolder.deleteMany({
      where: { userId: user.id },
    });
    await tx.session.deleteMany({
      where: { userId: user.id },
    });
    await tx.user.delete({
      where: { id: user.id },
    });
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
