import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { importWorkspaceSkillsFromZip } from "@/lib/workspace-skills";

async function getAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;
  return user?.isAdmin ? user : null;
}

export async function POST(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a ZIP file." }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".zip")) {
    return NextResponse.json({ error: "Upload a .zip archive." }, { status: 400 });
  }

  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json(
      { error: "ZIP files must be 8 MB or smaller." },
      { status: 400 },
    );
  }

  try {
    const payloads = await importWorkspaceSkillsFromZip(file);
    const prisma = getPrisma();
    const created = await prisma.$transaction(
      payloads.map((payload) =>
        prisma.globalSkill.create({
          data: {
            name: payload.name,
            description: payload.description,
            instructions: payload.instructions,
            source: payload.source,
            sourceUrl: payload.sourceUrl,
            metadata: payload.metadata,
          },
        }),
      ),
    );

    return NextResponse.json({
      ok: true,
      skills: created.map((skill) => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        instructions: skill.instructions,
        source: skill.source,
        sourceUrl: skill.sourceUrl,
        enabled: skill.enabled,
        createdAt: skill.createdAt.toISOString(),
        updatedAt: skill.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not import that ZIP archive.",
      },
      { status: 400 },
    );
  }
}

export const runtime = "nodejs";
