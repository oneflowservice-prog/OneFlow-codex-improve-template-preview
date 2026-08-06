import { unstable_cache } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import {
  DEFAULT_BUILDER_EXPERIENCE,
  normalizeBuilderExperience,
  type BuilderExperience,
} from "@/lib/builder-mode";
import {
  DEFAULT_DARK_THEME_PRESET,
  DEFAULT_SITE_THEME,
  normalizeDarkThemePreset,
  normalizeSiteThemeConfig,
  type DarkThemePreset,
  type SiteThemeConfig,
} from "@/lib/site-theme";

const SITE_SETTINGS_ID = "global";

export type SiteChromeLink = {
  label: string;
  href: string;
};

export type SiteChromeSocialPlatform =
  | "facebook"
  | "instagram"
  | "x"
  | "linkedin";

export type SiteChromeSocialLink = {
  platform: SiteChromeSocialPlatform;
  href: string;
};

export type SiteChromeFooterGroup = {
  title: string;
  links: SiteChromeLink[];
};

export type DefaultHomepageTabIcon = "blocks" | "monitor" | "bot" | "sparkles";

export type DefaultHomepageTab = {
  label: string;
  icon: DefaultHomepageTabIcon;
};

export type SignedInModeSwitchSettings = {
  enabled: boolean;
  appLabel: string;
  agentLabel: string;
  agentEnabled: boolean;
  agentBadge: string;
};

export type SignedInPromptInputStyle = "dashboard" | "guest-landing";
export type AuthHeroSlideDevice = "desktop" | "mobile";

export type AuthHeroSlide = {
  url: string;
  device: AuthHeroSlideDevice;
};

export type SiteChromeLinkTranslation = {
  label?: string;
};

export type SiteChromeFooterGroupTranslation = {
  title?: string;
  links?: SiteChromeLinkTranslation[];
};

export type HomepageChromeLocaleOverrides = {
  headerLinks?: SiteChromeLinkTranslation[];
  siteliyoHeaderLinks?: SiteChromeLinkTranslation[];
  guestPrimaryCtaLabel?: string;
  guestSecondaryCtaLabel?: string;
  footerDescription?: string;
  footerGroups?: SiteChromeFooterGroupTranslation[];
  footerBottomText?: string;
  siteliyoFooterDescription?: string;
  siteliyoFooterGroups?: SiteChromeFooterGroupTranslation[];
  siteliyoFooterBottomText?: string;
  siteliyoAuthWelcomeTitle?: string;
  siteliyoAuthLeftHeadline?: string;
  siteliyoAuthLeftSubtitle?: string;
  siteliyoAuthTags?: string[];
  siteliyoLoginSubtitle?: string;
  siteliyoSignupSubtitle?: string;
};

export type HomepageChromeTranslations = {
  tr?: HomepageChromeLocaleOverrides;
};

export type SiteSettingsLocaleOverrides = {
  siteName?: string;
  siteDescription?: string;
  authHeroBadge?: string;
  authHeroTitle?: string;
  authHeroDescription?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
};

export type SiteSettingsTranslations = {
  tr?: SiteSettingsLocaleOverrides;
};

export const SITE_CHROME_SOCIAL_PLATFORM_LABELS: Record<
  SiteChromeSocialPlatform,
  string
> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  linkedin: "LinkedIn",
};

export function createDefaultSiteChromeSocialLinks(): SiteChromeSocialLink[] {
  return [
    { platform: "facebook", href: "" },
    { platform: "instagram", href: "" },
    { platform: "x", href: "" },
    { platform: "linkedin", href: "" },
  ];
}

export type SiteliyoLandingOverviewCard = {
  icon: string;
  title: string;
  description: string;
  featured?: boolean;
};

export type SiteliyoLandingWorkflowHighlight = {
  title: string;
  description: string;
};

export type SiteliyoLandingFeatureCard = {
  title: string;
  description: string;
  image: string;
};

export type SiteliyoLandingOverviewCardTranslation = {
  title?: string;
  description?: string;
};

export type SiteliyoLandingWorkflowHighlightTranslation = {
  title?: string;
  description?: string;
};

export type SiteliyoLandingFeatureCardTranslation = {
  title?: string;
  description?: string;
};

export type SiteliyoLandingTestimonialTranslation = {
  quote?: string;
  name?: string;
  role?: string;
  company?: string;
};

export type SiteliyoLandingFaqTranslation = {
  question?: string;
  answer?: string;
};

export type SiteliyoLandingLocaleOverrides = {
  brandLabel?: string;
  heroBadge?: string;
  heroTitle?: string;
  heroDescription?: string;
  heroPrimaryCtaLabel?: string;
  heroPromptPlaceholder?: string;
  heroPreviewAlt?: string;
  trustedByText?: string;
  overviewSectionEyebrow?: string;
  overviewSectionTitle?: string;
  overviewSectionDescription?: string;
  overviewCards?: SiteliyoLandingOverviewCardTranslation[];
  workflowSectionEyebrow?: string;
  workflowSectionTitle?: string;
  workflowSectionDescription?: string;
  workflowEditorPreviewAlt?: string;
  workflowHighlights?: SiteliyoLandingWorkflowHighlightTranslation[];
  featureSectionEyebrow?: string;
  featureSectionTitle?: string;
  featureCards?: SiteliyoLandingFeatureCardTranslation[];
  testimonialsSectionEyebrow?: string;
  testimonialsSectionTitle?: string;
  testimonialsSectionDescription?: string;
  testimonials?: SiteliyoLandingTestimonialTranslation[];
  faqSectionEyebrow?: string;
  faqSectionTitle?: string;
  faqs?: SiteliyoLandingFaqTranslation[];
  finalCtaTitle?: string;
  finalCtaDescription?: string;
  finalCtaLabel?: string;
};

export type SiteliyoLandingTranslations = {
  tr?: SiteliyoLandingLocaleOverrides;
};

export type SiteliyoLandingTestimonial = {
  quote: string;
  name: string;
  role: string;
  company?: string;
  rating?: number;
  image?: string;
  featured?: boolean;
};

export type SiteliyoLandingFaq = {
  question: string;
  answer?: string;
};

export type SiteliyoLandingSettings = {
  brandLabel: string;
  heroBadge: string;
  enableHeroBadge?: boolean;
  heroTitle: string;
  enableHeroTitle?: boolean;
  heroDescription: string;
  enableHeroDescription?: boolean;
  heroPrimaryCtaLabel: string;
  heroPrimaryCtaHref: string;
  enableHeroPrimaryCta?: boolean;
  heroPromptPlaceholder: string;
  enableHeroPromptPanel?: boolean;
  heroPreviewImage: string;
  heroPreviewAlt: string;
  enableHeroPreview?: boolean;
  trustedByText: string;
  logoLabels: string[];
  enableLogoSection?: boolean;
  overviewSectionEyebrow: string;
  overviewSectionTitle: string;
  overviewSectionDescription: string;
  overviewCards: SiteliyoLandingOverviewCard[];
  enableOverviewSection?: boolean;
  workflowSectionEyebrow: string;
  workflowSectionTitle: string;
  workflowSectionDescription: string;
  workflowEditorPreviewImage: string;
  workflowEditorPreviewAlt: string;
  workflowHighlights: SiteliyoLandingWorkflowHighlight[];
  enableWorkflowSection?: boolean;
  featureSectionEyebrow: string;
  featureSectionTitle: string;
  featureCards: SiteliyoLandingFeatureCard[];
  enableFeatureSection?: boolean;
  testimonialsSectionEyebrow: string;
  testimonialsSectionTitle: string;
  testimonialsSectionDescription: string;
  testimonials: SiteliyoLandingTestimonial[];
  enableTestimonialsSection?: boolean;
  faqSectionEyebrow: string;
  faqSectionTitle: string;
  faqs: SiteliyoLandingFaq[];
  enableFaqSection?: boolean;
  finalCtaTitle: string;
  finalCtaDescription: string;
  finalCtaLabel: string;
  finalCtaHref: string;
  enableFinalCtaSection?: boolean;
  translations?: SiteliyoLandingTranslations;
};

export type HomepageChromeSettings = {
  landingPageUi: "default" | "siteliyo";
  cookieConsentPosition:
    | "bottom-left"
    | "bottom-right"
    | "top-left"
    | "top-right";
  previewProvider: PreviewProvider;
  screenshotProvider: ScreenshotProvider;
  builderExperience: BuilderExperience;
  codeSandboxApiKey: string;
  codeSandboxBundlerUrl: string;
  codeSandboxTeamId: string;
  e2bApiKey: string;
  e2bTemplate: string;
  e2bTimeoutSeconds: number;
  webbyBuilderUrl: string;
  webbyBuilderServerKey: string;
  captureKitApiKey: string;
  screenshotOneApiKey: string;
  screenshotOneSecretKey: string;
  firebaseProjectId: string;
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseStorageBucket: string;
  firebaseMessagingSenderId: string;
  firebaseAppId: string;
  firebaseMeasurementId: string;
  firebaseCollectionPrefix: string;
  firebaseAdminSdkJson: string;
  clerkPublishableKey: string;
  clerkSecretKey: string;
  clerkSignInUrl: string;
  clerkSignUpUrl: string;
  clerkAfterSignInUrl: string;
  clerkAfterSignUpUrl: string;
  siteliyoFigmaUrl: string;
  communityProjectIds: string[];
  communityProjectNiches: Record<string, string>;
  defaultHomepageTabs: DefaultHomepageTab[];
  signedInPromptInputStyle: SignedInPromptInputStyle;
  signedInModeSwitch: SignedInModeSwitchSettings;
  maxHeroVideoUrl: string | null;
  headerLinks: SiteChromeLink[];
  siteliyoHeaderLinks: SiteChromeLink[];
  guestPrimaryCtaLabel: string;
  guestPrimaryCtaHref: string;
  guestSecondaryCtaLabel: string;
  guestSecondaryCtaHref: string;
  footerDescription: string;
  footerSocialLinks: SiteChromeSocialLink[];
  footerGroups: SiteChromeFooterGroup[];
  footerBottomText: string;
  siteliyoFooterDescription: string;
  siteliyoFooterSocialLinks: SiteChromeSocialLink[];
  siteliyoFooterGroups: SiteChromeFooterGroup[];
  siteliyoFooterBottomText: string;
  samplePrompts: string[];
  siteliyoLanding: SiteliyoLandingSettings;
  siteliyoAuthWelcomeTitle: string;
  siteliyoAuthLeftHeadline: string;
  siteliyoAuthLeftSubtitle: string;
  siteliyoAuthTags: string[];
  siteliyoLoginSubtitle: string;
  siteliyoSignupSubtitle: string;
  authHeroSlides: AuthHeroSlide[];
  authHeroMarqueeSpeedSeconds: number;
  libraryImageGenerationEnabled?: boolean;
  libraryVideoGenerationEnabled?: boolean;
  libraryImageProvider?: "google" | "openai";
  libraryVideoProvider?: "google" | "openai";
  geminiImageModelId?: string;
  geminiVideoModelId?: string;
  openAiImageModelId?: string;
  openAiVideoModelId?: string;
  translations?: HomepageChromeTranslations;
};

export type PreviewProvider = "codesandbox" | "builder" | "webby-builder";
export type ScreenshotProvider = "microlink" | "capturekit" | "screenshotone";

export const DEFAULT_SITELIYO_LANDING: SiteliyoLandingSettings = {
  brandLabel: "siteliyo",
  heroBadge: "AI website builder",
  enableHeroBadge: true,
  heroTitle: "Build and host your\nwebsite with AI",
  enableHeroTitle: true,
  heroDescription:
    "Turn a simple prompt into a clean, modern website you can edit, customize, and publish without touching code.",
  enableHeroDescription: true,
  heroPrimaryCtaLabel: "Start for free",
  heroPrimaryCtaHref: "/signup",
  enableHeroPrimaryCta: true,
  heroPromptPlaceholder: "Design a website for a business...",
  enableHeroPromptPanel: true,
  heroPreviewImage:
    "https://www.figma.com/api/mcp/asset/ffbf8d1e-3e3a-4a3e-bc4b-0ca587c6ceb2",
  heroPreviewAlt: "Siteliyo homepage editor preview",
  enableHeroPreview: true,
  trustedByText:
    "Trusted by teams and creators building standout websites worldwide",
  logoLabels: ["Logoplusum", "CCD", "LOOCO", "IPSUM", "Kopals", "logo"],
  enableLogoSection: true,
  overviewSectionEyebrow: "Key features overview",
  overviewSectionTitle: "Generate, edit, and publish with AI",
  overviewSectionDescription:
    "A single workspace for building website direction, polishing the details, and getting live faster.",
  overviewCards: [
    {
      icon: "A",
      title: "AI-powered builder",
      description:
        "Generate a polished first draft from a plain-language prompt and skip the heavy setup work.",
    },
    {
      icon: "E",
      title: "Editor with control",
      description:
        "Refine sections, content, and visuals from one workspace without breaking the flow.",
      featured: true,
    },
    {
      icon: "P",
      title: "Publishing ready",
      description:
        "Move from concept to a launchable website with hosting and structure already in place.",
    },
  ],
  enableOverviewSection: true,
  workflowSectionEyebrow: "Key features overview",
  workflowSectionTitle: "Generate, edit, and publish with AI",
  workflowSectionDescription:
    "A single workspace for building website direction, polishing the details, and getting live faster.",
  enableWorkflowSection: true,
  workflowEditorPreviewImage:
    "https://www.figma.com/api/mcp/asset/d42d6b4e-2bd2-4e14-a55f-0646bc7e1403",
  workflowEditorPreviewAlt: "Siteliyo editor workspace",
  workflowHighlights: [
    {
      title: "AI builder",
      description:
        "Transform prompts into a high-quality website direction with layout, sections, and style built in.",
    },
    {
      title: "Simple editor",
      description:
        "Refine copy, modules, and visuals quickly inside a workspace that stays close to the final result.",
    },
    {
      title: "Built for creators",
      description:
        "Publish faster with a workflow designed for solo builders, teams, and client delivery.",
    },
    {
      title: "Fast hosting",
      description:
        "Keep momentum after generation with straightforward hosting and clean publishing flows.",
    },
  ],
  enableFeatureSection: true,
  featureSectionEyebrow: "Features",
  featureSectionTitle: "Key Features Overview",
  featureCards: [
    {
      title: "Creative AI UI",
      description:
        "Guide the builder with intent and get sharp website layouts that feel purposeful instead of generic.",
      image:
        "https://www.figma.com/api/mcp/asset/18e66a8a-aba0-4a82-8f56-45af83655823",
    },
    {
      title: "Built-in editor",
      description:
        "Shape every section inside a focused editing experience made for fast iterations and cleaner decisions.",
      image:
        "https://www.figma.com/api/mcp/asset/6cabca9e-7d56-4c63-810c-cbf7db9d9a3c",
    },
    {
      title: "Hosting and domain management",
      description:
        "Keep generation, setup, and publishing close together so the path to launch stays simple.",
      image:
        "https://www.figma.com/api/mcp/asset/e636c35c-2924-4799-b634-1db332ee25aa",
    },
    {
      title: "SEO controls",
      description:
        "Tune visibility and structure with tools that keep the site polished for both visitors and search.",
      image:
        "https://www.figma.com/api/mcp/asset/6f6a71cb-1c60-4a71-8da4-23fcfa60dfbe",
    },
  ],
  enableTestimonialsSection: true,
  testimonialsSectionEyebrow: "Testimonials",
  testimonialsSectionTitle: "Trusted by creators and teams",
  testimonialsSectionDescription:
    "Teams use Siteliyo to turn rough ideas into launch-ready pages with less back-and-forth.",
  testimonials: [
    {
      quote:
        "We shipped a much stronger first version because the generated structure already felt intentional and launch-ready.",
      name: "Lina",
      role: "Creative lead",
      company: "Siteliyo",
      rating: 4.5,
      image: "https://avatars.githubusercontent.com/u/14985020?v=4",
    },
    {
      quote:
        "The editor experience makes iteration feel fast. It is the first AI website workflow that actually reduced team friction.",
      name: "Jordan",
      role: "Product marketer",
      company: "Siteliyo",
      rating: 5,
      image: "https://avatars.githubusercontent.com/u/583231?v=4",
      featured: true,
    },
    {
      quote:
        "We used it to go from concept to live page far quicker than our normal handoff process without sacrificing polish.",
      name: "Mika",
      role: "Freelancer",
      company: "Siteliyo",
      rating: 4.5,
      image: "https://avatars.githubusercontent.com/u/69631?v=4",
    },
  ],
  enableFaqSection: true,
  faqSectionEyebrow: "FAQ",
  faqSectionTitle: "What people usually ask",
  faqs: [
    {
      question: "How does the AI website creation work?",
      answer:
        "Simply describe your website in plain language and our AI generates a complete, styled page with layout, sections, and content. You can then refine it in the editor and publish with one click.",
    },
    {
      question: "What are credits and how do they work?",
      answer:
        "Credits are used each time you generate or significantly edit a website with AI. Each plan comes with a monthly credit allowance. You can top up at any time from your billing page.",
    },
    {
      question: "What happens when I run out of credits?",
      answer:
        "You can still view and edit your existing websites manually, but AI generation will be paused until you top up your credits or your plan renews at the start of the next billing period.",
    },
    {
      question: "Can I connect my own domain?",
      answer:
        "Yes. You can connect any custom domain you own directly from your project settings. We provide step-by-step DNS instructions to get you pointed and live quickly.",
    },
    {
      question: "Can I create more than one page?",
      answer:
        "Yes, multi-page websites are supported. You can add, remove, and reorder pages from within the editor and generate content for each page individually.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Absolutely. All data is encrypted in transit and at rest. We never share or sell your content, and you retain full ownership of everything you create on Siteliyo.",
    },
  ],
  enableFinalCtaSection: true,
  finalCtaTitle: "Turn your idea into a live website today",
  finalCtaDescription:
    "No setup headaches. No bloated builders. Just a clean website generated by AI.",
  finalCtaLabel: "Start free trial",
  finalCtaHref: "/signup",
  translations: {},
};

