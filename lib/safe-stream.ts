export function createSafeStreamWriter<T>(
  controller: ReadableStreamDefaultController<T>,
  signal?: AbortSignal,
) {
  let closed = false;

  const isClosed = () => closed || Boolean(signal?.aborted);

  const enqueue = (chunk: T) => {
    if (isClosed()) return false;
    try {
      controller.enqueue(chunk);
      return true;
    } catch {
      closed = true;
      return false;
    }
  };

  const close = () => {
    if (closed) return;
    closed = true;
    if (signal?.aborted) return;
    try {
      controller.close();
    } catch {
      // Cancellation can win the race between the last enqueue and close.
    }
  };

  const cancel = () => {
    closed = true;
  };

  return { enqueue, close, cancel, isClosed };
}
