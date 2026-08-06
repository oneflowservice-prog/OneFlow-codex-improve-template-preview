import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  getAccessibleChatContext,
  type ChatAccessContext,
} from "@/lib/team-projects";

type ProjectRecord = {
  id: string;
  model: string;
  title: string;
  builderWorkspaceId: string | null;
  openCodeSessionId: string | null;
  workspaceRevision: number;
};

export type AuthorizedProject = {
  userId: string;
  access: ChatAccessContext;
  project: ProjectRecord;
};

export type ProjectAuthorizationResult =
  | { ok: true; value: AuthorizedProject }
  | { ok: false; response: NextResponse };

export async function authorizeProjectRequest(
  request: NextRequest,
  chatId: string,
  capability: "read" | "edit" | "manage" = "read",
): Promise<ProjectAuthorizationResult> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    };
  }

  const prisma = getPrisma();
  const access = await getAccessibleChatContext(prisma, chatId, user.id);
  if (!access?.canRead) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      ),
    };
  }

  const permitted =
    capability === "read"
      ? access.canRead
      : capability === "edit"
        ? access.canEdit
        : access.canManage;
  if (!permitted) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const project = await prisma.chat.findUnique({
    where: { id: chatId },
    select: {
      id: true,
      model: true,
      title: true,
      builderWorkspaceId: true,
      openCodeSessionId: true,
      workspaceRevision: true,
    },
  });

  if (!project) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      ),
    };
  }

  return {
    ok: true,
    value: { userId: user.id, access, project },
  };
}
