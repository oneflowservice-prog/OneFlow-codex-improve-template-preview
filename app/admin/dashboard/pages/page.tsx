import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { AdminPagesForm } from "@/app/admin/dashboard/pages/pages-form";
import { getSitePages } from "@/lib/site-pages";

export default async function AdminPagesPage() {
  const pages = await getSitePages();
  const totalBlocks = Object.values(pages).reduce(
    (count, page) => count + (page.blocks?.length ?? 0),
    0,
  );

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Pages"
        title="Public content editing console"
        description="Manage the public content for Terms and Conditions, Privacy Policy, and About Us from one place."
        badges={["Terms", "Privacy", "About", `${totalBlocks} structured blocks`]}
        aside={
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                Publishing snapshot
              </p>
              <p className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">
                Legal and brand copy hub
              </p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Edit the key public information pages with structure where it
                matters, while keeping simpler brand copy fast to update.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Pages
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {Object.keys(pages).length} editable routes
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Structured docs
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  Terms and privacy use blocks
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Total blocks
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {totalBlocks} content blocks
                </p>
              </div>
            </div>
          </div>
        }
      />

      <AdminPagesForm initialPages={pages} />
    </AdminTechPage>
  );
}
