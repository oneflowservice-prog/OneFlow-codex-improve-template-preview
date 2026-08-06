export type PreviewStatusEventLike = {
  status: string;
  jobId?: string;
  previewUrl?: string;
  error?: string;
  cacheHit?: boolean;
};

/**
 * Builds the deduplication key for a preview status event. Two events with the
 * same key are considered duplicates and only the first is reported upstream.
 * Distinct statuses, jobs, URLs, errors, or cache hits must produce distinct
 * keys so a later "ready"/"error" event is never swallowed by an earlier one.
 */
export function getPreviewStatusEventKey(
  event: PreviewStatusEventLike,
): string {
  return JSON.stringify([
    event.status,
    event.jobId || "",
    event.previewUrl || "",
    event.error || "",
    Boolean(event.cacheHit),
  ]);
}
