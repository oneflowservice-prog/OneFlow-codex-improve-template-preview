// ============================================================================
// Discord Logger - Type Definitions
// ============================================================================

// ----------------------------------------------------------------------------
// Severity
// ----------------------------------------------------------------------------

/** Severity levels for log events */
export type LogSeverity = 'success' | 'warning' | 'error' | 'info';

// ----------------------------------------------------------------------------
// Event Categories
// ----------------------------------------------------------------------------

/** Event categories matching Discord channel groups */
export type EventCategory =
  | 'authentication'
  | 'users'
  | 'ai'
  | 'billing'
  | 'api'
  | 'admin'
  | 'security'
  | 'system'
  | 'errors'
  | 'audit';

// ----------------------------------------------------------------------------
// Event Types by Category
// ----------------------------------------------------------------------------

/** Authentication event types */
export type AuthEventType =
  | 'login'
  | 'register'
  | 'password_changed'
  | 'password_reset'
  | 'email_changed'
  | 'email_verified'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'logout'
  | 'session_created'
  | 'session_expired';

/** User event types */
export type UserEventType =
  | 'profile_updated'
  | 'username_changed'
  | 'avatar_changed'
  | 'subscription_updated'
  | 'account_deleted'
  | 'account_restricted'
  | 'role_changed'
  | 'preferences_updated';

/** AI system event types */
export type AIEventType =
  | 'chat_request'
  | 'chat_response'
  | 'agent_started'
  | 'agent_finished'
  | 'image_generation'
  | 'video_generation'
  | 'voice_generation'
  | 'document_generation'
  | 'token_usage'
  | 'credit_usage'
  | 'ai_error';

/** Billing event types */
export type BillingEventType =
  | 'payment_success'
  | 'payment_failed'
  | 'refund'
  | 'invoice_created'
  | 'free_credits'
  | 'credit_topup'
  | 'subscription_started'
  | 'subscription_cancelled'
  | 'subscription_renewed';

/** API event types */
export type APIEventType =
  | 'api_request'
  | 'api_error'
  | 'api_key_created'
  | 'api_key_deleted'
  | 'webhook_execution'
  | 'integration'
  | 'rate_limit'
  | 'api_latency';

/** Admin event types */
export type AdminEventType =
  | 'staff_action'
  | 'admin_action'
  | 'permission_change'
  | 'ban'
  | 'unban'
  | 'deleted_message'
  | 'manual_override';

/** Security event types */
export type SecurityEventType =
  | 'failed_login'
  | 'invalid_password'
  | 'invalid_token'
  | 'suspicious_activity'
  | 'vpn_detected'
  | 'new_device_login'
  | 'new_country_login'
  | 'ip_change'
  | 'access_denied'
  | 'brute_force';

/** System event types */
export type SystemEventType =
  | 'startup'
  | 'shutdown'
  | 'restart'
  | 'build'
  | 'deploy'
  | 'env_change'
  | 'database_query'
  | 'cache_event'
  | 'queue_event'
  | 'health_check';

/** Error event types */
export type ErrorEventType =
  | 'warning'
  | 'exception'
  | 'unhandled_rejection'
  | 'api_error'
  | 'database_error'
  | 'ai_error'
  | 'crash'
  | 'performance_issue';

/** Audit event types */
export type AuditEventType =
  | 'database_modification'
  | 'config_change'
  | 'object_deleted'
  | 'backup'
  | 'restore'
  | 'env_variable_change';

/** Union of all event types */
export type EventType =
  | AuthEventType
  | UserEventType
  | AIEventType
  | BillingEventType
  | APIEventType
  | AdminEventType
  | SecurityEventType
  | SystemEventType
  | ErrorEventType
  | AuditEventType;

// ----------------------------------------------------------------------------
// Attachment
// ----------------------------------------------------------------------------

/** File attachment that can be included with a log embed */
export interface LogAttachment {
  /** Display name for the attachment */
  name: string;
  /** URL to the file */
  url: string;
  /** Type of attachment */
  type: 'image' | 'video' | 'document' | 'screenshot';
}

