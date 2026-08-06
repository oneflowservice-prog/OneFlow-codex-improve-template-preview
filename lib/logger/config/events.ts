// ============================================================================
// Discord Logger - Event Configuration
// ============================================================================

import type {
  EventType,
  EventCategory,
  LogSeverity,
} from '@/lib/logger/types';

// ----------------------------------------------------------------------------
// Event Titles (human-readable with emoji)
// ----------------------------------------------------------------------------

/** Maps each EventType to a human-readable title with emoji prefix */
const EVENT_TITLES: Record<string, string> = {
  // Authentication
  login: '🔑 User Login',
  register: '📝 New Registration',
  password_changed: '🔒 Password Changed',
  password_reset: '🔓 Password Reset',
  email_changed: '📧 Email Changed',
  email_verified: '✅ Email Verified',
  '2fa_enabled': '🛡️ 2FA Enabled',
  '2fa_disabled': '⚠️ 2FA Disabled',
  logout: '🚪 User Logout',
  session_created: '🎫 Session Created',
  session_expired: '⏰ Session Expired',

  // Users
  profile_updated: '👤 Profile Updated',
  username_changed: '✏️ Username Changed',
  avatar_changed: '🖼️ Avatar Changed',
  subscription_updated: '💳 Subscription Updated',
  account_deleted: '🗑️ Account Deleted',
  account_restricted: '🚫 Account Restricted',
  role_changed: '🏷️ Role Changed',
  preferences_updated: '⚙️ Preferences Updated',

  // AI System
  chat_request: '💬 AI Chat Request',
  chat_response: '🤖 AI Chat Response',
  agent_started: '🚀 Agent Started',
  agent_finished: '🏁 Agent Finished',
  image_generation: '🎨 Image Generated',
  video_generation: '🎬 Video Generated',
  voice_generation: '🎙️ Voice Generated',
  document_generation: '📄 Document Generated',
  token_usage: '🪙 Token Usage',
  credit_usage: '💎 Credit Usage',
  ai_error: '🤖❌ AI Error',

  // Billing
  payment_success: '💰 Payment Successful',
  payment_failed: '💸 Payment Failed',
  refund: '🔄 Refund Processed',
  invoice_created: '🧾 Invoice Created',
  free_credits: '🎁 Free Credits Granted',
  credit_topup: '💎 Credit Top-Up',
  subscription_started: '🟢 Subscription Started',
  subscription_cancelled: '🔴 Subscription Cancelled',
  subscription_renewed: '🔄 Subscription Renewed',

  // API
  api_request: '🔌 API Request',
  api_error: '🔌❌ API Error',
  api_key_created: '🔑 API Key Created',
  api_key_deleted: '🗑️ API Key Deleted',
  webhook_execution: '🪝 Webhook Executed',
  integration: '🔗 Integration Event',
  rate_limit: '🚦 Rate Limit Hit',
  api_latency: '⏱️ API Latency Alert',

  // Admin
  staff_action: '👨‍💼 Staff Action',
  admin_action: '🛡️ Admin Action',
  permission_change: '🔐 Permission Changed',
  ban: '🔨 User Banned',
  unban: '✅ User Unbanned',
  deleted_message: '🗑️ Message Deleted',
  manual_override: '⚡ Manual Override',

  // Security
  failed_login: '🚨 Failed Login Attempt',
  invalid_password: '❌ Invalid Password',
  invalid_token: '🔒 Invalid Token',
  suspicious_activity: '🕵️ Suspicious Activity',
  vpn_detected: '🌐 VPN Detected',
  new_device_login: '📱 New Device Login',
  new_country_login: '🌍 New Country Login',
  ip_change: '🔄 IP Address Changed',
  access_denied: '⛔ Access Denied',
  brute_force: '🚨 Brute Force Attempt',

  // System
  startup: '🟢 System Started',
  shutdown: '🔴 System Shutdown',
  restart: '🔄 System Restart',
  build: '🔨 Build Completed',
  deploy: '🚀 Deployment',
  env_change: '📝 Environment Changed',
  database_query: '🗃️ Database Query',
  cache_event: '💾 Cache Event',
  queue_event: '📬 Queue Event',
  health_check: '💓 Health Check',

  // Errors
  warning: '⚠️ Warning',
  exception: '❌ Exception',
  unhandled_rejection: '💥 Unhandled Rejection',
  database_error: '🗃️❌ Database Error',
  crash: '💀 Application Crash',
  performance_issue: '🐌 Performance Issue',

  // Audit
  database_modification: '📝 Database Modified',
  config_change: '⚙️ Config Changed',
  object_deleted: '🗑️ Object Deleted',
  backup: '💾 Backup Created',
  restore: '📥 Backup Restored',
  env_variable_change: '🔧 Env Variable Changed',
};

// ----------------------------------------------------------------------------
// Default Severity Mapping
// ----------------------------------------------------------------------------

