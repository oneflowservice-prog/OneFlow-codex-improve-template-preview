import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { appendCodingEvent } from "@/lib/coding/events";
import { authorizeProjectRequest } from "@/lib/coding/project-access";
import { ensureProjectWorkspace } from "@/lib/coding/workspace";
import { getPrisma } from "@/lib/prisma";
import { getOpenCodeRuntimeConfig } from "@/lib/opencode/config";
import {
  ensureOpenCodeCodingJobMonitor,
  startOpenCodeCodingJob,
} from "@/lib/opencode/jobs";
import { getWebbyBuilderWorkspaceFiles } from "@/lib/webby-builder-preview";
import { createSafeStreamWriter } from "@/lib/safe-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 1800;

const requestSchema = z.object({
  messageId: z.string().trim().min(1),
  model: z.string().trim().min(1).max(200).optional(),
});

const encoder = new TextEncoder();
const activeStatuses = [
  "queued",
  "running",
  "agent_completed",
  "validating",
  "previewing",
  "cancelling",
];

function sseData(value: unknown) {
  return encoder.encode(`data: ${JSON.stringify(value)}\n\n`);
}

function codingJobErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (!error || typeof error !== "object") return fallback;
  const record = error as Record<string, unknown>;
  return typeof record.message === "string" && record.message.trim()
    ? record.message.trim()
    : fallback;
}

function requestIdFor(request: NextRequest) {
  const candidate = request.headers.get("x-client-request-id")?.trim();
  return candidate && /^[a-zA-Z0-9_-]{8,100}$/.test(candidate)
    ? candidate
    : randomUUID();
}

function logCompletionStream(
  level: "info" | "warn" | "error",
  event: string,
  fields: Record<string, unknown>,
) {
  const payload = { event, ...fields };
  if (level === "error") {
    console.error("[completion-stream]", payload);
  } else if (level === "warn") {
    console.warn("[completion-stream]", payload);
  } else {
    console.info("[completion-stream]", payload);
  }
}

