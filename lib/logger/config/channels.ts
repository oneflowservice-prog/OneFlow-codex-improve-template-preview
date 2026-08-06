// ============================================================================
// Discord Logger - Channel Configuration & Routing
// ============================================================================

import type {
  ChannelRoute,
  EventCategory,
  EventType,
  AuthEventType,
  UserEventType,
  AIEventType,
  BillingEventType,
  APIEventType,
  AdminEventType,
  SecurityEventType,
  SystemEventType,
  ErrorEventType,
  AuditEventType,
} from '@/lib/logger/types';

// ----------------------------------------------------------------------------
// Channel Name Constants (match Discord server structure)
// ----------------------------------------------------------------------------

export const CHANNEL_NAMES = {
  // LIVE LOGS
  ALL_LOGS: 'all-logs',
  LIVE_EVENTS: 'live-events',
  ACTIVITY_FEED: 'activity-feed',

  // AUTHENTICATION
  LOGIN_LOGS: 'login-logs',
  REGISTER_LOGS: 'register-logs',
  PASSWORD_LOGS: 'password-logs',
  EMAIL_LOGS: 'email-logs',
  TWO_FACTOR_LOGS: 'two-factor-logs',
  LOGOUT_LOGS: 'logout-logs',

  // USERS
  USER_ACTIVITY: 'user-activity',
  PROFILE_UPDATES: 'profile-updates',
  SETTINGS_UPDATES: 'settings-updates',
  ACCOUNT_DELETIONS: 'account-deletions',
  USER_RESTRICTIONS: 'user-restrictions',

  // AI SYSTEM
  AI_LOGS: 'ai-logs',
  AGENT_ACTIVITY: 'agent-activity',
  IMAGE_LOGS: 'image-logs',
  VIDEO_LOGS: 'video-logs',
  VOICE_LOGS: 'voice-logs',
  DOCUMENT_LOGS: 'document-logs',
  TOKEN_USAGE: 'token-usage',
  CREDIT_USAGE: 'credit-usage',

  // BILLING
  PAYMENT_LOGS: 'payment-logs',
  STRIPE_LOGS: 'stripe-logs',
  REFUND_LOGS: 'refund-logs',
  INVOICE_LOGS: 'invoice-logs',
  FREE_CREDIT_LOGS: 'free-credit-logs',
  TOPUP_LOGS: 'topup-logs',

  // API
  API_REQUESTS: 'api-requests',
  API_KEY_LOGS: 'api-key-logs',
  WEBHOOK_LOGS: 'webhook-logs',
  INTEGRATION_LOGS: 'integration-logs',
  RATE_LIMIT_LOGS: 'rate-limit-logs',

  // ADMIN
  ADMIN_ACTIONS: 'admin-actions',
  STAFF_ACTIONS: 'staff-actions',
  PERMISSION_CHANGES: 'permission-changes',
  BAN_LOGS: 'ban-logs',
  UNBAN_LOGS: 'unban-logs',

  // SECURITY
  SECURITY_ALERTS: 'security-alerts',
  FAILED_LOGINS: 'failed-logins',
  IP_LOGS: 'ip-logs',
  SUSPICIOUS_ACTIVITY: 'suspicious-activity',
  ACCESS_DENIED: 'access-denied',

  // SYSTEM
  SERVER_STATUS: 'server-status',
  DEPLOYMENT_LOGS: 'deployment-logs',
  RESTART_LOGS: 'restart-logs',
  BUILD_LOGS: 'build-logs',
  SYSTEM_EVENTS: 'system-events',
  DATABASE_LOGS: 'database-logs',

  // ERRORS
  WARNINGS: 'warnings',
  ERROR_LOGS: 'error-logs',
  CRASH_LOGS: 'crash-logs',
  DEBUG_LOGS: 'debug-logs',
  PERFORMANCE: 'performance',

  // AUDIT
  AUDIT_LOG: 'audit-log',
  CONFIG_CHANGES: 'config-changes',
  DELETED_ITEMS: 'deleted-items',
  BACKUP_LOGS: 'backup-logs',
} as const;

export type ChannelName = (typeof CHANNEL_NAMES)[keyof typeof CHANNEL_NAMES];

// ----------------------------------------------------------------------------
// Environment Variable Helpers
// ----------------------------------------------------------------------------

/**
 * Converts a channel name to its env var key for the channel ID.
 * e.g. "login-logs" → "DISCORD_CHANNEL_LOGIN_LOGS"
 */
function toChannelEnvKey(channelName: string): string {
  return `DISCORD_CHANNEL_${channelName.toUpperCase().replace(/-/g, '_')}`;
}

/**
 * Converts a channel name to its env var key for the webhook URL.
 * e.g. "login-logs" → "DISCORD_WEBHOOK_LOGIN_LOGS"
 */
