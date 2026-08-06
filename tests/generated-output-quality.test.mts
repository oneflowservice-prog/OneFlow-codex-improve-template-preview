import assert from "node:assert/strict";
import test from "node:test";
// Node's native TypeScript runner requires the explicit extension.
// @ts-expect-error TypeScript disallows it unless allowImportingTsExtensions is global.
import { analyzeGeneratedOutputCompleteness } from "../lib/generated-output-quality.ts";

test("detects a truncated Next.js response before it becomes a blank preview", () => {
  const files = new Map([
    ["package.json", JSON.stringify({ dependencies: { next: "latest" } })],
    ["app/globals.css", "@tailwind utilities;"],
    ["components/ui/button.tsx", "export function Button() { return null; }"],
  ]);
  const issues = analyzeGeneratedOutputCompleteness(
    "STATE 4\n```tsx file=components/ui/button.tsx\nexport function Button() {",
    files,
  );
  const titles = issues.map((issue) => issue.title);

  assert.ok(titles.includes("Missing Next.js entry page"));
  assert.ok(titles.includes("Missing Next.js root layout"));
  assert.ok(titles.includes("Truncated generated output"));
});

test("accepts complete core Next.js output", () => {
  const files = new Map([
    ["package.json", JSON.stringify({ dependencies: { next: "latest" } })],
    ["app/layout.tsx", "export default function Layout({ children }) { return children; }"],
    ["app/page.tsx", "export default function Page() { return <main>Ready</main>; }"],
    ["app/globals.css", "@tailwind utilities;"],
  ]);

  assert.deepEqual(
    analyzeGeneratedOutputCompleteness("```tsx\ncomplete\n```", files),
    [],
  );
});
