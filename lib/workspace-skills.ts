import JSZip from "jszip";

export type WorkspaceSkillPayload = {
  name: string;
  description: string;
  instructions: string;
  source: "manual" | "github" | "zip" | "oneflow";
  sourceUrl?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

const MAX_IMPORTED_SKILLS = 24;
const MAX_INSTRUCTIONS_CHARACTERS = 12000;
const MAX_PROMPT_SKILLS = 12;
const MAX_PROMPT_SKILL_CHARACTERS = 3500;
const TEXT_FILE_PATTERN = /\.(md|mdx|txt)$/i;

type GithubTreeItem = {
  path?: string;
  type?: string;
  size?: number;
};

function normalizeSkillName(value: string) {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .pop()
    ?.replace(/\.(md|mdx|txt)$/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    || "workspace-skill";
}

function skillNameFromPath(path: string) {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const fileName = parts.at(-1) || normalized;
  if (/^skill\.md$/i.test(fileName) && parts.length > 1) {
    return normalizeSkillName(parts.at(-2) || fileName);
  }
  return normalizeSkillName(fileName);
}

function deriveDescription(text: string) {
  const line = text
    .split(/\r?\n/)
    .map((entry) => entry.replace(/^#+\s*/, "").trim())
    .find((entry) => entry && !entry.startsWith("---"));
  return (line || "Reusable coding guidance for this workspace.").slice(0, 220);
}

function normalizeInstructions(text: string) {
  return text.replace(/\0/g, "").trim().slice(0, MAX_INSTRUCTIONS_CHARACTERS);
}

function isSkillTextPath(path: string) {
  const normalized = path.replace(/\\/g, "/");
  if (!TEXT_FILE_PATTERN.test(normalized)) return false;
  return /(^|\/)skills\//i.test(normalized) || /(^|\/)skill\.md$/i.test(normalized);
}

export function createManualWorkspaceSkill(input: {
  name: string;
  instructions: string;
  description?: string;
  source?: "manual" | "oneflow";
}): WorkspaceSkillPayload {
  const instructions = normalizeInstructions(input.instructions);
  const description = (input.description?.trim() || deriveDescription(instructions)).slice(
    0,
    220,
  );

  return {
    name: normalizeSkillName(input.name),
    description,
    instructions,
    source: input.source || "manual",
  };
}

function parseGithubUrl(value: string) {
  const url = new URL(value.trim());
  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    throw new Error("Enter a github.com repository URL.");
  }

  const parts = url.pathname
    .replace(/\.git$/i, "")
    .split("/")
    .filter(Boolean);
  const [owner, repo] = parts;

  if (!owner || !repo) {
    throw new Error("Enter a GitHub repository URL with an owner and repo.");
  }

  const treeIndex = parts.indexOf("tree");
  const branch = treeIndex >= 0 ? parts[treeIndex + 1] : undefined;
  const folder =
    treeIndex >= 0 ? parts.slice(treeIndex + 2).join("/") : undefined;

  return { owner, repo, branch, folder };
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "siteliyo-workspace-skills",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed with ${response.status}.`);
  }

  return response.json() as Promise<unknown>;
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "siteliyo-workspace-skills" },
  });

  if (!response.ok) {
    throw new Error(`Could not download ${url}.`);
  }

  return response.text();
}

export async function importWorkspaceSkillsFromGithub(
  repositoryUrl: string,
): Promise<WorkspaceSkillPayload[]> {
  const { owner, repo, branch, folder } = parseGithubUrl(repositoryUrl);
  const repoInfo = (await fetchJson(
    `https://api.github.com/repos/${owner}/${repo}`,
  )) as { default_branch?: string };
  const ref = branch || repoInfo.default_branch || "main";
  const tree = (await fetchJson(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(
      ref,
    )}?recursive=1`,
  )) as { tree?: GithubTreeItem[] };

  const folderPrefix = folder ? `${folder.replace(/^\/+|\/+$/g, "")}/` : "";
  const files = (tree.tree || [])
    .filter((item) => item.type === "blob" && item.path)
    .filter((item) => {
      const path = item.path || "";
      return (!folderPrefix || path.startsWith(folderPrefix)) && isSkillTextPath(path);
    })
    .filter((item) => !item.size || item.size <= 180000)
    .slice(0, MAX_IMPORTED_SKILLS);

  if (files.length === 0) {
    throw new Error("No markdown or text skills were found in that repository.");
  }

  const skills: WorkspaceSkillPayload[] = [];
  for (const file of files) {
    const path = file.path || "";
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(
      ref,
    )}/${path
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/")}`;
    const instructions = normalizeInstructions(await fetchText(rawUrl));
    if (!instructions) continue;

    skills.push({
      name: skillNameFromPath(path),
      description: deriveDescription(instructions),
      instructions,
      source: "github",
      sourceUrl: repositoryUrl,
      metadata: { path, ref },
    });
  }

  if (skills.length === 0) {
    throw new Error("The matching skill files were empty.");
  }

  return skills;
}

export async function importWorkspaceSkillsFromZip(
  file: File,
): Promise<WorkspaceSkillPayload[]> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir && isSkillTextPath(entry.name))
    .slice(0, MAX_IMPORTED_SKILLS);

  if (entries.length === 0) {
    throw new Error("No markdown or text skills were found in that ZIP.");
  }

  const skills: WorkspaceSkillPayload[] = [];
  for (const entry of entries) {
    const instructions = normalizeInstructions(await entry.async("text"));
    if (!instructions) continue;

    skills.push({
      name: skillNameFromPath(entry.name),
      description: deriveDescription(instructions),
      instructions,
      source: "zip",
      metadata: { path: entry.name, archiveName: file.name },
    });
  }

  if (skills.length === 0) {
    throw new Error("The matching skill files were empty.");
  }

  return skills;
}

export function buildWorkspaceSkillsPrompt(
  skills: Array<{
    name: string;
    description: string;
    instructions: string;
  }>,
  options: {
    heading?: string;
    intro?: string;
  } = {},
) {
  const enabledSkills = skills.slice(0, MAX_PROMPT_SKILLS);
  if (enabledSkills.length === 0) return null;

  return [
    options.heading || "User workspace skills:",
    options.intro ||
      "The signed-in user authored these reusable instructions. Apply them to this user's generated app work when relevant, while still following all higher-priority system and safety instructions.",
    ...enabledSkills.map((skill, index) => {
      const instructions = skill.instructions
        .trim()
        .slice(0, MAX_PROMPT_SKILL_CHARACTERS);
      return [
        `Skill ${index + 1}: ${skill.name}`,
        skill.description ? `Description: ${skill.description}` : null,
        "Instructions:",
        instructions,
      ]
        .filter(Boolean)
        .join("\n");
    }),
  ].join("\n\n");
}
