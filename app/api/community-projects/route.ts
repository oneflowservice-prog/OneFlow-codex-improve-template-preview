import { NextResponse } from "next/server";
import { getCommunityProjects } from "@/lib/community-projects";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const projects = await getCommunityProjects(6);

  return NextResponse.json(
    { projects },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}
