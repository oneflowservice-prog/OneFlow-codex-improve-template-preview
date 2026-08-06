export type IntegrationCredential = {
  /** Env-style key the AI should read the secret from. */
  key: string;
  /** Short hint telling the user where to find this value. */
  hint: string;
  /** Public values may be exposed to the browser (NEXT_PUBLIC_*). */
  isPublic?: boolean;
};

export type IntegrationDefinition = {
  id: string;
  name: string;
  category: string;
  description: string;
  /** What the AI should build when this integration is requested. */
  task: string;
  credentials: IntegrationCredential[];
};

export const INTEGRATION_CATEGORIES = [
  "E-commerce",
  "Payments",
  "Shipping",
  "Marketing & Email",
  "Customer Support",
  "Scheduling",
  "Social Media",
  "File Storage",
  "CRM & Project Management",
  "AI & Machine Learning",
  "Analytics",
  "Authentication",
  "Hosting & DevOps",
  "CMS & Content",
  "Communication",
  "Design",
  "Automation",
] as const;

export const INTEGRATIONS_CATALOG: IntegrationDefinition[] = [
  // ── E-commerce ────────────────────────────────────────────────────────────
  {
    id: "shopify",
    name: "Shopify",
    category: "E-commerce",
    description: "Sell products from your Shopify store inside your app.",
    task: "Connect my Shopify store: fetch products and collections via the Storefront API, show a product grid with details, and support cart/checkout links back to Shopify.",
    credentials: [
      { key: "SHOPIFY_STORE_DOMAIN", hint: "your-store.myshopify.com" },
      {
        key: "SHOPIFY_STOREFRONT_ACCESS_TOKEN",
        hint: "Shopify admin → Settings → Apps and sales channels → Develop apps → Storefront API token",
      },
      {
        key: "SHOPIFY_ADMIN_API_ACCESS_TOKEN",
        hint: "Optional — Admin API token for order/inventory management",
      },
    ],
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    category: "E-commerce",
    description: "Pull products and orders from your WooCommerce store.",
    task: "Connect my WooCommerce store via the REST API: list products with images and prices, and let me view recent orders.",
    credentials: [
      { key: "WOOCOMMERCE_STORE_URL", hint: "https://your-store.com" },
      {
        key: "WOOCOMMERCE_CONSUMER_KEY",
        hint: "WooCommerce → Settings → Advanced → REST API → Add key",
      },
      {
        key: "WOOCOMMERCE_CONSUMER_SECRET",
        hint: "Shown once when the REST API key is created",
      },
    ],
  },
  {
    id: "etsy",
    name: "Etsy",
    category: "E-commerce",
    description: "Show your Etsy shop listings in your app.",
    task: "Connect my Etsy shop via the Etsy Open API v3: display my active listings with photos and prices, linking each to its Etsy page.",
    credentials: [
      {
        key: "ETSY_API_KEY",
        hint: "Etsy developer portal → Your apps → Keystring",
      },
      { key: "ETSY_SHOP_ID", hint: "Your numeric Etsy shop ID" },
    ],
  },
  {
    id: "amazon-seller",
    name: "Amazon Seller",
    category: "E-commerce",
    description: "Manage Amazon listings and orders via the SP-API.",
    task: "Connect Amazon Selling Partner API: fetch my orders and listings and show them in a simple dashboard with status filters.",
    credentials: [
      {
        key: "AMAZON_SP_API_CLIENT_ID",
        hint: "Seller Central → Develop apps → LWA client ID",
      },
      { key: "AMAZON_SP_API_CLIENT_SECRET", hint: "LWA client secret" },
      {
        key: "AMAZON_SP_API_REFRESH_TOKEN",
        hint: "Generated when you self-authorize the app",
      },
      { key: "AMAZON_MARKETPLACE_ID", hint: "e.g. ATVPDKIKX0DER for US" },
    ],
  },
  {
    id: "ebay",
    name: "eBay",
    category: "E-commerce",
    description: "List and manage eBay items from your app.",
    task: "Connect the eBay APIs (OAuth): browse my active listings and show order statuses in the app.",
    credentials: [
      {
        key: "EBAY_CLIENT_ID",
        hint: "eBay developer program → Application keys (App ID)",
      },
      { key: "EBAY_CLIENT_SECRET", hint: "Cert ID from the same page" },
      {
        key: "EBAY_RU_NAME",
        hint: "Redirect URL name for the OAuth consent flow",
      },
    ],
  },
  {
    id: "bigcommerce",
    name: "BigCommerce",
    category: "E-commerce",
    description: "Sync products and orders from BigCommerce.",
    task: "Connect my BigCommerce store via the REST Management API: show products and recent orders.",
    credentials: [
      {
        key: "BIGCOMMERCE_STORE_HASH",
        hint: "From your API path: /stores/{store_hash}/",
      },
      {
        key: "BIGCOMMERCE_ACCESS_TOKEN",
        hint: "Store settings → API accounts → Create API account",
      },
    ],
  },
  {
    id: "square",
    name: "Square",
    category: "E-commerce",
    description: "Accept payments and sync catalog with Square.",
    task: "Connect Square: sync my catalog items and accept card payments with Square Web Payments SDK on a checkout page.",
    credentials: [
      {
        key: "SQUARE_ACCESS_TOKEN",
        hint: "Square developer dashboard → your app → Production access token",
      },
      { key: "SQUARE_LOCATION_ID", hint: "Developer dashboard → Locations" },
      {
        key: "NEXT_PUBLIC_SQUARE_APPLICATION_ID",
        hint: "Application ID (safe for the browser)",
        isPublic: true,
      },
    ],
  },

  // ── Payments ──────────────────────────────────────────────────────────────
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments",
    description: "Accept card payments, subscriptions, and invoices.",
    task: "Add Stripe payments: a checkout flow (Stripe Checkout) for my products/plans, plus a webhook endpoint that records successful payments.",
    credentials: [
      {
        key: "STRIPE_SECRET_KEY",
        hint: "Stripe dashboard → Developers → API keys (sk_live_… or sk_test_…)",
      },
      {
        key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
        hint: "Publishable key (pk_…)",
        isPublic: true,
      },
      {
        key: "STRIPE_WEBHOOK_SECRET",
        hint: "Developers → Webhooks → Signing secret (whsec_…)",
      },
    ],
  },
  {
    id: "paypal",
    name: "PayPal",
    category: "Payments",
    description: "Accept PayPal payments in your app.",
    task: "Add PayPal checkout using the PayPal JS SDK and Orders API: a pay button that captures payment server-side and confirms success to the user.",
    credentials: [
      {
        key: "PAYPAL_CLIENT_ID",
        hint: "developer.paypal.com → My apps & credentials",
      },
      { key: "PAYPAL_CLIENT_SECRET", hint: "Same app page → Secret" },
      { key: "PAYPAL_MODE", hint: "sandbox or live" },
    ],
  },
  {
    id: "paddle",
    name: "Paddle",
    category: "Payments",
    description: "Sell SaaS subscriptions with Paddle (merchant of record).",
    task: "Add Paddle Billing: overlay checkout for my subscription plans and a webhook handler that provisions access on successful payment.",
    credentials: [
      { key: "PADDLE_API_KEY", hint: "Paddle dashboard → Developer tools → Authentication" },
      {
        key: "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN",
        hint: "Client-side token for Paddle.js",
        isPublic: true,
      },
      { key: "PADDLE_WEBHOOK_SECRET", hint: "Developer tools → Notifications → secret key" },
    ],
  },
  {
    id: "lemon-squeezy",
    name: "Lemon Squeezy",
    category: "Payments",
    description: "Sell digital products and subscriptions with Lemon Squeezy.",
    task: "Add Lemon Squeezy: checkout links/overlay for my products and a webhook endpoint that unlocks purchases automatically.",
    credentials: [
      { key: "LEMONSQUEEZY_API_KEY", hint: "Settings → API → Create key" },
      { key: "LEMONSQUEEZY_STORE_ID", hint: "Settings → Stores" },
      { key: "LEMONSQUEEZY_WEBHOOK_SECRET", hint: "Settings → Webhooks → Signing secret" },
    ],
  },

  // ── Shipping ──────────────────────────────────────────────────────────────
  {
    id: "shippo",
    name: "Shippo",
    category: "Shipping",
    description: "Get shipping rates and print labels via Shippo.",
    task: "Integrate Shippo: fetch live shipping rates for an order's address, let me pick a rate, and create the shipping label.",
    credentials: [
      { key: "SHIPPO_API_TOKEN", hint: "Shippo → Settings → API → Live/Test token" },
    ],
  },
  {
    id: "shipstation",
    name: "ShipStation",
    category: "Shipping",
    description: "Sync orders and shipments with ShipStation.",
    task: "Integrate ShipStation: push new orders into ShipStation and show shipment status/tracking numbers back in the app.",
    credentials: [
      { key: "SHIPSTATION_API_KEY", hint: "ShipStation → Settings → Account → API settings" },
      { key: "SHIPSTATION_API_SECRET", hint: "Same page → API secret" },
    ],
  },
  {
    id: "dhl",
    name: "DHL",
    category: "Shipping",
    description: "DHL shipment tracking and rates.",
    task: "Integrate the DHL API: add a shipment tracking widget where a user enters a tracking number and sees live status.",
    credentials: [
      { key: "DHL_API_KEY", hint: "developer.dhl.com → Your apps → API key" },
      { key: "DHL_API_SECRET", hint: "Same app page → API secret (if required by the chosen API)" },
    ],
  },
  {
    id: "fedex",
    name: "FedEx",
    category: "Shipping",
    description: "FedEx rates, labels, and tracking.",
    task: "Integrate the FedEx API: shipment tracking by number plus rate quotes for a given package and destination.",
    credentials: [
      { key: "FEDEX_API_KEY", hint: "developer.fedex.com → Projects → API key" },
      { key: "FEDEX_SECRET_KEY", hint: "Same project → Secret key" },
      { key: "FEDEX_ACCOUNT_NUMBER", hint: "Your FedEx shipping account number" },
    ],
  },
  {
    id: "ups",
    name: "UPS",
    category: "Shipping",
    description: "UPS rates, labels, and tracking.",
    task: "Integrate the UPS API (OAuth): shipment tracking and rate quotes inside the app.",
    credentials: [
      { key: "UPS_CLIENT_ID", hint: "developer.ups.com → Apps → Client ID" },
      { key: "UPS_CLIENT_SECRET", hint: "Same app → Client secret" },
      { key: "UPS_ACCOUNT_NUMBER", hint: "Your UPS shipper account number" },
    ],
  },

  // ── Marketing & Email ─────────────────────────────────────────────────────
  {
    id: "mailchimp",
    name: "Mailchimp",
    category: "Marketing & Email",
    description: "Grow your audience and send campaigns with Mailchimp.",
    task: "Integrate Mailchimp: a newsletter signup form that subscribes visitors to my audience, with success/error states and double opt-in support.",
    credentials: [
      { key: "MAILCHIMP_API_KEY", hint: "Account → Extras → API keys" },
      { key: "MAILCHIMP_SERVER_PREFIX", hint: "The 'usX' part at the end of your API key" },
      { key: "MAILCHIMP_AUDIENCE_ID", hint: "Audience → Settings → Audience name and defaults" },
    ],
  },
  {
    id: "klaviyo",
    name: "Klaviyo",
    category: "Marketing & Email",
    description: "E-commerce email/SMS marketing with Klaviyo.",
    task: "Integrate Klaviyo: subscribe visitors to a list from a signup form and track key events (viewed product, started checkout) server-side.",
    credentials: [
      { key: "KLAVIYO_PRIVATE_API_KEY", hint: "Settings → API keys → Private key (pk_…)" },
      { key: "KLAVIYO_LIST_ID", hint: "Lists & segments → your list → Settings" },
    ],
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "Marketing & Email",
    description: "Sync contacts and deals with HubSpot CRM.",
    task: "Integrate HubSpot: create/update a contact when someone submits my contact form, and log form submissions as notes on the contact.",
    credentials: [
      {
        key: "HUBSPOT_PRIVATE_APP_TOKEN",
        hint: "Settings → Integrations → Private apps → Access token",
      },
    ],
  },
  {
    id: "brevo",
    name: "Brevo",
    category: "Marketing & Email",
    description: "Email campaigns and transactional email with Brevo.",
    task: "Integrate Brevo: newsletter signups into a contact list plus transactional emails (welcome email) via the API.",
    credentials: [
      { key: "BREVO_API_KEY", hint: "Brevo → SMTP & API → API keys" },
      { key: "BREVO_LIST_ID", hint: "Contacts → Lists → numeric ID" },
    ],
  },
  {
    id: "activecampaign",
    name: "ActiveCampaign",
    category: "Marketing & Email",
    description: "Marketing automation with ActiveCampaign.",
    task: "Integrate ActiveCampaign: add form subscribers as contacts, tag them, and trigger an automation.",
    credentials: [
      { key: "ACTIVECAMPAIGN_API_URL", hint: "Settings → Developer → API URL" },
      { key: "ACTIVECAMPAIGN_API_KEY", hint: "Settings → Developer → API key" },
    ],
  },
  {
    id: "convertkit",
    name: "ConvertKit (Kit)",
    category: "Marketing & Email",
    description: "Creator email marketing with Kit (formerly ConvertKit).",
    task: "Integrate Kit (ConvertKit): a signup form that subscribes visitors to my form/sequence via the API.",
    credentials: [
      { key: "CONVERTKIT_API_KEY", hint: "Kit → Settings → Developer → API key" },
      { key: "CONVERTKIT_FORM_ID", hint: "The numeric ID of the form to subscribe to" },
    ],
  },

  // ── Customer Support ──────────────────────────────────────────────────────
  {
    id: "intercom",
    name: "Intercom",
    category: "Customer Support",
    description: "Live chat and customer messaging with Intercom.",
    task: "Add the Intercom Messenger to my app with logged-in user identification (name, email, user id) via identity verification.",
    credentials: [
      { key: "NEXT_PUBLIC_INTERCOM_APP_ID", hint: "Intercom → Settings → Installation", isPublic: true },
      { key: "INTERCOM_IDENTITY_SECRET", hint: "Settings → Security → Identity verification secret" },
    ],
  },
  {
    id: "zendesk",
    name: "Zendesk",
    category: "Customer Support",
    description: "Support tickets and help center with Zendesk.",
    task: "Integrate Zendesk: a support form that creates tickets via the API, plus the Zendesk web widget on every page.",
    credentials: [
      { key: "ZENDESK_SUBDOMAIN", hint: "your-company (from your-company.zendesk.com)" },
      { key: "ZENDESK_EMAIL", hint: "Agent email used with the API token" },
      { key: "ZENDESK_API_TOKEN", hint: "Admin center → Apps and integrations → APIs → Zendesk API" },
    ],
  },
  {
    id: "freshdesk",
    name: "Freshdesk",
    category: "Customer Support",
    description: "Helpdesk ticketing with Freshdesk.",
    task: "Integrate Freshdesk: create support tickets from my in-app contact form and show the user a confirmation with ticket ID.",
    credentials: [
      { key: "FRESHDESK_DOMAIN", hint: "your-company (from your-company.freshdesk.com)" },
      { key: "FRESHDESK_API_KEY", hint: "Profile settings → View API key" },
    ],
  },
  {
    id: "crisp",
    name: "Crisp",
    category: "Customer Support",
    description: "Live chat widget with Crisp.",
    task: "Add the Crisp chat widget to my app and identify logged-in users by email/nickname.",
    credentials: [
      { key: "NEXT_PUBLIC_CRISP_WEBSITE_ID", hint: "Crisp → Settings → Website settings → Setup instructions", isPublic: true },
    ],
  },
  {
    id: "tidio",
    name: "Tidio",
    category: "Customer Support",
    description: "Live chat and chatbots with Tidio.",
    task: "Add the Tidio chat widget to my app, loaded on all pages, with visitor data set for logged-in users.",
    credentials: [
      { key: "NEXT_PUBLIC_TIDIO_PUBLIC_KEY", hint: "From your Tidio script URL: //code.tidio.co/{key}.js", isPublic: true },
    ],
  },

  // ── Scheduling ────────────────────────────────────────────────────────────
  {
    id: "calendly",
    name: "Calendly",
    category: "Scheduling",
    description: "Let visitors book meetings via Calendly.",
    task: "Integrate Calendly: embed my booking page inline on a /book page and add popup booking buttons where relevant.",
    credentials: [
      { key: "NEXT_PUBLIC_CALENDLY_URL", hint: "Your scheduling link, e.g. https://calendly.com/your-name/30min", isPublic: true },
      { key: "CALENDLY_PERSONAL_ACCESS_TOKEN", hint: "Optional — Integrations → API & webhooks, for listing scheduled events" },
    ],
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    category: "Scheduling",
    description: "Read and create Google Calendar events.",
    task: "Integrate Google Calendar via OAuth: connect my Google account, show upcoming events, and create events from the app. Include the OAuth consent flow with the redirect URL clearly documented.",
    credentials: [
      { key: "GOOGLE_CLIENT_ID", hint: "Google Cloud Console → APIs & Services → Credentials → OAuth client" },
      { key: "GOOGLE_CLIENT_SECRET", hint: "Same OAuth client" },
    ],
  },
  {
    id: "microsoft-calendar",
    name: "Microsoft Calendar",
    category: "Scheduling",
    description: "Outlook/Microsoft 365 calendar via Microsoft Graph.",
    task: "Integrate Microsoft Graph Calendar via OAuth: connect my Microsoft account, list upcoming events, and create new events.",
    credentials: [
      { key: "MICROSOFT_CLIENT_ID", hint: "Azure portal → App registrations → Application (client) ID" },
      { key: "MICROSOFT_CLIENT_SECRET", hint: "Certificates & secrets → Client secret value" },
      { key: "MICROSOFT_TENANT_ID", hint: "Directory (tenant) ID, or 'common' for multi-tenant" },
    ],
  },
  {
    id: "acuity-scheduling",
    name: "Acuity Scheduling",
    category: "Scheduling",
    description: "Appointment booking with Acuity.",
    task: "Integrate Acuity Scheduling: embed my scheduler on a booking page and list upcoming appointments via the API.",
    credentials: [
      { key: "ACUITY_USER_ID", hint: "Acuity → Integrations → API → User ID" },
      { key: "ACUITY_API_KEY", hint: "Same page → API key" },
    ],
  },

  // ── Social Media ──────────────────────────────────────────────────────────
  {
    id: "instagram",
    name: "Instagram",
    category: "Social Media",
    description: "Show your Instagram feed or publish via the API.",
    task: "Integrate the Instagram Graph API: display my latest posts in a feed section, refreshed automatically, with links to each post.",
    credentials: [
      { key: "INSTAGRAM_ACCESS_TOKEN", hint: "Meta developer app → Instagram Graph API long-lived token" },
      { key: "INSTAGRAM_USER_ID", hint: "Your Instagram professional account ID" },
    ],
  },
  {
    id: "facebook-pages",
    name: "Facebook Pages",
    category: "Social Media",
    description: "Read and publish posts on your Facebook Page.",
    task: "Integrate the Facebook Pages API: show my page's latest posts and let me publish a new post from the app.",
    credentials: [
      { key: "FACEBOOK_PAGE_ID", hint: "Your Facebook Page ID" },
      { key: "FACEBOOK_PAGE_ACCESS_TOKEN", hint: "Meta developer app → long-lived Page access token" },
    ],
  },
  {
    id: "tiktok",
    name: "TikTok",
    category: "Social Media",
    description: "TikTok login and content via the TikTok API.",
    task: "Integrate the TikTok API (OAuth): connect my TikTok account and display my latest videos in the app.",
    credentials: [
      { key: "TIKTOK_CLIENT_KEY", hint: "developers.tiktok.com → your app → Client key" },
      { key: "TIKTOK_CLIENT_SECRET", hint: "Same app → Client secret" },
    ],
  },
  {
    id: "youtube",
    name: "YouTube",
    category: "Social Media",
    description: "Show channel videos or upload via the YouTube API.",
    task: "Integrate the YouTube Data API: show my channel's latest videos in a grid with embedded players.",
    credentials: [
      { key: "YOUTUBE_API_KEY", hint: "Google Cloud Console → Credentials → API key (YouTube Data API v3 enabled)" },
      { key: "YOUTUBE_CHANNEL_ID", hint: "YouTube Studio → Settings → Channel → Advanced" },
    ],
  },
  {
    id: "x-twitter",
    name: "X (Twitter)",
    category: "Social Media",
    description: "Read or post to X via the X API.",
    task: "Integrate the X API v2: display my recent posts and let me publish a new post from the app.",
    credentials: [
      { key: "X_API_KEY", hint: "developer.x.com → your app → API key" },
      { key: "X_API_SECRET", hint: "API key secret" },
      { key: "X_ACCESS_TOKEN", hint: "Your account's access token" },
      { key: "X_ACCESS_TOKEN_SECRET", hint: "Access token secret" },
    ],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    category: "Social Media",
    description: "LinkedIn login and sharing via the LinkedIn API.",
    task: "Integrate the LinkedIn API (OAuth): connect my LinkedIn account and share a post from the app.",
    credentials: [
      { key: "LINKEDIN_CLIENT_ID", hint: "LinkedIn developer portal → your app → Auth" },
      { key: "LINKEDIN_CLIENT_SECRET", hint: "Same page → Client secret" },
    ],
  },

  // ── File Storage ──────────────────────────────────────────────────────────
  {
    id: "google-drive",
    name: "Google Drive",
    category: "File Storage",
    description: "Browse and upload files to Google Drive.",
    task: "Integrate Google Drive via OAuth: connect my Google account, browse my files, and upload files from the app.",
    credentials: [
      { key: "GOOGLE_CLIENT_ID", hint: "Google Cloud Console → Credentials → OAuth client (Drive API enabled)" },
      { key: "GOOGLE_CLIENT_SECRET", hint: "Same OAuth client" },
    ],
  },
  {
    id: "dropbox",
    name: "Dropbox",
    category: "File Storage",
    description: "Upload and manage files in Dropbox.",
    task: "Integrate Dropbox via OAuth: connect my account, list a folder's contents, and upload files from the app.",
    credentials: [
      { key: "DROPBOX_APP_KEY", hint: "dropbox.com/developers → your app → App key" },
      { key: "DROPBOX_APP_SECRET", hint: "Same page → App secret" },
    ],
  },
  {
    id: "onedrive",
    name: "OneDrive",
    category: "File Storage",
    description: "Files in OneDrive via Microsoft Graph.",
    task: "Integrate OneDrive via Microsoft Graph OAuth: connect my Microsoft account, browse files, and upload from the app.",
    credentials: [
      { key: "MICROSOFT_CLIENT_ID", hint: "Azure portal → App registrations → Application (client) ID" },
      { key: "MICROSOFT_CLIENT_SECRET", hint: "Certificates & secrets → Client secret value" },
    ],
  },
  {
    id: "amazon-s3",
    name: "Amazon S3",
    category: "File Storage",
    description: "Store user uploads in an S3 bucket.",
    task: "Integrate Amazon S3: server-side presigned upload URLs so users can upload files, plus listing and deleting uploaded files.",
    credentials: [
      { key: "AWS_ACCESS_KEY_ID", hint: "IAM user with S3 access" },
      { key: "AWS_SECRET_ACCESS_KEY", hint: "IAM secret access key" },
      { key: "AWS_REGION", hint: "e.g. us-east-1" },
      { key: "S3_BUCKET_NAME", hint: "Your bucket name" },
    ],
  },
  {
    id: "cloudflare-r2",
    name: "Cloudflare R2",
    category: "File Storage",
    description: "S3-compatible object storage with zero egress fees.",
    task: "Integrate Cloudflare R2 (S3-compatible API): presigned uploads for user files and a gallery of uploaded objects.",
    credentials: [
      { key: "R2_ACCOUNT_ID", hint: "Cloudflare dashboard → R2 → Account ID" },
      { key: "R2_ACCESS_KEY_ID", hint: "R2 → Manage API tokens" },
      { key: "R2_SECRET_ACCESS_KEY", hint: "Shown once when the token is created" },
      { key: "R2_BUCKET_NAME", hint: "Your R2 bucket name" },
    ],
  },

  // ── CRM & Project Management ──────────────────────────────────────────────
  {
    id: "salesforce",
    name: "Salesforce",
    category: "CRM & Project Management",
    description: "Sync leads and contacts with Salesforce.",
    task: "Integrate Salesforce (OAuth): create a lead in Salesforce whenever someone submits my contact form.",
    credentials: [
      { key: "SALESFORCE_CLIENT_ID", hint: "Setup → App Manager → Connected app → Consumer key" },
      { key: "SALESFORCE_CLIENT_SECRET", hint: "Consumer secret" },
      { key: "SALESFORCE_INSTANCE_URL", hint: "e.g. https://your-org.my.salesforce.com" },
    ],
  },
  {
    id: "zoho-crm",
    name: "Zoho CRM",
    category: "CRM & Project Management",
    description: "Sync leads and deals with Zoho CRM.",
    task: "Integrate Zoho CRM (OAuth): push form submissions into Zoho as leads and show sync status.",
    credentials: [
      { key: "ZOHO_CLIENT_ID", hint: "api-console.zoho.com → your client" },
      { key: "ZOHO_CLIENT_SECRET", hint: "Same client" },
      { key: "ZOHO_REFRESH_TOKEN", hint: "Generated via the self-client authorization flow" },
      { key: "ZOHO_API_DOMAIN", hint: "e.g. https://www.zohoapis.com (or .eu / .in)" },
    ],
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    category: "CRM & Project Management",
    description: "Create deals and contacts in Pipedrive.",
    task: "Integrate Pipedrive: create a person + deal from my contact/lead form and show my open deals in a small dashboard.",
    credentials: [
      { key: "PIPEDRIVE_API_TOKEN", hint: "Settings → Personal preferences → API" },
      { key: "PIPEDRIVE_COMPANY_DOMAIN", hint: "your-company (from your-company.pipedrive.com)" },
    ],
  },
  {
    id: "monday",
    name: "Monday.com",
    category: "CRM & Project Management",
    description: "Create and track items on Monday boards.",
    task: "Integrate Monday.com (GraphQL API): create items on my board from app events and show board items in a list view.",
    credentials: [
      { key: "MONDAY_API_TOKEN", hint: "Avatar → Developers → My access tokens" },
      { key: "MONDAY_BOARD_ID", hint: "The numeric ID from the board URL" },
    ],
  },
  {
    id: "asana",
    name: "Asana",
    category: "CRM & Project Management",
    description: "Create and view Asana tasks.",
    task: "Integrate Asana: create tasks in my project from the app and display open tasks grouped by section.",
    credentials: [
      { key: "ASANA_PERSONAL_ACCESS_TOKEN", hint: "app.asana.com/0/my-apps → Personal access token" },
      { key: "ASANA_PROJECT_ID", hint: "The numeric ID from the project URL" },
    ],
  },
  {
    id: "notion",
    name: "Notion",
    category: "CRM & Project Management",
    description: "Read and write Notion databases and pages.",
    task: "Integrate Notion: read rows from my database and display them, plus a form that adds new rows.",
    credentials: [
      { key: "NOTION_API_KEY", hint: "notion.so/my-integrations → Internal integration secret" },
      { key: "NOTION_DATABASE_ID", hint: "The 32-char ID from the database URL (share the DB with the integration)" },
    ],
  },
  {
    id: "airtable",
    name: "Airtable",
    category: "CRM & Project Management",
    description: "Use Airtable as a lightweight database.",
    task: "Integrate Airtable: list records from my table with filtering, and a form that creates new records.",
    credentials: [
      { key: "AIRTABLE_PERSONAL_ACCESS_TOKEN", hint: "airtable.com/create/tokens" },
      { key: "AIRTABLE_BASE_ID", hint: "appXXXXXXXX from the API docs for your base" },
      { key: "AIRTABLE_TABLE_NAME", hint: "The table to read/write" },
    ],
  },

  // ── AI & Machine Learning ─────────────────────────────────────────────────
  {
    id: "openai",
    name: "OpenAI",
    category: "AI & Machine Learning",
    description: "GPT models for chat, generation, and embeddings.",
    task: "Integrate the OpenAI API: an AI feature (e.g. chat assistant or content generator) with streaming responses, called from a server route so the key stays secret.",
    credentials: [
      { key: "OPENAI_API_KEY", hint: "platform.openai.com → API keys" },
    ],
  },
  {
    id: "claude",
    name: "Claude (Anthropic)",
    category: "AI & Machine Learning",
    description: "Claude models for chat and content generation.",
    task: "Integrate the Anthropic API: an AI assistant feature using a current Claude model with streaming responses, called server-side.",
    credentials: [
      { key: "ANTHROPIC_API_KEY", hint: "console.anthropic.com → API keys" },
    ],
  },
  {
    id: "gemini",
    name: "Gemini (Google)",
    category: "AI & Machine Learning",
    description: "Google's Gemini models for text and multimodal AI.",
    task: "Integrate the Gemini API: an AI feature (text or image understanding) using the Google GenAI SDK, called server-side.",
    credentials: [
      { key: "GEMINI_API_KEY", hint: "aistudio.google.com → Get API key" },
    ],
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    category: "AI & Machine Learning",
    description: "Lifelike text-to-speech voices.",
    task: "Integrate ElevenLabs: convert text to speech server-side and play the audio in the app with a simple player.",
    credentials: [
      { key: "ELEVENLABS_API_KEY", hint: "elevenlabs.io → Profile → API key" },
      { key: "ELEVENLABS_VOICE_ID", hint: "Voice Lab → your voice → ID" },
    ],
  },
  {
    id: "replicate",
    name: "Replicate",
    category: "AI & Machine Learning",
    description: "Run open-source AI models (image, video, audio).",
    task: "Integrate Replicate: run a model (e.g. image generation) from a server route with progress polling and show the result.",
    credentials: [
      { key: "REPLICATE_API_TOKEN", hint: "replicate.com/account/api-tokens" },
    ],
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  {
    id: "google-analytics",
    name: "Google Analytics",
    category: "Analytics",
    description: "Track visitors with Google Analytics 4.",
    task: "Add Google Analytics 4: the gtag snippet on all pages with page-view tracking and a couple of custom events for key actions.",
    credentials: [
      { key: "NEXT_PUBLIC_GA_MEASUREMENT_ID", hint: "GA4 → Admin → Data streams → Measurement ID (G-XXXX)", isPublic: true },
    ],
  },
  {
    id: "posthog",
    name: "PostHog",
    category: "Analytics",
    description: "Product analytics, session replay, and feature flags.",
    task: "Integrate PostHog: initialize the JS SDK, capture page views and key events, and identify logged-in users.",
    credentials: [
      { key: "NEXT_PUBLIC_POSTHOG_KEY", hint: "PostHog → Project settings → Project API key", isPublic: true },
      { key: "NEXT_PUBLIC_POSTHOG_HOST", hint: "https://us.i.posthog.com or your instance URL", isPublic: true },
    ],
  },
  {
    id: "mixpanel",
    name: "Mixpanel",
    category: "Analytics",
    description: "Event analytics with Mixpanel.",
    task: "Integrate Mixpanel: track page views and key user actions, and identify logged-in users with profile properties.",
    credentials: [
      { key: "NEXT_PUBLIC_MIXPANEL_TOKEN", hint: "Project settings → Project token", isPublic: true },
    ],
  },
  {
    id: "hotjar",
    name: "Hotjar",
    category: "Analytics",
    description: "Heatmaps and session recordings.",
    task: "Add the Hotjar tracking snippet across the app so heatmaps and recordings work.",
    credentials: [
      { key: "NEXT_PUBLIC_HOTJAR_SITE_ID", hint: "Hotjar → Settings → Sites & organizations → Site ID", isPublic: true },
    ],
  },

  // ── Authentication ────────────────────────────────────────────────────────
  {
    id: "google-login",
    name: "Google Login",
    category: "Authentication",
    description: "Sign in with Google.",
    task: "Add 'Sign in with Google' (OAuth): login button, callback route, and user session. Document the exact redirect URI I must add in Google Cloud Console.",
    credentials: [
      { key: "GOOGLE_CLIENT_ID", hint: "Google Cloud Console → Credentials → OAuth 2.0 client" },
      { key: "GOOGLE_CLIENT_SECRET", hint: "Same OAuth client" },
    ],
  },
  {
    id: "apple-login",
    name: "Apple Login",
    category: "Authentication",
    description: "Sign in with Apple.",
    task: "Add 'Sign in with Apple' (OAuth): login button, callback handling, and session. Document the return URL for the Apple Services ID.",
    credentials: [
      { key: "APPLE_CLIENT_ID", hint: "Apple developer → Services ID (e.g. com.yourapp.web)" },
      { key: "APPLE_TEAM_ID", hint: "Membership details → Team ID" },
      { key: "APPLE_KEY_ID", hint: "Keys → your Sign in with Apple key" },
      { key: "APPLE_PRIVATE_KEY", hint: "Contents of the .p8 key file" },
    ],
  },
  {
    id: "microsoft-login",
    name: "Microsoft Login",
    category: "Authentication",
    description: "Sign in with a Microsoft account.",
    task: "Add 'Sign in with Microsoft' (Entra ID OAuth): login button, callback route, and session. Document the redirect URI for the Azure app registration.",
    credentials: [
      { key: "MICROSOFT_CLIENT_ID", hint: "Azure portal → App registrations → Application (client) ID" },
      { key: "MICROSOFT_CLIENT_SECRET", hint: "Certificates & secrets → Client secret value" },
      { key: "MICROSOFT_TENANT_ID", hint: "Directory (tenant) ID, or 'common'" },
    ],
  },
  {
    id: "auth0",
    name: "Auth0",
    category: "Authentication",
    description: "Full-featured auth platform by Okta.",
    task: "Integrate Auth0: login/logout, protected pages, and a user profile section. Document the callback and logout URLs I must allow in Auth0.",
    credentials: [
      { key: "AUTH0_DOMAIN", hint: "your-tenant.us.auth0.com" },
      { key: "AUTH0_CLIENT_ID", hint: "Applications → your app" },
      { key: "AUTH0_CLIENT_SECRET", hint: "Same app settings" },
      { key: "AUTH0_SECRET", hint: "A long random string for session encryption (openssl rand -hex 32)" },
    ],
  },
  {
    id: "clerk",
    name: "Clerk",
    category: "Authentication",
    description: "Drop-in auth and user management.",
    task: "Integrate Clerk: sign-up/sign-in pages, protected routes, and the user button component wired to my Clerk instance.",
    credentials: [
      { key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", hint: "Clerk dashboard → API keys", isPublic: true },
      { key: "CLERK_SECRET_KEY", hint: "Same page → Secret key" },
    ],
  },

  // ── Hosting & DevOps ──────────────────────────────────────────────────────
  {
    id: "vercel",
    name: "Vercel",
    category: "Hosting & DevOps",
    description: "Deploy and manage projects on Vercel.",
    task: "Integrate the Vercel API: show my project's latest deployments and their status, with links to each deployment.",
    credentials: [
      { key: "VERCEL_TOKEN", hint: "vercel.com/account/tokens" },
      { key: "VERCEL_PROJECT_ID", hint: "Project → Settings → General" },
    ],
  },
  {
    id: "netlify",
    name: "Netlify",
    category: "Hosting & DevOps",
    description: "Deploy and manage sites on Netlify.",
    task: "Integrate the Netlify API: show my site's deploy history and trigger a new build from the app.",
    credentials: [
      { key: "NETLIFY_AUTH_TOKEN", hint: "User settings → Applications → Personal access tokens" },
      { key: "NETLIFY_SITE_ID", hint: "Site settings → General → Site ID" },
    ],
  },
  {
    id: "cloudflare-pages",
    name: "Cloudflare Pages",
    category: "Hosting & DevOps",
    description: "Deployments on Cloudflare Pages.",
    task: "Integrate the Cloudflare API: list my Pages project's deployments and trigger a new deployment.",
    credentials: [
      { key: "CLOUDFLARE_API_TOKEN", hint: "dash.cloudflare.com → My profile → API tokens" },
      { key: "CLOUDFLARE_ACCOUNT_ID", hint: "Dashboard right sidebar → Account ID" },
      { key: "CLOUDFLARE_PAGES_PROJECT", hint: "Your Pages project name" },
    ],
  },
  {
    id: "aws",
    name: "AWS",
    category: "Hosting & DevOps",
    description: "Use AWS services (Lambda, SES, DynamoDB, …).",
    task: "Integrate AWS: set up the AWS SDK server-side for the service I need (tell me which — e.g. SES for email, DynamoDB for data) with a working example.",
    credentials: [
      { key: "AWS_ACCESS_KEY_ID", hint: "IAM user access key" },
      { key: "AWS_SECRET_ACCESS_KEY", hint: "IAM secret access key" },
      { key: "AWS_REGION", hint: "e.g. us-east-1" },
    ],
  },
  {
    id: "github",
    name: "GitHub",
    category: "Hosting & DevOps",
    description: "Repos, issues, and commits via the GitHub API.",
    task: "Integrate the GitHub API: show my repository's recent commits, open issues, and pull requests in a dashboard.",
    credentials: [
      { key: "GITHUB_TOKEN", hint: "github.com/settings/tokens → fine-grained token with repo read access" },
      { key: "GITHUB_REPO", hint: "owner/repo" },
    ],
  },
  {
    id: "gitlab",
    name: "GitLab",
    category: "Hosting & DevOps",
    description: "Projects and pipelines via the GitLab API.",
    task: "Integrate the GitLab API: show my project's recent pipelines, merge requests, and issues.",
    credentials: [
      { key: "GITLAB_TOKEN", hint: "GitLab → Preferences → Access tokens" },
      { key: "GITLAB_PROJECT_ID", hint: "Project → Settings → General → Project ID" },
    ],
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    category: "Hosting & DevOps",
    description: "Repos and pipelines via the Bitbucket API.",
    task: "Integrate the Bitbucket API: show my repository's recent commits and pull requests.",
    credentials: [
      { key: "BITBUCKET_USERNAME", hint: "Your Bitbucket username" },
      { key: "BITBUCKET_APP_PASSWORD", hint: "Personal settings → App passwords" },
      { key: "BITBUCKET_WORKSPACE_REPO", hint: "workspace/repo-slug" },
    ],
  },
  {
    id: "jira",
    name: "Jira",
    category: "Hosting & DevOps",
    description: "Issues and boards via the Jira Cloud API.",
    task: "Integrate Jira: create issues from the app and show my project's open issues grouped by status.",
    credentials: [
      { key: "JIRA_BASE_URL", hint: "https://your-team.atlassian.net" },
      { key: "JIRA_EMAIL", hint: "The Atlassian account email for the API token" },
      { key: "JIRA_API_TOKEN", hint: "id.atlassian.com → Security → API tokens" },
      { key: "JIRA_PROJECT_KEY", hint: "e.g. PROJ" },
    ],
  },
  {
    id: "linear",
    name: "Linear",
    category: "Hosting & DevOps",
    description: "Issues and projects via the Linear API.",
    task: "Integrate Linear (GraphQL API): create issues from the app (e.g. from a feedback form) and list my team's active issues.",
    credentials: [
      { key: "LINEAR_API_KEY", hint: "Linear → Settings → API → Personal API keys" },
      { key: "LINEAR_TEAM_KEY", hint: "e.g. ENG (shown in issue IDs)" },
    ],
  },

  // ── CMS & Content ─────────────────────────────────────────────────────────
  {
    id: "wordpress",
    name: "WordPress",
    category: "CMS & Content",
    description: "Pull posts and pages from a WordPress site.",
    task: "Integrate the WordPress REST API: show my blog posts (list + detail pages) pulled from my WordPress site with images and categories.",
    credentials: [
      { key: "WORDPRESS_SITE_URL", hint: "https://your-site.com" },
      { key: "WORDPRESS_USERNAME", hint: "Optional — only for creating/updating content" },
      { key: "WORDPRESS_APP_PASSWORD", hint: "Optional — Users → Profile → Application passwords" },
    ],
  },
  {
    id: "sanity",
    name: "Sanity",
    category: "CMS & Content",
    description: "Structured content from Sanity CMS.",
    task: "Integrate Sanity: fetch content from my dataset via GROQ and render it (e.g. blog or product content) with live-ish updates.",
    credentials: [
      { key: "SANITY_PROJECT_ID", hint: "sanity.io/manage → your project" },
      { key: "SANITY_DATASET", hint: "usually 'production'" },
      { key: "SANITY_API_TOKEN", hint: "Optional — API → Tokens, for private datasets or writes" },
    ],
  },
  {
    id: "contentful",
    name: "Contentful",
    category: "CMS & Content",
    description: "Content from Contentful's delivery API.",
    task: "Integrate Contentful: fetch entries of my content type and render them as pages/sections with images.",
    credentials: [
      { key: "CONTENTFUL_SPACE_ID", hint: "Settings → API keys" },
      { key: "CONTENTFUL_DELIVERY_TOKEN", hint: "Content Delivery API access token" },
      { key: "CONTENTFUL_ENVIRONMENT", hint: "usually 'master'" },
    ],
  },
  {
    id: "strapi",
    name: "Strapi",
    category: "CMS & Content",
    description: "Content from a self-hosted Strapi CMS.",
    task: "Integrate Strapi: fetch my collection's entries via the REST API and render them, handling images and rich text.",
    credentials: [
      { key: "STRAPI_API_URL", hint: "https://your-strapi-host.com" },
      { key: "STRAPI_API_TOKEN", hint: "Settings → API tokens" },
    ],
  },
  {
    id: "supabase",
    name: "Supabase",
    category: "CMS & Content",
    description: "Postgres database, auth, and storage.",
    task: "Integrate Supabase: connect the client, create the tables my app needs, and wire up data reads/writes (plus auth if my app has login).",
    credentials: [
      { key: "NEXT_PUBLIC_SUPABASE_URL", hint: "Project settings → API → Project URL", isPublic: true },
      { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", hint: "Project settings → API → anon public key", isPublic: true },
      { key: "SUPABASE_SERVICE_ROLE_KEY", hint: "service_role key — server-side only, never expose" },
    ],
  },

  // ── Communication ─────────────────────────────────────────────────────────
  {
    id: "twilio",
    name: "Twilio",
    category: "Communication",
    description: "Send SMS and make calls with Twilio.",
    task: "Integrate Twilio: send SMS notifications from the app (e.g. order confirmations or OTP codes) via a server route.",
    credentials: [
      { key: "TWILIO_ACCOUNT_SID", hint: "Twilio console → Account info" },
      { key: "TWILIO_AUTH_TOKEN", hint: "Same page → Auth token" },
      { key: "TWILIO_PHONE_NUMBER", hint: "Your Twilio number in E.164 format, e.g. +15551234567" },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    category: "Communication",
    description: "Send messages to Slack channels.",
    task: "Integrate Slack: post notifications to my channel when key events happen in the app (new signup, new order, form submission).",
    credentials: [
      { key: "SLACK_BOT_TOKEN", hint: "api.slack.com/apps → OAuth & Permissions → Bot token (xoxb-…), or use a webhook URL instead" },
      { key: "SLACK_CHANNEL_ID", hint: "Channel → View details → ID (or #channel-name)" },
    ],
  },
  {
    id: "discord",
    name: "Discord",
    category: "Communication",
    description: "Send messages to a Discord server.",
    task: "Integrate Discord: send event notifications to my channel via a webhook (rich embeds for important events).",
    credentials: [
      { key: "DISCORD_WEBHOOK_URL", hint: "Channel settings → Integrations → Webhooks → Copy URL" },
    ],
  },
  {
    id: "microsoft-teams",
    name: "Microsoft Teams",
    category: "Communication",
    description: "Post messages to Teams channels.",
    task: "Integrate Microsoft Teams: send notification cards to my channel via an incoming webhook when key app events happen.",
    credentials: [
      { key: "TEAMS_WEBHOOK_URL", hint: "Teams channel → ⋯ → Workflows/Connectors → Incoming webhook URL" },
    ],
  },
  {
    id: "whatsapp-business",
    name: "WhatsApp Business",
    category: "Communication",
    description: "Send WhatsApp messages via the Cloud API.",
    task: "Integrate the WhatsApp Business Cloud API: send template messages (e.g. order updates) to customers from a server route.",
    credentials: [
      { key: "WHATSAPP_ACCESS_TOKEN", hint: "Meta developer app → WhatsApp → API setup" },
      { key: "WHATSAPP_PHONE_NUMBER_ID", hint: "Same page → Phone number ID" },
    ],
  },
  {
    id: "telegram",
    name: "Telegram",
    category: "Communication",
    description: "Send messages via a Telegram bot.",
    task: "Integrate Telegram: send notifications to my chat/channel via my bot when key app events happen.",
    credentials: [
      { key: "TELEGRAM_BOT_TOKEN", hint: "Create a bot with @BotFather → token" },
      { key: "TELEGRAM_CHAT_ID", hint: "Your chat/channel ID (get it from @userinfobot or the getUpdates API)" },
    ],
  },

  // ── Design ────────────────────────────────────────────────────────────────
  {
    id: "figma",
    name: "Figma",
    category: "Design",
    description: "Read designs and assets from Figma files.",
    task: "Integrate the Figma API: fetch frames/components from my file and display them (e.g. a design gallery or spec viewer).",
    credentials: [
      { key: "FIGMA_ACCESS_TOKEN", hint: "Figma → Settings → Security → Personal access tokens" },
      { key: "FIGMA_FILE_KEY", hint: "From the file URL: figma.com/design/{file_key}/…" },
    ],
  },
  {
    id: "framer",
    name: "Framer",
    category: "Design",
    description: "Embed or link Framer-built pages.",
    task: "Integrate my Framer site: embed my published Framer page(s) in the app where it makes sense, matching the surrounding design.",
    credentials: [
      { key: "NEXT_PUBLIC_FRAMER_SITE_URL", hint: "Your published Framer site URL", isPublic: true },
    ],
  },
  {
    id: "webflow",
    name: "Webflow",
    category: "Design",
    description: "CMS items and pages from Webflow.",
    task: "Integrate the Webflow API: fetch my CMS collection items and render them in the app (e.g. blog or portfolio items).",
    credentials: [
      { key: "WEBFLOW_API_TOKEN", hint: "Webflow → Site settings → Apps & integrations → API access" },
      { key: "WEBFLOW_COLLECTION_ID", hint: "CMS → collection settings → Collection ID" },
    ],
  },
  {
    id: "canva",
    name: "Canva",
    category: "Design",
    description: "Canva Connect API for designs and exports.",
    task: "Integrate the Canva Connect API (OAuth): connect my Canva account and list/export my designs into the app.",
    credentials: [
      { key: "CANVA_CLIENT_ID", hint: "canva.com/developers → your integration" },
      { key: "CANVA_CLIENT_SECRET", hint: "Same integration → Client secret" },
    ],
  },

  // ── Automation ────────────────────────────────────────────────────────────
  {
    id: "zapier",
    name: "Zapier",
    category: "Automation",
    description: "Trigger Zapier workflows from your app.",
    task: "Integrate Zapier: send app events (new signup, form submission, new order) to my Zap via a webhook trigger so I can automate anything downstream.",
    credentials: [
      { key: "ZAPIER_WEBHOOK_URL", hint: "Zap editor → Webhooks by Zapier → Catch hook URL" },
    ],
  },
  {
    id: "make",
    name: "Make",
    category: "Automation",
    description: "Trigger Make (Integromat) scenarios.",
    task: "Integrate Make: send app events to my scenario's custom webhook so downstream automations run.",
    credentials: [
      { key: "MAKE_WEBHOOK_URL", hint: "Scenario → Webhooks module → webhook URL" },
    ],
  },
  {
    id: "n8n",
    name: "n8n",
    category: "Automation",
    description: "Trigger self-hosted n8n workflows.",
    task: "Integrate n8n: send app events to my workflow's webhook node, with an optional header auth token.",
    credentials: [
      { key: "N8N_WEBHOOK_URL", hint: "Workflow → Webhook node → Production URL" },
      { key: "N8N_AUTH_HEADER_VALUE", hint: "Optional — value for header auth on the webhook" },
    ],
  },
];

/** Official website per integration id — used to load real brand logos. */
export const INTEGRATION_DOMAINS: Record<string, string> = {
  shopify: "shopify.com",
  woocommerce: "woocommerce.com",
  etsy: "etsy.com",
  "amazon-seller": "amazon.com",
  ebay: "ebay.com",
  bigcommerce: "bigcommerce.com",
  square: "squareup.com",
  stripe: "stripe.com",
  paypal: "paypal.com",
  paddle: "paddle.com",
  "lemon-squeezy": "lemonsqueezy.com",
  shippo: "goshippo.com",
  shipstation: "shipstation.com",
  dhl: "dhl.com",
  fedex: "fedex.com",
  ups: "ups.com",
  mailchimp: "mailchimp.com",
  klaviyo: "klaviyo.com",
  hubspot: "hubspot.com",
  brevo: "brevo.com",
  activecampaign: "activecampaign.com",
  convertkit: "kit.com",
  intercom: "intercom.com",
  zendesk: "zendesk.com",
  freshdesk: "freshdesk.com",
  crisp: "crisp.chat",
  tidio: "tidio.com",
  calendly: "calendly.com",
  "google-calendar": "calendar.google.com",
  "microsoft-calendar": "outlook.com",
  "acuity-scheduling": "acuityscheduling.com",
  instagram: "instagram.com",
  "facebook-pages": "facebook.com",
  tiktok: "tiktok.com",
  youtube: "youtube.com",
  "x-twitter": "x.com",
  linkedin: "linkedin.com",
  "google-drive": "drive.google.com",
  dropbox: "dropbox.com",
  onedrive: "onedrive.live.com",
  "amazon-s3": "aws.amazon.com",
  "cloudflare-r2": "cloudflare.com",
  salesforce: "salesforce.com",
  "zoho-crm": "zoho.com",
  pipedrive: "pipedrive.com",
  monday: "monday.com",
  asana: "asana.com",
  notion: "notion.so",
  airtable: "airtable.com",
  openai: "openai.com",
  claude: "anthropic.com",
  gemini: "gemini.google.com",
  elevenlabs: "elevenlabs.io",
  replicate: "replicate.com",
  "google-analytics": "analytics.google.com",
  posthog: "posthog.com",
  mixpanel: "mixpanel.com",
  hotjar: "hotjar.com",
  "google-login": "google.com",
  "apple-login": "apple.com",
  "microsoft-login": "microsoft.com",
  auth0: "auth0.com",
  clerk: "clerk.com",
  vercel: "vercel.com",
  netlify: "netlify.com",
  "cloudflare-pages": "cloudflare.com",
  aws: "aws.amazon.com",
  github: "github.com",
  gitlab: "gitlab.com",
  bitbucket: "bitbucket.org",
  jira: "atlassian.com",
  linear: "linear.app",
  wordpress: "wordpress.org",
  sanity: "sanity.io",
  contentful: "contentful.com",
  strapi: "strapi.io",
  supabase: "supabase.com",
  twilio: "twilio.com",
  slack: "slack.com",
  discord: "discord.com",
  "microsoft-teams": "microsoft.com",
  "whatsapp-business": "whatsapp.com",
  telegram: "telegram.org",
  figma: "figma.com",
  framer: "framer.com",
  webflow: "webflow.com",
  canva: "canva.com",
  zapier: "zapier.com",
  make: "make.com",
  n8n: "n8n.io",
};

export function getIntegrationLogoUrl(integrationId: string): string | null {
  const domain = INTEGRATION_DOMAINS[integrationId];
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

const PLACEHOLDER = "[PASTE YOUR VALUE HERE]";

/**
 * Builds the "Ask AI" chat prompt for an integration. Credential values the
 * user typed into the panel are inlined; anything left blank keeps a clearly
 * marked placeholder so the user (or the AI) knows what is still missing.
 */
export function buildIntegrationPrompt(
  integration: IntegrationDefinition,
  credentialValues: Record<string, string> = {},
): string {
  const credentialLines = integration.credentials
    .map((credential) => {
      const value = credentialValues[credential.key]?.trim();
      return `- ${credential.key} = ${value || PLACEHOLDER}  (${credential.hint})`;
    })
    .join("\n");

  return [
    `Integrate ${integration.name} into my app.`,
    "",
    `Goal: ${integration.task}`,
    "",
    "Implementation requirements:",
    "- Build the integration end to end: server routes/SDK calls, UI, loading and error states.",
    "- Read every secret from environment variables using the exact names below; never hardcode secrets or expose non-public keys in client-side code.",
    "- If the integration needs an OAuth redirect URL or webhook URL, set it up and tell me the exact URL to register in the provider's dashboard.",
    "- Add a short setup note listing any remaining manual steps.",
    "",
    `My ${integration.name} connection details (keep these exact variable names):`,
    credentialLines,
    "",
    `If a value above still says ${PLACEHOLDER}, build everything anyway with that value read from its environment variable, and tell me exactly where in ${integration.name} to find it and where to paste it.`,
  ].join("\n");
}

export function searchIntegrations(
  query: string,
  category: string | null,
): IntegrationDefinition[] {
  const normalizedQuery = query.trim().toLowerCase();

  return INTEGRATIONS_CATALOG.filter((integration) => {
    if (category && integration.category !== category) return false;
    if (!normalizedQuery) return true;

    return (
      integration.name.toLowerCase().includes(normalizedQuery) ||
      integration.category.toLowerCase().includes(normalizedQuery) ||
      integration.description.toLowerCase().includes(normalizedQuery)
    );
  });
}