export type SiteSettings = {
  siteName: string;
  siteDescription: string;
  logoUrl: string | null;
  lightModeLogoUrl: string | null;
  darkModeLogoUrl: string | null;
  faviconUrl: string | null;
  customJs: string | null;
  authHeroBadge: string;
  authHeroTitle: string;
  authHeroDescription: string;
  authHeroImageUrl: string | null;
  adminSignupEnabled: boolean;
  socialAuthButtonsEnabled: boolean;
  darkThemePreset: DarkThemePreset;
  themeConfig: SiteThemeConfig;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  ogImageUrl: string | null;
  twitterHandle: string | null;
  homepageChrome: HomepageChromeSettings;
  translations?: SiteSettingsTranslations;
  openCodeDesignAuthorityMode: "auto" | "taste-only" | "impeccable-only";
};

export const DEFAULT_HOMEPAGE_CHROME: HomepageChromeSettings = {
  landingPageUi: "default",
  cookieConsentPosition: "bottom-left",
  previewProvider: "codesandbox",
  screenshotProvider: "microlink",
  builderExperience: DEFAULT_BUILDER_EXPERIENCE,
  codeSandboxApiKey: "",
  codeSandboxBundlerUrl: "",
  codeSandboxTeamId: "",
  e2bApiKey: "",
  e2bTemplate: "",
  e2bTimeoutSeconds: 3600,
  webbyBuilderUrl: "",
  webbyBuilderServerKey: "",
  captureKitApiKey: "",
  screenshotOneApiKey: "",
  screenshotOneSecretKey: "",
  firebaseProjectId: "",
  firebaseApiKey: "",
  firebaseAuthDomain: "",
  firebaseStorageBucket: "",
  firebaseMessagingSenderId: "",
  firebaseAppId: "",
  firebaseMeasurementId: "",
  firebaseCollectionPrefix: "",
  firebaseAdminSdkJson: "",
  clerkPublishableKey: "",
  clerkSecretKey: "",
  clerkSignInUrl: "/sign-in",
  clerkSignUpUrl: "/sign-up",
  clerkAfterSignInUrl: "/",
  clerkAfterSignUpUrl: "/",
  siteliyoFigmaUrl:
    "https://www.figma.com/design/mbhvnstmBsveqsOxD9wEUa/Siteliyo---MVP--Own-?node-id=10336-17131",
  communityProjectIds: [],
  communityProjectNiches: {},
  defaultHomepageTabs: [
    { label: "Full Stack App", icon: "blocks" },
    { label: "Website", icon: "monitor" },
    { label: "AI Agent", icon: "bot" },
    { label: "Automation", icon: "sparkles" },
  ],
  signedInPromptInputStyle: "dashboard",
  signedInModeSwitch: {
    enabled: true,
    appLabel: "App",
    agentLabel: "Agent",
    agentEnabled: true,
    agentBadge: "New",
  },
  maxHeroVideoUrl: null,
  headerLinks: [
    { label: "Solutions", href: "#" },
    { label: "Agents", href: "/agents" },
    { label: "Max", href: "/max" },
    { label: "Resources", href: "#" },
    { label: "Enterprise", href: "#" },
    { label: "Pricing", href: "#" },
  ],
  siteliyoHeaderLinks: [
    { label: "Features", href: "/#features" },
    { label: "Testimonials", href: "/#testimonials" },
    { label: "Community", href: "/community" },
    { label: "Support", href: "/support" },
    { label: "Pricing", href: "/pricing" },
  ],
  guestPrimaryCtaLabel: "Get started",
  guestPrimaryCtaHref: "/signup",
  guestSecondaryCtaLabel: "Log in",
  guestSecondaryCtaHref: "/login",
  footerDescription:
    "Build, iterate, and ship modern software with AI in one focused workflow.",
  footerSocialLinks: createDefaultSiteChromeSocialLinks(),
  footerGroups: [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#" },
        { label: "Pricing", href: "#" },
        { label: "Roadmap", href: "#" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Docs", href: "#" },
        { label: "Guides", href: "#" },
        { label: "Support", href: "#" },
      ],
    },
    {
      title: "Pages",
      links: [
        { label: "About Us", href: "/about-us" },
        { label: "Privacy Policy", href: "/privacy-policy" },
        { label: "Terms & Conditions", href: "/terms" },
      ],
    },
  ],
  footerBottomText: "Build faster with focused AI workflows.",
  siteliyoFooterDescription:
    "Everything you need to create, edit, and launch modern websites while bringing your ideas to life.",
  siteliyoFooterSocialLinks: createDefaultSiteChromeSocialLinks(),
  siteliyoFooterGroups: [
    {
      title: "Product",
      links: [
        { label: "Features", href: "/#features" },
        { label: "Testimonials", href: "/#testimonials" },
        { label: "Community", href: "/community" },
        { label: "FAQs", href: "/support" },
        { label: "Pricing", href: "/pricing" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Blog", href: "/blog" },
        { label: "Support", href: "/support" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy policy", href: "/privacy-policy" },
        { label: "Terms of service", href: "/terms" },
      ],
    },
  ],
  siteliyoFooterBottomText: "All rights reserved.",
  samplePrompts: [],
  siteliyoLanding: DEFAULT_SITELIYO_LANDING,
  siteliyoAuthWelcomeTitle: "Welcome to Siteliyo",
  siteliyoAuthLeftHeadline: "Your next website starts here",
  siteliyoAuthLeftSubtitle: "create, preview, and customize your site with AI.",
  siteliyoAuthTags: [
    "Personal brand website",
    "Creative portfolio showcase",
    "Modern business homepage",
    "Analytics dashboard UI",
    "Product launch landing page",
    "Editorial blog experience",
    "Fashion brand storefront",
  ],
  siteliyoLoginSubtitle: "Please login to continue to your account.",
  siteliyoSignupSubtitle: "Please login to continue to your account.",
  authHeroSlides: [],
  authHeroMarqueeSpeedSeconds: 16,
  libraryImageGenerationEnabled: true,
  libraryVideoGenerationEnabled: true,
  libraryImageProvider: "google",
  libraryVideoProvider: "google",
  geminiImageModelId: "imagen-3.0-generate-002:predict",
  geminiVideoModelId: "veo-2.0-generate-001:predict",
  openAiImageModelId: "dall-e-3",
  openAiVideoModelId: "sora",
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: "OneFlow",
  siteDescription:
    "OneFlow helps you plan, build, and iterate modern web apps with AI. Generate multi-file TypeScript apps with live preview and version history.",
  logoUrl: "/logo.png",
  lightModeLogoUrl: null,
  darkModeLogoUrl: null,
  faviconUrl: "/favicon.ico",
  customJs: null,
  authHeroBadge: "Y Combinator S24",
  authHeroTitle: "Built for teams that ship fast.",
  authHeroDescription:
    "Collaborate in real time, refine ideas instantly, and turn prompts into polished product experiences.",
  authHeroImageUrl: "/halo.png",
  adminSignupEnabled: true,
  socialAuthButtonsEnabled: true,
  darkThemePreset: DEFAULT_DARK_THEME_PRESET,
  themeConfig: DEFAULT_SITE_THEME,
  metaTitle: "OneFlow - AI App Builder",
  metaDescription:
    "OneFlow helps you plan, build, and iterate modern web apps with AI. Generate multi-file TypeScript apps with live preview and version history.",
  metaKeywords: [
    "OneFlow",
    "AI app builder",
    "AI code generator",
    "Next.js app generator",
    "TypeScript code generation",
    "frontend prototyping",
  ],
  ogImageUrl: null,
  twitterHandle: "@oneflow",
  homepageChrome: DEFAULT_HOMEPAGE_CHROME,
  translations: {},
  openCodeDesignAuthorityMode: "auto",
};

function normalizeOptionalUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeAuthHeroSlides(value: unknown): AuthHeroSlide[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const slides = value
    .map((item, index): AuthHeroSlide | null => {
      if (typeof item === "string") {
        const url = normalizeOptionalUrl(item);
        return url
          ? { url, device: index % 3 === 1 ? "mobile" : "desktop" }
          : null;
      }

      if (!item || typeof item !== "object") {
        return null;
      }

      const raw = item as Record<string, unknown>;
      const url = normalizeOptionalUrl(raw.url);

      if (!url) {
        return null;
      }

      return {
        url,
        device: raw.device === "mobile" ? "mobile" : "desktop",
      };
    })
    .filter((slide): slide is AuthHeroSlide => Boolean(slide));

  const seen = new Set<string>();
  return slides.filter((slide) => {
    const key = `${slide.device}:${slide.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeCustomJsInput(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\r\n/g, "\n").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalHandle(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function normalizeSiteChromeLink(
  value: unknown,
  fallback: SiteChromeLink,
): SiteChromeLink {
  if (!value || typeof value !== "object") return fallback;

  const raw = value as Record<string, unknown>;
  const label =
    typeof raw.label === "string" && raw.label.trim()
      ? raw.label.trim()
      : fallback.label;
  const href =
    typeof raw.href === "string" && raw.href.trim()
      ? raw.href.trim()
      : fallback.href;

  return { label, href };
}

function normalizeSiteChromeFooterGroup(
  value: unknown,
  fallback: SiteChromeFooterGroup,
): SiteChromeFooterGroup {
  if (!value || typeof value !== "object") return fallback;

  const raw = value as Record<string, unknown>;
  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : fallback.title;
  const links = Array.isArray(raw.links)
    ? raw.links
        .slice(0, Math.max(fallback.links.length, 6))
        .map((item, index) =>
          normalizeSiteChromeLink(
            item,
            fallback.links[index] ?? { label: `Link ${index + 1}`, href: "#" },
          ),
        )
        .filter((item) => item.label && item.href)
    : fallback.links;

  return {
    title,
    links: links.length > 0 ? links : fallback.links,
  };
}

function normalizeSiteChromeSocialLinks(
  value: unknown,
  fallback: SiteChromeSocialLink[],
): SiteChromeSocialLink[] {
  const items = Array.isArray(value) ? value : [];

  return fallback.map((link) => {
    const match = items.find((candidate) => {
      if (!candidate || typeof candidate !== "object") return false;

      return (candidate as Record<string, unknown>).platform === link.platform;
    }) as Record<string, unknown> | undefined;

    return {
      platform: link.platform,
      href: typeof match?.href === "string" ? match.href.trim() : link.href,
    };
  });
}

function normalizeDefaultHomepageTabs(
  value: unknown,
  fallback: DefaultHomepageTab[],
): DefaultHomepageTab[] {
  const validIcons: DefaultHomepageTabIcon[] = [
    "blocks",
    "monitor",
    "bot",
    "sparkles",
  ];
  const items = Array.isArray(value) ? value : [];
  const tabs = items
    .slice(0, 8)
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return fallback[index] ?? null;
      }

      const raw = item as Record<string, unknown>;
      const label =
        typeof raw.label === "string" && raw.label.trim()
          ? raw.label.trim()
          : fallback[index]?.label;
      const icon = validIcons.includes(raw.icon as DefaultHomepageTabIcon)
        ? (raw.icon as DefaultHomepageTabIcon)
        : fallback[index]?.icon;

      return label && icon ? { label, icon } : null;
    })
    .filter((item): item is DefaultHomepageTab => Boolean(item));

  return tabs.length > 0 ? tabs : fallback;
}

function normalizeSignedInModeSwitch(
  value: unknown,
  fallback: SignedInModeSwitchSettings,
): SignedInModeSwitchSettings {
  if (!value || typeof value !== "object") return fallback;

  const raw = value as Record<string, unknown>;

  return {
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : fallback.enabled,
    appLabel:
      typeof raw.appLabel === "string" && raw.appLabel.trim()
        ? raw.appLabel.trim().slice(0, 24)
        : fallback.appLabel,
    agentLabel:
      typeof raw.agentLabel === "string" && raw.agentLabel.trim()
        ? raw.agentLabel.trim().slice(0, 24)
        : fallback.agentLabel,
    agentEnabled:
      typeof raw.agentEnabled === "boolean"
        ? raw.agentEnabled
        : fallback.agentEnabled,
    agentBadge:
      typeof raw.agentBadge === "string"
        ? raw.agentBadge.trim().slice(0, 16)
        : fallback.agentBadge,
  };
}

function normalizeSiteliyoLandingOverviewCard(
  value: unknown,
  fallback: SiteliyoLandingOverviewCard,
): SiteliyoLandingOverviewCard {
  if (!value || typeof value !== "object") return fallback;

  const raw = value as Record<string, unknown>;

  return {
    icon:
      typeof raw.icon === "string" && raw.icon.trim()
        ? raw.icon.trim().slice(0, 3)
        : fallback.icon,
    title:
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title.trim()
        : fallback.title,
    description:
      typeof raw.description === "string" && raw.description.trim()
        ? raw.description.trim()
        : fallback.description,
    featured: raw.featured === true,
  };
}

function normalizeSiteliyoLandingWorkflowHighlight(
  value: unknown,
  fallback: SiteliyoLandingWorkflowHighlight,
): SiteliyoLandingWorkflowHighlight {
  if (!value || typeof value !== "object") return fallback;

  const raw = value as Record<string, unknown>;

  return {
    title:
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title.trim()
        : fallback.title,
    description:
      typeof raw.description === "string" && raw.description.trim()
        ? raw.description.trim()
        : fallback.description,
  };
}

function normalizeSiteliyoLandingFeatureCard(
  value: unknown,
  fallback: SiteliyoLandingFeatureCard,
): SiteliyoLandingFeatureCard {
  if (!value || typeof value !== "object") return fallback;

  const raw = value as Record<string, unknown>;

  return {
    title:
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title.trim()
        : fallback.title,
    description:
      typeof raw.description === "string" && raw.description.trim()
        ? raw.description.trim()
        : fallback.description,
    image:
      typeof raw.image === "string" && raw.image.trim()
        ? raw.image.trim()
        : fallback.image,
  };
}

function normalizeSiteliyoLandingTestimonial(
  value: unknown,
  fallback: SiteliyoLandingTestimonial,
): SiteliyoLandingTestimonial {
  if (!value || typeof value !== "object") return fallback;

  const raw = value as Record<string, unknown>;

  return {
    quote:
      typeof raw.quote === "string" && raw.quote.trim()
        ? raw.quote.trim()
        : fallback.quote,
    name:
      typeof raw.name === "string" && raw.name.trim()
        ? raw.name.trim()
        : fallback.name,
    role:
      typeof raw.role === "string" && raw.role.trim()
        ? raw.role.trim()
        : fallback.role,
    company:
      typeof raw.company === "string" && raw.company.trim()
        ? raw.company.trim()
        : fallback.company,
    rating:
      typeof raw.rating === "number" && Number.isFinite(raw.rating)
        ? Math.min(5, Math.max(0, Math.round(raw.rating * 2) / 2))
        : fallback.rating,
    image:
      typeof raw.image === "string" && raw.image.trim()
        ? raw.image.trim()
        : fallback.image,
    featured: raw.featured === true,
  };
}

function normalizeSiteliyoLandingFaq(
  value: unknown,
  fallback: SiteliyoLandingFaq,
): SiteliyoLandingFaq {
  if (!value || typeof value !== "object") return fallback;

  const raw = value as Record<string, unknown>;

  return {
    question:
      typeof raw.question === "string" && raw.question.trim()
        ? raw.question.trim()
        : fallback.question,
    answer:
      typeof raw.answer === "string" && raw.answer.trim()
        ? raw.answer.trim()
        : fallback.answer,
  };
}

function normalizeLocalizedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeLocalizedKeywords(value: unknown): string[] | undefined {
  const keywords = Array.isArray(value)
    ? value
        .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
        .map((item) => item.trim())
        .filter(Boolean)
    : typeof value === "string"
      ? value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  if (keywords.length === 0) {
    return undefined;
  }

  return Array.from(new Set(keywords));
}

function normalizeSiteSettingsLocaleOverrides(
  value: unknown,
): SiteSettingsLocaleOverrides | undefined {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as Record<string, unknown>;
  const metaKeywords = normalizeLocalizedKeywords(raw.metaKeywords);

  const normalized: SiteSettingsLocaleOverrides = {
    ...(normalizeLocalizedString(raw.siteName)
      ? { siteName: normalizeLocalizedString(raw.siteName) }
      : {}),
    ...(normalizeLocalizedString(raw.siteDescription)
      ? { siteDescription: normalizeLocalizedString(raw.siteDescription) }
      : {}),
    ...(normalizeLocalizedString(raw.authHeroBadge)
      ? { authHeroBadge: normalizeLocalizedString(raw.authHeroBadge) }
      : {}),
    ...(normalizeLocalizedString(raw.authHeroTitle)
      ? { authHeroTitle: normalizeLocalizedString(raw.authHeroTitle) }
      : {}),
    ...(normalizeLocalizedString(raw.authHeroDescription)
      ? {
          authHeroDescription: normalizeLocalizedString(
            raw.authHeroDescription,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.metaTitle)
      ? { metaTitle: normalizeLocalizedString(raw.metaTitle) }
      : {}),
    ...(normalizeLocalizedString(raw.metaDescription)
      ? { metaDescription: normalizeLocalizedString(raw.metaDescription) }
      : {}),
    ...(metaKeywords ? { metaKeywords } : {}),
  };

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeSiteSettingsTranslations(
  value: unknown,
): SiteSettingsTranslations | undefined {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as Record<string, unknown>;
  const tr = normalizeSiteSettingsLocaleOverrides(raw.tr);

  if (!tr) {
    return undefined;
  }

  return { tr };
}

function normalizeSiteChromeLinkTranslation(
  value: unknown,
): SiteChromeLinkTranslation | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const label = normalizeLocalizedString(raw.label);

  if (!label) {
    return null;
  }

  return { label };
}

function normalizeSiteChromeFooterGroupTranslation(
  value: unknown,
): SiteChromeFooterGroupTranslation | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const title = normalizeLocalizedString(raw.title);
  const links = Array.isArray(raw.links)
    ? raw.links.map((item) => normalizeSiteChromeLinkTranslation(item))
    : [];

  if (!title && !links.some(Boolean)) {
    return null;
  }

  return {
    ...(title ? { title } : {}),
    ...(links.some(Boolean) ? { links: links.map((item) => item ?? {}) } : {}),
  };
}

function normalizeHomepageChromeLocaleOverrides(
  value: unknown,
): HomepageChromeLocaleOverrides | undefined {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as Record<string, unknown>;
  const headerLinks = Array.isArray(raw.headerLinks)
    ? raw.headerLinks.map((item) => normalizeSiteChromeLinkTranslation(item))
    : [];
  const siteliyoHeaderLinks = Array.isArray(raw.siteliyoHeaderLinks)
    ? raw.siteliyoHeaderLinks.map((item) =>
        normalizeSiteChromeLinkTranslation(item),
      )
    : [];
  const footerGroups = Array.isArray(raw.footerGroups)
    ? raw.footerGroups.map((item) =>
        normalizeSiteChromeFooterGroupTranslation(item),
      )
    : [];
  const siteliyoFooterGroups = Array.isArray(raw.siteliyoFooterGroups)
    ? raw.siteliyoFooterGroups.map((item) =>
        normalizeSiteChromeFooterGroupTranslation(item),
      )
    : [];
  const siteliyoAuthTags = Array.isArray(raw.siteliyoAuthTags)
    ? raw.siteliyoAuthTags
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : typeof raw.siteliyoAuthTags === "string"
      ? raw.siteliyoAuthTags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  const normalized: HomepageChromeLocaleOverrides = {
    ...(normalizeLocalizedString(raw.guestPrimaryCtaLabel)
      ? {
          guestPrimaryCtaLabel: normalizeLocalizedString(
            raw.guestPrimaryCtaLabel,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.guestSecondaryCtaLabel)
      ? {
          guestSecondaryCtaLabel: normalizeLocalizedString(
            raw.guestSecondaryCtaLabel,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.footerDescription)
      ? { footerDescription: normalizeLocalizedString(raw.footerDescription) }
      : {}),
    ...(normalizeLocalizedString(raw.footerBottomText)
      ? { footerBottomText: normalizeLocalizedString(raw.footerBottomText) }
      : {}),
    ...(normalizeLocalizedString(raw.siteliyoFooterDescription)
      ? {
          siteliyoFooterDescription: normalizeLocalizedString(
            raw.siteliyoFooterDescription,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.siteliyoFooterBottomText)
      ? {
          siteliyoFooterBottomText: normalizeLocalizedString(
            raw.siteliyoFooterBottomText,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.siteliyoAuthWelcomeTitle)
      ? {
          siteliyoAuthWelcomeTitle: normalizeLocalizedString(
            raw.siteliyoAuthWelcomeTitle,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.siteliyoAuthLeftHeadline)
      ? {
          siteliyoAuthLeftHeadline: normalizeLocalizedString(
            raw.siteliyoAuthLeftHeadline,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.siteliyoAuthLeftSubtitle)
      ? {
          siteliyoAuthLeftSubtitle: normalizeLocalizedString(
            raw.siteliyoAuthLeftSubtitle,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.siteliyoLoginSubtitle)
      ? {
          siteliyoLoginSubtitle: normalizeLocalizedString(
            raw.siteliyoLoginSubtitle,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.siteliyoSignupSubtitle)
      ? {
          siteliyoSignupSubtitle: normalizeLocalizedString(
            raw.siteliyoSignupSubtitle,
          ),
        }
      : {}),
    ...(siteliyoAuthTags.length > 0 ? { siteliyoAuthTags } : {}),
    ...(headerLinks.some(Boolean)
      ? { headerLinks: headerLinks.map((item) => item ?? {}) }
      : {}),
    ...(siteliyoHeaderLinks.some(Boolean)
      ? { siteliyoHeaderLinks: siteliyoHeaderLinks.map((item) => item ?? {}) }
      : {}),
    ...(footerGroups.some(Boolean)
      ? { footerGroups: footerGroups.map((item) => item ?? {}) }
      : {}),
    ...(siteliyoFooterGroups.some(Boolean)
      ? { siteliyoFooterGroups: siteliyoFooterGroups.map((item) => item ?? {}) }
      : {}),
  };

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeHomepageChromeTranslations(
  value: unknown,
): HomepageChromeTranslations | undefined {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as Record<string, unknown>;
  const tr = normalizeHomepageChromeLocaleOverrides(raw.tr);

  if (!tr) {
    return undefined;
  }

  return { tr };
}

function normalizeSiteliyoLandingOverviewCardTranslation(
  value: unknown,
): SiteliyoLandingOverviewCardTranslation | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const title = normalizeLocalizedString(raw.title);
  const description = normalizeLocalizedString(raw.description);

  if (!title && !description) {
    return null;
  }

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
  };
}

function normalizeSiteliyoLandingWorkflowHighlightTranslation(
  value: unknown,
): SiteliyoLandingWorkflowHighlightTranslation | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const title = normalizeLocalizedString(raw.title);
  const description = normalizeLocalizedString(raw.description);

  if (!title && !description) {
    return null;
  }

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
  };
}

function normalizeSiteliyoLandingFeatureCardTranslation(
  value: unknown,
): SiteliyoLandingFeatureCardTranslation | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const title = normalizeLocalizedString(raw.title);
  const description = normalizeLocalizedString(raw.description);

  if (!title && !description) {
    return null;
  }

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
  };
}

function normalizeSiteliyoLandingTestimonialTranslation(
  value: unknown,
): SiteliyoLandingTestimonialTranslation | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const quote = normalizeLocalizedString(raw.quote);
  const name = normalizeLocalizedString(raw.name);
  const role = normalizeLocalizedString(raw.role);
  const company = normalizeLocalizedString(raw.company);

  if (!quote && !name && !role && !company) {
    return null;
  }

  return {
    ...(quote ? { quote } : {}),
    ...(name ? { name } : {}),
    ...(role ? { role } : {}),
    ...(company ? { company } : {}),
  };
}

function normalizeSiteliyoLandingFaqTranslation(
  value: unknown,
): SiteliyoLandingFaqTranslation | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const question = normalizeLocalizedString(raw.question);
  const answer = normalizeLocalizedString(raw.answer);

  if (!question && !answer) {
    return null;
  }

  return {
    ...(question ? { question } : {}),
    ...(answer ? { answer } : {}),
  };
}

function normalizeSiteliyoLandingLocaleOverrides(
  value: unknown,
): SiteliyoLandingLocaleOverrides | undefined {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as Record<string, unknown>;
  const overviewCards = Array.isArray(raw.overviewCards)
    ? raw.overviewCards
        .slice(0, 8)
        .map((item) => normalizeSiteliyoLandingOverviewCardTranslation(item))
    : [];
  const workflowHighlights = Array.isArray(raw.workflowHighlights)
    ? raw.workflowHighlights
        .slice(0, 8)
        .map((item) =>
          normalizeSiteliyoLandingWorkflowHighlightTranslation(item),
        )
    : [];
  const featureCards = Array.isArray(raw.featureCards)
    ? raw.featureCards
        .slice(0, 8)
        .map((item) => normalizeSiteliyoLandingFeatureCardTranslation(item))
    : [];
  const testimonials = Array.isArray(raw.testimonials)
    ? raw.testimonials
        .slice(0, 8)
        .map((item) => normalizeSiteliyoLandingTestimonialTranslation(item))
    : [];
  const faqs = Array.isArray(raw.faqs)
    ? raw.faqs
        .slice(0, 12)
        .map((item) => normalizeSiteliyoLandingFaqTranslation(item))
    : [];

  const normalized: SiteliyoLandingLocaleOverrides = {
    ...(normalizeLocalizedString(raw.brandLabel)
      ? { brandLabel: normalizeLocalizedString(raw.brandLabel) }
      : {}),
    ...(normalizeLocalizedString(raw.heroBadge)
      ? { heroBadge: normalizeLocalizedString(raw.heroBadge) }
      : {}),
    ...(normalizeLocalizedString(raw.heroTitle)
      ? { heroTitle: normalizeLocalizedString(raw.heroTitle) }
      : {}),
    ...(normalizeLocalizedString(raw.heroDescription)
      ? { heroDescription: normalizeLocalizedString(raw.heroDescription) }
      : {}),
    ...(normalizeLocalizedString(raw.heroPrimaryCtaLabel)
      ? {
          heroPrimaryCtaLabel: normalizeLocalizedString(
            raw.heroPrimaryCtaLabel,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.heroPromptPlaceholder)
      ? {
          heroPromptPlaceholder: normalizeLocalizedString(
            raw.heroPromptPlaceholder,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.heroPreviewAlt)
      ? { heroPreviewAlt: normalizeLocalizedString(raw.heroPreviewAlt) }
      : {}),
    ...(normalizeLocalizedString(raw.trustedByText)
      ? { trustedByText: normalizeLocalizedString(raw.trustedByText) }
      : {}),
    ...(normalizeLocalizedString(raw.overviewSectionEyebrow)
      ? {
          overviewSectionEyebrow: normalizeLocalizedString(
            raw.overviewSectionEyebrow,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.overviewSectionTitle)
      ? {
          overviewSectionTitle: normalizeLocalizedString(
            raw.overviewSectionTitle,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.overviewSectionDescription)
      ? {
          overviewSectionDescription: normalizeLocalizedString(
            raw.overviewSectionDescription,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.workflowSectionEyebrow)
      ? {
          workflowSectionEyebrow: normalizeLocalizedString(
            raw.workflowSectionEyebrow,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.workflowSectionTitle)
      ? {
          workflowSectionTitle: normalizeLocalizedString(
            raw.workflowSectionTitle,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.workflowSectionDescription)
      ? {
          workflowSectionDescription: normalizeLocalizedString(
            raw.workflowSectionDescription,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.workflowEditorPreviewAlt)
      ? {
          workflowEditorPreviewAlt: normalizeLocalizedString(
            raw.workflowEditorPreviewAlt,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.featureSectionEyebrow)
      ? {
          featureSectionEyebrow: normalizeLocalizedString(
            raw.featureSectionEyebrow,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.featureSectionTitle)
      ? {
          featureSectionTitle: normalizeLocalizedString(
            raw.featureSectionTitle,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.testimonialsSectionEyebrow)
      ? {
          testimonialsSectionEyebrow: normalizeLocalizedString(
            raw.testimonialsSectionEyebrow,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.testimonialsSectionTitle)
      ? {
          testimonialsSectionTitle: normalizeLocalizedString(
            raw.testimonialsSectionTitle,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.testimonialsSectionDescription)
      ? {
          testimonialsSectionDescription: normalizeLocalizedString(
            raw.testimonialsSectionDescription,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.faqSectionEyebrow)
      ? {
          faqSectionEyebrow: normalizeLocalizedString(raw.faqSectionEyebrow),
        }
      : {}),
    ...(normalizeLocalizedString(raw.faqSectionTitle)
      ? { faqSectionTitle: normalizeLocalizedString(raw.faqSectionTitle) }
      : {}),
    ...(normalizeLocalizedString(raw.finalCtaTitle)
      ? { finalCtaTitle: normalizeLocalizedString(raw.finalCtaTitle) }
      : {}),
    ...(normalizeLocalizedString(raw.finalCtaDescription)
      ? {
          finalCtaDescription: normalizeLocalizedString(
            raw.finalCtaDescription,
          ),
        }
      : {}),
    ...(normalizeLocalizedString(raw.finalCtaLabel)
      ? { finalCtaLabel: normalizeLocalizedString(raw.finalCtaLabel) }
      : {}),
    ...(overviewCards.some(Boolean)
      ? { overviewCards: overviewCards.map((item) => item ?? {}) }
      : {}),
    ...(workflowHighlights.some(Boolean)
      ? { workflowHighlights: workflowHighlights.map((item) => item ?? {}) }
      : {}),
    ...(featureCards.some(Boolean)
      ? { featureCards: featureCards.map((item) => item ?? {}) }
      : {}),
    ...(testimonials.some(Boolean)
      ? { testimonials: testimonials.map((item) => item ?? {}) }
      : {}),
    ...(faqs.some(Boolean) ? { faqs: faqs.map((item) => item ?? {}) } : {}),
  };

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeSiteliyoLandingTranslations(
  value: unknown,
): SiteliyoLandingTranslations | undefined {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as Record<string, unknown>;
  const tr = normalizeSiteliyoLandingLocaleOverrides(raw.tr);

  if (!tr) {
    return undefined;
  }

  return { tr };
}

function normalizeSiteliyoLandingInput(
  value: unknown,
): SiteliyoLandingSettings {
  const raw = (value ?? {}) as Record<string, unknown>;
  const translations = normalizeSiteliyoLandingTranslations(raw.translations);

  const logoLabels = Array.isArray(raw.logoLabels)
    ? raw.logoLabels
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 10)
    : DEFAULT_SITELIYO_LANDING.logoLabels;

  const overviewCards = Array.isArray(raw.overviewCards)
    ? raw.overviewCards.slice(0, 6).map((item, index) =>
        normalizeSiteliyoLandingOverviewCard(
          item,
          DEFAULT_SITELIYO_LANDING.overviewCards[index] ?? {
            icon: `${index + 1}`,
            title: `Card ${index + 1}`,
            description: "Add a short description.",
          },
        ),
      )
    : DEFAULT_SITELIYO_LANDING.overviewCards;

  const workflowHighlights = Array.isArray(raw.workflowHighlights)
    ? raw.workflowHighlights.slice(0, 8).map((item, index) =>
        normalizeSiteliyoLandingWorkflowHighlight(
          item,
          DEFAULT_SITELIYO_LANDING.workflowHighlights[index] ?? {
            title: `Highlight ${index + 1}`,
            description: "Add a short description.",
          },
        ),
      )
    : DEFAULT_SITELIYO_LANDING.workflowHighlights;

  const featureCards = Array.isArray(raw.featureCards)
    ? raw.featureCards.slice(0, 8).map((item, index) =>
        normalizeSiteliyoLandingFeatureCard(
          item,
          DEFAULT_SITELIYO_LANDING.featureCards[index] ?? {
            title: `Feature ${index + 1}`,
            description: "Add a short description.",
            image: DEFAULT_SITELIYO_LANDING.featureCards[0]?.image ?? "",
          },
        ),
      )
    : DEFAULT_SITELIYO_LANDING.featureCards;

  const testimonials = Array.isArray(raw.testimonials)
    ? raw.testimonials.slice(0, 8).map((item, index) =>
        normalizeSiteliyoLandingTestimonial(
          item,
          DEFAULT_SITELIYO_LANDING.testimonials[index] ?? {
            quote: "Add a testimonial quote.",
            name: `Customer ${index + 1}`,
            role: "Role",
            company: "Company",
            rating: 5,
            image: "",
          },
        ),
      )
    : DEFAULT_SITELIYO_LANDING.testimonials;

  const faqs = Array.isArray(raw.faqs)
    ? raw.faqs.slice(0, 12).map((item, index) =>
        normalizeSiteliyoLandingFaq(
          item,
          DEFAULT_SITELIYO_LANDING.faqs[index] ?? {
            question: `FAQ ${index + 1}`,
          },
        ),
      )
    : DEFAULT_SITELIYO_LANDING.faqs;

  return {
    brandLabel:
      typeof raw.brandLabel === "string" && raw.brandLabel.trim()
        ? raw.brandLabel.trim()
        : DEFAULT_SITELIYO_LANDING.brandLabel,
    heroBadge:
      typeof raw.heroBadge === "string" && raw.heroBadge.trim()
        ? raw.heroBadge.trim()
        : DEFAULT_SITELIYO_LANDING.heroBadge,
    enableHeroBadge:
      typeof raw.enableHeroBadge === "boolean"
        ? raw.enableHeroBadge
        : DEFAULT_SITELIYO_LANDING.enableHeroBadge,
    heroTitle:
      typeof raw.heroTitle === "string" && raw.heroTitle.trim()
        ? raw.heroTitle.trim()
        : DEFAULT_SITELIYO_LANDING.heroTitle,
    enableHeroTitle:
      typeof raw.enableHeroTitle === "boolean"
        ? raw.enableHeroTitle
        : DEFAULT_SITELIYO_LANDING.enableHeroTitle,
    heroDescription:
      typeof raw.heroDescription === "string" && raw.heroDescription.trim()
        ? raw.heroDescription.trim()
        : DEFAULT_SITELIYO_LANDING.heroDescription,
    enableHeroDescription:
      typeof raw.enableHeroDescription === "boolean"
        ? raw.enableHeroDescription
        : DEFAULT_SITELIYO_LANDING.enableHeroDescription,
    heroPrimaryCtaLabel:
      typeof raw.heroPrimaryCtaLabel === "string" &&
      raw.heroPrimaryCtaLabel.trim()
        ? raw.heroPrimaryCtaLabel.trim()
        : DEFAULT_SITELIYO_LANDING.heroPrimaryCtaLabel,
    heroPrimaryCtaHref:
      typeof raw.heroPrimaryCtaHref === "string" &&
      raw.heroPrimaryCtaHref.trim()
        ? raw.heroPrimaryCtaHref.trim()
        : DEFAULT_SITELIYO_LANDING.heroPrimaryCtaHref,
    enableHeroPrimaryCta:
      typeof raw.enableHeroPrimaryCta === "boolean"
        ? raw.enableHeroPrimaryCta
        : DEFAULT_SITELIYO_LANDING.enableHeroPrimaryCta,
    heroPromptPlaceholder:
      typeof raw.heroPromptPlaceholder === "string" &&
      raw.heroPromptPlaceholder.trim()
        ? raw.heroPromptPlaceholder.trim()
        : DEFAULT_SITELIYO_LANDING.heroPromptPlaceholder,
    enableHeroPromptPanel:
      typeof raw.enableHeroPromptPanel === "boolean"
        ? raw.enableHeroPromptPanel
        : DEFAULT_SITELIYO_LANDING.enableHeroPromptPanel,
    heroPreviewImage:
      typeof raw.heroPreviewImage === "string" && raw.heroPreviewImage.trim()
        ? raw.heroPreviewImage.trim()
        : DEFAULT_SITELIYO_LANDING.heroPreviewImage,
    heroPreviewAlt:
      typeof raw.heroPreviewAlt === "string" && raw.heroPreviewAlt.trim()
        ? raw.heroPreviewAlt.trim()
        : DEFAULT_SITELIYO_LANDING.heroPreviewAlt,
    enableHeroPreview:
      typeof raw.enableHeroPreview === "boolean"
        ? raw.enableHeroPreview
        : DEFAULT_SITELIYO_LANDING.enableHeroPreview,
    trustedByText:
      typeof raw.trustedByText === "string" && raw.trustedByText.trim()
        ? raw.trustedByText.trim()
        : DEFAULT_SITELIYO_LANDING.trustedByText,
    logoLabels:
      logoLabels.length > 0 ? logoLabels : DEFAULT_SITELIYO_LANDING.logoLabels,
    enableLogoSection:
      typeof raw.enableLogoSection === "boolean"
        ? raw.enableLogoSection
        : DEFAULT_SITELIYO_LANDING.enableLogoSection,
    overviewSectionEyebrow:
      typeof raw.overviewSectionEyebrow === "string" &&
      raw.overviewSectionEyebrow.trim()
        ? raw.overviewSectionEyebrow.trim()
        : DEFAULT_SITELIYO_LANDING.overviewSectionEyebrow,
    overviewSectionTitle:
      typeof raw.overviewSectionTitle === "string" &&
      raw.overviewSectionTitle.trim()
        ? raw.overviewSectionTitle.trim()
        : DEFAULT_SITELIYO_LANDING.overviewSectionTitle,
    overviewSectionDescription:
      typeof raw.overviewSectionDescription === "string" &&
      raw.overviewSectionDescription.trim()
        ? raw.overviewSectionDescription.trim()
        : DEFAULT_SITELIYO_LANDING.overviewSectionDescription,
    overviewCards:
      overviewCards.length > 0
        ? overviewCards
        : DEFAULT_SITELIYO_LANDING.overviewCards,
    enableOverviewSection:
      typeof raw.enableOverviewSection === "boolean"
        ? raw.enableOverviewSection
        : DEFAULT_SITELIYO_LANDING.enableOverviewSection,
    workflowSectionEyebrow:
      typeof raw.workflowSectionEyebrow === "string" &&
      raw.workflowSectionEyebrow.trim()
        ? raw.workflowSectionEyebrow.trim()
        : DEFAULT_SITELIYO_LANDING.workflowSectionEyebrow,
    workflowSectionTitle:
      typeof raw.workflowSectionTitle === "string" &&
      raw.workflowSectionTitle.trim()
        ? raw.workflowSectionTitle.trim()
        : DEFAULT_SITELIYO_LANDING.workflowSectionTitle,
    workflowSectionDescription:
      typeof raw.workflowSectionDescription === "string" &&
      raw.workflowSectionDescription.trim()
        ? raw.workflowSectionDescription.trim()
        : DEFAULT_SITELIYO_LANDING.workflowSectionDescription,
    workflowEditorPreviewImage:
      typeof raw.workflowEditorPreviewImage === "string" &&
      raw.workflowEditorPreviewImage.trim()
        ? raw.workflowEditorPreviewImage.trim()
        : DEFAULT_SITELIYO_LANDING.workflowEditorPreviewImage,
    workflowEditorPreviewAlt:
      typeof raw.workflowEditorPreviewAlt === "string" &&
      raw.workflowEditorPreviewAlt.trim()
        ? raw.workflowEditorPreviewAlt.trim()
        : DEFAULT_SITELIYO_LANDING.workflowEditorPreviewAlt,
    workflowHighlights:
      workflowHighlights.length > 0
        ? workflowHighlights
        : DEFAULT_SITELIYO_LANDING.workflowHighlights,
    enableWorkflowSection:
      typeof raw.enableWorkflowSection === "boolean"
        ? raw.enableWorkflowSection
        : DEFAULT_SITELIYO_LANDING.enableWorkflowSection,
    featureSectionEyebrow:
      typeof raw.featureSectionEyebrow === "string" &&
      raw.featureSectionEyebrow.trim()
        ? raw.featureSectionEyebrow.trim()
        : DEFAULT_SITELIYO_LANDING.featureSectionEyebrow,
    featureSectionTitle:
      typeof raw.featureSectionTitle === "string" &&
      raw.featureSectionTitle.trim()
        ? raw.featureSectionTitle.trim()
        : DEFAULT_SITELIYO_LANDING.featureSectionTitle,
    featureCards:
      featureCards.length > 0
        ? featureCards
        : DEFAULT_SITELIYO_LANDING.featureCards,
    enableFeatureSection:
      typeof raw.enableFeatureSection === "boolean"
        ? raw.enableFeatureSection
        : DEFAULT_SITELIYO_LANDING.enableFeatureSection,
    testimonialsSectionEyebrow:
      typeof raw.testimonialsSectionEyebrow === "string" &&
      raw.testimonialsSectionEyebrow.trim()
        ? raw.testimonialsSectionEyebrow.trim()
        : DEFAULT_SITELIYO_LANDING.testimonialsSectionEyebrow,
    testimonialsSectionTitle:
      typeof raw.testimonialsSectionTitle === "string" &&
      raw.testimonialsSectionTitle.trim()
        ? raw.testimonialsSectionTitle.trim()
        : DEFAULT_SITELIYO_LANDING.testimonialsSectionTitle,
    testimonialsSectionDescription:
      typeof raw.testimonialsSectionDescription === "string" &&
      raw.testimonialsSectionDescription.trim()
        ? raw.testimonialsSectionDescription.trim()
        : DEFAULT_SITELIYO_LANDING.testimonialsSectionDescription,
    testimonials:
      testimonials.length > 0
        ? testimonials
        : DEFAULT_SITELIYO_LANDING.testimonials,
    enableTestimonialsSection:
      typeof raw.enableTestimonialsSection === "boolean"
        ? raw.enableTestimonialsSection
        : DEFAULT_SITELIYO_LANDING.enableTestimonialsSection,
    faqSectionEyebrow:
      typeof raw.faqSectionEyebrow === "string" && raw.faqSectionEyebrow.trim()
        ? raw.faqSectionEyebrow.trim()
        : DEFAULT_SITELIYO_LANDING.faqSectionEyebrow,
    faqSectionTitle:
      typeof raw.faqSectionTitle === "string" && raw.faqSectionTitle.trim()
        ? raw.faqSectionTitle.trim()
        : DEFAULT_SITELIYO_LANDING.faqSectionTitle,
    faqs: faqs.length > 0 ? faqs : DEFAULT_SITELIYO_LANDING.faqs,
    enableFaqSection:
      typeof raw.enableFaqSection === "boolean"
        ? raw.enableFaqSection
        : DEFAULT_SITELIYO_LANDING.enableFaqSection,
    finalCtaTitle:
      typeof raw.finalCtaTitle === "string" && raw.finalCtaTitle.trim()
        ? raw.finalCtaTitle.trim()
        : DEFAULT_SITELIYO_LANDING.finalCtaTitle,
    finalCtaDescription:
      typeof raw.finalCtaDescription === "string" &&
      raw.finalCtaDescription.trim()
        ? raw.finalCtaDescription.trim()
        : DEFAULT_SITELIYO_LANDING.finalCtaDescription,
    finalCtaLabel:
      typeof raw.finalCtaLabel === "string" && raw.finalCtaLabel.trim()
        ? raw.finalCtaLabel.trim()
        : DEFAULT_SITELIYO_LANDING.finalCtaLabel,
    finalCtaHref:
      typeof raw.finalCtaHref === "string" && raw.finalCtaHref.trim()
        ? raw.finalCtaHref.trim()
        : DEFAULT_SITELIYO_LANDING.finalCtaHref,
    enableFinalCtaSection:
      typeof raw.enableFinalCtaSection === "boolean"
        ? raw.enableFinalCtaSection
        : DEFAULT_SITELIYO_LANDING.enableFinalCtaSection,
    translations,
  };
}

export function resolveSiteliyoLandingForLocale(
  landing: SiteliyoLandingSettings,
  locale: "en" | "tr",
): SiteliyoLandingSettings {
  if (locale !== "tr") {
    return landing;
  }

  const tr = landing.translations?.tr;

  if (!tr) {
    return landing;
  }

  return {
    ...landing,
    brandLabel: tr.brandLabel ?? landing.brandLabel,
    heroBadge: tr.heroBadge ?? landing.heroBadge,
    heroTitle: tr.heroTitle ?? landing.heroTitle,
    heroDescription: tr.heroDescription ?? landing.heroDescription,
    heroPrimaryCtaLabel: tr.heroPrimaryCtaLabel ?? landing.heroPrimaryCtaLabel,
    heroPromptPlaceholder:
      tr.heroPromptPlaceholder ?? landing.heroPromptPlaceholder,
    heroPreviewAlt: tr.heroPreviewAlt ?? landing.heroPreviewAlt,
    trustedByText: tr.trustedByText ?? landing.trustedByText,
    overviewSectionEyebrow:
      tr.overviewSectionEyebrow ?? landing.overviewSectionEyebrow,
    overviewSectionTitle:
      tr.overviewSectionTitle ?? landing.overviewSectionTitle,
    overviewSectionDescription:
      tr.overviewSectionDescription ?? landing.overviewSectionDescription,
    overviewCards: landing.overviewCards.map((card, index) => ({
      ...card,
      title: tr.overviewCards?.[index]?.title ?? card.title,
      description: tr.overviewCards?.[index]?.description ?? card.description,
    })),
    workflowSectionEyebrow:
      tr.workflowSectionEyebrow ?? landing.workflowSectionEyebrow,
    workflowSectionTitle:
      tr.workflowSectionTitle ?? landing.workflowSectionTitle,
    workflowSectionDescription:
      tr.workflowSectionDescription ?? landing.workflowSectionDescription,
    workflowEditorPreviewAlt:
      tr.workflowEditorPreviewAlt ?? landing.workflowEditorPreviewAlt,
    workflowHighlights: landing.workflowHighlights.map((item, index) => ({
      ...item,
      title: tr.workflowHighlights?.[index]?.title ?? item.title,
      description:
        tr.workflowHighlights?.[index]?.description ?? item.description,
    })),
    featureSectionEyebrow:
      tr.featureSectionEyebrow ?? landing.featureSectionEyebrow,
    featureSectionTitle: tr.featureSectionTitle ?? landing.featureSectionTitle,
    featureCards: landing.featureCards.map((card, index) => ({
      ...card,
      title: tr.featureCards?.[index]?.title ?? card.title,
      description: tr.featureCards?.[index]?.description ?? card.description,
    })),
    testimonialsSectionEyebrow:
      tr.testimonialsSectionEyebrow ?? landing.testimonialsSectionEyebrow,
    testimonialsSectionTitle:
      tr.testimonialsSectionTitle ?? landing.testimonialsSectionTitle,
    testimonialsSectionDescription:
      tr.testimonialsSectionDescription ??
      landing.testimonialsSectionDescription,
    testimonials: landing.testimonials.map((testimonial, index) => ({
      ...testimonial,
      quote: tr.testimonials?.[index]?.quote ?? testimonial.quote,
      name: tr.testimonials?.[index]?.name ?? testimonial.name,
      role: tr.testimonials?.[index]?.role ?? testimonial.role,
      company: tr.testimonials?.[index]?.company ?? testimonial.company,
    })),
    faqSectionEyebrow: tr.faqSectionEyebrow ?? landing.faqSectionEyebrow,
    faqSectionTitle: tr.faqSectionTitle ?? landing.faqSectionTitle,
    faqs: landing.faqs.map((faq, index) => ({
      ...faq,
      question: tr.faqs?.[index]?.question ?? faq.question,
      answer: tr.faqs?.[index]?.answer ?? faq.answer,
    })),
    finalCtaTitle: tr.finalCtaTitle ?? landing.finalCtaTitle,
    finalCtaDescription: tr.finalCtaDescription ?? landing.finalCtaDescription,
    finalCtaLabel: tr.finalCtaLabel ?? landing.finalCtaLabel,
  };
}

export function resolveHomepageChromeForLocale(
  homepageChrome: HomepageChromeSettings,
  locale: "en" | "tr",
): HomepageChromeSettings {
  if (locale !== "tr") {
    return homepageChrome;
  }

  const tr = homepageChrome.translations?.tr;

  if (!tr) {
    return homepageChrome;
  }

  return {
    ...homepageChrome,
    headerLinks: homepageChrome.headerLinks.map((link, index) => ({
      ...link,
      label: tr.headerLinks?.[index]?.label ?? link.label,
    })),
    siteliyoHeaderLinks: homepageChrome.siteliyoHeaderLinks.map(
      (link, index) => ({
        ...link,
        label: tr.siteliyoHeaderLinks?.[index]?.label ?? link.label,
      }),
    ),
    guestPrimaryCtaLabel:
      tr.guestPrimaryCtaLabel ?? homepageChrome.guestPrimaryCtaLabel,
    guestSecondaryCtaLabel:
      tr.guestSecondaryCtaLabel ?? homepageChrome.guestSecondaryCtaLabel,
    footerDescription: tr.footerDescription ?? homepageChrome.footerDescription,
    footerGroups: homepageChrome.footerGroups.map((group, groupIndex) => ({
      ...group,
      title: tr.footerGroups?.[groupIndex]?.title ?? group.title,
      links: group.links.map((link, linkIndex) => ({
        ...link,
        label:
          tr.footerGroups?.[groupIndex]?.links?.[linkIndex]?.label ??
          link.label,
      })),
    })),
    footerBottomText: tr.footerBottomText ?? homepageChrome.footerBottomText,
    siteliyoFooterDescription:
      tr.siteliyoFooterDescription ?? homepageChrome.siteliyoFooterDescription,
    siteliyoFooterGroups: homepageChrome.siteliyoFooterGroups.map(
      (group, groupIndex) => ({
        ...group,
        title: tr.siteliyoFooterGroups?.[groupIndex]?.title ?? group.title,
        links: group.links.map((link, linkIndex) => ({
          ...link,
          label:
            tr.siteliyoFooterGroups?.[groupIndex]?.links?.[linkIndex]?.label ??
            link.label,
        })),
      }),
    ),
    siteliyoFooterBottomText:
      tr.siteliyoFooterBottomText ?? homepageChrome.siteliyoFooterBottomText,
    siteliyoAuthWelcomeTitle:
      tr.siteliyoAuthWelcomeTitle ?? homepageChrome.siteliyoAuthWelcomeTitle,
    siteliyoAuthLeftHeadline:
      tr.siteliyoAuthLeftHeadline ?? homepageChrome.siteliyoAuthLeftHeadline,
    siteliyoAuthLeftSubtitle:
      tr.siteliyoAuthLeftSubtitle ?? homepageChrome.siteliyoAuthLeftSubtitle,
    siteliyoAuthTags:
      tr.siteliyoAuthTags && tr.siteliyoAuthTags.length > 0
        ? tr.siteliyoAuthTags
        : homepageChrome.siteliyoAuthTags,
    siteliyoLoginSubtitle:
      tr.siteliyoLoginSubtitle ?? homepageChrome.siteliyoLoginSubtitle,
    siteliyoSignupSubtitle:
      tr.siteliyoSignupSubtitle ?? homepageChrome.siteliyoSignupSubtitle,
  };
}

export function resolveSiteSettingsForLocale(
  settings: SiteSettings,
  locale: "en" | "tr",
): SiteSettings {
  if (locale !== "tr") {
    return settings;
  }

  const tr = settings.translations?.tr;

  if (!tr) {
    return settings;
  }

  return {
    ...settings,
    siteName: tr.siteName ?? settings.siteName,
    siteDescription: tr.siteDescription ?? settings.siteDescription,
    authHeroBadge: tr.authHeroBadge ?? settings.authHeroBadge,
    authHeroTitle: tr.authHeroTitle ?? settings.authHeroTitle,
    authHeroDescription: tr.authHeroDescription ?? settings.authHeroDescription,
    metaTitle: tr.metaTitle ?? settings.metaTitle,
    metaDescription: tr.metaDescription ?? settings.metaDescription,
    metaKeywords:
      tr.metaKeywords && tr.metaKeywords.length > 0
        ? tr.metaKeywords
        : settings.metaKeywords,
  };
}

export function normalizeHomepageChromeInput(
  value: unknown,
): HomepageChromeSettings {
  const raw = (value ?? {}) as Record<string, unknown>;
  const translations = normalizeHomepageChromeTranslations(raw.translations);
  const headerLinks = Array.isArray(raw.headerLinks)
    ? raw.headerLinks
        .slice(0, 8)
        .map((item, index) =>
          normalizeSiteChromeLink(
            item,
            DEFAULT_HOMEPAGE_CHROME.headerLinks[index] ?? {
              label: `Link ${index + 1}`,
              href: "#",
            },
          ),
        )
        .filter((item) => item.label && item.href)
    : DEFAULT_HOMEPAGE_CHROME.headerLinks;
  const footerGroups = Array.isArray(raw.footerGroups)
    ? raw.footerGroups.slice(0, 4).map((item, index) =>
        normalizeSiteChromeFooterGroup(
          item,
          DEFAULT_HOMEPAGE_CHROME.footerGroups[index] ?? {
            title: `Group ${index + 1}`,
            links: [{ label: "Link", href: "#" }],
          },
        ),
      )
    : DEFAULT_HOMEPAGE_CHROME.footerGroups;
  const siteliyoHeaderLinks = Array.isArray(raw.siteliyoHeaderLinks)
    ? raw.siteliyoHeaderLinks
        .slice(0, 6)
        .map((item, index) =>
          normalizeSiteChromeLink(
            item,
            DEFAULT_HOMEPAGE_CHROME.siteliyoHeaderLinks[index] ?? {
              label: `Link ${index + 1}`,
              href: "#",
            },
          ),
        )
        .filter((item) => item.label && item.href)
    : DEFAULT_HOMEPAGE_CHROME.siteliyoHeaderLinks;
  const siteliyoFooterGroups = Array.isArray(raw.siteliyoFooterGroups)
    ? raw.siteliyoFooterGroups.slice(0, 4).map((item, index) =>
        normalizeSiteChromeFooterGroup(
          item,
          DEFAULT_HOMEPAGE_CHROME.siteliyoFooterGroups[index] ?? {
            title: `Group ${index + 1}`,
            links: [{ label: "Link", href: "#" }],
          },
        ),
      )
    : DEFAULT_HOMEPAGE_CHROME.siteliyoFooterGroups;
  const footerSocialLinks = normalizeSiteChromeSocialLinks(
    raw.footerSocialLinks,
    DEFAULT_HOMEPAGE_CHROME.footerSocialLinks,
  );
  const siteliyoFooterSocialLinks = normalizeSiteChromeSocialLinks(
    raw.siteliyoFooterSocialLinks,
    DEFAULT_HOMEPAGE_CHROME.siteliyoFooterSocialLinks,
  );

  return {
    landingPageUi: raw.landingPageUi === "siteliyo" ? "siteliyo" : "default",
    cookieConsentPosition:
      raw.cookieConsentPosition === "bottom-right" ||
      raw.cookieConsentPosition === "top-left" ||
      raw.cookieConsentPosition === "top-right"
        ? raw.cookieConsentPosition
        : DEFAULT_HOMEPAGE_CHROME.cookieConsentPosition,
    previewProvider:
      raw.previewProvider === "builder" ||
      raw.previewProvider === "webby-builder"
        ? raw.previewProvider
        : "codesandbox",
    screenshotProvider:
      raw.screenshotProvider === "capturekit" ||
      raw.screenshotProvider === "screenshotone"
        ? raw.screenshotProvider
        : "microlink",
    libraryImageGenerationEnabled:
      typeof raw.libraryImageGenerationEnabled === "boolean"
        ? raw.libraryImageGenerationEnabled
        : DEFAULT_HOMEPAGE_CHROME.libraryImageGenerationEnabled,
    libraryVideoGenerationEnabled:
      typeof raw.libraryVideoGenerationEnabled === "boolean"
        ? raw.libraryVideoGenerationEnabled
        : DEFAULT_HOMEPAGE_CHROME.libraryVideoGenerationEnabled,
    libraryImageProvider:
      raw.libraryImageProvider === "openai" ? "openai" : "google",
    libraryVideoProvider:
      raw.libraryVideoProvider === "openai" ? "openai" : "google",
    geminiImageModelId:
      typeof raw.geminiImageModelId === "string"
        ? raw.geminiImageModelId.trim()
        : DEFAULT_HOMEPAGE_CHROME.geminiImageModelId,
    geminiVideoModelId:
      typeof raw.geminiVideoModelId === "string"
        ? raw.geminiVideoModelId.trim()
        : DEFAULT_HOMEPAGE_CHROME.geminiVideoModelId,
    openAiImageModelId:
      typeof raw.openAiImageModelId === "string"
        ? raw.openAiImageModelId.trim()
        : DEFAULT_HOMEPAGE_CHROME.openAiImageModelId,
    openAiVideoModelId:
      typeof raw.openAiVideoModelId === "string"
        ? raw.openAiVideoModelId.trim()
        : DEFAULT_HOMEPAGE_CHROME.openAiVideoModelId,
    builderExperience: normalizeBuilderExperience(raw.builderExperience),
    codeSandboxApiKey:
      typeof raw.codeSandboxApiKey === "string"
        ? raw.codeSandboxApiKey.trim()
        : DEFAULT_HOMEPAGE_CHROME.codeSandboxApiKey,
    codeSandboxBundlerUrl:
      typeof raw.codeSandboxBundlerUrl === "string"
        ? raw.codeSandboxBundlerUrl.trim()
        : DEFAULT_HOMEPAGE_CHROME.codeSandboxBundlerUrl,
    codeSandboxTeamId:
      typeof raw.codeSandboxTeamId === "string"
        ? raw.codeSandboxTeamId.trim()
        : DEFAULT_HOMEPAGE_CHROME.codeSandboxTeamId,
    e2bApiKey:
      typeof raw.e2bApiKey === "string"
        ? raw.e2bApiKey.trim()
        : DEFAULT_HOMEPAGE_CHROME.e2bApiKey,
    e2bTemplate:
      typeof raw.e2bTemplate === "string"
        ? raw.e2bTemplate.trim()
        : DEFAULT_HOMEPAGE_CHROME.e2bTemplate,
    e2bTimeoutSeconds:
      typeof raw.e2bTimeoutSeconds === "number" &&
      Number.isFinite(raw.e2bTimeoutSeconds)
        ? Math.max(300, Math.min(86400, Math.round(raw.e2bTimeoutSeconds)))
        : DEFAULT_HOMEPAGE_CHROME.e2bTimeoutSeconds,
    webbyBuilderUrl:
      typeof raw.webbyBuilderUrl === "string"
        ? raw.webbyBuilderUrl.trim().replace(/\/+$/, "")
        : DEFAULT_HOMEPAGE_CHROME.webbyBuilderUrl,
    webbyBuilderServerKey:
      typeof raw.webbyBuilderServerKey === "string"
        ? raw.webbyBuilderServerKey.trim()
        : DEFAULT_HOMEPAGE_CHROME.webbyBuilderServerKey,
    captureKitApiKey:
      typeof raw.captureKitApiKey === "string"
        ? raw.captureKitApiKey.trim()
        : DEFAULT_HOMEPAGE_CHROME.captureKitApiKey,
    screenshotOneApiKey:
      typeof raw.screenshotOneApiKey === "string"
        ? raw.screenshotOneApiKey.trim()
        : DEFAULT_HOMEPAGE_CHROME.screenshotOneApiKey,
    screenshotOneSecretKey:
      typeof raw.screenshotOneSecretKey === "string"
        ? raw.screenshotOneSecretKey.trim()
        : DEFAULT_HOMEPAGE_CHROME.screenshotOneSecretKey,
    firebaseProjectId:
      typeof raw.firebaseProjectId === "string"
        ? raw.firebaseProjectId.trim()
        : DEFAULT_HOMEPAGE_CHROME.firebaseProjectId,
    firebaseApiKey:
      typeof raw.firebaseApiKey === "string"
        ? raw.firebaseApiKey.trim()
        : DEFAULT_HOMEPAGE_CHROME.firebaseApiKey,
    firebaseAuthDomain:
      typeof raw.firebaseAuthDomain === "string"
        ? raw.firebaseAuthDomain.trim()
        : DEFAULT_HOMEPAGE_CHROME.firebaseAuthDomain,
    firebaseStorageBucket:
      typeof raw.firebaseStorageBucket === "string"
        ? raw.firebaseStorageBucket.trim()
        : DEFAULT_HOMEPAGE_CHROME.firebaseStorageBucket,
    firebaseMessagingSenderId:
      typeof raw.firebaseMessagingSenderId === "string"
        ? raw.firebaseMessagingSenderId.trim()
        : DEFAULT_HOMEPAGE_CHROME.firebaseMessagingSenderId,
    firebaseAppId:
      typeof raw.firebaseAppId === "string"
        ? raw.firebaseAppId.trim()
        : DEFAULT_HOMEPAGE_CHROME.firebaseAppId,
    firebaseMeasurementId:
      typeof raw.firebaseMeasurementId === "string"
        ? raw.firebaseMeasurementId.trim()
        : DEFAULT_HOMEPAGE_CHROME.firebaseMeasurementId,
    firebaseCollectionPrefix:
      typeof raw.firebaseCollectionPrefix === "string"
        ? raw.firebaseCollectionPrefix.trim().replace(/^\/+|\/+$/g, "")
        : DEFAULT_HOMEPAGE_CHROME.firebaseCollectionPrefix,
    firebaseAdminSdkJson:
      typeof raw.firebaseAdminSdkJson === "string"
        ? raw.firebaseAdminSdkJson.trim()
        : DEFAULT_HOMEPAGE_CHROME.firebaseAdminSdkJson,
    clerkPublishableKey:
      typeof raw.clerkPublishableKey === "string"
        ? raw.clerkPublishableKey.trim()
        : DEFAULT_HOMEPAGE_CHROME.clerkPublishableKey,
    clerkSecretKey:
      typeof raw.clerkSecretKey === "string"
        ? raw.clerkSecretKey.trim()
        : DEFAULT_HOMEPAGE_CHROME.clerkSecretKey,
    clerkSignInUrl:
      typeof raw.clerkSignInUrl === "string"
        ? raw.clerkSignInUrl.trim()
        : DEFAULT_HOMEPAGE_CHROME.clerkSignInUrl,
    clerkSignUpUrl:
      typeof raw.clerkSignUpUrl === "string"
        ? raw.clerkSignUpUrl.trim()
        : DEFAULT_HOMEPAGE_CHROME.clerkSignUpUrl,
    clerkAfterSignInUrl:
      typeof raw.clerkAfterSignInUrl === "string"
        ? raw.clerkAfterSignInUrl.trim()
        : DEFAULT_HOMEPAGE_CHROME.clerkAfterSignInUrl,
    clerkAfterSignUpUrl:
      typeof raw.clerkAfterSignUpUrl === "string"
        ? raw.clerkAfterSignUpUrl.trim()
        : DEFAULT_HOMEPAGE_CHROME.clerkAfterSignUpUrl,
    siteliyoFigmaUrl:
      typeof raw.siteliyoFigmaUrl === "string"
        ? raw.siteliyoFigmaUrl.trim()
        : DEFAULT_HOMEPAGE_CHROME.siteliyoFigmaUrl,
    communityProjectIds: Array.isArray(raw.communityProjectIds)
      ? [
          ...new Set(
            raw.communityProjectIds.filter(
              (item): item is string =>
                typeof item === "string" && item.trim().length > 0,
            ),
          ),
        ].slice(0, 200)
      : DEFAULT_HOMEPAGE_CHROME.communityProjectIds,
    communityProjectNiches:
      raw.communityProjectNiches &&
      typeof raw.communityProjectNiches === "object" &&
      !Array.isArray(raw.communityProjectNiches)
        ? Object.fromEntries(
            Object.entries(raw.communityProjectNiches)
              .filter(
                (entry): entry is [string, string] =>
                  typeof entry[0] === "string" &&
                  entry[0].trim().length > 0 &&
                  typeof entry[1] === "string" &&
                  entry[1].trim().length > 0,
              )
              .map(([projectId, niche]) => [projectId.trim(), niche.trim()]),
          )
        : DEFAULT_HOMEPAGE_CHROME.communityProjectNiches,
    defaultHomepageTabs: normalizeDefaultHomepageTabs(
      raw.defaultHomepageTabs,
      DEFAULT_HOMEPAGE_CHROME.defaultHomepageTabs,
    ),
    signedInPromptInputStyle:
      raw.signedInPromptInputStyle === "guest-landing"
        ? "guest-landing"
        : DEFAULT_HOMEPAGE_CHROME.signedInPromptInputStyle,
    signedInModeSwitch: normalizeSignedInModeSwitch(
      raw.signedInModeSwitch,
      DEFAULT_HOMEPAGE_CHROME.signedInModeSwitch,
    ),
    maxHeroVideoUrl: normalizeOptionalUrl(raw.maxHeroVideoUrl),
    headerLinks:
      headerLinks.length > 0
        ? headerLinks
        : DEFAULT_HOMEPAGE_CHROME.headerLinks,
    siteliyoHeaderLinks:
      siteliyoHeaderLinks.length > 0
        ? siteliyoHeaderLinks
        : DEFAULT_HOMEPAGE_CHROME.siteliyoHeaderLinks,
    guestPrimaryCtaLabel:
      typeof raw.guestPrimaryCtaLabel === "string" &&
      raw.guestPrimaryCtaLabel.trim()
        ? raw.guestPrimaryCtaLabel.trim()
        : DEFAULT_HOMEPAGE_CHROME.guestPrimaryCtaLabel,
    guestPrimaryCtaHref:
      typeof raw.guestPrimaryCtaHref === "string" &&
      raw.guestPrimaryCtaHref.trim()
        ? raw.guestPrimaryCtaHref.trim()
        : DEFAULT_HOMEPAGE_CHROME.guestPrimaryCtaHref,
    guestSecondaryCtaLabel:
      typeof raw.guestSecondaryCtaLabel === "string" &&
      raw.guestSecondaryCtaLabel.trim()
        ? raw.guestSecondaryCtaLabel.trim()
        : DEFAULT_HOMEPAGE_CHROME.guestSecondaryCtaLabel,
    guestSecondaryCtaHref:
      typeof raw.guestSecondaryCtaHref === "string" &&
      raw.guestSecondaryCtaHref.trim()
        ? raw.guestSecondaryCtaHref.trim()
        : DEFAULT_HOMEPAGE_CHROME.guestSecondaryCtaHref,
    footerDescription:
      typeof raw.footerDescription === "string" && raw.footerDescription.trim()
        ? raw.footerDescription.trim()
        : DEFAULT_HOMEPAGE_CHROME.footerDescription,
    footerSocialLinks,
    footerGroups:
      footerGroups.length > 0
        ? footerGroups
        : DEFAULT_HOMEPAGE_CHROME.footerGroups,
    footerBottomText:
      typeof raw.footerBottomText === "string" && raw.footerBottomText.trim()
        ? raw.footerBottomText.trim()
        : DEFAULT_HOMEPAGE_CHROME.footerBottomText,
    siteliyoFooterDescription:
      typeof raw.siteliyoFooterDescription === "string" &&
      raw.siteliyoFooterDescription.trim()
        ? raw.siteliyoFooterDescription.trim()
        : DEFAULT_HOMEPAGE_CHROME.siteliyoFooterDescription,
    siteliyoFooterSocialLinks,
    siteliyoFooterGroups:
      siteliyoFooterGroups.length > 0
        ? siteliyoFooterGroups
        : DEFAULT_HOMEPAGE_CHROME.siteliyoFooterGroups,
    siteliyoFooterBottomText:
      typeof raw.siteliyoFooterBottomText === "string" &&
      raw.siteliyoFooterBottomText.trim()
        ? raw.siteliyoFooterBottomText.trim()
        : DEFAULT_HOMEPAGE_CHROME.siteliyoFooterBottomText,
    samplePrompts: Array.isArray(raw.samplePrompts)
      ? raw.samplePrompts
          .filter(
            (item): item is string =>
              typeof item === "string" && item.trim().length > 0,
          )
          .map((item) => item.trim())
      : DEFAULT_HOMEPAGE_CHROME.samplePrompts,
    siteliyoLanding: normalizeSiteliyoLandingInput(raw.siteliyoLanding),
    siteliyoAuthWelcomeTitle:
      typeof raw.siteliyoAuthWelcomeTitle === "string" &&
      raw.siteliyoAuthWelcomeTitle.trim()
        ? raw.siteliyoAuthWelcomeTitle.trim()
        : DEFAULT_HOMEPAGE_CHROME.siteliyoAuthWelcomeTitle,
    siteliyoAuthLeftHeadline:
      typeof raw.siteliyoAuthLeftHeadline === "string" &&
      raw.siteliyoAuthLeftHeadline.trim()
        ? raw.siteliyoAuthLeftHeadline.trim()
        : DEFAULT_HOMEPAGE_CHROME.siteliyoAuthLeftHeadline,
    siteliyoAuthLeftSubtitle:
      typeof raw.siteliyoAuthLeftSubtitle === "string" &&
      raw.siteliyoAuthLeftSubtitle.trim()
        ? raw.siteliyoAuthLeftSubtitle.trim()
        : DEFAULT_HOMEPAGE_CHROME.siteliyoAuthLeftSubtitle,
    siteliyoAuthTags: Array.isArray(raw.siteliyoAuthTags)
      ? raw.siteliyoAuthTags
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 12)
      : DEFAULT_HOMEPAGE_CHROME.siteliyoAuthTags,
    siteliyoLoginSubtitle:
      typeof raw.siteliyoLoginSubtitle === "string" &&
      raw.siteliyoLoginSubtitle.trim()
        ? raw.siteliyoLoginSubtitle.trim()
        : DEFAULT_HOMEPAGE_CHROME.siteliyoLoginSubtitle,
    siteliyoSignupSubtitle:
      typeof raw.siteliyoSignupSubtitle === "string" &&
      raw.siteliyoSignupSubtitle.trim()
        ? raw.siteliyoSignupSubtitle.trim()
        : DEFAULT_HOMEPAGE_CHROME.siteliyoSignupSubtitle,
    authHeroSlides: normalizeAuthHeroSlides(raw.authHeroSlides).slice(0, 12),
    authHeroMarqueeSpeedSeconds:
      typeof raw.authHeroMarqueeSpeedSeconds === "number" &&
      Number.isFinite(raw.authHeroMarqueeSpeedSeconds)
        ? Math.max(6, Math.min(60, Math.round(raw.authHeroMarqueeSpeedSeconds)))
        : DEFAULT_HOMEPAGE_CHROME.authHeroMarqueeSpeedSeconds,
    translations,
  };
}

function applySiteNameHomepageChromeDefaults(
  homepageChrome: HomepageChromeSettings,
  siteName: string,
): HomepageChromeSettings {
  const defaultWelcomeTitle = DEFAULT_HOMEPAGE_CHROME.siteliyoAuthWelcomeTitle;
  const nextWelcomeTitle =
    homepageChrome.siteliyoAuthWelcomeTitle === defaultWelcomeTitle
      ? `Welcome to ${siteName}`
      : homepageChrome.siteliyoAuthWelcomeTitle;

  return {
    ...homepageChrome,
    siteliyoAuthWelcomeTitle: nextWelcomeTitle,
  };
}

function sanitizeHomepageChromeSecrets(
  homepageChrome: HomepageChromeSettings,
): HomepageChromeSettings {
  return {
    ...homepageChrome,
    codeSandboxApiKey: "",
    e2bApiKey: "",
    webbyBuilderServerKey: "",
    captureKitApiKey: "",
    screenshotOneApiKey: "",
    screenshotOneSecretKey: "",
    firebaseApiKey: "",
    firebaseAdminSdkJson: "",
    clerkSecretKey: "",
  };
}

function sanitizeSiteSettingsSecrets(settings: SiteSettings): SiteSettings {
  return {
    ...settings,
    homepageChrome: sanitizeHomepageChromeSecrets(settings.homepageChrome),
  };
}

function isMissingSiteSettingsColumnError(
  error: unknown,
  column:
    | "customJs"
    | "faviconUrl"
    | "lightModeLogoUrl"
    | "darkModeLogoUrl"
    | "authHeroBadge"
    | "authHeroTitle"
    | "authHeroDescription"
    | "authHeroImageUrl"
    | "adminSignupEnabled"
    | "socialAuthButtonsEnabled"
    | "darkThemePreset"
    | "themeConfig"
    | "homepageChrome"
    | "translations"
    | "openCodeDesignAuthorityMode",
) {
  if (!error || typeof error !== "object") return false;

  const maybePrismaError = error as {
    code?: unknown;
    meta?: { column?: unknown } | null;
    message?: unknown;
  };
  const expectedColumn = `SiteSettings.${column}`;
  const metaColumn =
    typeof maybePrismaError.meta?.column === "string"
      ? maybePrismaError.meta.column
      : null;
  const message =
    typeof maybePrismaError.message === "string"
      ? maybePrismaError.message
      : "";

  return (
    maybePrismaError.code === "P2022" &&
    (metaColumn === expectedColumn ||
      metaColumn?.endsWith(`.${column}`) === true ||
      message.includes(expectedColumn) ||
      message.includes(`\`${column}\``) ||
      message.includes(`"${column}"`) ||
      message.includes(`column \`${expectedColumn}\` does not exist`) ||
      message.includes(`column "${expectedColumn}" does not exist`))
  );
}

