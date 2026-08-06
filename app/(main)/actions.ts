"use server";

import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getModels } from "@/lib/models";
import { getVisibleModelsForUser } from "@/lib/models";
import { getPrisma } from "@/lib/prisma";
import { INSUFFICIENT_TOKENS_ERROR } from "@/lib/token-usage";
import { syncChatMessageToGithub } from "@/lib/github-sync";
import { notFound } from "next/navigation";
import { getAccessibleChatContext } from "@/lib/team-projects";
import { generateAiProjectTitleFromPrompt } from "@/lib/project-title";
import { ensureReadmeFile, type ChatFile } from "@/lib/chat-files";
import { getPlanFeatureAccessForUser } from "@/lib/plan-feature-access";
import type { Prisma } from "@prisma/client";
import { inferBuilderModeFromFiles } from "@/lib/builder-mode";

export async function createMessage(
  chatId: string,
  text: string,
  role: "assistant" | "user",
  files?: any,
  metadata?: Prisma.InputJsonValue,
) {
  const prisma = getPrisma();
  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = sessionToken
    ? await getUserBySessionToken(sessionToken)
    : null;
  const access = sessionToken
    ? await getAccessibleChatContext(prisma, chatId, sessionUser?.id ?? "")
    : null;
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: {
      id: true,
      userId: true,
      model: true,
      title: true,
      messages: {
        select: {
          role: true,
          position: true,
        },
      },
    },
  });
  if (!chat || !access?.canRead) {
    notFound();
  }

  if (!access.canEdit) {
    throw new Error("Unauthorized");
  }

  const maxPosition =
    chat.messages.length > 0
      ? Math.max(...chat.messages.map((m) => m.position))
      : -1;

  let remainingCreditBalance: number | null = null;
  let debitedTokens = 0;

  if (role === "user" && chat.userId) {
    if (!sessionUser) {
      throw new Error("Unauthorized");
    }

    const configuredModels = await getModels();
    const selectedModel = configuredModels.find(
      (candidate) => candidate.value === chat.model,
    );
    const tokensPerText = Math.max(selectedModel?.tokensPerText ?? 0, 0);

    if (tokensPerText > 0) {
      const usageDescription = `${tokensPerText.toLocaleString()} credits used for ${selectedModel?.label || chat.model}`;

      const debitResult = await prisma.$transaction(async (tx) => {
        const result = await tx.user.updateMany({
          where: {
            id: sessionUser.id,
            creditBalance: {
              gte: tokensPerText,
            },
          },
          data: {
            creditBalance: {
              decrement: tokensPerText,
            },
          },
        });

        if (result.count > 0) {
          await tx.billingTransaction.create({
            data: {
              id: randomUUID(),
              userId: sessionUser.id,
              provider: "usage",
              providerReference: `usage:${chatId}:${maxPosition + 1}:${randomUUID()}`,
              type: "usage_debit",
              direction: "expense",
              status: "completed",
              amount: 0,
              description: usageDescription,
              metadata: {
                chatId,
                model: chat.model,
                modelLabel: selectedModel?.label || chat.model,
                tokenDelta: -tokensPerText,
                credits: tokensPerText,
                messagePosition: maxPosition + 1,
              },
            },
          });
        }

        return result;
      });

      if (debitResult.count === 0) {
        throw new Error(INSUFFICIENT_TOKENS_ERROR);
      }

      debitedTokens = tokensPerText;

      const updatedUser = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: { creditBalance: true },
      });

      remainingCreditBalance = updatedUser?.creditBalance ?? 0;
    } else {
      remainingCreditBalance = sessionUser.creditBalance;
    }
  }

  const generatedFiles =
    role === "assistant" && Array.isArray(files) && files.length > 0
      ? ensureReadmeFile(files as ChatFile[], { title: chat.title })
      : files;
  const messageFiles =
    role === "assistant" &&
    Array.isArray(generatedFiles) &&
    generatedFiles.length > 0
      ? (() => {
          const normalized = generatedFiles as ChatFile[];
          const stack = inferBuilderModeFromFiles(
            normalized.map((file) => ({ path: file.path, content: file.code })),
          );
          const source = normalized.map((file) => file.code).join("\n");
          const backend = /@supabase\/|supabase-js/i.test(source)
            ? "supabase"
            : /firebase(?:\/|-admin)|firestore/i.test(source)
              ? "firebase"
              : "none";
          return {
            files: normalized,
            builderMode: stack,
            stack,
            backend,
            auth:
              backend === "supabase"
                ? "supabase-auth"
                : backend === "firebase"
                  ? "firebase-auth"
                  : "none",
            validation: {
              status: "pending",
              repairCount: 0,
              buildFingerprint: null,
            },
            deploymentTarget:
              stack === "nextjs" ? "netlify" : "netlify-or-vercel",
          };
        })()
      : generatedFiles;

  const newMessage = await prisma.message.create({
    data: {
      role,
      content: text,
      files: messageFiles ? JSON.parse(JSON.stringify(messageFiles)) : null,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      position: maxPosition + 1,
      chatId,
    },
  });

  if (
    role === "user" &&
    !chat.messages.some((message) => message.role === "user")
  ) {
    const title = await generateAiProjectTitleFromPrompt(text, chat.model);
    if (title && title !== chat.title) {
      await prisma.chat.update({
        where: { id: chatId },
        data: {
          title,
          prompt: text,
        },
      });
    }
  }

  if (role === "assistant" && sessionUser) {
    try {
      const planFeatureAccess = await getPlanFeatureAccessForUser(sessionUser);
      if (planFeatureAccess.githubAccessEnabled) {
        // Check if user has connected GitHub before attempting sync
        const userWithGithub = await prisma.user.findUnique({
          where: { id: sessionUser.id },
          select: {
            githubAccessToken: true,
            githubLogin: true,
          },
        });

        if (userWithGithub?.githubAccessToken && userWithGithub.githubLogin) {
          await syncChatMessageToGithub({
            chatId,
            messageId: newMessage.id,
          });
        }
      }
    } catch (error) {
      console.error("GitHub auto-push skipped:", error);
    }
  }

  return {
    ...newMessage,
    remainingCreditBalance,
    debitedTokens,
  };
}

export async function updateChatModel(chatId: string, model: string) {
  const prisma = getPrisma();
  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = sessionToken
    ? await getUserBySessionToken(sessionToken)
    : null;
  if (!sessionUser) {
    throw new Error("Unauthorized");
  }
  const access = await getAccessibleChatContext(prisma, chatId, sessionUser.id);
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { id: true, userId: true },
  });
  if (!chat || !access?.canEdit) {
    notFound();
  }

  const models = await getVisibleModelsForUser(chat.userId);
  const isAllowedModel = models.some((candidate) => candidate.value === model);
  if (!isAllowedModel) {
    throw new Error("Invalid model selection");
  }

  const updatedChat = await prisma.chat.update({
    where: { id: chatId },
    data: { model },
    select: { id: true, model: true },
  });

  return updatedChat;
}
