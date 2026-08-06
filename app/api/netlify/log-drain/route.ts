import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

type NormalizedLogRecord = {
  source: string;
  level: string | null;
  requestMethod: string | null;
  requestPath: string | null;
  responseStatus: number | null;
  responseSize: number | null;
  errorMessage: string | null;
  message: string | null;
  metadata: Record<string, unknown>;
  timestamp: Date;
};

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function parseTimestamp(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value > 10_000_000_000 ? value : value * 1000);
  }

  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return new Date(numeric > 10_000_000_000 ? numeric : numeric * 1000);
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

function normalizePath(value: string | null) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return value;
  }
}

function getNestedString(
  record: Record<string, unknown>,
  objectKey: string,
  valueKey: string,
) {
  const nested = record[objectKey];
  if (!nested || typeof nested !== "object") return null;
  return firstString((nested as Record<string, unknown>)[valueKey]);
}

function getNestedNumber(
  record: Record<string, unknown>,
  objectKey: string,
  valueKey: string,
) {
  const nested = record[objectKey];
  if (!nested || typeof nested !== "object") return null;
  return firstNumber((nested as Record<string, unknown>)[valueKey]);
}

function normalizeRecord(input: unknown): NormalizedLogRecord | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;

  const status = firstNumber(
    record.status,
    record.status_code,
    record.response_status,
    record.responseStatus,
    record.httpStatus,
    getNestedNumber(record, "response", "status"),
    getNestedNumber(record, "response", "statusCode"),
  );
  const message = firstString(record.message, record.msg, record.line);
  const level = firstString(record.level, record.severity)?.toUpperCase() ?? null;
  const explicitError = firstString(
    record.error,
    record.errorMessage,
    record.exception,
  );
  const errorMessage =
    explicitError || (status && status >= 500 ? message : null);

  return {
    source:
      firstString(record.source, record.type, record.logType, record.service) ||
      "netlify",
    level,
    requestMethod: firstString(
      record.method,
      record.request_method,
      record.httpMethod,
      getNestedString(record, "request", "method"),
      getNestedString(record, "http", "method"),
    )?.toUpperCase() ?? null,
    requestPath: normalizePath(
      firstString(
        record.path,
        record.url,
        record.request_path,
        record.requestUrl,
        getNestedString(record, "request", "path"),
        getNestedString(record, "request", "url"),
      ),
    ),
    responseStatus: status,
    responseSize: firstNumber(
      record.response_size,
      record.responseSize,
      record.content_length,
      record.bytes,
      record.size,
      getNestedNumber(record, "response", "bytes"),
      getNestedNumber(record, "response", "bytesSent"),
    ),
    errorMessage,
    message,
    metadata: record,
    timestamp: parseTimestamp(
      record.timestamp ??
        record.ts ??
        record.date ??
        record["@timestamp"] ??
        record.logged_at,
    ),
  };
}

async function parseLogDrainBody(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  const text = await request.text();
  if (!text.trim()) return [];

  if (
    contentType.includes("application/x-ndjson") ||
    contentType.includes("application/ndjson")
  ) {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as unknown];
        } catch {
          return [];
        }
      });
  }

  const parsed = JSON.parse(text) as unknown;
  if (Array.isArray(parsed)) return parsed;
  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { logs?: unknown }).logs)
  ) {
    return (parsed as { logs: unknown[] }).logs;
  }
  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { data?: unknown }).data)
  ) {
    return (parsed as { data: unknown[] }).data;
  }
  return [parsed];
}

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.NETLIFY_LOG_DRAIN_SECRET?.trim();
  if (!configuredSecret) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Set NETLIFY_LOG_DRAIN_SECRET before enabling the Netlify log drain.",
        },
        { status: 503 },
      ),
    };
  }

  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const headerSecret = request.headers.get("x-siteliyo-log-secret")?.trim();
  const querySecret = request.nextUrl.searchParams.get("secret")?.trim();

  if (
    bearer === configuredSecret ||
    headerSecret === configuredSecret ||
    querySecret === configuredSecret
  ) {
    return { ok: true };
  }

  return {
    ok: false,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}

export async function POST(request: NextRequest) {
  const authorized = isAuthorized(request);
  if (!authorized.ok) return authorized.response;

  const chatId = request.nextUrl.searchParams.get("chatId")?.trim();
  if (!chatId) {
    return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
  }

  const prisma = getPrisma();
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { id: true },
  });
  if (!chat) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let records: NormalizedLogRecord[];
  try {
    records = (await parseLogDrainBody(request))
      .map(normalizeRecord)
      .filter((record): record is NormalizedLogRecord => Boolean(record));
  } catch {
    return NextResponse.json({ error: "Invalid log payload" }, { status: 400 });
  }

  const limitedRecords = records.slice(0, 500);
  if (limitedRecords.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  await prisma.$transaction(
    limitedRecords.map((record) =>
      prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "ProjectLog" (
            "id",
            "chatId",
            "source",
            "level",
            "requestMethod",
            "requestPath",
            "responseStatus",
            "responseSize",
            "errorMessage",
            "message",
            "metadata",
            "timestamp"
          )
          VALUES (
            ${crypto.randomUUID()},
            ${chatId},
            ${record.source},
            ${record.level},
            ${record.requestMethod},
            ${record.requestPath},
            ${record.responseStatus},
            ${record.responseSize},
            ${record.errorMessage},
            ${record.message},
            ${JSON.stringify(record.metadata)}::jsonb,
            ${record.timestamp}
          )
        `,
      ),
    ),
  );

  await prisma.$executeRaw(
    Prisma.sql`
      DELETE FROM "ProjectLog"
      WHERE "chatId" = ${chatId}
        AND "timestamp" < ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
    `,
  );

  return NextResponse.json({ ok: true, inserted: limitedRecords.length });
}
