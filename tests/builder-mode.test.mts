import assert from "node:assert/strict";
import test from "node:test";
// Node's native TypeScript runner requires the explicit extension.
// @ts-expect-error TypeScript disallows it unless allowImportingTsExtensions is global.
import {
  inferBuilderModeFromFiles,
  resolveBuilderModeFromMessages,
} from "../lib/builder-mode.ts";

test("keeps the project stack from its original user message", () => {
  assert.equal(
    resolveBuilderModeFromMessages([
      { role: "user", files: { builderMode: "nextjs" } },
      { role: "assistant", files: null },
      { role: "user", files: { screenshotUrl: "https://example.com/ui.png" } },
    ]),
    "nextjs",
  );
});

test("App Router files force the Next.js preview runtime", () => {
  assert.equal(
    inferBuilderModeFromFiles([
      {
        path: "app/globals.css",
        content: "@tailwind utilities;",
      },
      {
        path: "data/properties.ts",
        content: "export const properties = [];",
      },
    ]),
    "nextjs",
  );
});

test("src App Router files force the Next.js preview runtime", () => {
  assert.equal(
    inferBuilderModeFromFiles([
      {
        path: "src/app/layout.tsx",
        content: "export default function Layout({ children }) { return children; }",
      },
    ]),
    "nextjs",
  );
});

test("ordinary Vite files remain on the React runtime", () => {
  assert.equal(
    inferBuilderModeFromFiles([
      {
        path: "src/App.tsx",
        content: "export default function App() { return null; }",
      },
    ]),
    "react",
  );
});