export async function POST(request: NextRequest) {
  const requestId = requestIdFor(request);
  const requestStartedAt = Date.now();
  const responseHeaders = { "X-Request-ID": requestId };

  if (!(await getOpenCodeRuntimeConfig())) {
    logCompletionStream("warn", "runtime_not_configured", { requestId });
    return new Response(
      `Webby Builder is not configured. Diagnostic ID: ${requestId}`,
      { status: 503, headers: responseHeaders },
    );
  }

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    logCompletionStream("warn", "invalid_request", {
      requestId,
      issues: parsed.error.issues.map((issue) => issue.path.join(".")),
    });
    return new Response("Invalid OpenCode generation request.", {
      status: 400,
      headers: responseHeaders,
    });
  }

  logCompletionStream("info", "request_received", {
    requestId,
    messageId: parsed.data.messageId,
    requestedModel: parsed.data.model || null,
  });

  const prisma = getPrisma();
  const message = await prisma.message.findUnique({
    where: { id: parsed.data.messageId },
    select: { id: true, chatId: true, content: true },
  });
  if (!message) {
    logCompletionStream("warn", "message_not_found", {
      requestId,
      messageId: parsed.data.messageId,
    });
    return new Response("Prompt message not found.", {
      status: 404,
      headers: responseHeaders,
    });
  }

  const authorization = await authorizeProjectRequest(
    request,
    message.chatId,
    "edit",
  );
  if (!authorization.ok) return authorization.response;

  // If this exact message already has a coding job (e.g. the client
  // reconnected after a page reload mid-generation), reattach to it instead
  // of starting a brand-new generation from scratch. Only failed/cancelled
  // jobs are not reusable — those fall through to creating a fresh job.
  const existingJobForMessage = await prisma.codingJob.findFirst({
    where: { messageId: message.id },
    orderBy: { createdAt: "desc" },
  });
  const reusableJob =
    existingJobForMessage &&
    !["failed", "cancelled"].includes(existingJobForMessage.status)
      ? existingJobForMessage
      : null;

  if (!reusableJob) {
    // Only block on jobs actively running for OTHER messages in this chat.
    // A job tied to this exact message is handled by the reuse path above.
    const activeJob = await prisma.codingJob.findFirst({
      where: {
        chatId: message.chatId,
        status: { in: activeStatuses },
        messageId: { not: message.id },
      },
      select: { id: true },
    });
    if (activeJob) {
      logCompletionStream("warn", "active_job_conflict", {
        requestId,
        chatId: message.chatId,
        activeJobId: activeJob.id,
      });
      return new Response(
        "A coding job is already active for this project.",
        {
          status: 409,
          headers: responseHeaders,
        },
      );
    }
  }

  const workspace = await ensureProjectWorkspace(message.chatId);
  const job =
    reusableJob ||
    (await prisma.codingJob.create({
      data: {
        chatId: message.chatId,
        requestedByUserId: authorization.value.userId,
        messageId: message.id,
        prompt: message.content,
        model: parsed.data.model || authorization.value.project.model,
        workspaceId: workspace.workspaceId,
        workspaceRevision: workspace.revision,
        status: "queued",
      },
    }));

  if (!reusableJob) {
    await appendCodingEvent(job.id, "job.started", {
      status: "queued",
      workspaceId: workspace.workspaceId,
      workspaceRevision: workspace.revision,
    });
  }

  logCompletionStream("info", reusableJob ? "job_reattached" : "job_queued", {
    requestId,
    chatId: message.chatId,
    messageId: message.id,
    jobId: job.id,
    jobStatus: job.status,
    workspaceId: workspace.workspaceId,
    elapsedMs: Date.now() - requestStartedAt,
  });

  let cancelStream = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        let cursor = 0;
        let agentResponse = "";
        const writer = createSafeStreamWriter(controller, request.signal);
        cancelStream = writer.cancel;
        try {
          // Flush the SSE response before remote OpenCode startup. This prevents
          // reverse proxies from turning a slow health/session handshake into 502.
          writer.enqueue(
            sseData({
              type: "opencode-event",
              event: {
                sequence: 0,
                eventType: "job.accepted",
                payload: { requestId, jobId: job.id },
                createdAt: new Date().toISOString(),
              },
            }),
          );
          logCompletionStream("info", "stream_opened", {
            requestId,
            jobId: job.id,
            elapsedMs: Date.now() - requestStartedAt,
          });

          try {
            // A reused job (still queued/running, or already completed) was
            // already started by an earlier request — starting it again
            // would re-run the generation from scratch. Only start jobs
            // that are brand-new for this message.
            if (!reusableJob || job.status === "queued") {
              await startOpenCodeCodingJob(job.id);
            } else if (activeStatuses.includes(job.status)) {
              // A reattached active job has no live monitor if its original
              // request/stream died (page reload, dropped connection, server
              // restart). Without a monitor it would sit "running" forever —
              // the permanent stuck state with no preview. No-op when a
              // monitor is already running in this process.
              void ensureOpenCodeCodingJobMonitor(job.id).catch((error) => {
                logCompletionStream("warn", "monitor_reattach_failed", {
                  requestId,
                  jobId: job.id,
                  error: codingJobErrorMessage(error, "Monitor reattach failed"),
                });
              });
            }
            logCompletionStream("info", "job_started", {
              requestId,
              jobId: job.id,
              reused: !!reusableJob,
              elapsedMs: Date.now() - requestStartedAt,
            });
          } catch (error) {
            const errorMessage = codingJobErrorMessage(
              error,
              "OpenCode could not start.",
            );
            logCompletionStream("error", "job_start_failed", {
              requestId,
              chatId: message.chatId,
              jobId: job.id,
              elapsedMs: Date.now() - requestStartedAt,
              error: errorMessage,
              stack: error instanceof Error ? error.stack : undefined,
            });
            writer.enqueue(
              sseData({
                type: "opencode-error",
                error: `${errorMessage} Diagnostic ID: ${requestId}`,
                status: "failed",
                requestId,
                jobId: job.id,
                phase: "startup",
              }),
            );
            writer.enqueue(encoder.encode("data: [DONE]\n\n"));
            return;
          }

          while (!writer.isClosed()) {
            const [events, currentJob] = await Promise.all([
              prisma.codingEvent.findMany({
                where: { jobId: job.id, sequence: { gt: cursor } },
                orderBy: { sequence: "asc" },
                take: 100,
              }),
              prisma.codingJob.findUnique({
                where: { id: job.id },
                select: { status: true, error: true },
              }),
            ]);

            for (const event of events) {
              cursor = event.sequence;
              if (
                event.type === "agent.response" &&
                event.payload &&
                typeof event.payload === "object" &&
                typeof (event.payload as Record<string, unknown>).text ===
                  "string"
              ) {
                agentResponse = (event.payload as Record<string, string>).text;
              }
              if (
                !writer.enqueue(
                  sseData({
                    type: "opencode-event",
                    event: {
                      sequence: event.sequence,
                      eventType: event.type,
                      payload: event.payload,
                      createdAt: event.createdAt.toISOString(),
                    },
                  }),
                )
              )
                return;
            }

            if (currentJob?.status === "completed") {
              const planOnly =
                message.content.startsWith("__PLAN_REQUEST__:") ||
                message.content.startsWith("__PLAN_ANSWERS__:");
              const workspaceFiles = planOnly
                ? []
                : await getWebbyBuilderWorkspaceFiles(job.workspaceId);
              const reply =
                agentResponse ||
                (planOnly
                  ? "Your project plan is ready — take a look and tell me what you'd like to adjust."
                  : `All done! Your app is built, validated, and running in the preview — ${workspaceFiles.length} files are in place. Open the preview to try it, and tell me what you'd like to improve next.`);
              writer.enqueue(
                sseData({
                  type: "opencode-result",
                  text: reply,
                  files: workspaceFiles.map((file) => ({
                    path: file.path,
                    code: file.content,
                  })),
                }),
              );
              writer.enqueue(
                sseData({ choices: [{ delta: { content: reply } }] }),
              );
              writer.enqueue(encoder.encode("data: [DONE]\n\n"));
              logCompletionStream("info", "stream_completed", {
                requestId,
                jobId: job.id,
                elapsedMs: Date.now() - requestStartedAt,
                fileCount: workspaceFiles.length,
              });
              break;
            }
            if (
              currentJob &&
              ["failed", "cancelled"].includes(currentJob.status)
            ) {
              const message =
                currentJob.status === "cancelled"
                  ? "OpenCode job was cancelled."
                  : codingJobErrorMessage(
                      currentJob.error,
                      "OpenCode job failed.",
                    );
              writer.enqueue(
                sseData({
                  type: "opencode-error",
                  error: `${message} Diagnostic ID: ${requestId}`,
                  status: currentJob.status,
                  requestId,
                  jobId: job.id,
                  phase: "execution",
                }),
              );
              writer.enqueue(encoder.encode("data: [DONE]\n\n"));
              logCompletionStream("warn", "job_ended_without_result", {
                requestId,
                jobId: job.id,
                status: currentJob.status,
                error: message,
                elapsedMs: Date.now() - requestStartedAt,
              });
              break;
            }

            if (!writer.enqueue(encoder.encode(": heartbeat\n\n"))) return;
            await new Promise((resolve) => setTimeout(resolve, 750));
          }
        } catch (error) {
          logCompletionStream("error", "stream_failed", {
            requestId,
            jobId: job.id,
            elapsedMs: Date.now() - requestStartedAt,
            error: codingJobErrorMessage(error, "Unknown stream failure"),
            stack: error instanceof Error ? error.stack : undefined,
          });
          if (!writer.isClosed()) {
            writer.enqueue(
              sseData({
                type: "opencode-error",
                error:
                  codingJobErrorMessage(
                    error,
                    "The generation stream ended unexpectedly.",
                  ) + ` Diagnostic ID: ${requestId}`,
                status: "failed",
                requestId,
                jobId: job.id,
              }),
            );
            writer.enqueue(encoder.encode("data: [DONE]\n\n"));
          }
        } finally {
          writer.close();
        }
      })();
    },
    cancel() {
      cancelStream();
      logCompletionStream("info", "stream_cancelled", {
        requestId,
        jobId: job.id,
        elapsedMs: Date.now() - requestStartedAt,
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
      "X-Request-ID": requestId,
    },
  });
}
