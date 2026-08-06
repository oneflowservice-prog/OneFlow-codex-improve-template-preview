import { cookies } from "next/headers";
import { DefaultBlogSinglePage } from "@/components/default-public-pages";
import { notFound } from "next/navigation";
import { SiteliyoBlogSinglePage } from "@/components/siteliyo-blog-single-page";
import {
  getBlogPostBySlug,
  getBlogPosts,
  resolveBlogPostForLocale,
} from "@/lib/blogs";
import { getSiteSettings } from "@/lib/site-settings";
import {
  SITELIYO_LOCALE_COOKIE,
  resolveSiteliyoLocale,
} from "@/lib/siteliyo-i18n";

export default async function BlogSinglePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, siteSettings, posts] = await Promise.all([
    getBlogPostBySlug(slug),
    getSiteSettings(),
    getBlogPosts(),
  ]);

  if (!post) {
    notFound();
  }
  const locale = resolveSiteliyoLocale(
    (await cookies()).get(SITELIYO_LOCALE_COOKIE)?.value,
  );
  const localizedPost = resolveBlogPostForLocale(post, locale);
  const relatedPosts = posts
    .filter((item) => item.slug !== slug)
    .map((item) => resolveBlogPostForLocale(item, locale))
    .slice(0, 3);

  if (siteSettings.homepageChrome.landingPageUi === "siteliyo") {
    return (
      <SiteliyoBlogSinglePage
        post={localizedPost}
        relatedPosts={relatedPosts}
        siteSettings={siteSettings}
      />
    );
  }

  return <DefaultBlogSinglePage post={localizedPost} siteSettings={siteSettings} />;
}
