import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Helper function to parse fence tag for language and path
function parseFenceTag(tag: string): { language: string; path: string } {
  const raw = tag || "";
  const langMatch = raw.match(/^([A-Za-z0-9]+)/);
  const language = langMatch ? langMatch[1] : "text";
  const pathMatch = raw.match(/(?:\{\s*)?path\s*=\s*([^}\s]+)(?:\s*\})?/);
  const filenameMatch = raw.match(
    /(?:\{\s*)?filename\s*=\s*([^}\s]+)(?:\s*\})?/,
  );
  const path = pathMatch
    ? pathMatch[1]
    : filenameMatch
      ? filenameMatch[1]
      : `file.${getExtensionForLanguage(language)}`;
  return { language, path };
}

export function extractFirstCodeBlock(input: string) {
  // 1) We use a more general pattern for the code fence:
  //    - ^```([^\n]*) captures everything after the triple backticks up to the newline.
  //    - ([\s\S]*?) captures the *body* of the code block (non-greedy).
  //    - Then we look for a closing backticks on its own line (\n```).
  // The 'm' (multiline) flag isn't strictly necessary here, but can help if input is multiline.
  // The '([\s\S]*?)' is a common trick to match across multiple lines non-greedily.
  const match = input.match(/```([^\n]*)\n([\s\S]*?)\n```/);

  if (match) {
    const fenceTag = match[1] || ""; // e.g. "tsx{filename=Calculator.tsx}"
    const code = match[2]; // The actual code block content
    const fullMatch = match[0]; // Entire matched string including backticks

    // We'll parse the fenceTag to extract optional language and filename
    let language: string | null = null;
    let filename: { name: string; extension: string } | null = null;

    // Attempt to parse out the language, which we assume is the leading alphanumeric part
    // Example: fenceTag = "tsx{filename=Calculator.tsx}"
    const langMatch = fenceTag.match(/^([A-Za-z0-9]+)/);
    if (langMatch) {
      language = langMatch[1];
    }

    // Attempt to parse out a filename from braces, e.g. {filename=Calculator.tsx}
    const fileMatch = fenceTag.match(/{\s*filename\s*=\s*([^}]+)\s*}/);
    if (fileMatch) {
      filename = parseFileName(fileMatch[1]);
    }

    return { code, language, filename, fullMatch };
  }
  return null; // No code block found
}

export function extractAllCodeBlocks(input: string): Array<{
  code: string;
  language: string;
  path: string;
  fullMatch: string;
}> {
  const codeBlockRegex = /```([^\n]*)\n([\s\S]*?)\n```/g;
  const files: Array<{
    code: string;
    language: string;
    path: string;
    fullMatch: string;
  }> = [];

  let match;
  while ((match = codeBlockRegex.exec(input)) !== null) {
    const fenceTag = match[1] || ""; // e.g. "tsx{path=src/App.tsx}"
    const code = match[2]; // The actual code block content
    const fullMatch = match[0]; // Entire matched string including backticks

    // Parse language and path
    const { language, path } = parseFenceTag(fenceTag);

    files.push({ code, language, path, fullMatch });
  }

  return files;
}

function parseFileName(fileName: string): { name: string; extension: string } {
  // Split the string at the last dot
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1) {
    // No dot found
    return { name: fileName, extension: "" };
  }
  return {
    name: fileName.slice(0, lastDotIndex),
    extension: fileName.slice(lastDotIndex + 1),
  };
}

// New: Parse an assistant reply into ordered text and file segments.
// Supports multiple files per reply and interleaved text. Streaming-safe: returns
// a partial file segment if the closing fence hasn't arrived yet.
export type ReplySegment =
  | { type: "text"; content: string }
  | {
      type: "file";
      code: string;
      language: string;
      path: string;
      isPartial: boolean;
    };

export function parseReplySegments(markdown: string): ReplySegment[] {
  const segments: ReplySegment[] = [];
  const normalized = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  // Streaming providers sometimes include extra whitespace around fences.
  const fenceRegex = /^\s*```([^\n`]*)\s*$/; // opening or closing fence line

  let textBuffer: string[] = [];
  let codeBuffer: string[] = [];
  let openTag: string | null = null; // e.g. tsx{path=src/App.tsx}

  const flushText = () => {
    if (textBuffer.length > 0) {
      segments.push({ type: "text", content: textBuffer.join("\n") });
      textBuffer = [];
    }
  };

  const parseTag = parseFenceTag;

  for (const line of lines) {
    const match = line.match(fenceRegex);
    if (match && !openTag) {
      // Opening fence
      openTag = (match[1] || "").trim();
      flushText();
      codeBuffer = [];
    } else if (match && openTag) {
      // Closing fence
      const { language, path } = parseTag(openTag);
      segments.push({
        type: "file",
        code: codeBuffer.join("\n"),
        language,
        path,
        isPartial: false,
      });
      openTag = null;
      codeBuffer = [];
    } else if (openTag) {
      codeBuffer.push(line);
    } else {
      textBuffer.push(line);
    }
  }

  // If a code fence remains open, emit a partial file segment
  if (openTag) {
    const { language, path } = parseTag(openTag);
    segments.push({
      type: "file",
      code: codeBuffer.join("\n"),
      language,
      path,
      isPartial: true,
    });
  } else {
    flushText();
  }

  return segments.filter(
    (r) => r.type !== "text" || (r.type === "text" && r.content.length > 0),
  );
}

