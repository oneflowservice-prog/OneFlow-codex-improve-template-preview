import { NextRequest, NextResponse } from "next/server";
import { appendCodingEvent } from "@/lib/coding/events";
import { authorizeProjectRequest } from "@/lib/coding/project-access";
import { getPrisma } from "@/lib/prisma";
import { abortOpenCodeCodingJob } from "@/lib/opencode/jobs";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; jobId: string }>;
};

async function getAuthorizedJob(
  request: NextRequest,
  context: RouteContext,
  capability: "read" | "edit",
) {
  const { id: chatId, jobId } = await context.params;
  const authorization = await authorizeProjectRequest(
    request,
    chatId,
    capability,
  );
  if (!authorization.ok) return authorization;

  const job = await getPrisma().codingJob.findFirst({
    where: { id: jobId, chatId },
  });
  if (!job) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Coding job not found" },
        { status: 404 },
      ),
    };
  }
  return { ok: true as const, job };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const result = await getAuthorizedJob(request, context, "read");
  if (!result.ok) return result.response;

  return NextResponse.json({
    jobId: result.job.id,
    status: result.job.status,
    workspaceRevision: result.job.workspaceRevision,
    openCodeSessionId: result.job.openCodeSessionId,
    error: result.job.error,
    cancelRequestedAt: result.job.cancelRequestedAt,
    startedAt: result.job.startedAt,
    completedAt: result.job.completedAt,
    createdAt: result.job.createdAt,
    updatedAt: result.job.updatedAt,
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const result = await getAuthorizedJob(request, context, "edit");
  if (!result.ok) return result.response;

  if (["completed", "failed", "cancelled"].includes(result.job.status)) {
    return NextResponse.json(
      { jobId: result.job.id, status: result.job.status },
      { status: 200 },
    );
  }

  const now = new Date();
  const updated = await getPrisma().codingJob.update({
    where: { id: result.job.id },
    data: { status: "cancelling", cancelRequestedAt: now },
    select: { id: true, status: true, openCodeSessionId: true },
  });
  await appendCodingEvent(updated.id, "job.cancelling", {
    requestedAt: now.toISOString(),
  });

  if (updated.openCodeSessionId) {
    try {
      await abortOpenCodeCodingJob({
        sessionId: updated.openCodeSessionId,
        workspaceId: result.job.workspaceId,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: "OpenCode cancellation could not be confirmed.",
          details: error instanceof Error ? error.message : undefined,
          jobId: updated.id,
          status: updated.status,
        },
        { status: 502 },
      );
    }
  }

  const cancelledAt = new Date();
  const cancelled = await getPrisma().codingJob.update({
    where: { id: updated.id },
    data: { status: "cancelled", completedAt: cancelledAt },
    select: { id: true, status: true },
  });
  await appendCodingEvent(cancelled.id, "job.cancelled", {
    completedAt: cancelledAt.toISOString(),
  });

  return NextResponse.json(
    { jobId: cancelled.id, status: cancelled.status },
    { status: 200 },
  );
}
