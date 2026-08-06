const NEXT_NOT_FOUND_PATTERNS = [
  /<title>\s*404(?::|\s|<)/i,
  /name=["']next-error["'][^>]*content=["']not-found["']/i,
  /NEXT_HTTP_ERROR_FALLBACK;404/i,
  /["']statusCode["']\s*:\s*404/i,
];

const NEXT_ERROR_PATTERNS = [
  /unhandled runtime error/i,
  /failed to compile/i,
  /__next_error__/i,
];

export function inspectWebbyPreviewProbe(input: {
  status: number;
  contentType: string;
  body: string;
}) {
  if (input.status < 200 || input.status >= 300) {
    return { ready: false, reason: `http_${input.status}` } as const;
  }

  if (!input.contentType.toLowerCase().includes("text/html")) {
    return { ready: false, reason: "non_html_response" } as const;
  }

  if (NEXT_NOT_FOUND_PATTERNS.some((pattern) => pattern.test(input.body))) {
    return { ready: false, reason: "next_not_found" } as const;
  }

  if (NEXT_ERROR_PATTERNS.some((pattern) => pattern.test(input.body))) {
    return { ready: false, reason: "next_error" } as const;
  }

  if (!/<(?:html|body)(?:\s|>)/i.test(input.body)) {
    return { ready: false, reason: "incomplete_html" } as const;
  }

  return { ready: true, reason: "ready" } as const;
}
