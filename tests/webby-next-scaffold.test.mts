import assert from "node:assert/strict";
import test from "node:test";
// Node's native TypeScript runner requires the explicit extension.
// @ts-expect-error TypeScript disallows it unless allowImportingTsExtensions is global.
import {
  createNextStarterFiles,
  ensureNextStarterScaffold,
  getNextAppDirectory,
  mergeNextStarterFiles,
} from "../lib/webby-next-scaffold.ts";
// @ts-expect-error Node's native TypeScript runner requires explicit extensions.
import { getNextPreviewConfigChanges } from "../lib/webby-next-preview-config.ts";

test("replaces generated Next config with the mounted preview config", () => {
  assert.deepEqual(
    getNextPreviewConfigChanges({
      "next.config.js": "module.exports = { reactStrictMode: true };",
      "app/page.tsx": "export default function Page() { return null; }",
    }).map(({ operation, path }) => ({ operation, path })),
    [
      { operation: "write", path: "next.config.mjs" },
      { operation: "delete", path: "next.config.js" },
    ],
  );
});
// @ts-expect-error Node's native TypeScript runner requires the explicit extension.
import { validateGeneratedWorkspace } from "../lib/generated-preflight.ts";

test("provides a complete create-next-app-style starter before generation", () => {
  const files = createNextStarterFiles();

  assert.ok(files["package.json"]);
  assert.ok(files["tsconfig.json"]);
  assert.ok(files["next-env.d.ts"]);
  assert.ok(files["app/layout.tsx"]);
  assert.ok(files["app/page.tsx"]);
  assert.ok(files["app/globals.css"]);
  assert.doesNotMatch(files["app/page.tsx"], /SITELIYO_MISSING_GENERATED_PAGE/);
  assert.match(files["app/page.tsx"], /Your app is ready/);
  assert.deepEqual(
    validateGeneratedWorkspace(
      Object.entries(files).map(([path, content]) => ({ path, content })),
      "nextjs",
    ),
    [],
  );
});

test("adds the required root App Router scaffold", () => {
  const files = ensureNextStarterScaffold({
    "app/page.tsx": "export default function Page() { return null; }",
  });

  assert.equal(getNextAppDirectory(files), "app");
  assert.ok(files["app/layout.tsx"]);
  assert.ok(files["app/globals.css"]);
  assert.equal(files["src/app/layout.tsx"], undefined);
});

test("keeps a src App Router project in src", () => {
  const files = ensureNextStarterScaffold({
    "src/app/page.tsx": "export default function Page() { return null; }",
  });

  assert.equal(getNextAppDirectory(files), "src/app");
  assert.ok(files["src/app/layout.tsx"]);
  assert.ok(files["src/app/globals.css"]);
  assert.equal(files["app/layout.tsx"], undefined);
});

test("preserves generated scaffold files", () => {
  const layout = "export default function Layout({ children }) { return children; }";
  const page = "export default function Page() { return <main>Generated</main>; }";
  const css = "body { color: rebeccapurple; }";
  const files = ensureNextStarterScaffold({
    "app/layout.tsx": layout,
    "app/page.tsx": page,
    "app/globals.css": css,
  });

  assert.equal(files["app/layout.tsx"], layout);
  assert.equal(files["app/page.tsx"], page);
  assert.equal(files["app/globals.css"], css);
});

test("chooses one tree when malformed output contains both", () => {
  const files = ensureNextStarterScaffold({
    "app/page.tsx": "export default function RootPage() { return null; }",
    "src/app/page.tsx": "export default function SrcPage() { return null; }",
  });

  assert.equal(getNextAppDirectory(files), "app");
  assert.ok(files["app/layout.tsx"]);
  assert.equal(files["src/app/layout.tsx"], undefined);
});

test("marks a synthesized empty page so preview validation cannot accept it", () => {
  const files = ensureNextStarterScaffold({
    "app/globals.css": "@tailwind utilities;",
  });

  assert.match(
    files["app/page.tsx"],
    /SITELIYO_MISSING_GENERATED_PAGE/,
  );
});

test("progressively edits the root scaffold without replacing its infrastructure", () => {
  const page = "export default function Page() { return <main>Generated</main>; }";
  const files = mergeNextStarterFiles({ "app/page.tsx": page });

  assert.equal(files["app/page.tsx"], page);
  assert.ok(files["app/layout.tsx"]);
  assert.ok(files["package.json"]);
  assert.deepEqual(
    validateGeneratedWorkspace(
      Object.entries(files).map(([path, content]) => ({ path, content })),
      "nextjs",
    ),
    [],
  );
});

test("progressive src/app output moves the scaffold into the same tree", () => {
  const page = "export default function Page() { return <main>src</main>; }";
  const files = mergeNextStarterFiles({ "src/app/page.tsx": page });
  const tsconfig = JSON.parse(files["tsconfig.json"]);

  assert.equal(files["src/app/page.tsx"], page);
  assert.ok(files["src/app/layout.tsx"]);
  assert.equal(files["app/page.tsx"], undefined);
  assert.deepEqual(tsconfig.compilerOptions.paths, { "@/*": ["./src/*"] });
});

test("progressive merges preserve explicit generated configuration", () => {
  const packageJson = JSON.stringify({
    scripts: { build: "next build --no-lint" },
    dependencies: { next: "15.5.0" },
  });
  const files = mergeNextStarterFiles({
    "package.json": packageJson,
    "app/page.tsx": "export default function Page() { return null; }",
  });

  assert.equal(files["package.json"], packageJson);
});
