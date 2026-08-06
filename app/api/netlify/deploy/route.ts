import { NextRequest, NextResponse } from "next/server";
import { createSafeStreamWriter } from "@/lib/safe-stream";
import { getPrisma } from "@/lib/prisma";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getFilesFromMessage } from "@/lib/chat-files";
import {
  buildNetlifyDeployArchive,
  createNetlifyDeploy,
  createNetlifyNextDeploy,
  createNetlifySite,
  getNetlifyBuildIssue,
  getNetlifyScreenshotUrl,
  isNetlifyBuildCommandError,
  normalizeNetlifyUrl,
  shouldDeployNetlifyWithNextRuntime,
  slugifyProjectName,
  waitForNetlifyDeployReady,
  waitForNetlifyDeployScreenshotUrl,
  syncNetlifyEnvironmentVariables,
} from "@/lib/netlify";
import { getProductionEnvironmentVariables } from "@/lib/supabase-builder";
import { getSiteSettings } from "@/lib/site-settings";
import {
  uploadConfiguredPreviewScreenshotToCloudinary,
  uploadPreviewScreenshotUrlToCloudinary,
} from "@/lib/preview-screenshots";
import {
  buildUptimeHubMonitorName,
  ensureUptimeHubMonitor,
} from "@/lib/uptimehub";
import { getAccessibleChatContext } from "@/lib/team-projects";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = token ? await getUserBySessionToken(token) : null;
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      netlifyAccessToken: true,
    },
  });

  if (!user?.netlifyAccessToken) {
    return NextResponse.json(
      { error: "Connect Netlify before publishing." },
      { status: 400 },
    );
  }
  const accessToken = user.netlifyAccessToken;

  const body = await request.json();
  const chatId =
    typeof body?.chatId === "string" && body.chatId.length > 0
      ? body.chatId
      : null;
  const messageId =
    typeof body?.messageId === "string" && body.messageId.length > 0
      ? body.messageId
      : null;
  const isFreePlan =
    sessionUser.subscriptionStatus !== "active" ||
    !sessionUser.subscriptionPlanSlug ||
    sessionUser.subscriptionPlanSlug === "free";
  const showSiteBranding = isFreePlan || body?.showSiteBranding === true;

  if (!chatId) {
    return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  let cancelStream = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const writer = createSafeStreamWriter(controller, request.signal);
      cancelStream = writer.cancel;
      const write = (event: Record<string, unknown>) => {
        writer.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      const close = writer.close;

      const log = (message: string) => {
        write({ type: "log", message, timestamp: Date.now() });
      };

      void (async () => {
        try {
          const access = await getAccessibleChatContext(
            prisma,
            chatId,
            user.id,
          );
          const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            select: {
              id: true,
              title: true,
              userId: true,
              previewImageUrl: true,
              netlifySiteId: true,
              netlifySiteName: true,
              projectEnvVars: true,
            },
          });

          if (!chat) {
            write({ type: "error", error: "Chat not found" });
            close();
            return;
          }

          if (!access?.canManage) {
            write({ type: "error", error: "Forbidden" });
            close();
            return;
          }

          const message = messageId
            ? await prisma.message.findFirst({
                where: {
                  id: messageId,
                  chatId,
                  role: "assistant",
                },
                select: {
                  id: true,
                  content: true,
                  files: true,
                },
              })
            : await prisma.message.findFirst({
                where: {
                  chatId,
                  role: "assistant",
                },
                orderBy: {
                  createdAt: "desc",
                },
                select: {
                  id: true,
                  content: true,
                  files: true,
                },
              });

          if (!message) {
            write({
              type: "error",
              error: "No publishable version found for this chat.",
            });
            close();
            return;
          }

          const files = getFilesFromMessage(message.files, message.content);
          if (files.length === 0) {
            write({
              type: "error",
              error: "The selected version does not contain deployable files.",
            });
            close();
            return;
          }

          const siteSettings = await getSiteSettings();
          const siteName =
            chat.netlifySiteName || slugifyProjectName(chat.title, chat.id);
          const site =
            chat.netlifySiteId && chat.netlifySiteName
              ? { id: chat.netlifySiteId, name: chat.netlifySiteName }
              : await (async () => {
                  log(`Creating Netlify site ${siteName}...`);
                  return createNetlifySite({
                    accessToken,
                    siteName,
                  });
                })();

          log("Preparing generated project files...");
          const useNextRuntime = shouldDeployNetlifyWithNextRuntime(files);
          const productionEnvironment = {
            ...getProductionEnvironmentVariables(chat.projectEnvVars),
            ...(siteSettings.homepageChrome.firebaseProjectId
              ? {
                  FIREBASE_PROJECT_ID:
                    siteSettings.homepageChrome.firebaseProjectId,
                }
              : {}),
            ...(siteSettings.homepageChrome.firebaseAdminSdkJson
              ? {
                  FIREBASE_ADMIN_SDK_JSON:
                    siteSettings.homepageChrome.firebaseAdminSdkJson,
                }
              : {}),
            SITELIYO_PROJECT_ID: chat.id,
          };
          if (useNextRuntime) {
            log("Synchronizing production environment variables...");
            await syncNetlifyEnvironmentVariables({
              accessToken,
              siteId: site.id!,
              variables: productionEnvironment,
            });
          }
          const createdDeploy = useNextRuntime
            ? await createNetlifyNextDeploy({
                files,
                accessToken,
                siteId: site.id!,
                options: {
                  showBranding: showSiteBranding,
                  brandName: siteSettings.siteName,
                  onLog: log,
                  environmentVariables: productionEnvironment,
                },
              })
            : await (async () => {
                const archive = await buildNetlifyDeployArchive(files, {
                  showBranding: showSiteBranding,
                  brandName: siteSettings.siteName,
                  onLog: log,
                });

                log(
                  `Uploading deploy bundle to Netlify site ${site.name || siteName}...`,
                );
                return createNetlifyDeploy({
                  accessToken,
                  siteId: site.id!,
                  archive,
                });
              })();

          await prisma.chat.update({
            where: { id: chat.id },
            data: {
              netlifySiteId: site.id,
              netlifySiteName: site.name || siteName,
              netlifyDeployId: createdDeploy.id || null,
              netlifyDeployUrl: normalizeNetlifyUrl(createdDeploy),
              netlifyDeployStatus: createdDeploy.state || "processing",
            },
          });

          log(`Netlify deploy created: ${createdDeploy.id}`);
          const readyDeploy = await waitForNetlifyDeployReady({
            accessToken,
            deployId: createdDeploy.id!,
            onLog: log,
          });

          const deployUrl = normalizeNetlifyUrl(readyDeploy || createdDeploy);
          const deployStatus =
            readyDeploy?.state || createdDeploy.state || "unknown";

          let previewImageUrl: string | null = null;
          if (deployStatus === "ready" && deployUrl) {
            const netlifyScreenshotUrl =
              getNetlifyScreenshotUrl(readyDeploy) ||
              getNetlifyScreenshotUrl(createdDeploy);
            const previewFolder = `project-previews/${chat.id}`;

            if (netlifyScreenshotUrl) {
              log("Using Netlify preview screenshot...");
              previewImageUrl = await uploadPreviewScreenshotUrlToCloudinary({
                sourceUrl: netlifyScreenshotUrl,
                folder: previewFolder,
                onLog: log,
              });
            } else if (readyDeploy?.id || createdDeploy.id) {
              log("Waiting for Netlify preview screenshot...");
              const waitedNetlifyScreenshotUrl =
                await waitForNetlifyDeployScreenshotUrl({
                  accessToken,
                  deployId: (readyDeploy?.id || createdDeploy.id)!,
                  onLog: log,
                });
              if (waitedNetlifyScreenshotUrl) {
                previewImageUrl = await uploadPreviewScreenshotUrlToCloudinary({
                  sourceUrl: waitedNetlifyScreenshotUrl,
                  folder: previewFolder,
                  onLog: log,
                });
              }
            } else {
              log("Generating preview screenshot...");
              previewImageUrl =
                await uploadConfiguredPreviewScreenshotToCloudinary({
                  targetUrl: deployUrl,
                  folder: previewFolder,
                  onLog: log,
                });
            }

            if (!previewImageUrl) {
              log("Generating preview screenshot...");
              previewImageUrl =
                await uploadConfiguredPreviewScreenshotToCloudinary({
                  targetUrl: deployUrl,
                  folder: previewFolder,
                  onLog: log,
                });
            }

            if (previewImageUrl) {
              log("Preview screenshot ready.");
            } else {
              log("Preview screenshot unavailable after all capture attempts.");
            }
          }

          if (
            deployStatus === "ready" &&
            deployUrl &&
            process.env.UPTIMEHUB_API_KEY?.trim()
          ) {
            log("Syncing uptime monitor for deployed link...");

            try {
              const ensuredMonitor = await ensureUptimeHubMonitor({
                name: buildUptimeHubMonitorName({
                  userName: sessionUser.name,
                  userEmail: sessionUser.email,
                  siteName: site.name || siteName,
                  chatTitle: chat.title,
                }),
                target: deployUrl,
              });

              log(
                ensuredMonitor.created
                  ? `UptimeHub monitor created: ${ensuredMonitor.id}`
                  : `UptimeHub monitor already exists: ${ensuredMonitor.id}`,
              );
            } catch (monitorError) {
              log(
                monitorError instanceof Error
                  ? `Uptime monitor sync skipped: ${monitorError.message}`
                  : "Uptime monitor sync skipped.",
              );
            }
          }

          await prisma.chat.update({
            where: { id: chat.id },
            data: {
              netlifySiteId: site.id,
              netlifySiteName: site.name || siteName,
              netlifyDeployId: createdDeploy.id || null,
              netlifyDeployUrl: deployUrl,
              netlifyDeployStatus: deployStatus,
              netlifyDeployReadyAt:
                deployStatus === "ready" ? new Date() : null,
              previewImageUrl: previewImageUrl || chat.previewImageUrl,
            },
          });

          write({
            type: "result",
            deploymentId: createdDeploy.id,
            deploymentUrl: deployUrl,
            status: deployStatus,
            previewImageUrl,
          });
          close();
        } catch (error) {
          console.error("Failed to publish to Netlify:", error);
          if (isNetlifyBuildCommandError(error)) {
            const issue = getNetlifyBuildIssue(error);
            write({
              type: "build_error",
              error: error.message,
              issue,
            });
            close();
            return;
          }

          write({
            type: "error",
            error:
              error instanceof Error
                ? error.message
                : "Failed to publish to Netlify",
          });
          close();
        }
      })();
    },
    cancel() {
      cancelStream();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
