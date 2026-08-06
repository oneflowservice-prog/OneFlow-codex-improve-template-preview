import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { SiteliyoSocialProofForm } from "@/app/admin/dashboard/siteliyo-social-proof/siteliyo-social-proof-form";
import { getSiteSettings } from "@/lib/site-settings";

export default async function AdminSiteliyoSocialProofPage() {
  const settings = await getSiteSettings();
  const landing = settings.homepageChrome.siteliyoLanding;
  const featuredTestimonials = landing.testimonials.filter(
    (testimonial) => testimonial.featured === true,
  ).length;

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="FAQs / Testimonials"
        title="Siteliyo social proof and objection handling"
        description="Refine the trust layer of the Siteliyo homepage from one modern workspace. Update testimonials, tune FAQs, and keep credibility content clean, current, and easier to manage."
        badges={[
          `Active UI: ${settings.homepageChrome.landingPageUi}`,
          `${landing.testimonials.length} testimonials`,
          `${landing.faqs.length} faqs`,
        ]}
        aside={
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                Publishing snapshot
              </p>
              <p className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">
                Trust content control
              </p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Use this page to balance confidence and clarity so visitors see
                proof quickly without feeling overloaded.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Featured
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {featuredTestimonials} highlighted cards
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Testimonials
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {landing.enableTestimonialsSection !== false ? "Section enabled" : "Section hidden"}
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  FAQs
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {landing.enableFaqSection !== false ? "Section enabled" : "Section hidden"}
                </p>
              </div>
            </div>
          </div>
        }
      />

      <SiteliyoSocialProofForm initialHomepageChrome={settings.homepageChrome} />
    </AdminTechPage>
  );
}