function toWebhookEnvKey(channelName: string): string {
  return `DISCORD_WEBHOOK_${channelName.toUpperCase().replace(/-/g, '_')}`;
}

// ----------------------------------------------------------------------------
// Channel Route Resolution
// ----------------------------------------------------------------------------

/**
 * Resolves a ChannelRoute from environment variables for a given channel name.
 * Reads both the channel ID and webhook URL env vars.
 */
export function getChannelRoute(channelName: string): ChannelRoute {
  const channelId = process.env[toChannelEnvKey(channelName)];
  const webhookUrl = process.env[toWebhookEnvKey(channelName)];

  return {
    channelName,
    channelId: channelId || undefined,
    webhookUrl: webhookUrl || undefined,
  };
}

// ----------------------------------------------------------------------------
// Event → Channel Mapping
// ----------------------------------------------------------------------------

/** Maps every EventType to its target Discord channel name */
const EVENT_CHANNEL_MAP: Record<string, ChannelName> = {
  // Authentication
  login: CHANNEL_NAMES.LOGIN_LOGS,
  register: CHANNEL_NAMES.REGISTER_LOGS,
  password_changed: CHANNEL_NAMES.PASSWORD_LOGS,
  password_reset: CHANNEL_NAMES.PASSWORD_LOGS,
  email_changed: CHANNEL_NAMES.EMAIL_LOGS,
  email_verified: CHANNEL_NAMES.EMAIL_LOGS,
  '2fa_enabled': CHANNEL_NAMES.TWO_FACTOR_LOGS,
  '2fa_disabled': CHANNEL_NAMES.TWO_FACTOR_LOGS,
  logout: CHANNEL_NAMES.LOGOUT_LOGS,
  session_created: CHANNEL_NAMES.LOGOUT_LOGS,
  session_expired: CHANNEL_NAMES.LOGOUT_LOGS,

  // Users
  profile_updated: CHANNEL_NAMES.PROFILE_UPDATES,
  username_changed: CHANNEL_NAMES.PROFILE_UPDATES,
  avatar_changed: CHANNEL_NAMES.PROFILE_UPDATES,
  subscription_updated: CHANNEL_NAMES.USER_ACTIVITY,
  account_deleted: CHANNEL_NAMES.ACCOUNT_DELETIONS,
  account_restricted: CHANNEL_NAMES.USER_RESTRICTIONS,
  role_changed: CHANNEL_NAMES.USER_ACTIVITY,
  preferences_updated: CHANNEL_NAMES.SETTINGS_UPDATES,

  // AI System
  chat_request: CHANNEL_NAMES.AI_LOGS,
  chat_response: CHANNEL_NAMES.AI_LOGS,
  agent_started: CHANNEL_NAMES.AGENT_ACTIVITY,
  agent_finished: CHANNEL_NAMES.AGENT_ACTIVITY,
  image_generation: CHANNEL_NAMES.IMAGE_LOGS,
  video_generation: CHANNEL_NAMES.VIDEO_LOGS,
  voice_generation: CHANNEL_NAMES.VOICE_LOGS,
  document_generation: CHANNEL_NAMES.DOCUMENT_LOGS,
  token_usage: CHANNEL_NAMES.TOKEN_USAGE,
  credit_usage: CHANNEL_NAMES.CREDIT_USAGE,
  ai_error: CHANNEL_NAMES.AI_LOGS,

  // Billing
  payment_success: CHANNEL_NAMES.PAYMENT_LOGS,
  payment_failed: CHANNEL_NAMES.PAYMENT_LOGS,
  refund: CHANNEL_NAMES.REFUND_LOGS,
  invoice_created: CHANNEL_NAMES.INVOICE_LOGS,
  free_credits: CHANNEL_NAMES.FREE_CREDIT_LOGS,
  credit_topup: CHANNEL_NAMES.TOPUP_LOGS,
  subscription_started: CHANNEL_NAMES.STRIPE_LOGS,
  subscription_cancelled: CHANNEL_NAMES.STRIPE_LOGS,
  subscription_renewed: CHANNEL_NAMES.STRIPE_LOGS,

  // API
  api_request: CHANNEL_NAMES.API_REQUESTS,
  api_error: CHANNEL_NAMES.API_REQUESTS,
  api_key_created: CHANNEL_NAMES.API_KEY_LOGS,
  api_key_deleted: CHANNEL_NAMES.API_KEY_LOGS,
  webhook_execution: CHANNEL_NAMES.WEBHOOK_LOGS,
  integration: CHANNEL_NAMES.INTEGRATION_LOGS,
  rate_limit: CHANNEL_NAMES.RATE_LIMIT_LOGS,
  api_latency: CHANNEL_NAMES.API_REQUESTS,

  // Admin
  staff_action: CHANNEL_NAMES.STAFF_ACTIONS,
  admin_action: CHANNEL_NAMES.ADMIN_ACTIONS,
  permission_change: CHANNEL_NAMES.PERMISSION_CHANGES,
  ban: CHANNEL_NAMES.BAN_LOGS,
  unban: CHANNEL_NAMES.UNBAN_LOGS,
  deleted_message: CHANNEL_NAMES.ADMIN_ACTIONS,
  manual_override: CHANNEL_NAMES.ADMIN_ACTIONS,

  // Security
  failed_login: CHANNEL_NAMES.FAILED_LOGINS,
  invalid_password: CHANNEL_NAMES.FAILED_LOGINS,
  invalid_token: CHANNEL_NAMES.ACCESS_DENIED,
  suspicious_activity: CHANNEL_NAMES.SUSPICIOUS_ACTIVITY,
  vpn_detected: CHANNEL_NAMES.SECURITY_ALERTS,
  new_device_login: CHANNEL_NAMES.SECURITY_ALERTS,
  new_country_login: CHANNEL_NAMES.SECURITY_ALERTS,
  ip_change: CHANNEL_NAMES.IP_LOGS,
  access_denied: CHANNEL_NAMES.ACCESS_DENIED,
  brute_force: CHANNEL_NAMES.SUSPICIOUS_ACTIVITY,

  // System
  startup: CHANNEL_NAMES.SERVER_STATUS,
  shutdown: CHANNEL_NAMES.SERVER_STATUS,
  restart: CHANNEL_NAMES.RESTART_LOGS,
  build: CHANNEL_NAMES.BUILD_LOGS,
  deploy: CHANNEL_NAMES.DEPLOYMENT_LOGS,
  env_change: CHANNEL_NAMES.SYSTEM_EVENTS,
  database_query: CHANNEL_NAMES.DATABASE_LOGS,
  cache_event: CHANNEL_NAMES.SYSTEM_EVENTS,
  queue_event: CHANNEL_NAMES.SYSTEM_EVENTS,
  health_check: CHANNEL_NAMES.SERVER_STATUS,

  // Errors
  warning: CHANNEL_NAMES.WARNINGS,
  exception: CHANNEL_NAMES.ERROR_LOGS,
  unhandled_rejection: CHANNEL_NAMES.ERROR_LOGS,
  // Note: 'api_error' is already mapped above (API category takes priority)
  database_error: CHANNEL_NAMES.ERROR_LOGS,
  // Note: 'ai_error' is already mapped above (AI category takes priority)
  crash: CHANNEL_NAMES.CRASH_LOGS,
  performance_issue: CHANNEL_NAMES.PERFORMANCE,

  // Audit
  database_modification: CHANNEL_NAMES.AUDIT_LOG,
  config_change: CHANNEL_NAMES.CONFIG_CHANGES,
  object_deleted: CHANNEL_NAMES.DELETED_ITEMS,
  backup: CHANNEL_NAMES.BACKUP_LOGS,
  restore: CHANNEL_NAMES.BACKUP_LOGS,
  env_variable_change: CHANNEL_NAMES.CONFIG_CHANGES,
};

