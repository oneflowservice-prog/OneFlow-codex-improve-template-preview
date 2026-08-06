export const WEBBY_PREVIEW_NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const nextConfig = {
  basePath,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
`;

export type WorkspaceFileChange = {
  operation: "write" | "delete";
  path: string;
  content?: string;
};

export function getNextPreviewConfigChanges(
  files: Record<string, string>,
): WorkspaceFileChange[] {
  const changes: WorkspaceFileChange[] = [];

  if (files["next.config.mjs"] !== WEBBY_PREVIEW_NEXT_CONFIG) {
    changes.push({
      operation: "write",
      path: "next.config.mjs",
      content: WEBBY_PREVIEW_NEXT_CONFIG,
    });
  }

  for (const path of [
    "next.config.ts",
    "next.config.js",
    "next.config.cjs",
  ]) {
    if (files[path] !== undefined) {
      changes.push({ operation: "delete", path });
    }
  }

  return changes;
}
