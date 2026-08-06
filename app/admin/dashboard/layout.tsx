import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  type AdminSidebarNavGroup,
  type AdminSidebarNavItem,
} from "@/app/admin/dashboard/admin-sidebar-nav";
import { AdminSidebarShell } from "@/app/admin/dashboard/admin-sidebar-shell";
import { Toaster } from "@/components/ui/toaster";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

const navItems = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    description: "Key platform metrics",
    icon: "overview",
  },
  {
    label: "Website",
    description: "Brand, appearance, and public UI settings",
    icon: "site",
    items: [
      {
        href: "/admin/dashboard/site",
        label: "Site Settings",
        description: "Brand, logo, and SEO metadata",
        icon: "site",
      },
      {
        href: "/admin/dashboard/theme",
        label: "Theme",
        description: "Switch between dark tech palettes",
        icon: "theme",
      },
      {
        href: "/admin/dashboard/ui-ux",
        label: "UI/UX",
        description: "Design quality, flows, and product polish guidance",
        icon: "theme",
      },
      {
        href: "/admin/dashboard/frontend",
        label: "Frontend",
        description: "Auth visuals and right-side hero media",
        icon: "frontend",
      },
      {
        href: "/admin/dashboard/custom-js",
        label: "Custom JS",
        description: "Paste support widgets and third-party snippets",
        icon: "customJs",
      },
      {
        href: "/admin/dashboard/popups",
        label: "Popups",
        description: "Edit onboarding and product popups",
        icon: "popups",
      },
    ],
  },
  {
    label: "Content",
    description: "Homepage sections, pages, blog, and guides",
    icon: "pages",
    items: [
      {
        href: "/admin/dashboard/homepage",
        label: "Homepage",
        description: "Guest header and footer navigation",
        icon: "pages",
      },
      {
        href: "/admin/dashboard/siteliyo-landing",
        label: "Siteliyo Landing",
        description: "Edit the Siteliyo homepage sections and CTA copy",
        icon: "pages",
      },
      {
        href: "/admin/dashboard/siteliyo-social-proof",
        label: "FAQs / Testimonials",
        description: "Edit Siteliyo social proof and FAQ content",
        icon: "pages",
      },
      {
        href: "/admin/dashboard/pages",
        label: "Legal Pages",
        description: "Edit terms, privacy, and about",
        icon: "pages",
      },
      {
        href: "/admin/dashboard/blogs",
        label: "Blog Posts",
        description: "Manage blog content",
        icon: "blog",
      },
      {
        href: "/admin/dashboard/knowledge-base",
        label: "Knowledge Base",
        description: "Operational setup guides",
        icon: "knowledge",
      },
    ],
  },
  {
    label: "Resources",
    description: "Files, media library, community, and requests",
    icon: "media",
    items: [
      {
        href: "/admin/dashboard/requests",
        label: "Requests",
        description: "Support and contact submissions",
        icon: "requests",
      },
      {
        href: "/admin/dashboard/file-manager",
        label: "File Manager",
        description: "Upload and reuse hosted images and videos",
        icon: "media",
      },
      {
        href: "/admin/dashboard/library",
        label: "Library",
        description: "Control user media generation",
        icon: "media",
      },
      {
        href: "/admin/dashboard/resources/community",
        label: "Community",
        description: "Select projects shown on the community page",
        icon: "community",
      },
    ],
  },
  {
    label: "Monetization",
    description: "Revenue controls and billing activity",
    icon: "finance",
    items: [
      {
        href: "/admin/dashboard/finance",
        label: "Finance",
        description: "Revenue, losses, and subscribers",
        icon: "finance",
      },
      {
        href: "/admin/dashboard/billing",
        label: "Billing",
        description: "Credits, tokens, and billing history",
        icon: "transactions",
      },
      {
        href: "/admin/dashboard/pricing",
        label: "Pricing",
        description: "Plans, prices, and features",
        icon: "pricing",
      },
      {
        href: "/admin/dashboard/transactions",
        label: "Transactions",
        description: "All recorded payment activity",
        icon: "transactions",
      },
      {
        href: "/admin/dashboard/payment-methods",
        label: "Payment Methods",
        description: "Activate PayPal and manage credentials",
        icon: "transactions",
      },
    ],
  },
  {
    label: "Users & Growth",
    description: "Accounts, projects, growth, and notifications",
    icon: "users",
    items: [
      {
        href: "/admin/dashboard/users",
        label: "Users",
        description: "Registered accounts and bans",
        icon: "users",
      },
      {
        href: "/admin/dashboard/referrals",
        label: "Referrals",
        description: "Affiliate tracking and bonus payouts",
        icon: "referrals",
      },
      {
        href: "/admin/dashboard/projects",
        label: "All Projects",
        description: "Projects across all users",
        icon: "projects",
      },
      {
        href: "/admin/dashboard/agents",
        label: "All Agents",
        description: "Agents across all users and template status",
        icon: "agents",
      },
      {
        href: "/admin/dashboard/notifications",
        label: "Notifications",
        description: "Broadcast announcements to users",
        icon: "notifications",
      },
    ],
  },
  {
    label: "AI & Builder",
    description: "Models, providers, previews, RAG, and app data",
    icon: "models",
    items: [
      {
        href: "/admin/dashboard/preview",
        label: "App Preview",
        description: "Manage the React preview runtime and Sandpack settings",
        icon: "frontend",
      },
      {
        href: "/admin/dashboard/rag",
        label: "RAG",
        description: "Prompt templates and retrieval context",
        icon: "rag",
      },
      {
        href: "/admin/dashboard/models",
        label: "Models",
        description: "Runtime model names and IDs",
        icon: "models",
      },
      {
        href: "/admin/dashboard/ai-providers",
        label: "Providers",
        description: "Claude and future provider credentials",
        icon: "models",
      },
      {
        href: "/admin/dashboard/firebase",
        label: "Firebase",
        description: "System Firestore config for generated apps",
        icon: "storage",
      },
      {
        href: "/admin/dashboard/firestore-data",
        label: "Firestore Data",
        description: "View generated project data isolation paths",
        icon: "storage",
      },
      {
        href: "/admin/dashboard/open-code-skills",
        label: "OpenCode Skills",
        description: "Control design authority routing for generated UI",
        icon: "openCode",
      },
    ],
  },
  {
    label: "Integrations",
    description: "Auth, email, and storage providers",
    icon: "social",
    items: [
      {
        href: "/admin/dashboard/integrations",
        label: "Project Auth",
        description: "Clerk defaults for generated project authentication",
        icon: "social",
      },
      {
        href: "/admin/dashboard/social-login",
        label: "Social Login",
        description: "GitHub auth and provider visibility",
        icon: "social",
      },
      {
        href: "/admin/dashboard/smtp",
        label: "SMTP Settings",
        description: "Outgoing mail host, auth, and relay checks",
        icon: "notifications",
      },
      {
        href: "/admin/dashboard/storage",
        label: "Storage",
        description: "Cloudinary API keys and media storage setup",
        icon: "storage",
      },
    ],
  },
  {
    label: "Monitoring",
    description: "Runtime health and deployment checks",
    icon: "uptime",
    items: [
      {
        href: "/admin/dashboard/uptime-monitors",
        label: "Uptime monitors",
        description: "Track Netlify deployment health",
        icon: "uptime",
      },
    ],
  },
] satisfies (AdminSidebarNavItem | AdminSidebarNavGroup)[];

export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user?.isAdmin) {
    redirect("/admin");
  }

  return (
    <div className="theme-admin-shell relative h-[100dvh] overflow-hidden">
      <div className="flex h-full w-full flex-col lg:flex-row">
        <AdminSidebarShell
          items={navItems}
          userLabel={user.username?.trim() || user.name?.trim() || user.email}
        />

        <main className="theme-admin-scrollbar relative min-w-0 flex-1 overflow-y-auto border-l border-[hsl(var(--border))] bg-[hsl(var(--background))] px-5 py-5 sm:px-6 lg:px-6">
          {children}
          <Toaster />
        </main>
      </div>
    </div>
  );
}