// ----------------------------------------------------------------------------
// User Context
// ----------------------------------------------------------------------------

/** User context extracted from the request */
export interface UserContext {
  userId?: string;
  username?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
}

// ----------------------------------------------------------------------------
// Channel Routing
// ----------------------------------------------------------------------------

/** Channel routing configuration */
export interface ChannelRoute {
  /** Discord channel ID (for bot mode) */
  channelId?: string;
  /** Discord webhook URL (for webhook mode) */
  webhookUrl?: string;
  /** Human-readable channel name */
  channelName: string;
}

// ----------------------------------------------------------------------------
// Log Event Data
// ----------------------------------------------------------------------------

/** Core log event data — produced by handlers, consumed by embed builder */
export interface LogEventData {
  /** Unique event ID */
  eventId: string;
  /** Event category for routing */
  category: EventCategory;
  /** Specific event type */
  eventType: EventType;
  /** Human-readable event title */
  eventTitle: string;
  /** Severity level (determines embed color) */
  severity: LogSeverity;
  /** User context if available */
  user?: UserContext;
  /** Additional key-value metadata */
  metadata?: Record<string, unknown>;
  /** Whether the operation succeeded */
  success?: boolean;
  /** Custom footer text */
  footer?: string;
  /** File attachments */
  attachments?: LogAttachment[];
  /** Event timestamp */
  timestamp: Date;
}

// ----------------------------------------------------------------------------
// Discord Embed Types (matching Discord API)
// ----------------------------------------------------------------------------

/** Discord embed field */
export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

/** Discord embed structure */
export interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields: DiscordEmbedField[];
  thumbnail?: { url: string };
  image?: { url: string };
  footer: { text: string; icon_url?: string };
  timestamp: string;
  author?: { name: string; icon_url?: string; url?: string };
}

// ----------------------------------------------------------------------------
// Queue Types
// ----------------------------------------------------------------------------

/** Queue item for rate-limited sending */
export interface QueueItem {
  id: string;
  channelRoute: ChannelRoute;
  embed: DiscordEmbed;
  attachments?: LogAttachment[];
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  priority: 'high' | 'normal' | 'low';
}

// ----------------------------------------------------------------------------
// Configuration
// ----------------------------------------------------------------------------

/** Discord delivery mode */
export type DeliveryMode = 'webhook' | 'bot' | 'both';

/** Logger configuration */
export interface LoggerConfig {
  /** How to deliver messages: webhook URLs, bot token, or both */
  deliveryMode: DeliveryMode;
  /** Discord bot token (required if deliveryMode is 'bot' or 'both') */
  botToken?: string;
  /** Whether to queue messages for rate limit handling */
  enableQueue: boolean;
  /** Maximum retry attempts for failed sends */
  maxRetries: number;
  /** Base delay in ms for exponential backoff */
  retryBaseDelay: number;
  /** Number of messages to batch send */
  batchSize: number;
  /** How often to flush the queue in ms */
  flushInterval: number;
  /** Also log to console */
  enableConsoleLog: boolean;
  /** Also store logs in database */
  enableDatabaseLog: boolean;
}

// ----------------------------------------------------------------------------
// Device & Geo Info
// ----------------------------------------------------------------------------

/** Parsed device information from user agent */
export interface DeviceInfo {
  device: string;
  browser: string;
  os: string;
}

/** Geographic information from IP lookup */
export interface GeoInfo {
  country: string;
  city: string;
  region: string;
  timezone: string;
}

// ----------------------------------------------------------------------------
// Handler-Specific Data Types
// ----------------------------------------------------------------------------

/** Auth - Login */
export interface AuthLoginData {
  method?: string;
  success: boolean;
  sessionId?: string;
  mfaUsed?: boolean;
  failureReason?: string;
}

/** Auth - Register */
export interface AuthRegisterData {
  method?: string;
  success: boolean;
  plan?: string;
  referralCode?: string;
}

