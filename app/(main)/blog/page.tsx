import { cookies } from "next/headers";
import { DefaultBlogPage } from "@/components/default-public-pages";
import { SiteliyoBlogPage } from "@/components/siteliyo-blog-page";
import { getBlogPosts, resolveBlogPostForLocale } from "@/lib/blogs";
import { getSiteSettings } from "@/lib/site-settings";
import {
  SITELIYO_LOCALE_COOKIE,
  resolveSiteliyoLocale,
} from "@/lib/siteliyo-i18n";

export default async function BlogPage() {
  const [siteSettings, posts] = await Promise.all([
    getSiteSettings(),
    getBlogPosts(),
  ]);
  const locale = resolveSiteliyoLocale(
    (await cookies()).get(SITELIYO_LOCALE_COOKIE)?.value,
  );
  const localizedPosts = posts.map((post) => resolveBlogPostForLocale(post, locale));

  if (siteSettings.homepageChrome.landingPageUi === "siteliyo") {
    return <SiteliyoBlogPage siteSettings={siteSettings} posts={localizedPosts} />;
  }

  return <DefaultBlogPage siteSettings={siteSettings} posts={localizedPosts} />;
}
