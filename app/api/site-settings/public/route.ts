import { NextRequest, NextResponse } from "next/server";
import { getSiteSettings, resolveSiteSettingsForLocale } from "@/lib/site-settings";
import {
  SITELIYO_LOCALE_COOKIE,
  resolveSiteliyoLocale,
} from "@/lib/siteliyo-i18n";

export async function GET(request: NextRequest) {
  const locale = resolveSiteliyoLocale(
    request.cookies.get(SITELIYO_LOCALE_COOKIE)?.value,
  );
  const settings = resolveSiteSettingsForLocale(await getSiteSettings(), locale);
  return NextResponse.json({ settings });
}
