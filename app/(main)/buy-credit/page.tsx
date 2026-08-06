import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  getActivePayPalClientId,
  getPaymentSettings,
  isPayPalCardConfigured,
} from "@/lib/payment-settings";
import { getPublicPaymentMethods } from "@/lib/payment-methods";
import { getPrisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { MainSidebarPage } from "@/components/main-sidebar-page";
import { BuyCreditClient } from "./buy-credit-client";
import { SiteliyoBuyCreditClient } from "./siteliyo-buy-credit-client";

export const dynamic = "force-dynamic";

export default async function BuyCreditPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = token ? await getUserBySessionToken(token) : null;

  if (!sessionUser) {
    redirect("/login");
  }

  const prisma = getPrisma();
  const [siteSettings, userRows, totalProjects, paymentMethods, savedPaymentMethods] =
    await Promise.all([
      getSiteSettings(),
    prisma.$queryRaw<
      Array<{
        email: string;
        name: string | null;
        username: string | null;
        avatarUrl: string | null;
        vercelAvatarUrl: string | null;
        creditBalance: number;
      }>
    >(
      Prisma.sql`
        SELECT "email", "name", "username", "avatarUrl", "vercelAvatarUrl", "creditBalance"
        FROM "User"
        WHERE "id" = ${sessionUser.id}
        LIMIT 1
      `,
    ),
    prisma.chat.count({
      where: { userId: sessionUser.id },
    }),
    getPublicPaymentMethods(),
    prisma.userPaymentMethod.findMany({
      where: { userId: sessionUser.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        brand: true,
        last4: true,
        expMonth: true,
        expYear: true,
        cardholderName: true,
        country: true,
        isDefault: true,
      },
    }),
  ]);

  const user = userRows[0] || null;

  if (!user) {
    redirect("/login");
  }

  const displayName = user.name?.trim() || user.email;
  const paymentSettings = await getPaymentSettings();
  const paypalCardConfig = isPayPalCardConfigured(paymentSettings)
    ? {
        clientId: getActivePayPalClientId(paymentSettings),
        environment: paymentSettings.paypalEnvironment,
      }
    : null;

  return (
    <MainSidebarPage contentClassName="overflow-hidden">
      <div className="theme-scrollbar h-full overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 lg:px-8">
        <div className="w-full">
          {siteSettings.homepageChrome.landingPageUi === "siteliyo" ? (
            <SiteliyoBuyCreditClient
              siteName={siteSettings.siteName}
              displayName={displayName}
              currentCredits={user.creditBalance}
              user={{
                email: user.email,
                username: user.username,
                name: user.name,
                avatarUrl: user.avatarUrl,
                vercelAvatarUrl: user.vercelAvatarUrl,
              }}
              totalProjects={totalProjects}
              paypalCardConfig={paypalCardConfig}
              paymentMethods={paymentMethods}
              savedPaymentMethods={savedPaymentMethods}
            />
          ) : (
            <BuyCreditClient
              displayName={displayName}
              currentCredits={user.creditBalance}
              totalProjects={totalProjects}
              paypalCardConfig={paypalCardConfig}
              paymentMethods={paymentMethods}
              savedPaymentMethods={savedPaymentMethods}
            />
          )}
        </div>
      </div>
    </MainSidebarPage>
  );
}
