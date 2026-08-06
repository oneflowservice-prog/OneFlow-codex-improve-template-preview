import "server-only";

import path from "node:path";
import type { OpenCodeRuntimeConfig } from "@/lib/opencode/config";
import { assertWorkspaceId } from "@/lib/coding/workspace";
import {
  buildDesignAuthorityPrompt,
  type DesignAuthority,
} from "@/lib/design-authority";
import {
  buildSiteliyoFirebasePlatformPrompt,
  promptNeedsFirebaseSkills,
} from "@/lib/firebase-agent-skills-core";

type OpenCodeSession = {
  id: string;
  directory?: string;
  title?: string;
};

type OpenCodeHealth = { healthy: boolean; version: string };
type OpenCodeMessage = {
  info?: { role?: string };
  parts?: Array<{ type?: string; text?: string }>;
};

function buildOpenCodeBuildPermissions(workspaceDirectory: string) {
  const workspacePattern = `${workspaceDirectory}/**`;

  return [
    { permission: "question", action: "deny", pattern: "*" },
    { permission: "plan_enter", action: "deny", pattern: "*" },
    { permission: "plan_exit", action: "deny", pattern: "*" },

    { permission: "external_directory", action: "deny", pattern: "*" },
    {
      permission: "external_directory",
      action: "allow",
      pattern: workspacePattern,
    },
    {
      permission: "external_directory",
      action: "allow",
      pattern: `${workspaceDirectory}/.opencode/skills/**`,
    },
    {
      permission: "external_directory",
      action: "allow",
      pattern: `${workspaceDirectory}/.agents/**`,
    },
    {
      permission: "external_directory",
      action: "allow",
      // Scaffolding (create-next-app, tar staging) happens in /tmp inside the
      // per-workspace sandbox; it cannot reach host/webby servers.
      pattern: "/tmp/**",
    },
    {
      permission: "external_directory",
      action: "allow",
      pattern: "/root/.local/share/opencode/tool/output/**",
    },

    { permission: "read", action: "allow", pattern: "*" },
    { permission: "edit", action: "allow", pattern: "*" },
    { permission: "glob", action: "allow", pattern: "*" },
    { permission: "grep", action: "allow", pattern: "*" },
    { permission: "list", action: "allow", pattern: "*" },
    { permission: "lsp", action: "allow", pattern: "*" },
    { permission: "task", action: "allow", pattern: "*" },
    { permission: "skill", action: "allow", pattern: "*" },
    { permission: "webfetch", action: "allow", pattern: "*" },
    { permission: "websearch", action: "allow", pattern: "*" },
    { permission: "doom_loop", action: "allow", pattern: "*" },
    { permission: "todowrite", action: "allow", pattern: "*" },
    { permission: "todoread", action: "allow", pattern: "*" },

    { permission: "bash", action: "allow", pattern: "*" },
    { permission: "bash", action: "deny", pattern: "sudo *" },
    { permission: "bash", action: "deny", pattern: "su *" },
    { permission: "bash", action: "deny", pattern: "chmod *" },
    { permission: "bash", action: "deny", pattern: "chown *" },
    { permission: "bash", action: "deny", pattern: "mount *" },
    { permission: "bash", action: "deny", pattern: "umount *" },
    { permission: "bash", action: "deny", pattern: "systemctl *" },
    { permission: "bash", action: "deny", pattern: "service *" },
    { permission: "bash", action: "deny", pattern: "pm2 *" },
    { permission: "bash", action: "deny", pattern: "docker *" },
    { permission: "bash", action: "deny", pattern: "kill *" },
    { permission: "bash", action: "deny", pattern: "killall *" },
    { permission: "bash", action: "deny", pattern: "pkill *" },
    { permission: "bash", action: "deny", pattern: "git push*" },
    { permission: "bash", action: "deny", pattern: "vercel *" },
    { permission: "bash", action: "deny", pattern: "netlify *" },
  ];
}

export class OpenCodeApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "OpenCodeApiError";
  }
}

export function getOpenCodeWorkspaceDirectory(workspaceId: string) {
  return path.posix.join(
    "/app/storage/workspaces",
    assertWorkspaceId(workspaceId),
  );
}

