import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

type AgentTemplateRow = {
  id: string;
  title: string;
  avatarUrl: string | null;
  prompt: string;
  plan: Prisma.JsonValue | null;
  createdAt: Date;
};

function isMissingTemplateColumn(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2010" &&
    typeof error.meta?.message === "string" &&
    error.meta.message.includes('column "isTemplate" does not exist')
  );
}

function getTemplateSummary(plan: Prisma.JsonValue | null, prompt: string) {
  if (plan && typeof plan === "object" && !Array.isArray(plan)) {
    const summary = (plan as Record<string, unknown>).summary;
    if (typeof summary === "string" && summary.trim()) {
      return summary.trim();
    }
  }

  return prompt.replace(/\s+/g, " ").trim();
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const prisma = getPrisma();

  try {
    const templates = await prisma.$queryRaw<AgentTemplateRow[]>(Prisma.sql`
      SELECT
        "id",
        "title",
        "avatarUrl",
        "prompt",
        "plan",
        "createdAt"
      FROM "Agent"
      WHERE "isTemplate" = true
      ORDER BY "createdAt" DESC
      LIMIT 8
    `);

    return NextResponse.json({
      templates: templates.map((template) => ({
        id: template.id,
        title: template.title,
        avatarUrl: template.avatarUrl,
        prompt: template.prompt,
        summary: getTemplateSummary(template.plan, template.prompt),
        isNew:
          Date.now() - new Date(template.createdAt).getTime() <
          1000 * 60 * 60 * 24 * 14,
      })),
    });
  } catch (error) {
    if (isMissingTemplateColumn(error)) {
      return NextResponse.json({ templates: [] });
    }

    console.error("[agents] templates failed", error);
    return NextResponse.json(
      { error: "Failed to load agent templates" },
      { status: 500 },
    );
  }
}
