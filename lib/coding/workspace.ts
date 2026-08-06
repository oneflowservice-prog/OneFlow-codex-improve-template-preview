import "server-only";

import { randomUUID } from "node:crypto";
import { getPrisma } from "@/lib/prisma";

const WORKSPACE_ID_PATTERN = /^oneflow-[0-9a-f]{32}$/;

function createWorkspaceId() {
  return `oneflow-${randomUUID().replaceAll("-", "")}`;
}

export function assertWorkspaceId(value: string) {
  if (!WORKSPACE_ID_PATTERN.test(value)) {
    throw new Error("Invalid project workspace identifier.");
  }
  return value;
}

export async function ensureProjectWorkspace(chatId: string) {
  const prisma = getPrisma();
  const existing = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { builderWorkspaceId: true, workspaceRevision: true },
  });
  if (!existing) throw new Error("Project not found.");
  if (existing.builderWorkspaceId) {
    return {
      workspaceId: assertWorkspaceId(existing.builderWorkspaceId),
      revision: existing.workspaceRevision,
    };
  }

  const workspaceId = createWorkspaceId();
  const claimed = await prisma.chat.updateMany({
    where: { id: chatId, builderWorkspaceId: null },
    data: { builderWorkspaceId: workspaceId },
  });
  if (claimed.count === 1) {
    return { workspaceId, revision: existing.workspaceRevision };
  }

  const winner = await prisma.chat.findUniqueOrThrow({
    where: { id: chatId },
    select: { builderWorkspaceId: true, workspaceRevision: true },
  });
  if (!winner.builderWorkspaceId) {
    throw new Error("Could not allocate the project workspace.");
  }
  return {
    workspaceId: assertWorkspaceId(winner.builderWorkspaceId),
    revision: winner.workspaceRevision,
  };
}