export function normalizeSiteSettingsInput(payload: unknown): SiteSettings {
  const raw = (payload ?? {}) as Record<string, unknown>;
  const translations = normalizeSiteSettingsTranslations(raw.translations);
  const siteName = typeof raw.siteName === "string" ? raw.siteName.trim() : "";
  const siteDescription =
    typeof raw.siteDescription === "string" ? raw.siteDescription.trim() : "";
  const metaTitle =
    typeof raw.metaTitle === "string" ? raw.metaTitle.trim() : "";
  const metaDescription =
    typeof raw.metaDescription === "string" ? raw.metaDescription.trim() : "";
  const metaKeywords = Array.isArray(raw.metaKeywords)
    ? raw.metaKeywords
        .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
        .map((item) => item.trim())
        .filter(Boolean)
    : typeof raw.metaKeywords === "string"
      ? raw.metaKeywords
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  if (!siteName) {
    throw new Error("Site name is required.");
  }

  if (!siteDescription) {
    throw new Error("Site description is required.");
  }

  if (!metaTitle) {
    throw new Error("Meta title is required.");
  }

  if (!metaDescription) {
    throw new Error("Meta description is required.");
  }

  const homepageChrome = applySiteNameHomepageChromeDefaults(
    normalizeHomepageChromeInput(raw.homepageChrome),
    siteName,
  );

  return {
    siteName,
    siteDescription,
    logoUrl: normalizeOptionalUrl(raw.logoUrl) ?? DEFAULT_SITE_SETTINGS.logoUrl,
    lightModeLogoUrl: normalizeOptionalUrl(raw.lightModeLogoUrl),
    darkModeLogoUrl: normalizeOptionalUrl(raw.darkModeLogoUrl),
    faviconUrl:
      normalizeOptionalUrl(raw.faviconUrl) ?? DEFAULT_SITE_SETTINGS.faviconUrl,
    customJs: normalizeCustomJsInput(raw.customJs),
    authHeroBadge:
      typeof raw.authHeroBadge === "string" && raw.authHeroBadge.trim()
        ? raw.authHeroBadge.trim()
        : DEFAULT_SITE_SETTINGS.authHeroBadge,
    authHeroTitle:
      typeof raw.authHeroTitle === "string" && raw.authHeroTitle.trim()
        ? raw.authHeroTitle.trim()
        : DEFAULT_SITE_SETTINGS.authHeroTitle,
    authHeroDescription:
      typeof raw.authHeroDescription === "string" &&
      raw.authHeroDescription.trim()
        ? raw.authHeroDescription.trim()
        : DEFAULT_SITE_SETTINGS.authHeroDescription,
    authHeroImageUrl: normalizeOptionalUrl(raw.authHeroImageUrl),
    adminSignupEnabled:
      typeof raw.adminSignupEnabled === "boolean"
        ? raw.adminSignupEnabled
        : DEFAULT_SITE_SETTINGS.adminSignupEnabled,
    socialAuthButtonsEnabled:
      typeof raw.socialAuthButtonsEnabled === "boolean"
        ? raw.socialAuthButtonsEnabled
        : DEFAULT_SITE_SETTINGS.socialAuthButtonsEnabled,
    darkThemePreset: normalizeDarkThemePreset(raw.darkThemePreset),
    themeConfig: normalizeSiteThemeConfig(raw.themeConfig),
    metaTitle,
    metaDescription,
    metaKeywords:
      metaKeywords.length > 0
        ? Array.from(new Set(metaKeywords))
        : DEFAULT_SITE_SETTINGS.metaKeywords,
    ogImageUrl: normalizeOptionalUrl(raw.ogImageUrl),
    twitterHandle: normalizeOptionalHandle(raw.twitterHandle),
    homepageChrome,
    translations,
    openCodeDesignAuthorityMode:
      typeof raw.openCodeDesignAuthorityMode === "string" &&
      (raw.openCodeDesignAuthorityMode === "auto" ||
        raw.openCodeDesignAuthorityMode === "taste-only" ||
        raw.openCodeDesignAuthorityMode === "impeccable-only")
        ? raw.openCodeDesignAuthorityMode
        : DEFAULT_SITE_SETTINGS.openCodeDesignAuthorityMode,
  };
}

const loadCachedSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const prisma = getPrisma();
    let record: {
      siteName: string;
      siteDescription: string;
      logoUrl: string | null;
      lightModeLogoUrl: string | null;
      darkModeLogoUrl: string | null;
      faviconUrl: string | null;
      customJs: string | null;
      authHeroBadge: string;
      authHeroTitle: string;
      authHeroDescription: string;
      authHeroImageUrl: string | null;
      adminSignupEnabled: boolean;
      socialAuthButtonsEnabled: boolean;
      darkThemePreset: DarkThemePreset;
      themeConfig: unknown;
      metaTitle: string;
      metaDescription: string;
      metaKeywords: string[];
      ogImageUrl: string | null;
      twitterHandle: string | null;
      homepageChrome: unknown;
      translations: unknown;
      openCodeDesignAuthorityMode: unknown;
    } | null;

    try {
      record = (await prisma.siteSettings.findUnique({
        where: { id: SITE_SETTINGS_ID },
      })) as typeof record;
    } catch (error) {
      const isMissingFaviconColumn = isMissingSiteSettingsColumnError(
        error,
        "faviconUrl",
      );
      const isMissingLightModeLogoColumn = isMissingSiteSettingsColumnError(
        error,
        "lightModeLogoUrl",
      );
      const isMissingDarkModeLogoColumn = isMissingSiteSettingsColumnError(
        error,
        "darkModeLogoUrl",
      );
      const isMissingCustomJsColumn = isMissingSiteSettingsColumnError(
        error,
        "customJs",
      );
      const isMissingAdminSignupColumn = isMissingSiteSettingsColumnError(
        error,
        "adminSignupEnabled",
      );
      const isMissingAuthHeroBadgeColumn = isMissingSiteSettingsColumnError(
        error,
        "authHeroBadge",
      );
      const isMissingAuthHeroTitleColumn = isMissingSiteSettingsColumnError(
        error,
        "authHeroTitle",
      );
      const isMissingAuthHeroDescriptionColumn =
        isMissingSiteSettingsColumnError(error, "authHeroDescription");
      const isMissingAuthHeroImageColumn = isMissingSiteSettingsColumnError(
        error,
        "authHeroImageUrl",
      );
      const isMissingSocialAuthButtonsColumn = isMissingSiteSettingsColumnError(
        error,
        "socialAuthButtonsEnabled",
      );
      const isMissingThemeConfigColumn = isMissingSiteSettingsColumnError(
        error,
        "themeConfig",
      );
      const isMissingDarkThemePresetColumn = isMissingSiteSettingsColumnError(
        error,
        "darkThemePreset",
      );
      const isMissingHomepageChromeColumn = isMissingSiteSettingsColumnError(
        error,
        "homepageChrome",
      );
      const isMissingTranslationsColumn = isMissingSiteSettingsColumnError(
        error,
        "translations",
      );
      const isMissingOpenCodeDesignAuthorityModeColumn =
        isMissingSiteSettingsColumnError(
          error,
          "openCodeDesignAuthorityMode",
        );

      if (
        !isMissingFaviconColumn &&
        !isMissingLightModeLogoColumn &&
        !isMissingDarkModeLogoColumn &&
        !isMissingCustomJsColumn &&
        !isMissingAuthHeroBadgeColumn &&
        !isMissingAuthHeroTitleColumn &&
        !isMissingAuthHeroDescriptionColumn &&
        !isMissingAuthHeroImageColumn &&
        !isMissingAdminSignupColumn &&
        !isMissingSocialAuthButtonsColumn &&
        !isMissingDarkThemePresetColumn &&
        !isMissingThemeConfigColumn &&
        !isMissingHomepageChromeColumn &&
        !isMissingTranslationsColumn &&
        !isMissingOpenCodeDesignAuthorityModeColumn
      ) {
      }

      try {
        if (isMissingFaviconColumn) {
          const legacyRecord = (await prisma.siteSettings.findUnique({
            where: { id: SITE_SETTINGS_ID },
            select: {
              siteName: true,
              siteDescription: true,
              logoUrl: true,
              ...(isMissingLightModeLogoColumn
                ? {}
                : { lightModeLogoUrl: true }),
              ...(isMissingDarkModeLogoColumn ? {} : { darkModeLogoUrl: true }),
              metaTitle: true,
              metaDescription: true,
              metaKeywords: true,
              ogImageUrl: true,
              twitterHandle: true,
            },
          })) as {
            siteName: string;
            siteDescription: string;
            logoUrl: string | null;
            lightModeLogoUrl?: string | null;
            darkModeLogoUrl?: string | null;
            metaTitle: string;
            metaDescription: string;
            metaKeywords: string[];
            ogImageUrl: string | null;
            twitterHandle: string | null;
          } | null;

          record = legacyRecord
            ? {
                ...legacyRecord,
                faviconUrl: DEFAULT_SITE_SETTINGS.faviconUrl,
                lightModeLogoUrl:
                  legacyRecord.lightModeLogoUrl ??
                  DEFAULT_SITE_SETTINGS.lightModeLogoUrl,
                darkModeLogoUrl:
                  legacyRecord.darkModeLogoUrl ??
                  DEFAULT_SITE_SETTINGS.darkModeLogoUrl,
                customJs: DEFAULT_SITE_SETTINGS.customJs,
                authHeroBadge: DEFAULT_SITE_SETTINGS.authHeroBadge,
                authHeroTitle: DEFAULT_SITE_SETTINGS.authHeroTitle,
                authHeroDescription: DEFAULT_SITE_SETTINGS.authHeroDescription,
                authHeroImageUrl: DEFAULT_SITE_SETTINGS.authHeroImageUrl,
                adminSignupEnabled: DEFAULT_SITE_SETTINGS.adminSignupEnabled,
                socialAuthButtonsEnabled:
                  DEFAULT_SITE_SETTINGS.socialAuthButtonsEnabled,
                darkThemePreset: DEFAULT_SITE_SETTINGS.darkThemePreset,
                themeConfig: DEFAULT_SITE_SETTINGS.themeConfig,
                homepageChrome: DEFAULT_SITE_SETTINGS.homepageChrome,
                translations: DEFAULT_SITE_SETTINGS.translations,
                openCodeDesignAuthorityMode:
                  DEFAULT_SITE_SETTINGS.openCodeDesignAuthorityMode,
              }
            : null;
        } else {
          const legacyRecord = (await prisma.siteSettings.findUnique({
            where: { id: SITE_SETTINGS_ID },
            select: {
              siteName: true,
              siteDescription: true,
              logoUrl: true,
              ...(isMissingLightModeLogoColumn
                ? {}
                : { lightModeLogoUrl: true }),
              ...(isMissingDarkModeLogoColumn ? {} : { darkModeLogoUrl: true }),
              faviconUrl: true,
              ...(isMissingCustomJsColumn ? {} : { customJs: true }),
              metaTitle: true,
              metaDescription: true,
              metaKeywords: true,
              ogImageUrl: true,
              twitterHandle: true,
              ...(isMissingAuthHeroBadgeColumn ? {} : { authHeroBadge: true }),
              ...(isMissingAuthHeroTitleColumn ? {} : { authHeroTitle: true }),
              ...(isMissingAuthHeroDescriptionColumn
                ? {}
                : { authHeroDescription: true }),
              ...(isMissingAuthHeroImageColumn
                ? {}
                : { authHeroImageUrl: true }),
              ...(isMissingAdminSignupColumn || isMissingSocialAuthButtonsColumn
                ? {}
                : { adminSignupEnabled: true, socialAuthButtonsEnabled: true }),
              ...(isMissingDarkThemePresetColumn
                ? {}
                : { darkThemePreset: true }),
              ...(isMissingThemeConfigColumn ? {} : { themeConfig: true }),
              ...(isMissingHomepageChromeColumn
                ? {}
                : { homepageChrome: true }),
              ...(isMissingTranslationsColumn ? {} : { translations: true }),
              ...(isMissingOpenCodeDesignAuthorityModeColumn
                ? {}
                : { openCodeDesignAuthorityMode: true }),
            },
          })) as
            | ({
                siteName: string;
                siteDescription: string;
                logoUrl: string | null;
                lightModeLogoUrl?: string | null;
                darkModeLogoUrl?: string | null;
                faviconUrl: string | null;
                metaTitle: string;
                metaDescription: string;
                metaKeywords: string[];
                ogImageUrl: string | null;
                twitterHandle: string | null;
                homepageChrome: unknown;
                translations: unknown;
              } & Partial<{
                customJs: string | null;
                authHeroBadge: string;
                authHeroTitle: string;
                authHeroDescription: string;
                authHeroImageUrl: string | null;
                adminSignupEnabled: boolean;
                socialAuthButtonsEnabled: boolean;
                darkThemePreset: DarkThemePreset;
                themeConfig: unknown;
              }>)
            | null;

          record = legacyRecord
            ? {
                ...legacyRecord,
                faviconUrl:
                  legacyRecord.faviconUrl || DEFAULT_SITE_SETTINGS.faviconUrl,
                lightModeLogoUrl:
                  "lightModeLogoUrl" in legacyRecord
                    ? (legacyRecord.lightModeLogoUrl ??
                      DEFAULT_SITE_SETTINGS.lightModeLogoUrl)
                    : DEFAULT_SITE_SETTINGS.lightModeLogoUrl,
                darkModeLogoUrl:
                  "darkModeLogoUrl" in legacyRecord
                    ? (legacyRecord.darkModeLogoUrl ??
                      DEFAULT_SITE_SETTINGS.darkModeLogoUrl)
                    : DEFAULT_SITE_SETTINGS.darkModeLogoUrl,
                customJs:
                  "customJs" in legacyRecord
                    ? (legacyRecord.customJs ?? DEFAULT_SITE_SETTINGS.customJs)
                    : DEFAULT_SITE_SETTINGS.customJs,
                authHeroBadge:
                  "authHeroBadge" in legacyRecord
                    ? (legacyRecord.authHeroBadge ??
                      DEFAULT_SITE_SETTINGS.authHeroBadge)
                    : DEFAULT_SITE_SETTINGS.authHeroBadge,
                authHeroTitle:
                  "authHeroTitle" in legacyRecord
                    ? (legacyRecord.authHeroTitle ??
                      DEFAULT_SITE_SETTINGS.authHeroTitle)
                    : DEFAULT_SITE_SETTINGS.authHeroTitle,
                authHeroDescription:
                  "authHeroDescription" in legacyRecord
                    ? (legacyRecord.authHeroDescription ??
                      DEFAULT_SITE_SETTINGS.authHeroDescription)
                    : DEFAULT_SITE_SETTINGS.authHeroDescription,
                authHeroImageUrl:
                  "authHeroImageUrl" in legacyRecord
                    ? (legacyRecord.authHeroImageUrl ??
                      DEFAULT_SITE_SETTINGS.authHeroImageUrl)
                    : DEFAULT_SITE_SETTINGS.authHeroImageUrl,
                adminSignupEnabled:
                  "adminSignupEnabled" in legacyRecord
                    ? (legacyRecord.adminSignupEnabled ??
                      DEFAULT_SITE_SETTINGS.adminSignupEnabled)
                    : DEFAULT_SITE_SETTINGS.adminSignupEnabled,
                socialAuthButtonsEnabled:
                  "socialAuthButtonsEnabled" in legacyRecord
                    ? (legacyRecord.socialAuthButtonsEnabled ??
                      DEFAULT_SITE_SETTINGS.socialAuthButtonsEnabled)
                    : DEFAULT_SITE_SETTINGS.socialAuthButtonsEnabled,
                darkThemePreset:
                  "darkThemePreset" in legacyRecord
                    ? normalizeDarkThemePreset(legacyRecord.darkThemePreset)
                    : DEFAULT_SITE_SETTINGS.darkThemePreset,
                themeConfig:
                  "themeConfig" in legacyRecord
                    ? legacyRecord.themeConfig
                    : DEFAULT_SITE_SETTINGS.themeConfig,
                homepageChrome:
                  "homepageChrome" in legacyRecord
                    ? legacyRecord.homepageChrome
                    : DEFAULT_SITE_SETTINGS.homepageChrome,
                translations:
                  "translations" in legacyRecord
                    ? legacyRecord.translations
                    : DEFAULT_SITE_SETTINGS.translations,
                openCodeDesignAuthorityMode:
                  "openCodeDesignAuthorityMode" in legacyRecord
                    ? legacyRecord.openCodeDesignAuthorityMode
                    : DEFAULT_SITE_SETTINGS.openCodeDesignAuthorityMode,
              }
            : null;
        }
      } catch {
        return DEFAULT_SITE_SETTINGS;
      }
    }

    if (!record) {
      return DEFAULT_SITE_SETTINGS;
    }

    const homepageChrome = applySiteNameHomepageChromeDefaults(
      normalizeHomepageChromeInput(record.homepageChrome),
      record.siteName,
    );
    const translations = normalizeSiteSettingsTranslations(record.translations);

    return {
      siteName: record.siteName,
      siteDescription: record.siteDescription,
      logoUrl: record.logoUrl || DEFAULT_SITE_SETTINGS.logoUrl,
      lightModeLogoUrl:
        record.lightModeLogoUrl || DEFAULT_SITE_SETTINGS.lightModeLogoUrl,
      darkModeLogoUrl:
        record.darkModeLogoUrl || DEFAULT_SITE_SETTINGS.darkModeLogoUrl,
      faviconUrl: record.faviconUrl || DEFAULT_SITE_SETTINGS.faviconUrl,
      customJs: record.customJs || DEFAULT_SITE_SETTINGS.customJs,
      authHeroBadge:
        record.authHeroBadge || DEFAULT_SITE_SETTINGS.authHeroBadge,
      authHeroTitle:
        record.authHeroTitle || DEFAULT_SITE_SETTINGS.authHeroTitle,
      authHeroDescription:
        record.authHeroDescription || DEFAULT_SITE_SETTINGS.authHeroDescription,
      authHeroImageUrl:
        record.authHeroImageUrl || DEFAULT_SITE_SETTINGS.authHeroImageUrl,
      adminSignupEnabled: record.adminSignupEnabled,
      socialAuthButtonsEnabled: record.socialAuthButtonsEnabled,
      themeConfig: normalizeSiteThemeConfig(record.themeConfig),
      metaTitle: record.metaTitle,
      metaDescription: record.metaDescription,
      metaKeywords:
        record.metaKeywords.length > 0
          ? record.metaKeywords
          : DEFAULT_SITE_SETTINGS.metaKeywords,
      ogImageUrl: record.ogImageUrl,
      twitterHandle:
        record.twitterHandle || DEFAULT_SITE_SETTINGS.twitterHandle,
      darkThemePreset: normalizeDarkThemePreset(record.darkThemePreset),
      homepageChrome,
      translations,
      openCodeDesignAuthorityMode:
        typeof record.openCodeDesignAuthorityMode === "string" &&
        ["auto", "taste-only", "impeccable-only"].includes(
          record.openCodeDesignAuthorityMode,
        )
          ? (record.openCodeDesignAuthorityMode as "auto" | "taste-only" | "impeccable-only")
          : DEFAULT_SITE_SETTINGS.openCodeDesignAuthorityMode,
    };
  },
  ["site-settings"],
  { tags: ["site-settings"] },
);

