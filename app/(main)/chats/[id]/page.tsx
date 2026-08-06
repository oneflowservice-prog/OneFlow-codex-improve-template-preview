import { getPrisma } from "@/lib/prisma";
import { getVisibleDisplayModelsWithAccessForUser } from "@/lib/models";
import { getSiteSettings } from "@/lib/site-settings";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getAccessibleChatContext } from "@/lib/team-projects";
import { getPlanFeatureAccessForUser } from "@/lib/plan-feature-access";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import PageClient from "./page.client";
import { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Await the params before accessing its properties
  const resolvedParams = await params;
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = token ? await getUserBySessionToken(token) : null;
  const chat = sessionUser
    ? await getChatById(resolvedParams.id, sessionUser.id)
    : null;

  if (!chat) {
    return {
      title: "OneFlow - Chat not found",
      description: "The requested chat could not be found.",
    };
  }

  return {
    title: `${chat.title} | OneFlow`,
    description: `Build and iterate on ${chat.title} with OneFlow (${chat.model}).`,
    openGraph: {
      title: `${chat.title} | OneFlow`,
      description: `Build and iterate on ${chat.title} with OneFlow (${chat.model}).`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${chat.title} | OneFlow`,
      description: `Build and iterate on ${chat.title} with OneFlow (${chat.model}).`,
    },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = token ? await getUserBySessionToken(token) : null;

  if (!sessionUser) {
    redirect("/signup");
  }

  const id = (await params).id;
  const resolvedSearchParams = await searchParams;

  // Run all data fetches in parallel. Use sessionUser.id + subscriptionPlanSlug
  // (already resolved from the session join above) so we skip a redundant DB query
  // inside getVisibleDisplayModelsWithAccessForUser.
  const [chat, connections, siteSettings, models, planFeatureAccess] = await Promise.all([
    getChatById(id, sessionUser.id),
    getPublishConnections(),
    getSiteSettings(),
    getVisibleDisplayModelsWithAccessForUser(
      sessionUser.id,
      sessionUser.subscriptionPlanSlug,
    ),
    getPlanFeatureAccessForUser(sessionUser),
  ]);

  if (!chat) {
    notFound();
  }

  const netlifyStatus =
    typeof resolvedSearchParams.netlify === "string"
      ? resolvedSearchParams.netlify
      : undefined;
  const netlifyMessage =
    typeof resolvedSearchParams.message === "string"
      ? resolvedSearchParams.message
      : undefined;
  const githubStatus =
    typeof resolvedSearchParams.github === "string"
      ? resolvedSearchParams.github
      : undefined;
  const githubMessage =
    typeof resolvedSearchParams.githubMessage === "string"
      ? resolvedSearchParams.githubMessage
      : netlifyMessage;
  const supabaseStatus =
    typeof resolvedSearchParams.supabase === "string"
      ? resolvedSearchParams.supabase
      : undefined;
  const supabaseMessage =
    typeof resolvedSearchParams.supabaseMessage === "string"
      ? resolvedSearchParams.supabaseMessage
      : undefined;

  return (
    <PageClient
      chat={chat}
      models={models}
      siteName={siteSettings.siteName}
      currentUser={{
        name: sessionUser.name,
        email: sessionUser.email,
        username: sessionUser.username,
        avatarUrl: sessionUser.avatarUrl || sessionUser.vercelAvatarUrl,
        creditBalance: sessionUser.creditBalance,
      }}
      isNetlifyConnected={connections.netlify}
      isGitHubConnected={connections.github}
      isSupabaseConnected={connections.supabase}
      githubLogin={connections.githubLogin}
      githubAvatarUrl={connections.githubAvatarUrl}
      isFreePlan={
        sessionUser.subscriptionStatus !== "active" ||
        !sessionUser.subscriptionPlanSlug ||
        sessionUser.subscriptionPlanSlug === "free"
      }
      planFeatureAccess={planFeatureAccess}
      netlifyStatus={netlifyStatus}
      netlifyMessage={netlifyMessage}
      githubStatus={githubStatus}
      githubMessage={githubMessage}
      supabaseStatus={supabaseStatus}
      supabaseMessage={supabaseMessage}
    />
  );
}

async function getPublishConnections() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return {
      netlify: false,
      github: false,
      supabase: false,
      githubLogin: null,
      githubAvatarUrl: null,
    };
  }

  const prisma = getPrisma();
  const session = await prisma.session.findUnique({
    where: {
      tokenHash: await hashSessionToken(token),
    },
    select: {
      expiresAt: true,
      user: {
        select: {
          netlifyAccessToken: true,
          githubAccessToken: true,
          supabaseAccessToken: true,
          githubLogin: true,
          githubAvatarUrl: true,
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    return {
      netlify: false,
      github: false,
      supabase: false,
      githubLogin: null,
      githubAvatarUrl: null,
    };
  }

  return {
    netlify: Boolean(session.user.netlifyAccessToken),
    github: Boolean(session.user.githubAccessToken),
    supabase: Boolean(session.user.supabaseAccessToken),
    githubLogin: session.user.githubLogin,
    githubAvatarUrl: session.user.githubAvatarUrl,
  };
}

async function hashSessionToken(token: string) {
  const encoded = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const getChatById = cache(async (id: string, viewerUserId: string) => {
  const prisma = getPrisma();
  const access = await getAccessibleChatContext(prisma, id, viewerUserId);
  if (!access?.canRead) return null;
  const chat = await prisma.chat.findFirst({
    where: { id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          username: true,
          avatarUrl: true,
          vercelAvatarUrl: true,
        },
      },
    },
  });

  if (!chat) return null;

  // Get total message count
  const totalMessages = await prisma.message.count({
    where: { chatId: id },
  });

  // Always fetch system message (position 0) and initial user message (position 1)
  const initialMessages = await prisma.message.findMany({
    where: {
      chatId: id,
      position: { in: [0, 1] },
    },
    orderBy: { position: "asc" },
  });

  // Fetch the last 100 messages from position 2 onwards
  const recentMessages = await prisma.message.findMany({
    where: {
      chatId: id,
      position: { gte: 2 },
    },
    orderBy: { position: "desc" },
    take: 100,
  });

  // Combine and sort all messages
  const allMessages = [...initialMessages, ...recentMessages].sort(
    (a, b) => a.position - b.position,
  );

  // Calculate assistant messages count before the loaded range for correct versioning
  const assistantMessagesInLoaded = allMessages.filter(
    (m) => m.role === "assistant",
  );
  let assistantMessagesCountBefore = 0;
  if (assistantMessagesInLoaded.length > 0) {
    const minPosition = Math.min(
      ...assistantMessagesInLoaded.map((m) => m.position),
    );
    assistantMessagesCountBefore = await prisma.message.count({
      where: {
        chatId: id,
        role: "assistant",
        position: { lt: minPosition },
      },
    });
  }

  return {
    ...chat,
    messages: allMessages,
    totalMessages,
    assistantMessagesCountBefore,
  };
});

export type Chat = NonNullable<Awaited<ReturnType<typeof getChatById>>>;
export type Message = Chat["messages"][number];

export const runtime = "nodejs";