/**
 * Category-specific channel maps to resolve ambiguous event type names
 * (e.g. 'api_error' exists in both API and Errors categories).
 */
const CATEGORY_CHANNEL_OVERRIDES: Partial<
  Record<EventCategory, Partial<Record<string, ChannelName>>>
> = {
  errors: {
    api_error: CHANNEL_NAMES.ERROR_LOGS,
    ai_error: CHANNEL_NAMES.ERROR_LOGS,
  },
  api: {
    api_error: CHANNEL_NAMES.API_REQUESTS,
  },
  ai: {
    ai_error: CHANNEL_NAMES.AI_LOGS,
  },
};

/**
 * Resolves the ChannelRoute for a given event, using category to disambiguate
 * when an event type exists in multiple categories.
 */
export function getEventChannel(
  category: EventCategory,
  eventType: EventType
): ChannelRoute {
  // Check for category-specific override first
  const override = CATEGORY_CHANNEL_OVERRIDES[category]?.[eventType];
  const channelName =
    override ?? EVENT_CHANNEL_MAP[eventType] ?? CHANNEL_NAMES.ALL_LOGS;

  return getChannelRoute(channelName);
}

/**
 * Returns the "all-logs" channel route (every event is also sent here).
 */
export function getAllLogsChannel(): ChannelRoute {
  return getChannelRoute(CHANNEL_NAMES.ALL_LOGS);
}

/**
 * Returns the "live-events" channel route.
 */
export function getLiveEventsChannel(): ChannelRoute {
  return getChannelRoute(CHANNEL_NAMES.LIVE_EVENTS);
}

/**
 * Returns the "activity-feed" channel route.
 */
export function getActivityFeedChannel(): ChannelRoute {
  return getChannelRoute(CHANNEL_NAMES.ACTIVITY_FEED);
}
