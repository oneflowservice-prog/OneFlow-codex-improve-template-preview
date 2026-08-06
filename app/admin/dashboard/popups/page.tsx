import { AdminHero, AdminMetricCard, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { AdminPopupsForm } from "@/app/admin/dashboard/popups/popups-form";
import { listAdminPopups, type AppPopupSummary } from "@/lib/popups";

export default async function AdminPopupsPage() {
  const popups = await listAdminPopups();
  const onboardingCount = popups.filter(
    (popup: AppPopupSummary) => popup.target === "onboarding",
  ).length;
  const loggedInCount = popups.filter(
    (popup: AppPopupSummary) => popup.target === "logged_in",
  ).length;
  const previewCardCount = popups.filter(
    (popup: AppPopupSummary) => popup.target === "preview",
  ).length;
  const activeCount = popups.filter(
    (popup: AppPopupSummary) => popup.isActive,
  ).length;

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Popups"
        title="Manage onboarding and product popups"
        description="Edit the welcome popup shown to new users, create once-per-user announcements for signed-in users, and manage the promo cards that rotate in the preview pane while apps build."
        badges={[
          `${activeCount} active`,
          `${onboardingCount} onboarding`,
          `${loggedInCount} logged-in announcements`,
          `${previewCardCount} preview cards`,
        ]}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard
          label="Active"
          value={activeCount.toLocaleString()}
          detail="Currently eligible to appear."
        />
        <AdminMetricCard
          label="Onboarding"
          value={onboardingCount.toLocaleString()}
          detail="Shown to users created after the popup exists."
        />
        <AdminMetricCard
          label="Logged-In"
          value={loggedInCount.toLocaleString()}
          detail="Product updates for existing users."
        />
        <AdminMetricCard
          label="Preview Cards"
          value={previewCardCount.toLocaleString()}
          detail="Rotating promos shown while apps build."
        />
      </div>

      <AdminPopupsForm
        popups={popups.map((popup: AppPopupSummary) => ({
          ...popup,
          createdAt: popup.createdAt.toISOString(),
          updatedAt: popup.updatedAt.toISOString(),
        }))}
      />
    </AdminTechPage>
  );
}
