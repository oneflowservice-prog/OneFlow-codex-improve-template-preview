const { cpSync, existsSync, mkdirSync, readdirSync, rmSync } = require("node:fs");
const { dirname, join } = require("node:path");

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");

if (!existsSync(standaloneDir)) {
  throw new Error("Missing .next/standalone. Did Next.js build with output: 'standalone'?");
}

function removeIfExists(path) {
  rmSync(path, { recursive: true, force: true });
}

function pruneGeneratedFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = join(dir, entry.name);

    if (
      entry.name === ".env" ||
      entry.name.startsWith(".env.") ||
      entry.name.endsWith(".log") ||
      entry.name.endsWith(".tsbuildinfo") ||
      entry.name.endsWith(".zip") ||
      entry.name.endsWith(".tar") ||
      entry.name.endsWith(".tgz") ||
      entry.name.endsWith(".md") ||
      (entry.name.startsWith("test-") && entry.name.endsWith(".js"))
    ) {
      removeIfExists(entryPath);
      continue;
    }

    if (entry.isDirectory() && entry.name !== "node_modules") {
      pruneGeneratedFiles(entryPath);
    }
  }
}

for (const entry of [
  "documentation",
  ".git",
  ".github",
  ".vscode",
  ".idea",
  ".vercel",
  ".railway",
  ".railpack",
  ".cursor",
  ".next/cache",
]) {
  removeIfExists(join(standaloneDir, entry));
}

pruneGeneratedFiles(standaloneDir);

const copies = [
  ["public", join(standaloneDir, "public")],
  [join(".next", "static"), join(standaloneDir, ".next", "static")],
  [join("vendor", "impeccable"), join(standaloneDir, "vendor", "impeccable")],
  [join("vendor", "taste-skill"), join(standaloneDir, "vendor", "taste-skill")],
  [join("vendor", "astryx"), join(standaloneDir, "vendor", "astryx")],
  [
    join("vendor", "agentic-awesome-skills"),
    join(standaloneDir, "vendor", "agentic-awesome-skills"),
  ],
  [
    join("vendor", "firebase-agent-skills"),
    join(standaloneDir, "vendor", "firebase-agent-skills"),
  ],
];

for (const [src, dest] of copies) {
  const sourcePath = join(root, src);

  if (!existsSync(sourcePath)) {
    continue;
  }

  mkdirSync(dirname(dest), { recursive: true });
  cpSync(sourcePath, dest, { recursive: true, force: true });
}
