// ============================================================================
// Discord Logger - Authentication Event Handler
// ============================================================================

import type {
  LogEventData,
  UserContext,
  AuthEventType,
  AuthLoginData,
  AuthRegisterData,
  AuthPasswordData,
  AuthEmailData,
  Auth2FAData,
  AuthSessionData,
  ChannelRoute,
} from '@/lib/logger/types';
import { getEventChannel } from '@/lib/logger/config/channels';
import { getEventTitle, getDefaultSeverity } from '@/lib/logger/config/events';
import { generateEventId } from '@/lib/logger/utils/formatters';

// ----------------------------------------------------------------------------
// Channel Routing
// ----------------------------------------------------------------------------

/**
 * Returns the Discord channel route for an authentication event.
 */
export function getAuthChannel(eventType: AuthEventType): ChannelRoute {
  return getEventChannel('authentication', eventType);
}

// ----------------------------------------------------------------------------
// Handler Functions
// ----------------------------------------------------------------------------

/**
 * Handle a login event.
 */
export function handleLogin(
  data: AuthLoginData,
  user?: UserContext
): LogEventData {
  const eventType: AuthEventType = 'login';
  return {
    eventId: generateEventId(),
    category: 'authentication',
    eventType,
    eventTitle: getEventTitle(eventType),
    severity: data.success ? 'success' : 'error',
    user,
    success: data.success,
    timestamp: new Date(),
    metadata: {
      method: data.method,
      sessionId: data.sessionId,
      mfaUsed: data.mfaUsed,
      ...(data.failureReason && { failureReason: data.failureReason }),
    },
  };
}

/**
 * Handle a registration event.
 */
export function handleRegister(
  data: AuthRegisterData,
  user?: UserContext
): LogEventData {
  const eventType: AuthEventType = 'register';
  return {
    eventId: generateEventId(),
    category: 'authentication',
    eventType,
    eventTitle: getEventTitle(eventType),
    severity: data.success ? 'success' : 'error',
    user,
    success: data.success,
    timestamp: new Date(),
    metadata: {
      method: data.method,
      plan: data.plan,
      referralCode: data.referralCode,
    },
  };
}

/**
 * Handle a password change or reset event.
 */
export function handlePasswordChange(
  data: AuthPasswordData,
  user?: UserContext
): LogEventData {
  const eventType: AuthEventType =
    data.action === 'changed' ? 'password_changed' : 'password_reset';
  return {
    eventId: generateEventId(),
    category: 'authentication',
    eventType,
    eventTitle: getEventTitle(eventType),
    severity: data.success
      ? getDefaultSeverity(eventType)
      : 'error',
    user,
    success: data.success,
    timestamp: new Date(),
    metadata: {
      action: data.action,
      method: data.method,
      ...(data.resetToken && { resetTokenProvided: true }),
    },
  };
}

/**
 * Handle an email change or verification event.
 */
export function handleEmailChange(
  data: AuthEmailData,
  user?: UserContext
): LogEventData {
  const eventType: AuthEventType =
    data.action === 'changed' ? 'email_changed' : 'email_verified';
  return {
    eventId: generateEventId(),
    category: 'authentication',
    eventType,
    eventTitle: getEventTitle(eventType),
    severity: data.success
      ? getDefaultSeverity(eventType)
      : 'error',
    user,
    success: data.success,
    timestamp: new Date(),
    metadata: {
      action: data.action,
      oldEmail: data.oldEmail,
      newEmail: data.newEmail,
    },
  };
}

/**
 * Handle a 2FA enable/disable event.
 */
export function handle2FA(
  data: Auth2FAData,
  user?: UserContext
): LogEventData {
  const eventType: AuthEventType =
    data.action === 'enabled' ? '2fa_enabled' : '2fa_disabled';
  return {
    eventId: generateEventId(),
    category: 'authentication',
    eventType,
    eventTitle: getEventTitle(eventType),
    severity: data.success
      ? getDefaultSeverity(eventType)
      : 'error',
    user,
    success: data.success,
    timestamp: new Date(),
    metadata: {
      action: data.action,
      method: data.method,
    },
  };
}

/**
 * Handle session-related events (created, expired, logout).
 */
export function handleSession(
  data: AuthSessionData,
  user?: UserContext
): LogEventData {
  const eventTypeMap: Record<string, AuthEventType> = {
    created: 'session_created',
    expired: 'session_expired',
    logout: 'logout',
  };
  const eventType = eventTypeMap[data.action] ?? 'session_created';

  return {
    eventId: generateEventId(),
    category: 'authentication',
    eventType,
    eventTitle: getEventTitle(eventType),
    severity: getDefaultSeverity(eventType),
    user,
    success: true,
    timestamp: new Date(),
    metadata: {
      action: data.action,
      sessionId: data.sessionId,
      ...(data.duration !== undefined && { durationMs: data.duration }),
      reason: data.reason,
    },
  };
}
