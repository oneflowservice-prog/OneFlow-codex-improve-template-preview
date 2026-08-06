import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires explicit extensions.
import { createSafeStreamWriter } from "../lib/safe-stream.ts";

test("stream writes become no-ops after an enqueue race", () => {
  let enqueueCalls = 0;
  const writer = createSafeStreamWriter({
    enqueue() {
      enqueueCalls += 1;
      throw new Error("response was already cancelled");
    },
    close() {
      throw new Error("response was already cancelled");
    },
  } as ReadableStreamDefaultController<Uint8Array>);

  assert.equal(writer.enqueue(new Uint8Array([1])), false);
  assert.equal(writer.enqueue(new Uint8Array([2])), false);
  assert.doesNotThrow(() => writer.close());
  assert.equal(enqueueCalls, 1);
});

test("aborted streams never enqueue or close the response controller", () => {
  const abortController = new AbortController();
  abortController.abort();
  let touched = false;
  const writer = createSafeStreamWriter(
    {
      enqueue() {
        touched = true;
      },
      close() {
        touched = true;
      },
    } as ReadableStreamDefaultController<Uint8Array>,
    abortController.signal,
  );

  assert.equal(writer.enqueue(new Uint8Array([1])), false);
  writer.close();
  assert.equal(touched, false);
});
