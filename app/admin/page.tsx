import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminAuthForm } from "@/app/admin/admin-auth-form";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";

export default async function AdminPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const settings = await getSiteSettings();

  if (token) {
    const user = await getUserBySessionToken(token);
    if (user?.isAdmin) {
      redirect("/admin/dashboard");
    }
  }

  return <AdminAuthForm adminSignupEnabled={settings.adminSignupEnabled} />;
}
