import { SiteFallbackPage } from "@/components/site-fallback-page";
import { SiteliyoNotFoundPage } from "@/components/siteliyo-not-found-page";
import { getSiteSettings } from "@/lib/site-settings";

export default async function NotFoundPage() {
  const settings = await getSiteSettings();

  if (settings.homepageChrome.landingPageUi === "siteliyo") {
    return <SiteliyoNotFoundPage siteSettings={settings} />;
  }

  return (
    <SiteFallbackPage
      badge="Route lost"
      code="404 / Not Found"
      title="This page slipped out of the workflow."
      description="The route you requested does not exist, may have moved, or was never shipped. Jump back into the product from a page that still resolves."
      panelLabel="Not found boundary"
      panelFileLabel="app/not-found.tsx"
      panelLines={[
        '> resolve("/requested-route")',
        "issue: route not found",
        'hint: navigate("/") or open("/projects")',
      ]}
      siteName={settings.siteName}
      logoUrl={settings.logoUrl}
      actions={[
        {
          label: "Go home",
          href: "/",
          icon: "home",
          variant: "primary",
        },
        {
          label: "Open projects",
          href: "/projects",
          icon: "compass",
          variant: "secondary",
        },
      ]}
      asideItems={[
        { label: "Status", value: "Route missing" },
        { label: "Suggestion", value: "Check the URL" },
        { label: "Recovery", value: "Return to workspace" },
      ]}
    />
  );
}