/** Auth - Password */
export interface AuthPasswordData {
  action: 'changed' | 'reset';
  success: boolean;
  resetToken?: string;
  method?: string;
}

/** Auth - Email */
export interface AuthEmailData {
  action: 'changed' | 'verified';
  oldEmail?: string;
  newEmail?: string;
  success: boolean;
}

/** Auth - 2FA */
export interface Auth2FAData {
  action: 'enabled' | 'disabled';
  method?: string;
  success: boolean;
}

/** Auth - Session */
export interface AuthSessionData {
  action: 'created' | 'expired' | 'logout';
  sessionId?: string;
  duration?: number;
  reason?: string;
}

/** User - Profile */
export interface UserProfileData {
  action:
    | 'profile_updated'
    | 'username_changed'
    | 'avatar_changed'
    | 'preferences_updated';
  changes?: Record<string, { old: unknown; new: unknown }>;
  success: boolean;
}

/** User - Account */
export interface UserAccountData {
  action:
    | 'account_deleted'
    | 'account_restricted'
    | 'role_changed'
    | 'subscription_updated';
  reason?: string;
  newRole?: string;
  oldRole?: string;
  newPlan?: string;
  oldPlan?: string;
  restrictionType?: string;
  success: boolean;
}

/** AI - Request */
export interface AIRequestData {
  model?: string;
  provider?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  duration?: number;
  agentId?: string;
  agentName?: string;
  generationType?: string;
  creditsUsed?: number;
  success: boolean;
  error?: string;
}

/** Billing - Payment */
export interface BillingPaymentData {
  amount?: number;
  currency?: string;
  stripePaymentId?: string;
  stripeCustomerId?: string;
  invoiceId?: string;
  plan?: string;
  interval?: string;
  credits?: number;
  refundReason?: string;
  success: boolean;
  failureReason?: string;
}

/** API - Request */
export interface APIRequestData {
  method?: string;
  path?: string;
  statusCode?: number;
  latencyMs?: number;
  apiKeyId?: string;
  apiKeyName?: string;
  webhookId?: string;
  webhookUrl?: string;
  integrationName?: string;
  rateLimitRemaining?: number;
  rateLimitTotal?: number;
  errorMessage?: string;
  success: boolean;
}

/** Admin - Action */
export interface AdminActionData {
  action: string;
  targetUserId?: string;
  targetUsername?: string;
  reason?: string;
  duration?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  messageContent?: string;
  overrideDetails?: string;
  performedBy: string;
  success: boolean;
}

/** Security - Alert */
export interface SecurityAlertData {
  alertType: SecurityEventType;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  ipAddress?: string;
  previousIp?: string;
  previousCountry?: string;
  newCountry?: string;
  vpnProvider?: string;
  attemptCount?: number;
  blocked?: boolean;
  success: boolean;
}

/** System - Event */
export interface SystemEventData {
  service?: string;
  version?: string;
  environment?: string;
  buildId?: string;
  deployId?: string;
  duration?: number;
  queryText?: string;
  queryDuration?: number;
  cacheKey?: string;
  cacheHit?: boolean;
  healthStatus?: 'healthy' | 'degraded' | 'unhealthy';
  uptime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  success: boolean;
}

/** Error - Event */
export interface ErrorLogData {
  errorName?: string;
  errorMessage: string;
  errorStack?: string;
  errorCode?: string;
  component?: string;
  endpoint?: string;
  statusCode?: number;
  responseTime?: number;
  threshold?: number;
  severity: LogSeverity;
}

/** Audit - Event */
export interface AuditEventData {
  tableName?: string;
  recordId?: string;
  operation?: 'create' | 'update' | 'delete';
  changes?: Record<string, { old: unknown; new: unknown }>;
  configKey?: string;
  configOldValue?: string;
  configNewValue?: string;
  backupId?: string;
  backupSize?: number;
  envKey?: string;
  performedBy?: string;
  success: boolean;
}
