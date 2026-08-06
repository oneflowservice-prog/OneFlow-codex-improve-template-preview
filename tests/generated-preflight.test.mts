import assert from "node:assert/strict";
import test from "node:test";
// Node's native TypeScript runner requires the explicit extension.
// @ts-expect-error TypeScript disallows it unless allowImportingTsExtensions is global.
import { validateGeneratedWorkspace } from "../lib/generated-preflight.ts";

const baseFiles = [
  {
    path: "package.json",
    content: JSON.stringify({ dependencies: { next: "latest", react: "latest" } }),
  },
  {
    path: "app/layout.tsx",
    content: "export default function Layout({ children }) { return children; }",
  },
];

test("rejects the scaffold marker instead of publishing a blank preview", () => {
  const diagnostics = validateGeneratedWorkspace(
    [
      ...baseFiles,
      {
        path: "app/page.tsx",
        content: `/* SITELIYO_MISSING_GENERATED_PAGE */
          export default function Page() { return <main />; }`,
      },
    ],
    "nextjs",
  );

  assert.equal(
    diagnostics.some(
      (item) => item.category === "structure" && item.file === "app/page.tsx",
    ),
    true,
  );
});

test("ignores browser-global words inside strings and comments", () => {
  const diagnostics = validateGeneratedWorkspace(
    [
      ...baseFiles,
      {
        path: "lib/constants.ts",
        content: `
          // document and window are ordinary words here.
          export const description = "Managed document review";
          export const note = 'Open a browser window';
        `,
      },
    ],
    "nextjs",
  );

  assert.equal(
    diagnostics.some((item) => item.category === "boundary"),
    false,
  );
});

test("still rejects executable browser-global access in server modules", () => {
  const diagnostics = validateGeneratedWorkspace(
    [
      ...baseFiles,
      {
        path: "lib/constants.ts",
        content: "export const title = document.title;",
      },
    ],
    "nextjs",
  );

  assert.equal(
    diagnostics.some(
      (item) =>
        item.category === "boundary" && item.file === "lib/constants.ts",
    ),
    true,
  );
});

test("reports invalid computed JSX tags before the remote build", () => {
  const diagnostics = validateGeneratedWorkspace(
    [
      ...baseFiles,
      {
        path: "app/practice-areas/page.tsx",
        content: `
          const icons = { corporate: () => null };
          export default function Page() {
            const name = "corporate";
            return <icons[name] className="size-6" />;
          }
        `,
      },
    ],
    "nextjs",
  );

  const syntaxError = diagnostics.find((item) => item.category === "syntax");
  assert.equal(syntaxError?.file, "app/practice-areas/page.tsx");
  assert.equal(syntaxError?.line, 5);
  assert.equal(typeof syntaxError?.column, "number");
  assert.match(syntaxError?.details || "", /^Syntax error:/);
});

test("accepts a computed component assigned to a capitalized variable", () => {
  const diagnostics = validateGeneratedWorkspace(
    [
      ...baseFiles,
      {
        path: "app/practice-areas/page.tsx",
        content: `
          const icons = { corporate: () => null };
          export default function Page() {
            const Icon = icons.corporate;
            return <Icon className="size-6" />;
          }
        `,
      },
    ],
    "nextjs",
  );

  assert.equal(
    diagnostics.some((item) => item.category === "syntax"),
    false,
  );
});

test("reports an unrepaired Button asChild contract mismatch immediately", () => {
  const diagnostics = validateGeneratedWorkspace(
    [
      ...baseFiles,
      {
        path: "components/ui/Button.tsx",
        content: `interface ButtonProps { children?: unknown }
          export function Button(props: ButtonProps) { return <button>{props.children}</button>; }`,
      },
      {
        path: "components/Header.tsx",
        content: `export function Header() { return <Button asChild><a href="/">Home</a></Button>; }`,
      },
    ],
    "nextjs",
  );

  assert.equal(
    diagnostics.some(
      (item) =>
        item.file === "components/ui/Button.tsx" &&
        item.details.includes("asChild/Slot contract"),
    ),
    true,
  );
});
