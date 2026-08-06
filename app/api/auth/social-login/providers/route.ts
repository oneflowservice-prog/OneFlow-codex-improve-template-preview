import { NextResponse } from "next/server";
import { getPublicSocialLoginProviders } from "@/lib/social-login-settings";

export async function GET() {
  const providers = await getPublicSocialLoginProviders();
  return NextResponse.json({ providers });
}
