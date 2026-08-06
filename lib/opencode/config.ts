import "server-only";

import { getWebbyBuilderRuntimeConfig } from "@/lib/webby-builder-preview";

export type OpenCodeRuntimeConfig = {
  baseUrl: string;
  serverKey: string;
  requestTimeoutMs: number;
  jobTimeoutMs: number;
  workspaceRoot: string;
};

export async function getOpenCodeRuntimeConfig(): Promise<OpenCodeRuntimeConfig | null> {
  const builder = await getWebbyBuilderRuntimeConfig();
  if (!builder) return null;

  return {
    baseUrl: `${builder.baseUrl}/api/opencode`,
    serverKey: builder.serverKey,
    requestTimeoutMs: 60_000,
    jobTimeoutMs: 1_800_000,
    workspaceRoot: "/app/storage/workspaces",
  };
}

export async function requireOpenCodeRuntimeConfig() {
  const config = await getOpenCodeRuntimeConfig();
  if (!config) {
    throw new Error(
      "OpenCode uses Webby Builder. Configure the Webby Builder URL and server key in the admin dashboard.",
    );
  }
  return config;
}
