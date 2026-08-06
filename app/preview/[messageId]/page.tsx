import CodeRunner from "@/components/code-runner";
import { getFilesFromMessage } from "@/lib/chat-files";
import { inferBuilderModeFromFiles } from "@/lib/builder-mode";
import { getPrisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { getPreviewEnvironmentVariables } from "@/lib/supabase-builder";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ messageId: string }>;
}): Promise<Metadata> {
  const { messageId } = await params;
  const message = await getMessage(messageId);
  if (!message) {
    notFound();
  }

  const title = message.chat.title;
  const searchParams = new URLSearchParams();
  searchParams.set("prompt", title);

  return {
    title,
    description: `An app generated on OneFlow: ${title}`,
    openGraph: {
      title,
      description: `An app generated on OneFlow: ${title}`,
      images: [`/api/og?${searchParams}`],
    },
    twitter: {
      card: "summary_large_image",
      images: [`/api/og?${searchParams}`],
      title,
    },
  };
}

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ messageId: string }>;
}) {
  const { messageId } = await params;
  const [message, siteSettings] = await Promise.all([
    getMessage(messageId),
    getSiteSettings(),
  ]);

  if (!message) {
    notFound();
  }

  const files = getFilesFromMessage(message.files, message.content);
  if (files.length === 0) {
    notFound();
  }

  const builderMode = inferBuilderModeFromFiles(
    files.map((file) => ({ path: file.path, content: file.code })),
  );

  return (
    <main className="h-dvh w-full overflow-hidden bg-[hsl(var(--surface))]">
      <CodeRunner
        files={files.map((file) => ({
          path: file.path,
          content: file.code,
        }))}
        chatId={message.chatId}
        previewProvider={siteSettings.homepageChrome.previewProvider}
        builderMode={builderMode}
        environmentVariables={getPreviewEnvironmentVariables(
          message.chat.projectEnvVars,
          { builderMode },
        )}
      />
    </main>
  );
}

const getMessage = cache(async (messageId: string) => {
  const prisma = getPrisma();
  return prisma.message.findUnique({
    where: {
      id: messageId,
    },
    include: {
      chat: true,
    },
  });
});
