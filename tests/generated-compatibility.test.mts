import assert from "node:assert/strict";
import test from "node:test";
// Node's native TypeScript runner requires the explicit extension.
// @ts-expect-error TypeScript disallows it unless allowImportingTsExtensions is global.
import {
  buildPreviewUtilsModule,
  repairToastCompatibility,
} from "../lib/generated-compatibility.ts";

test("repairs missing useToast exports and prop-compatible toasters", () => {
  const files: Record<string, string> = {
    "app/page.tsx": `import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/sonner";
export default function Page() {
  useToast();
  return <Toaster position="top-right" toastOptions={{ className: "toast" }} />;
}`,
    "components/ui/use-toast.tsx": "export const toast = () => null;",
    "components/ui/sonner.tsx": "export function Toaster() { return null; }",
  };

  assert.equal(repairToastCompatibility(files), 2);
  assert.match(files["components/ui/use-toast.tsx"], /export function useToast/);
  assert.match(files["components/ui/sonner.tsx"], /props: ToasterProps/);
  assert.equal(files["src/components/ui/use-toast.tsx"], undefined);
});

test("repairs toast modules inside a src-only workspace", () => {
  const files: Record<string, string> = {
    "src/app/page.tsx": `import { Toaster } from "@/components/ui/toaster";
export default function Page() { return <Toaster />; }`,
  };

  assert.equal(repairToastCompatibility(files), 1);
  assert.ok(files["src/components/ui/toaster.tsx"]);
  assert.equal(files["components/ui/toaster.tsx"], undefined);
});

test("repairs an existing relative use-toast module in a mixed workspace", () => {
  const files: Record<string, string> = {
    "app/page.tsx": "export default function Page() { return null; }",
    "src/components/ui/toaster.tsx": `import { useToast } from "./use-toast";
export function Toaster() { useToast(); return null; }`,
    "src/components/ui/use-toast.ts": "export const toast = () => null;",
  };

  assert.equal(repairToastCompatibility(files), 2);
  assert.match(files["src/components/ui/use-toast.ts"], /export function useToast/);
  assert.match(files["components/ui/use-toast.tsx"], /export function useToast/);
});

test("preview utils export the generated formatting contract", () => {
  const content = buildPreviewUtilsModule();

  for (const exportName of [
    "cn",
    "formatCurrency",
    "formatNumber",
    "formatPercent",
    "formatDate",
  ]) {
    assert.match(content, new RegExp(`export function ${exportName}\\b`));
  }
  assert.doesNotMatch(content, /return "N\/A"/);
});