function splitThinkingAndContent(input: string): { content: string; thoughts: string } {
  const tagRegex = /<\/?(think|thinking)\b[^>]*>/gi;
  const visibleParts: string[] = [];
  const thoughtParts: string[] = [];

  let depth = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(input)) !== null) {
    const segment = input.slice(lastIndex, match.index);
    if (segment) {
      if (depth > 0) {
        thoughtParts.push(segment);
      } else {
        visibleParts.push(segment);
      }
    }

    const tagText = match[0];
    const isClosing = tagText.startsWith("</");
    if (isClosing) {
      depth = Math.max(0, depth - 1);
    } else {
      depth += 1;
    }

    lastIndex = tagRegex.lastIndex;
  }

  const tail = input.slice(lastIndex);
  if (tail) {
    if (depth > 0) {
      thoughtParts.push(tail);
    } else {
      visibleParts.push(tail);
    }
  }

  return {
    content: visibleParts.join(""),
    thoughts: thoughtParts.join(""),
  };
}

export function stripThinkingContent(input: string): string {
  return splitThinkingAndContent(input).content;
}

export function extractThinkingContent(input: string): string {
  return splitThinkingAndContent(input).thoughts;
}

// Enhanced filename generation for when models don't provide filenames
export function generateIntelligentFilename(
  content: string,
  language: string,
): { name: string; extension: string } {
  // Try to extract filename from common patterns in the content
  const patterns = [
    /export\s+default\s+(?:function\s+)?(\w+)/i,
    /function\s+(\w+)\s*\(/i,
    /const\s+(\w+)\s*=\s*\(/i,
    /class\s+(\w+)/i,
    /component\s*:\s*(\w+)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const name = match[1];
      // Convert to kebab-case
      const kebabName = name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
      return { name: kebabName, extension: getExtensionForLanguage(language) };
    }
  }

  // Fallback to generic names based on language
  return { name: `component`, extension: getExtensionForLanguage(language) };
}

export function getExtensionForLanguage(language: string): string {
  const extensions: Record<string, string> = {
    javascript: "js",
    js: "js",
    typescript: "tsx",
    ts: "ts",
    tsx: "tsx",
    jsx: "jsx",
    python: "py",
    py: "py",
    html: "html",
    css: "css",
    json: "json",
    markdown: "md",
    md: "md",
    sql: "sql",
    bash: "sh",
    sh: "sh",
    yaml: "yaml",
    yml: "yml",
  };

  return extensions[language.toLowerCase()] || "txt";
}

export function getLanguageOfFile(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase();
  const languages: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    tsx: "typescript",
    jsx: "javascript",
    py: "python",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    sql: "sql",
    sh: "shell",
    yaml: "yaml",
    yml: "yaml",
  };
  return languages[extension || ""] || "plaintext";
}

export function getMonacoLanguage(language: string): string {
  const map: Record<string, string> = {
    js: "javascript",
    javascript: "javascript",
    ts: "typescript",
    typescript: "typescript",
    tsx: "typescript",
    jsx: "javascript",
    py: "python",
    python: "python",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    markdown: "markdown",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    yaml: "yaml",
    yml: "yaml",
  };
  return map[language.toLowerCase()] || "plaintext";
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toTitleCase(rawName: string): string {
  // Split on one or more hyphens or underscores
  const parts = rawName.split(/[-_]+/);

  // Capitalize each part and join them back with spaces
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

const PROJECT_TITLE_MINOR_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

const PROJECT_TITLE_ACRONYMS: Record<string, string> = {
  ai: "AI",
  api: "API",
  b2b: "B2B",
  b2c: "B2C",
  cms: "CMS",
  crm: "CRM",
  erp: "ERP",
  faq: "FAQ",
  hr: "HR",
  ios: "iOS",
  pos: "POS",
  saas: "SaaS",
  seo: "SEO",
  sql: "SQL",
  ui: "UI",
  ux: "UX",
};

function formatProjectTitleToken(
  token: string,
  index: number,
  total: number,
): string {
  const normalized = token.toLowerCase();
  const acronym = PROJECT_TITLE_ACRONYMS[normalized];
  if (acronym) {
    return acronym;
  }

  if (
    index > 0 &&
    index < total - 1 &&
    PROJECT_TITLE_MINOR_WORDS.has(normalized)
  ) {
    return normalized;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function generateProjectTitleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return "New Project";

  const primarySegment =
    trimmed
      .split(/[\n\r.!?]+/)
      .map((segment) => segment.trim())
      .find(Boolean) ?? trimmed;

  let candidate = primarySegment
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ");

  candidate = candidate.replace(
    /^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+|help\s+me\s+|i\s+(?:want|need)\s+(?:to\s+)?|let'?s\s+|we\s+need\s+to\s+|i'?m\s+building\s+|i\s+am\s+building\s+|make\s+me\s+|build\s+me\s+)*(?:create|build|make|design|generate|develop|craft|prototype|spin\s+up)\s+/i,
    "",
  );
  candidate = candidate.replace(
    /^(?:please\s+)?(?:make|build|create|design|generate|develop|craft)\s+(?:me\s+)?(?:an?|the)\s+/i,
    "",
  );
  candidate = candidate.replace(
    /^(?:i\s+(?:want|need)\s+|i'd\s+like\s+)(?:an?|the)\s+/i,
    "",
  );
  candidate = candidate.replace(/^(?:an?|the)\s+/i, "");
  candidate = candidate.replace(/\s+(?:please|for\s+me)$/i, "");
  candidate = candidate.replace(/[,:;]+$/g, "").trim();

  const words = candidate
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}&/+.-]+$/gu, ""))
    .filter(Boolean);

  if (words.length === 0) return "New Project";

  const shortenedWords = words.slice(0, 6);
  return shortenedWords
    .map((word, index) =>
      formatProjectTitleToken(word, index, shortenedWords.length),
    )
    .join(" ");
}