export async function getSiteSettings() {
  return sanitizeSiteSettingsSecrets(await loadCachedSiteSettings());
}

export async function getAdminSiteSettings() {
  return loadCachedSiteSettings();
}

export async function upsertSiteSettings(settings: SiteSettings) {
  const prisma = getPrisma();
  try {
    return await prisma.siteSettings.upsert({
      where: { id: SITE_SETTINGS_ID },
      create: {
        id: SITE_SETTINGS_ID,
        ...settings,
      },
      update: settings,
    });
  } catch (error) {
    const isMissingFaviconColumn = isMissingSiteSettingsColumnError(
      error,
      "faviconUrl",
    );
    const isMissingLightModeLogoColumn = isMissingSiteSettingsColumnError(
      error,
      "lightModeLogoUrl",
    );
    const isMissingDarkModeLogoColumn = isMissingSiteSettingsColumnError(
      error,
      "darkModeLogoUrl",
    );
    const isMissingCustomJsColumn = isMissingSiteSettingsColumnError(
      error,
      "customJs",
    );
    const isMissingAdminSignupColumn = isMissingSiteSettingsColumnError(
      error,
      "adminSignupEnabled",
    );
    const isMissingAuthHeroBadgeColumn = isMissingSiteSettingsColumnError(
      error,
      "authHeroBadge",
    );
    const isMissingAuthHeroTitleColumn = isMissingSiteSettingsColumnError(
      error,
      "authHeroTitle",
    );
    const isMissingAuthHeroDescriptionColumn = isMissingSiteSettingsColumnError(
      error,
      "authHeroDescription",
    );
    const isMissingAuthHeroImageColumn = isMissingSiteSettingsColumnError(
      error,
      "authHeroImageUrl",
    );
    const isMissingSocialAuthButtonsColumn = isMissingSiteSettingsColumnError(
      error,
      "socialAuthButtonsEnabled",
    );
    const isMissingThemeConfigColumn = isMissingSiteSettingsColumnError(
      error,
      "themeConfig",
    );
    const isMissingDarkThemePresetColumn = isMissingSiteSettingsColumnError(
      error,
      "darkThemePreset",
    );
    const isMissingHomepageChromeColumn = isMissingSiteSettingsColumnError(
      error,
      "homepageChrome",
    );
    const isMissingTranslationsColumn = isMissingSiteSettingsColumnError(
      error,
      "translations",
    );
    const isMissingOpenCodeDesignAuthorityModeColumn =
      isMissingSiteSettingsColumnError(
        error,
        "openCodeDesignAuthorityMode",
      );

    if (
      !isMissingFaviconColumn &&
      !isMissingLightModeLogoColumn &&
      !isMissingDarkModeLogoColumn &&
      !isMissingCustomJsColumn &&
      !isMissingAuthHeroBadgeColumn &&
      !isMissingAuthHeroTitleColumn &&
      !isMissingAuthHeroDescriptionColumn &&
      !isMissingAuthHeroImageColumn &&
      !isMissingAdminSignupColumn &&
      !isMissingSocialAuthButtonsColumn &&
      !isMissingDarkThemePresetColumn &&
      !isMissingThemeConfigColumn &&
      !isMissingHomepageChromeColumn &&
      !isMissingTranslationsColumn &&
      !isMissingOpenCodeDesignAuthorityModeColumn
    ) {
      throw error;
    }

    if (
      isMissingFaviconColumn ||
      isMissingCustomJsColumn ||
      isMissingLightModeLogoColumn ||
      isMissingDarkModeLogoColumn
    ) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO "SiteSettings" (
            "id",
            "siteName",
            "siteDescription",
            "logoUrl",
            "metaTitle",
            "metaDescription",
            "metaKeywords",
            "ogImageUrl",
            "twitterHandle",
            "createdAt",
            "updatedAt"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          ON CONFLICT ("id") DO UPDATE SET
            "siteName" = EXCLUDED."siteName",
            "siteDescription" = EXCLUDED."siteDescription",
            "logoUrl" = EXCLUDED."logoUrl",
            "metaTitle" = EXCLUDED."metaTitle",
            "metaDescription" = EXCLUDED."metaDescription",
            "metaKeywords" = EXCLUDED."metaKeywords",
            "ogImageUrl" = EXCLUDED."ogImageUrl",
            "twitterHandle" = EXCLUDED."twitterHandle",
            "updatedAt" = NOW()
        `,
        SITE_SETTINGS_ID,
        settings.siteName,
        settings.siteDescription,
        settings.logoUrl,
        settings.metaTitle,
        settings.metaDescription,
        settings.metaKeywords,
        settings.ogImageUrl,
        settings.twitterHandle,
      );
    } else if (isMissingAdminSignupColumn || isMissingSocialAuthButtonsColumn) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO "SiteSettings" (
            "id",
            "siteName",
            "siteDescription",
            "logoUrl",
            "faviconUrl",
            "metaTitle",
            "metaDescription",
            "metaKeywords",
            "ogImageUrl",
            "twitterHandle",
            "createdAt",
            "updatedAt"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          ON CONFLICT ("id") DO UPDATE SET
            "siteName" = EXCLUDED."siteName",
            "siteDescription" = EXCLUDED."siteDescription",
            "logoUrl" = EXCLUDED."logoUrl",
            "faviconUrl" = EXCLUDED."faviconUrl",
            "metaTitle" = EXCLUDED."metaTitle",
            "metaDescription" = EXCLUDED."metaDescription",
            "metaKeywords" = EXCLUDED."metaKeywords",
            "ogImageUrl" = EXCLUDED."ogImageUrl",
            "twitterHandle" = EXCLUDED."twitterHandle",
            "updatedAt" = NOW()
        `,
        SITE_SETTINGS_ID,
        settings.siteName,
        settings.siteDescription,
        settings.logoUrl,
        settings.faviconUrl,
        settings.metaTitle,
        settings.metaDescription,
        settings.metaKeywords,
        settings.ogImageUrl,
        settings.twitterHandle,
      );
    } else if (isMissingThemeConfigColumn || isMissingDarkThemePresetColumn) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO "SiteSettings" (
            "id",
            "siteName",
            "siteDescription",
            "logoUrl",
            "faviconUrl",
            "adminSignupEnabled",
            "socialAuthButtonsEnabled",
            "darkThemePreset",
            "metaTitle",
            "metaDescription",
            "metaKeywords",
            "ogImageUrl",
            "twitterHandle",
            "createdAt",
            "updatedAt"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
          ON CONFLICT ("id") DO UPDATE SET
            "siteName" = EXCLUDED."siteName",
            "siteDescription" = EXCLUDED."siteDescription",
            "logoUrl" = EXCLUDED."logoUrl",
            "faviconUrl" = EXCLUDED."faviconUrl",
            "adminSignupEnabled" = EXCLUDED."adminSignupEnabled",
            "socialAuthButtonsEnabled" = EXCLUDED."socialAuthButtonsEnabled",
            "darkThemePreset" = EXCLUDED."darkThemePreset",
            "metaTitle" = EXCLUDED."metaTitle",
            "metaDescription" = EXCLUDED."metaDescription",
            "metaKeywords" = EXCLUDED."metaKeywords",
            "ogImageUrl" = EXCLUDED."ogImageUrl",
            "twitterHandle" = EXCLUDED."twitterHandle",
            "updatedAt" = NOW()
        `,
        SITE_SETTINGS_ID,
        settings.siteName,
        settings.siteDescription,
        settings.logoUrl,
        settings.faviconUrl,
        settings.adminSignupEnabled,
        settings.socialAuthButtonsEnabled,
        settings.darkThemePreset,
        settings.metaTitle,
        settings.metaDescription,
        settings.metaKeywords,
        settings.ogImageUrl,
        settings.twitterHandle,
      );
    } else if (
      isMissingAuthHeroBadgeColumn ||
      isMissingAuthHeroTitleColumn ||
      isMissingAuthHeroDescriptionColumn ||
      isMissingAuthHeroImageColumn
    ) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO "SiteSettings" (
            "id",
            "siteName",
            "siteDescription",
            "logoUrl",
            "faviconUrl",
            "adminSignupEnabled",
            "socialAuthButtonsEnabled",
            "darkThemePreset",
            "themeConfig",
            "metaTitle",
            "metaDescription",
            "metaKeywords",
            "ogImageUrl",
            "twitterHandle",
            "createdAt",
            "updatedAt"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
          ON CONFLICT ("id") DO UPDATE SET
            "siteName" = EXCLUDED."siteName",
            "siteDescription" = EXCLUDED."siteDescription",
            "logoUrl" = EXCLUDED."logoUrl",
            "faviconUrl" = EXCLUDED."faviconUrl",
            "adminSignupEnabled" = EXCLUDED."adminSignupEnabled",
            "socialAuthButtonsEnabled" = EXCLUDED."socialAuthButtonsEnabled",
            "darkThemePreset" = EXCLUDED."darkThemePreset",
            "themeConfig" = EXCLUDED."themeConfig",
            "metaTitle" = EXCLUDED."metaTitle",
            "metaDescription" = EXCLUDED."metaDescription",
            "metaKeywords" = EXCLUDED."metaKeywords",
            "ogImageUrl" = EXCLUDED."ogImageUrl",
            "twitterHandle" = EXCLUDED."twitterHandle",
            "updatedAt" = NOW()
        `,
        SITE_SETTINGS_ID,
        settings.siteName,
        settings.siteDescription,
        settings.logoUrl,
        settings.faviconUrl,
        settings.adminSignupEnabled,
        settings.socialAuthButtonsEnabled,
        settings.darkThemePreset,
        settings.themeConfig,
        settings.metaTitle,
        settings.metaDescription,
        settings.metaKeywords,
        settings.ogImageUrl,
        settings.twitterHandle,
      );
    } else if (
      isMissingHomepageChromeColumn ||
      isMissingTranslationsColumn ||
      isMissingOpenCodeDesignAuthorityModeColumn
    ) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO "SiteSettings" (
            "id",
            "siteName",
            "siteDescription",
            "logoUrl",
            "faviconUrl",
            "authHeroBadge",
            "authHeroTitle",
            "authHeroDescription",
            "authHeroImageUrl",
            "adminSignupEnabled",
            "socialAuthButtonsEnabled",
            "darkThemePreset",
            "themeConfig",
            "metaTitle",
            "metaDescription",
            "metaKeywords",
            "ogImageUrl",
            "twitterHandle",
            "homepageChrome",
            "openCodeDesignAuthorityMode",
            "createdAt",
            "updatedAt"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
          ON CONFLICT ("id") DO UPDATE SET
            "siteName" = EXCLUDED."siteName",
            "siteDescription" = EXCLUDED."siteDescription",
            "logoUrl" = EXCLUDED."logoUrl",
            "faviconUrl" = EXCLUDED."faviconUrl",
            "authHeroBadge" = EXCLUDED."authHeroBadge",
            "authHeroTitle" = EXCLUDED."authHeroTitle",
            "authHeroDescription" = EXCLUDED."authHeroDescription",
            "authHeroImageUrl" = EXCLUDED."authHeroImageUrl",
            "adminSignupEnabled" = EXCLUDED."adminSignupEnabled",
            "socialAuthButtonsEnabled" = EXCLUDED."socialAuthButtonsEnabled",
            "darkThemePreset" = EXCLUDED."darkThemePreset",
            "themeConfig" = EXCLUDED."themeConfig",
            "metaTitle" = EXCLUDED."metaTitle",
            "metaDescription" = EXCLUDED."metaDescription",
            "metaKeywords" = EXCLUDED."metaKeywords",
            "ogImageUrl" = EXCLUDED."ogImageUrl",
            "twitterHandle" = EXCLUDED."twitterHandle",
            "homepageChrome" = EXCLUDED."homepageChrome",
            "openCodeDesignAuthorityMode" = EXCLUDED."openCodeDesignAuthorityMode",
            "updatedAt" = NOW()
        `,
        SITE_SETTINGS_ID,
        settings.siteName,
        settings.siteDescription,
        settings.logoUrl,
        settings.faviconUrl,
        settings.authHeroBadge,
        settings.authHeroTitle,
        settings.authHeroDescription,
        settings.authHeroImageUrl,
        settings.adminSignupEnabled,
        settings.socialAuthButtonsEnabled,
        settings.darkThemePreset,
        settings.themeConfig,
        settings.metaTitle,
        settings.metaDescription,
        settings.metaKeywords,
        settings.ogImageUrl,
        settings.twitterHandle,
        settings.homepageChrome,
        settings.openCodeDesignAuthorityMode,
      );
    }

    return {
      id: SITE_SETTINGS_ID,
      ...settings,
    };
  }
}
