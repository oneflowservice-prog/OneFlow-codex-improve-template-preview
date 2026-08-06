import { readFileSync } from "node:fs";
import { join } from "node:path";

let cachedTailwindBrowserScript: string | undefined;

export function getTailwindBrowserScript() {
  if (cachedTailwindBrowserScript !== undefined) {
    return cachedTailwindBrowserScript;
  }

  try {
    const scriptBuffer = readFileSync(
      join(
        /* turbopackIgnore: true */ process.cwd(),
        "lib",
        "preview-browser",
        "tailwindcss-browser.js",
      ),
    );
    cachedTailwindBrowserScript =
      scriptBuffer[0] === 0xff && scriptBuffer[1] === 0xfe
        ? scriptBuffer.toString("utf16le").replace(/^\uFEFF/, "")
        : scriptBuffer.toString("utf8").replace(/^\uFEFF/, "");
  } catch {
    cachedTailwindBrowserScript = "";
  }

  return cachedTailwindBrowserScript;
}
