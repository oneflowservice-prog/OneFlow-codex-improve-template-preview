import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeProjectRequest } from "@/lib/coding/project-access";
import { appendCodingEvent } from "@/lib/coding/events";
import { ensureProjectWorkspace } from "@/lib/coding/workspace";
import { getPrisma } from "@/lib/prisma";
import { getOpenCodeRuntimeConfig } from "@/lib/opencode/config";
import { startOpenCodeCodingJob } from "@/lib/opencode/jobs";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const createJobSchema = z.object({
  prompt: z.string().trim().min(1).max(30_000),
  messageId: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).max(200).optional(),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: chatId } = await context.params;
  const authorization = await authorizeProjectRequest(request, chatId, "edit");
  if (!authorization.ok) return authorization.response;

  if (!(await getOpenCodeRuntimeConfig())) {
    return NextResponse.json(
      { error: "Webby Builder is not configured." },
      { status: 503 },
    );
  }

  const parsed = createJobSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid coding job request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  if (parsed.data.messageId) {
    const message = await prisma.message.findFirst({
      where: { id: parsed.data.messageId, chatId, role: "user" },
      select: { id: true },
    });
    if (!message) {
      return NextResponse.json(
        { error: "Prompt message was not found in this project." },
        { status: 400 },
      );
    }
  }

  const activeJob = await prisma.codingJob.findFirst({
    where: {
      chatId,
      status: {
        in: [
          "queued",
          "running",
          "agent_completed",
          "validating",
          "previewing",
          "cancelling",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });
  if (activeJob) {
    return NextResponse.json(
      {
        error: "A coding job is already active for this project.",
        jobId: activeJob.id,
        status: activeJob.status,
      },
      { status: 409 },
    );
  }

  const workspace = await ensureProjectWorkspace(chatId);
  const job = await prisma.codingJob.create({
    data: {
      chatId,
      requestedByUserId: authorization.value.userId,
      messageId: parsed.data.messageId,
      prompt: parsed.data.prompt,
      model: parsed.data.model || authorization.value.project.model,
      workspaceId: workspace.workspaceId,
      workspaceRevision: workspace.revision,
      status: "queued",
    },
    select: {
      id: true,
      status: true,
      workspaceId: true,
      workspaceRevision: true,
      createdAt: true,
    },
  });

  await appendCodingEvent(job.id, "job.started", {
    status: "queued",
    workspaceId: job.workspaceId,
    workspaceRevision: job.workspaceRevision,
  });

  try {
    const started = await startOpenCodeCodingJob(job.id);
    return NextResponse.json(
      {
        jobId: job.id,
        status: started.status,
        workspaceRevision: job.workspaceRevision,
        eventsUrl: `/api/chats/${chatId}/coding-jobs/${job.id}/events`,
        createdAt: job.createdAt.toISOString(),
      },
      { status: 202 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "OpenCode could not start the coding job.",
        details: error instanceof Error ? error.message : undefined,
        jobId: job.id,
        status: "failed",
      },
      { status: 502 },
    );
  }
}
