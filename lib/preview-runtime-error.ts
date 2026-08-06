const ERROR_HEADING_PATTERN =
  /\b(?:server error|unhandled runtime error|application error|build error)\b/i;
const ERROR_DETAIL_PATTERN =
  /\b(?:error:|cannot find module|module not found|typeerror|referenceerror|syntaxerror)\b/i;
const COMPACT_ERROR_COUNT_PATTERN = /\b(\d+)\s+errors?\b/i;

export function classifyPreviewRuntimeError({
  text,
  hasNextOverlay,
}: {
  text: string;
  hasNextOverlay: boolean;
}) {
  const normalized = text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) return null;

  const hasErrorHeading = ERROR_HEADING_PATTERN.test(normalized);
  const hasErrorDetail = ERROR_DETAIL_PATTERN.test(normalized);

  if ((hasNextOverlay || hasErrorHeading) && hasErrorDetail) {
    return normalized.length > 12_000
      ? `${normalized.slice(0, 12_000)}\n…`
      : normalized;
  }

  // Next's collapsed development overlay can expose only a badge such as
  // "1 error". Require the overlay to avoid matching ordinary application copy.
  if (hasNextOverlay) {
    const count = normalized.match(COMPACT_ERROR_COUNT_PATTERN)?.[1];
    if (count) {
      return `Next.js reported ${count} preview ${count === "1" ? "error" : "errors"}. Open the preview error details and fix the underlying application issue.`;
    }
  }

  return null;
}
