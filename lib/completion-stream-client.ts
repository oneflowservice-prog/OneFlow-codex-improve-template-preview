export async function requestCompletionStream(input: {
  messageId: string;
  model: string;
  source: string;
  isFree?: boolean;
}) {
  const clientRequestId = crypto.randomUUID();
  const startedAt = performance.now();

  console.info("[completion-stream]", {
    event: "request_started",
    clientRequestId,
    messageId: input.messageId,
    model: input.model,
    source: input.source,
  });

  let response: Response;
  try {
    response = await fetch("/api/get-next-completion-stream-promise", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Request-ID": clientRequestId,
      },
      body: JSON.stringify({
        messageId: input.messageId,
        model: input.model,
        ...(input.isFree === undefined ? {} : { isFree: input.isFree }),
      }),
    });
  } catch (error) {
    console.error("[completion-stream]", {
      event: "request_failed",
      clientRequestId,
      messageId: input.messageId,
      source: input.source,
      elapsedMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const requestId = response.headers.get("x-request-id") || clientRequestId;
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[completion-stream]", {
      event: "http_error",
      clientRequestId,
      requestId,
      messageId: input.messageId,
      source: input.source,
      status: response.status,
      elapsedMs: Math.round(performance.now() - startedAt),
      response: body || "(empty body)",
    });
    throw new Error(
      body ||
        `Failed to start generation (HTTP ${response.status}). Diagnostic ID: ${requestId}`,
    );
  }

  if (!response.body) {
    console.error("[completion-stream]", {
      event: "missing_response_body",
      clientRequestId,
      requestId,
      messageId: input.messageId,
      source: input.source,
      status: response.status,
    });
    throw new Error(`No body on response. Diagnostic ID: ${requestId}`);
  }

  console.info("[completion-stream]", {
    event: "stream_connected",
    clientRequestId,
    requestId,
    messageId: input.messageId,
    source: input.source,
    status: response.status,
    elapsedMs: Math.round(performance.now() - startedAt),
  });
  return response.body;
}
