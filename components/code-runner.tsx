import CodeRunnerReact from "./code-runner-react";
import CodeRunnerE2B from "./code-runner-e2b";
import CodeRunnerWebbyBuilder, {
  type WebbyBuilderPreviewStatusEvent,
} from "./code-runner-webby-builder";
import type { SiteThemeConfig } from "@/lib/site-theme";
import type { PreviewProvider } from "@/lib/site-settings";
import type { BuilderMode } from "@/lib/builder-mode";
import type { PreviewUpdateMode } from "@/lib/webby-builder-preview";

export default function CodeRunner({
  language,
  code,
  files,
  onRequestFix,
  chatId,
  themeConfig,
  resolvedTheme,
  previewProvider,
  builderMode,
  environmentVariables,
  autoFixError,
  previewEditEnabled,
  onWebbyPreviewStatus,
  previewUpdateMode,
}: {
  language?: string;
  code?: string;
  files?: Array<{ path: string; content: string }>;
  onRequestFix?: (e: string) => void;
  chatId?: string;
  themeConfig?: SiteThemeConfig;
  resolvedTheme?: "light" | "dark";
  previewProvider?: PreviewProvider;
  builderMode?: BuilderMode;
  environmentVariables?: Record<string, string>;
  autoFixError?: boolean;
  previewEditEnabled?: boolean;
  onWebbyPreviewStatus?: (event: WebbyBuilderPreviewStatusEvent) => void;
  previewUpdateMode?: PreviewUpdateMode;
}) {
  const actualFiles =
    files || (code ? [{ path: "App.tsx", content: code }] : []);

  if (previewProvider === "builder") {
    return (
      <CodeRunnerE2B
        files={actualFiles}
        chatId={chatId}
        themeConfig={themeConfig}
        resolvedTheme={resolvedTheme}
        builderMode={builderMode}
      />
    );
  }

  if (previewProvider === "webby-builder") {
    return (
      <CodeRunnerWebbyBuilder
        files={actualFiles}
        onRequestFix={onRequestFix}
        chatId={chatId}
        themeConfig={themeConfig}
        resolvedTheme={resolvedTheme}
        builderMode={builderMode}
        environmentVariables={environmentVariables}
        autoFixError={autoFixError}
        previewEditEnabled={previewEditEnabled}
        onPreviewStatus={onWebbyPreviewStatus}
        previewUpdateMode={previewUpdateMode}
      />
    );
  }

  return (
    <CodeRunnerReact
      files={actualFiles}
      onRequestFix={onRequestFix}
      chatId={chatId}
      themeConfig={themeConfig}
      resolvedTheme={resolvedTheme}
      builderMode={builderMode}
      environmentVariables={environmentVariables}
      autoFixError={autoFixError}
      previewEditEnabled={previewEditEnabled}
    />
  );
}
