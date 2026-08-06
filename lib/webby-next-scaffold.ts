export function getNextAppDirectory(files: Record<string, string>) {
  const paths = Object.keys(files);
  const hasRootApp = paths.some((filePath) => filePath.startsWith("app/"));
  const hasSrcApp = paths.some((filePath) => filePath.startsWith("src/app/"));

  // Prefer the documented root shape when generated output mixes both trees.
  return hasSrcApp && !hasRootApp ? "src/app" : "app";
}

export function createNextStarterFiles(): Record<string, string> {
  return {
    "package.json": JSON.stringify(
      {
        name: "siteliyo-generated-app",
        private: true,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
        },
        dependencies: {
          next: "14.2.15",
          react: "^18.3.1",
          "react-dom": "^18.3.1",
        },
        devDependencies: {
          "@types/node": "^24.6.0",
          "@types/react": "^18.3.3",
          "@types/react-dom": "^18.3.1",
          typescript: "^5.9.3",
        },
      },
      null,
      2,
    ),
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "ES2017",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: false,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./*"] },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      },
      null,
      2,
    ),
    "next-env.d.ts": `/// <reference types="next" />
/// <reference types="next/image-types/global" />
`,
    "app/layout.tsx": `import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Your app is being created",
  description: "A Siteliyo generated application",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

`,
    "app/page.tsx": `export default function HomePage() {
  return (
    <main className="starter-shell">
      <section className="starter-card">
        <div className="starter-mark">S</div>
        <p className="starter-eyebrow">NEXT.JS APP ROUTER</p>
        <h1>Your app is ready.</h1>
        <p className="starter-copy">
          Siteliyo is implementing your request on top of this working application.
        </p>
        <div className="starter-status">
          <span /> Building your experience
        </div>
      </section>
    </main>
  );
}
`,
    "app/globals.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #09090b; color: #fafafa; font-family: Arial, sans-serif; }
.starter-shell { min-height: 100vh; display: grid; place-items: center; padding: 32px; background: radial-gradient(circle at top, #27272a, #09090b 58%); }
.starter-card { width: min(560px, 100%); padding: 48px; border: 1px solid #3f3f46; border-radius: 24px; background: rgba(24, 24, 27, .86); box-shadow: 0 28px 80px rgba(0, 0, 0, .45); }
.starter-mark { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; background: #fafafa; color: #09090b; font-weight: 800; }
.starter-eyebrow { margin: 28px 0 10px; color: #a1a1aa; font-size: 12px; font-weight: 700; letter-spacing: .16em; }
h1 { margin: 0; font-size: clamp(36px, 8vw, 64px); line-height: .98; letter-spacing: -.05em; }
.starter-copy { margin: 20px 0 28px; color: #d4d4d8; font-size: 17px; line-height: 1.6; }
.starter-status { display: inline-flex; align-items: center; gap: 10px; color: #e4e4e7; font-size: 14px; }
.starter-status span { width: 9px; height: 9px; border-radius: 999px; background: #34d399; box-shadow: 0 0 0 6px rgba(52, 211, 153, .12); animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: .45; transform: scale(.8); } }
`,
  };
}

export function mergeNextStarterFiles(
  generatedFiles: Record<string, string>,
): Record<string, string> {
  const starterFiles = createNextStarterFiles();
  const appDirectory = getNextAppDirectory(generatedFiles);

  if (appDirectory === "src/app") {
    for (const filePath of Object.keys(starterFiles)) {
      if (!filePath.startsWith("app/")) continue;
      starterFiles[`src/${filePath}`] = starterFiles[filePath];
      delete starterFiles[filePath];
    }

    const tsconfig = JSON.parse(starterFiles["tsconfig.json"]) as {
      compilerOptions?: { paths?: Record<string, string[]> };
    };
    if (tsconfig.compilerOptions) {
      tsconfig.compilerOptions.paths = { "@/*": ["./src/*"] };
    }
    starterFiles["tsconfig.json"] = JSON.stringify(tsconfig, null, 2);
  }

  return {
    ...starterFiles,
    ...generatedFiles,
  };
}

export function ensureNextStarterScaffold(files: Record<string, string>) {
  const appDirectory = getNextAppDirectory(files);
  const layoutPath = `${appDirectory}/layout.tsx`;
  const pagePath = `${appDirectory}/page.tsx`;
  const globalsPath = `${appDirectory}/globals.css`;

  if (!files[layoutPath]) {
    files[layoutPath] = `import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Generated app",
  description: "Created with Siteliyo",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
  }

  if (!files[pagePath]) {
    files[pagePath] = `/* SITELIYO_MISSING_GENERATED_PAGE */
export default function HomePage() {
  return <main className="min-h-screen" />;
}
`;
  }

  if (!files[globalsPath]) {
    files[globalsPath] = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
  }

  return files;
}
