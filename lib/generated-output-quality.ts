export type GeneratedOutputIssue = {
  title: string;
  detail: string;
  repairInstruction: string;
};

export function analyzeGeneratedOutputCompleteness(
  content: string,
  files: Map<string, string>,
): GeneratedOutputIssue[] {
  const issues: GeneratedOutputIssue[] = [];
  const packageJson = files.get("package.json") || "";
  const isNextProject =
    /["']next["']\s*:/.test(packageJson) ||
    files.has("next.config.js") ||
    files.has("next.config.mjs") ||
    files.has("next.config.ts") ||
    files.has("app/globals.css") ||
    files.has("src/app/globals.css");

  if (isNextProject) {
    const hasPage = files.has("app/page.tsx") || files.has("src/app/page.tsx");
    const hasLayout =
      files.has("app/layout.tsx") || files.has("src/app/layout.tsx");

    if (!hasPage) {
      issues.push({
        title: "Missing Next.js entry page",
        detail:
          "The generated output declares a Next.js app but does not contain app/page.tsx or src/app/page.tsx, so the preview would be empty.",
        repairInstruction:
          "Emit a complete, polished app/page.tsx now. It must render the requested product UI and must not be an empty main element or placeholder.",
      });
    }

    if (!hasLayout) {
      issues.push({
        title: "Missing Next.js root layout",
        detail:
          "The generated output declares a Next.js app but does not contain app/layout.tsx or src/app/layout.tsx.",
        repairInstruction:
          "Emit app/layout.tsx with the required html/body shell and app/globals.css import.",
      });
    }
  }

  const fenceCount = content.match(/```/g)?.length || 0;
  if (fenceCount % 2 !== 0) {
    issues.push({
      title: "Truncated generated output",
      detail:
        "The response ended inside a file fence, so later application files were not saved.",
      repairInstruction:
        "Finish the app with complete file fences. Prioritize the runnable entry page and layout before optional components, routes, or UI primitives.",
    });
  }

  return issues;
}