export class OpenCodeClient {
  constructor(private readonly config: OpenCodeRuntimeConfig) {}

  private async request<T>(
    apiPath: string,
    init: RequestInit = {},
    directory?: string,
  ): Promise<T> {
    const signal = AbortSignal.timeout(this.config.requestTimeoutMs);
    const response = await fetch(`${this.config.baseUrl}${apiPath}`, {
      ...init,
      signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "X-Server-Key": this.config.serverKey,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(directory ? { "x-opencode-directory": directory } : {}),
        ...init.headers,
      },
    });

    if (!response.ok) {
      const details = await response
        .json()
        .catch(async () => response.text().catch(() => ""));
      throw new OpenCodeApiError(
        `OpenCode request failed with ${response.status}`,
        response.status,
        details,
      );
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  health() {
    return this.request<OpenCodeHealth>("/global/health");
  }

  getSession(sessionId: string, directory: string) {
    return this.request<OpenCodeSession>(
      `/session/${encodeURIComponent(sessionId)}`,
      {},
      directory,
    );
  }

  getMessages(sessionId: string, directory: string) {
    return this.request<OpenCodeMessage[]>(
      `/session/${encodeURIComponent(sessionId)}/message?limit=20`,
      {},
      directory,
    );
  }

  setProviderAuth(providerId: string, apiKey: string) {
    return this.request<boolean>(`/auth/${encodeURIComponent(providerId)}`, {
      method: "PUT",
      body: JSON.stringify({ type: "api", key: apiKey }),
    });
  }

  disposeInstance(directory: string) {
    return this.request<boolean>(
      "/instance/dispose",
      { method: "POST" },
      directory,
    );
  }

  createSession(input: { title: string; directory: string }) {
    return this.request<OpenCodeSession>(
      "/session",
      {
        method: "POST",
        body: JSON.stringify({
          title: input.title,
          permission: buildOpenCodeBuildPermissions(input.directory),
        }),
      },
      input.directory,
    );
  }

  promptAsync(input: {
    sessionId: string;
    directory: string;
    prompt: string;
    model?: string | null;
    builderMode?: "react" | "nextjs";
    screenshotUrl?: string;
    agent?: "build" | "plan";
    designAuthority?: DesignAuthority;
  }) {
    const separator = input.model?.indexOf("/") ?? -1;
    const modelParts =
      input.model && separator > 0
        ? [input.model.slice(0, separator), input.model.slice(separator + 1)]
        : null;
    const designAuthorityPrompt = buildDesignAuthorityPrompt(
      input.designAuthority || "none",
    );
    // Only inject the Firebase platform context when the request actually
    // involves a backend; otherwise it biases every turn toward Firebase.
    const firebasePlatformPrompt = promptNeedsFirebaseSkills(input.prompt)
      ? buildSiteliyoFirebasePlatformPrompt()
      : null;
    return this.request<void>(
      `/session/${encodeURIComponent(input.sessionId)}/prompt_async`,
      {
        method: "POST",
        body: JSON.stringify({
          agent: input.agent || "build",
          ...(modelParts
            ? { model: { providerID: modelParts[0], modelID: modelParts[1] } }
            : {}),
          parts: [
            ...(input.screenshotUrl
              ? [
                  {
                    type: "file",
                    mime: "image/png",
                    url: input.screenshotUrl,
                    filename: "design-reference",
                  },
                ]
              : []),
            {
              type: "text",
              text: [
                "OneFlow project context:",
                input.builderMode === "react"
                  ? "- This workspace is a React + TypeScript + Vite application."
                  : "- This workspace is a Next.js App Router + TypeScript application.",
                "- Edit the current workspace directly; Webby Builder owns builds and the persistent preview server.",
                "- The workspace is already a fully scaffolded, working app. NEVER scaffold a new project (no create-next-app, create-vite, npm init, or shadcn init) and never run interactive CLIs; they hang this non-interactive session and would replace the app with a default starter page.",
                "- Never run package installs (npm install / pnpm add / npx setup commands), dev servers, or builds. Write the code and imports directly; the host resolves dependencies and builds the preview.",
                "- Keep package.json, tsconfig.json, postcss/tailwind/next config files unchanged unless the request explicitly requires changing them.",
                "- Do not edit .oneflow-workspace-state.json or access parent/other project directories.",
                input.agent === "build"
                  ? "- Build autonomously. Do not stop to ask the user a question; infer practical defaults and create or update the app files in this turn."
                  : "- Plan autonomously. If details are missing, record reasonable assumptions instead of asking the user to answer setup questions.",
                "- Always maintain a visible task list with the todowrite tool: create it before you start working, keep exactly one task in_progress at a time, mark each task completed as soon as it is done, and add, update, or remove tasks whenever the plan changes. The user sees this list live in the chat.",
                "- Narrate as you build. The user watches this chat live and gets bored (and worried) when they only see silent file edits. Between major steps, write one short, friendly plain-language sentence about what you are doing and why it will be good for their app (e.g. 'Building the checkout page next so visitors can actually buy.'). Keep each note to a single sentence; never dump code, file paths, or technical logs into these notes.",
                "- End with a warm, engaging summary the user enjoys reading: one short paragraph describing the app you built and what makes it nice, then 3-5 short bullet highlights of the standout features, then 2-3 suggested next steps as a simple list. Write for a non-technical user — describe features and experience, not files or code. Keep the whole summary under ~150 words.",
                "- Brand everything you build. Unless the user already gave one, invent a short, memorable name plus a one-line tagline for the website/app/game and use them in the header, page title, and metadata. Also design a simple, professional logo as an inline SVG component (icon or wordmark that fits the app's theme and colors) and use it in the navbar/header and as the favicon. Mention the name you chose in your summary.",
                "- When the request is a game, ship a genuinely playable, polished game — never a bare canvas or placeholder: a real game loop, keyboard AND touch/click controls, a start screen with instructions, pause and game-over/win states with restart, live score or progress HUD, difficulty ramp where it fits, and styled game UI (menus, buttons, overlays) that matches the game's theme.",
                "- For 3D games or 3D scenes, use three.js (import from 'three'; use @react-three/fiber and @react-three/drei in React stacks when helpful): proper perspective camera, ambient plus directional lighting, shadows, real materials and colors, smooth requestAnimationFrame-driven animation, and camera/controls that feel good. The scene must look finished and run smoothly, ready to play immediately in the preview.",
                "- When the request is a web app, build it complete: every page/section it implies, working interactivity with real state (create/edit/delete where relevant), sensible seeded demo data so nothing looks empty, loading/empty/error states, and fully responsive layout.",
                "",
                ...(firebasePlatformPrompt ? [firebasePlatformPrompt, ""] : []),
                ...(designAuthorityPrompt ? [designAuthorityPrompt, ""] : []),
                "User request:",
                input.prompt,
              ].join("\n"),
            },
          ],
        }),
      },
      input.directory,
    );
  }

  abortSession(sessionId: string, directory: string) {
    return this.request<boolean>(
      `/session/${encodeURIComponent(sessionId)}/abort`,
      { method: "POST" },
      directory,
    );
  }

  async openEventStream(directory: string, signal: AbortSignal) {
    const response = await fetch(`${this.config.baseUrl}/event`, {
      signal,
      cache: "no-store",
      headers: {
        Accept: "text/event-stream",
        "X-Server-Key": this.config.serverKey,
        "x-opencode-directory": directory,
      },
    });
    if (!response.ok || !response.body) {
      throw new OpenCodeApiError(
        `OpenCode event stream failed with ${response.status}`,
        response.status,
      );
    }
    return response.body;
  }
}

export async function* decodeOpenCodeEventStream(
  stream: ReadableStream<Uint8Array>,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || "";

      for (const block of blocks) {
        const data = block
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (!data) continue;
        try {
          yield JSON.parse(data) as {
            type?: string;
            properties?: Record<string, unknown>;
          };
        } catch {
          // Ignore malformed or non-JSON keepalive events.
        }
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}
