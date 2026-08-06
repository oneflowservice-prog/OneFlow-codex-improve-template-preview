import { NextRequest } from "next/server";
import { authorizeProjectRequest } from "@/lib/coding/project-access";
import { serializeCodingEvent } from "@/lib/coding/events";
import { getPrisma } from "@/lib/prisma";
import { createSafeStreamWriter } from "@/lib/safe-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RouteContext = {
  params: Promise<{ id: string; jobId: string }>;
};

const encoder = new TextEncoder();
const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

function sseMessage(event: ReturnType<typeof serializeCodingEvent>) {
  return encoder.encode(
    `id: ${event.sequence}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id: chatId, jobId } = await context.params;
  const authorization = await authorizeProjectRequest(request, chatId, "read");
  if (!authorization.ok) return authorization.response;

  const prisma = getPrisma();
  const job = await prisma.codingJob.findFirst({
    where: { id: jobId, chatId },
    select: { id: true },
  });
  if (!job) return new Response("Coding job not found", { status: 404 });

  const headerSequence = Number.parseInt(
    request.headers.get("last-event-id") || "0",
    10,
  );
  const querySequence = Number.parseInt(
    request.nextUrl.searchParams.get("after") || "0",
    10,
  );
  let cursor = Math.max(
    Number.isFinite(headerSequence) ? headerSequence : 0,
    Number.isFinite(querySequence) ? querySequence : 0,
  );

  let cancelStream = () => {};
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const deadline = Date.now() + 25_000;
      const writer = createSafeStreamWriter(controller, request.signal);
      cancelStream = writer.cancel;
      try {
        while (!writer.isClosed() && Date.now() < deadline) {
          const [events, currentJob] = await Promise.all([
            prisma.codingEvent.findMany({
              where: { jobId, sequence: { gt: cursor } },
              orderBy: { sequence: "asc" },
              take: 100,
            }),
            prisma.codingJob.findUnique({
              where: { id: jobId },
              select: { status: true },
            }),
          ]);

          for (const event of events) {
            const serialized = serializeCodingEvent(event);
            cursor = event.sequence;
            if (!writer.enqueue(sseMessage(serialized))) return;
          }

          if (currentJob && TERMINAL_STATUSES.has(currentJob.status)) break;
          if (!writer.enqueue(encoder.encode(": heartbeat\n\n"))) return;
          await new Promise((resolve) => setTimeout(resolve, 750));
        }
      } catch (error) {
        writer.enqueue(
          encoder.encode(
            `event: stream.error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : "Event stream failed" })}\n\n`,
          ),
        );
      } finally {
        writer.close();
      }
    },
    cancel() {
      cancelStream();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
