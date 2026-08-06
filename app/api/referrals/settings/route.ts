import { NextResponse } from "next/server";
import { getReferralSettings } from "@/lib/referrals";

export async function GET() {
  const settings = await getReferralSettings();

  return NextResponse.json({
    settings: {
      showBuyCreditsButton: settings.showBuyCreditsButton,
      showShareOneflowButton: settings.showShareOneflowButton,
      showAffiliateProgramButton: settings.showAffiliateProgramButton,
      affiliateProgramUrl: settings.affiliateProgramUrl,
      referrerRewardCredits: settings.referrerRewardCredits,
    },
  });
}
