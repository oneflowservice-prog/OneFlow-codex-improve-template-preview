import "server-only";

import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

export const CODING_EVENT_TYPES = [
  "job.started",
  "job.progress",
  "workspace.ready",
  "agent.connected",
  "agent.thinking",
  "agent.todos",
  "agent.response",
  "agent.completed",
  "file.created",
  "file.updated",
  "file.deleted",
  "command.started",
  "command.completed",
  "validation.started",
  "validation.completed",
"preview.starting",
"preview.ready",
"preview.failed",
"preview.repairing",
  "job.completed",
  "job.failed",
  "job.cancelling",
  "job.cancelled",
] as const;

export type CodingEventType = (typeof CODING_EVENT_TYPES)[number];

export async function appendCodingEvent(
  jobId: string,
  type: CodingEventType,
  payload?: Prisma.InputJsonValue,
) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const job = await tx.codingJob.update({
      where: { id: jobId },
      data: { eventSequence: { increment: 1 } },
      select: { eventSequence: true },
    });

    return tx.codingEvent.create({
      data: {
        jobId,
        sequence: job.eventSequence,
        type,
        payload: payload ?? undefined,
      },
    });
  });
}

export function serializeCodingEvent(event: {
  id: string;
  sequence: number;
  type: string;
  payload: Prisma.JsonValue | null;
  createdAt: Date;
}) {
  return {
    id: event.id,
    sequence: event.sequence,
    type: event.type,
    payload: event.payload,
    createdAt: event.createdAt.toISOString(),
  };
}
