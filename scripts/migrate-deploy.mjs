import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function readLocalEnv(name) {
  if (!existsSync(".env")) return undefined;
  const prefix = `${name}=`;
  const line = readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(prefix));
  if (!line) return undefined;
  const value = line.slice(prefix.length).trim();
  return value.replace(/^(["'])(.*)\1$/, "$2");
}

function migrationUrl() {
  const configured =
    process.env.DIRECT_URL ||
    readLocalEnv("DIRECT_URL") ||
    process.env.DATABASE_URL ||
    readLocalEnv("DATABASE_URL");
  if (!configured) {
    throw new Error("DIRECT_URL or DATABASE_URL is required for migrations.");
  }

  const url = new URL(configured);
  if (url.hostname.includes("-pooler.")) {
    url.hostname = url.hostname.replace("-pooler.", ".");
  }
  return url.toString();
}

const pnpmCli = process.env.npm_execpath;
const command = pnpmCli ? process.execPath : "pnpm";
const args = pnpmCli
  ? [pnpmCli, "exec", "prisma", "migrate", "deploy"]
  : ["exec", "prisma", "migrate", "deploy"];
const result = spawnSync(command, args, {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: migrationUrl() },
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
