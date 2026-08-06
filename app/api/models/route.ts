import { NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getVisibleDisplayModelsWithAccessForUser } from "@/lib/models";

export async function GET(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.split("=")[1];
  const user = token ? await getUserBySessionToken(token) : null;
  const models = await getVisibleDisplayModelsWithAccessForUser(
    user?.id,
    user?.subscriptionPlanSlug,
  );

  return NextResponse.json({ models });
}
