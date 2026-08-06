import { getPrisma } from "@/lib/prisma";
import { getFilesFromMessage } from "@/lib/chat-files";
import {
  createGithubRepository,
  getGithubRepository,
  pushFilesToGithubRepository,
  slugifyGithubRepositoryName,
} from "@/lib/github";

type SyncGithubOptions = {
  chatId: string;
  messageId: string;
  force?: boolean;
  repositoryName?: string | null;
  visibility?: "private" | "public" | null;
};

export async function syncChatMessageToGithub({
  chatId,
  messageId,
  force = false,
  repositoryName,
  visibility,
}: SyncGithubOptions) {
  const prisma = getPrisma();
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: {
      id: true,
      title: true,
      userId: true,
      githubRepoOwner: true,
      githubRepoName: true,
      githubRepoUrl: true,
      githubDefaultBranch: true,
      githubLastPushedAt: true,
      githubPreferredRepoName: true,
      githubRepoVisibility: true,
      githubAutoPushEnabled: true,
      user: {
        select: {
          githubAccessToken: true,
          githubLogin: true,
        },
      },
    },
  });

  if (!chat) {
    throw new Error("Chat not found.");
  }

  if (!chat.user?.githubAccessToken || !chat.user.githubLogin) {
    throw new Error("Connect GitHub before pushing code.");
  }

  if (!force && !chat.githubAutoPushEnabled) {
    return null;
  }

  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      chatId,
      role: "assistant",
    },
    select: {
      id: true,
      content: true,
      files: true,
    },
  });

  if (!message) {
    throw new Error("No generated version was found for this chat.");
  }

  const files = getFilesFromMessage(message.files, message.content);
  if (files.length === 0) {
    return null;
  }

  const accessToken = chat.user.githubAccessToken;
  const githubLogin = chat.user.githubLogin;
  let repoOwner = chat.githubRepoOwner || githubLogin;
  let repoName = chat.githubRepoName;
  let repoUrl = chat.githubRepoUrl;
  let defaultBranch = chat.githubDefaultBranch || "main";
  const normalizedVisibility = visibility || chat.githubRepoVisibility || "private";
  const preferredRepoName = repositoryName?.trim() || chat.githubPreferredRepoName || chat.title;

  if (!repoName) {
    const fallbackName = chat.id.toLowerCase();
    const normalizedRepoName = slugifyGithubRepositoryName(
      preferredRepoName,
      fallbackName,
    );

    const repo = await createGithubRepository({
      accessToken,
      name: normalizedRepoName,
      description: `Exported from OneFlow chat ${chat.title}`,
      isPrivate: normalizedVisibility !== "public",
    });

    repoOwner = repo.owner?.login || githubLogin;
    repoName = repo.name;
    repoUrl = repo.html_url;
    defaultBranch = repo.default_branch || "main";
  } else if (!repoUrl || !defaultBranch) {
    const repo = await getGithubRepository(accessToken, repoOwner, repoName);
    repoOwner = repo.owner?.login || repoOwner;
    repoUrl = repo.html_url;
    defaultBranch = repo.default_branch || defaultBranch || "main";
  }

  const commitMessage = `Export ${chat.title} from OneFlow`;
  const pushResult = await pushFilesToGithubRepository({
    accessToken,
    owner: repoOwner,
    repo: repoName,
    branch: defaultBranch,
    files,
    commitMessage,
  });

  const pushedAt = new Date();

  await prisma.chat.update({
    where: { id: chat.id },
    data: {
      githubRepoOwner: repoOwner,
      githubRepoName: repoName,
      githubRepoUrl: repoUrl,
      githubDefaultBranch: defaultBranch,
      githubLastPushedAt: pushedAt,
      githubPreferredRepoName: preferredRepoName,
      githubRepoVisibility: normalizedVisibility,
    },
  });

  return {
    repoOwner,
    repoName,
    repoUrl,
    defaultBranch,
    lastCommitSha: pushResult.commitSha,
    pushedAt: pushedAt.toISOString(),
  };
}