/** Default severity for each event type */
const DEFAULT_SEVERITY: Record<string, LogSeverity> = {
  // Authentication
  login: 'success',
  register: 'success',
  password_changed: 'info',
  password_reset: 'warning',
  email_changed: 'info',
  email_verified: 'success',
  '2fa_enabled': 'success',
  '2fa_disabled': 'warning',
  logout: 'info',
  session_created: 'info',
  session_expired: 'info',

  // Users
  profile_updated: 'info',
  username_changed: 'info',
  avatar_changed: 'info',
  subscription_updated: 'info',
  account_deleted: 'warning',
  account_restricted: 'warning',
  role_changed: 'info',
  preferences_updated: 'info',

  // AI System
  chat_request: 'info',
  chat_response: 'info',
  agent_started: 'info',
  agent_finished: 'success',
  image_generation: 'info',
  video_generation: 'info',
  voice_generation: 'info',
  document_generation: 'info',
  token_usage: 'info',
  credit_usage: 'info',
  ai_error: 'error',

  // Billing
  payment_success: 'success',
  payment_failed: 'error',
  refund: 'warning',
  invoice_created: 'info',
  free_credits: 'info',
  credit_topup: 'success',
  subscription_started: 'success',
  subscription_cancelled: 'warning',
  subscription_renewed: 'success',

  // API
  api_request: 'info',
  api_error: 'error',
  api_key_created: 'info',
  api_key_deleted: 'warning',
  webhook_execution: 'info',
  integration: 'info',
  rate_limit: 'warning',
  api_latency: 'warning',

  // Admin
  staff_action: 'info',
  admin_action: 'info',
  permission_change: 'warning',
  ban: 'warning',
  unban: 'info',
  deleted_message: 'info',
  manual_override: 'warning',

  // Security
  failed_login: 'error',
  invalid_password: 'error',
  invalid_token: 'error',
  suspicious_activity: 'error',
  vpn_detected: 'warning',
  new_device_login: 'warning',
  new_country_login: 'warning',
  ip_change: 'info',
  access_denied: 'error',
  brute_force: 'error',

  // System
  startup: 'success',
  shutdown: 'warning',
  restart: 'warning',
  build: 'info',
  deploy: 'info',
  env_change: 'warning',
  database_query: 'info',
  cache_event: 'info',
  queue_event: 'info',
  health_check: 'info',

  // Errors
  warning: 'warning',
  exception: 'error',
  unhandled_rejection: 'error',
  database_error: 'error',
  crash: 'error',
  performance_issue: 'warning',

  // Audit
  database_modification: 'info',
  config_change: 'info',
  object_deleted: 'warning',
  backup: 'info',
  restore: 'info',
  env_variable_change: 'warning',
};

// ----------------------------------------------------------------------------
// Event → Category Mapping
// ----------------------------------------------------------------------------

/** Maps each event type to its category */
const EVENT_CATEGORIES: Record<string, EventCategory> = {
  // Authentication
  login: 'authentication',
  register: 'authentication',
  password_changed: 'authentication',
  password_reset: 'authentication',
  email_changed: 'authentication',
  email_verified: 'authentication',
  '2fa_enabled': 'authentication',
  '2fa_disabled': 'authentication',
  logout: 'authentication',
  session_created: 'authentication',
  session_expired: 'authentication',

  // Users
  profile_updated: 'users',
  username_changed: 'users',
  avatar_changed: 'users',
  subscription_updated: 'users',
  account_deleted: 'users',
  account_restricted: 'users',
  role_changed: 'users',
  preferences_updated: 'users',

  // AI System
  chat_request: 'ai',
  chat_response: 'ai',
  agent_started: 'ai',
  agent_finished: 'ai',
  image_generation: 'ai',
  video_generation: 'ai',
  voice_generation: 'ai',
  document_generation: 'ai',
  token_usage: 'ai',
  credit_usage: 'ai',
  ai_error: 'ai',

  // Billing
  payment_success: 'billing',
  payment_failed: 'billing',
  refund: 'billing',
  invoice_created: 'billing',
  free_credits: 'billing',
  credit_topup: 'billing',
  subscription_started: 'billing',
  subscription_cancelled: 'billing',
  subscription_renewed: 'billing',

  // API
  api_request: 'api',
  api_error: 'api',
  api_key_created: 'api',
  api_key_deleted: 'api',
  webhook_execution: 'api',
  integration: 'api',
  rate_limit: 'api',
  api_latency: 'api',

  // Admin
  staff_action: 'admin',
  admin_action: 'admin',
  permission_change: 'admin',
  ban: 'admin',
  unban: 'admin',
  deleted_message: 'admin',
  manual_override: 'admin',

  // Security
  failed_login: 'security',
  invalid_password: 'security',
  invalid_token: 'security',
  suspicious_activity: 'security',
  vpn_detected: 'security',
  new_device_login: 'security',
  new_country_login: 'security',
  ip_change: 'security',
  access_denied: 'security',
  brute_force: 'security',

  // System
  startup: 'system',
  shutdown: 'system',
  restart: 'system',
  build: 'system',
  deploy: 'system',
  env_change: 'system',
  database_query: 'system',
  cache_event: 'system',
  queue_event: 'system',
  health_check: 'system',

  // Errors
  warning: 'errors',
  exception: 'errors',
  unhandled_rejection: 'errors',
  database_error: 'errors',
  crash: 'errors',
  performance_issue: 'errors',

  // Audit
  database_modification: 'audit',
  config_change: 'audit',
  object_deleted: 'audit',
  backup: 'audit',
  restore: 'audit',
  env_variable_change: 'audit',
};

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------

/**
 * Returns the default severity for a given event type.
 */
export function getDefaultSeverity(eventType: EventType): LogSeverity {
  return DEFAULT_SEVERITY[eventType] ?? 'info';
}

/**
 * Returns the human-readable title for a given event type.
 */
export function getEventTitle(eventType: EventType): string {
  return EVENT_TITLES[eventType] ?? `📝 ${eventType.replace(/_/g, ' ')}`;
}

/**
 * Returns the category for a given event type.
 */
export function getEventCategory(eventType: EventType): EventCategory {
  return EVENT_CATEGORIES[eventType] ?? 'system';
}

/**
 * Returns all event types for a given category.
 */
export function getEventsByCategory(category: EventCategory): EventType[] {
  return Object.entries(EVENT_CATEGORIES)
    .filter(([, cat]) => cat === category)
    .map(([type]) => type as EventType);
}
