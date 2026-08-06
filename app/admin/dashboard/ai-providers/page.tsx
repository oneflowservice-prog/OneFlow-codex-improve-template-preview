import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { AiProviderSettingsForm } from "@/app/admin/dashboard/ai-providers/provider-settings-form";
import { getAdminSiteSettings } from "@/lib/site-settings";
import {
  getAiProviderSettings,
  getResolvedAnthropicApiKey,
  getResolvedGoogleApiKey,
  getResolvedNvidiaApiKey,
  getResolvedNovitaApiKey,
  getResolvedOpenAiApiKey,
  getResolvedOpenRouterApiKey,
  isAnthropicApiKeyConfigured,
  isGoogleApiKeyConfigured,
  isNvidiaApiKeyConfigured,
  isNovitaApiKeyConfigured,
  isOpenAiApiKeyConfigured,
  isOpenRouterApiKeyConfigured,
} from "@/lib/ai-provider-settings";

function providerBadge(
  name: string,
  isUsingDatabaseKey: boolean,
  hasResolvedKey: boolean,
) {
  if (isUsingDatabaseKey) return `${name}: admin key`;
  if (hasResolvedKey) return `${name}: env fallback`;
  return `${name}: not configured`;
}

export default async function AdminAiProvidersPage() {
  const settings = await getAiProviderSettings();
  const siteSettings = await getAdminSiteSettings();
  const [
    resolvedAnthropicApiKey,
    resolvedGoogleApiKey,
    resolvedNvidiaApiKey,
    resolvedNovitaApiKey,
    resolvedOpenAiApiKey,
    resolvedOpenRouterApiKey,
  ] = await Promise.all([
    getResolvedAnthropicApiKey(),
    getResolvedGoogleApiKey(),
    getResolvedNvidiaApiKey(),
    getResolvedNovitaApiKey(),
    getResolvedOpenAiApiKey(),
    getResolvedOpenRouterApiKey(),
  ]);

  const badges = [
    providerBadge(
      "Anthropic",
      isAnthropicApiKeyConfigured(settings),
      Boolean(resolvedAnthropicApiKey),
    ),
    providerBadge(
      "Gemini",
      isGoogleApiKeyConfigured(settings),
      Boolean(resolvedGoogleApiKey),
    ),
    providerBadge(
      "OpenAI",
      isOpenAiApiKeyConfigured(settings),
      Boolean(resolvedOpenAiApiKey),
    ),
    providerBadge(
      "OpenRouter",
      isOpenRouterApiKeyConfigured(settings),
      Boolean(resolvedOpenRouterApiKey),
    ),
    providerBadge(
      "NVIDIA",
      isNvidiaApiKeyConfigured(settings),
      Boolean(resolvedNvidiaApiKey),
    ),
    providerBadge(
      "Novita AI",
      isNovitaApiKeyConfigured(settings),
      Boolean(resolvedNovitaApiKey),
    ),
  ];

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="AI Providers"
        title="Manage provider credentials for runtime AI routing"
        description="Save provider keys here so Claude, Gemini, OpenAI, OpenRouter, NVIDIA NIM, and Novita AI models can be configured from the admin dashboard without depending only on environment variables."
        badges={badges}
      />

      <AiProviderSettingsForm
        initialSettings={settings}
        initialChrome={siteSettings.homepageChrome}
      />
    </AdminTechPage>
  );
}
