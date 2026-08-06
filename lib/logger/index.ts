// ============================================================================
// Discord Logger - Main LoggerService
// ============================================================================
//
// Centralized logging service for sending rich Discord embeds.
//
// Usage:
//   import { logger } from '@/lib/logger';
//
//   logger.login({ method: 'email', success: true }, userContext);
//   logger.payment('payment_success', { amount: 29.99, ... }, userContext);
//   logger.aiRequest('chat_request', { model: 'gpt-4', ... }, userContext);
//   logger.security('brute_force', { riskLevel: 'critical', ... }, userContext);
//   logger.error('exception', { errorMessage: '...', severity: 'error' });
//
// ============================================================================

import type {
  LoggerConfig,
  LogEventData,
  UserContext,
  QueueItem,
  ChannelRoute,
  LogAttachment,
  // Event types
  AuthEventType,
  AuthLoginData,
  AuthRegisterData,
  AuthPasswordData,
  AuthEmailData,
  Auth2FAData,
  AuthSessionData,
  UserProfileData,
  UserAccountData,
  AIEventType,
  AIRequestData,
  BillingEventType,
  BillingPaymentData,
  APIEventType,
  APIRequestData,
  AdminEventType,
  AdminActionData,
  SecurityEventType,
  SecurityAlertData,
  SystemEventType,
  SystemEventData,
  ErrorEventType,
  ErrorLogData,
  AuditEventType,
  AuditEventData,
} from '@/lib/logger/types';

// Services
import { createDiscordService, type DiscordService } from '@/lib/logger/services/discord.service';
import { embedBuilder } from '@/lib/logger/services/embed.service';
import { queueService, type QueueService } from '@/lib/logger/services/queue.service';

// Channel routing
import {
  getEventChannel,
  getAllLogsChannel,
  getLiveEventsChannel,
} from '@/lib/logger/config/channels';

// Handlers
import {
  handleLogin,
  handleRegister,
  handlePasswordChange,
  handleEmailChange,
  handle2FA,
  handleSession,
} from '@/lib/logger/handlers/auth.handler';
import {
  handleProfileUpdate,
  handleAccountAction,
} from '@/lib/logger/handlers/user.handler';
import { handleAIRequest } from '@/lib/logger/handlers/ai.handler';
import { handleBillingEvent } from '@/lib/logger/handlers/billing.handler';
import { handleAPIEvent } from '@/lib/logger/handlers/api.handler';
import { handleAdminEvent } from '@/lib/logger/handlers/admin.handler';
import { handleSecurityEvent } from '@/lib/logger/handlers/security.handler';
import { handleSystemEvent } from '@/lib/logger/handlers/system.handler';
import { handleErrorEvent } from '@/lib/logger/handlers/error.handler';
import { handleAuditEvent } from '@/lib/logger/handlers/audit.handler';

// Utilities
import { parseUserAgent } from '@/lib/logger/utils/device-parser';
import { lookupIP } from '@/lib/logger/utils/geo-lookup';
import { generateEventId } from '@/lib/logger/utils/formatters';

// ----------------------------------------------------------------------------
// Default Configuration
// ----------------------------------------------------------------------------

const DEFAULT_CONFIG: LoggerConfig = {
  deliveryMode: 'webhook',
  enableQueue: true,
  maxRetries: 3,
  retryBaseDelay: 1000,
  batchSize: 5,
  flushInterval: 2000,
  enableConsoleLog: process.env.NODE_ENV === 'development',
  enableDatabaseLog: false,
};

// ----------------------------------------------------------------------------
// Logger Service Class
// ----------------------------------------------------------------------------

/**
 * Centralized Discord logging service.
 *
 * Provides convenience methods for every event category.
 * Automatically routes events to the correct Discord channel,
 * builds rich embeds, and queues messages for rate-limit-safe delivery.
 */
class LoggerService {
  private config: LoggerConfig;
  private discordService: DiscordService;
  private queue: QueueService;
  private initialized = false;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.discordService = createDiscordService(this.config);
    this.queue = queueService;
  }

  /**
   * Initialize the logger (start queue processing).
   * Safe to call multiple times — only initializes once.
   */
  init(config?: Partial<LoggerConfig>): void {
    if (this.initialized) return;

    if (config) {
      this.config = { ...this.config, ...config };
      this.discordService = createDiscordService(this.config);
    }

    if (this.config.enableQueue) {
      this.queue.startProcessing(this.discordService);
    }

    this.initialized = true;
    console.log('[Discord Logger] Initialized', {
      mode: this.config.deliveryMode,
      queue: this.config.enableQueue,
    });
  }

  /**
   * Gracefully shut down the logger.
   */
  async shutdown(): Promise<void> {
    if (this.config.enableQueue) {
      await this.queue.flush();
      this.queue.stopProcessing();
    }
    this.initialized = false;
    console.log('[Discord Logger] Shut down');
  }

  // ==========================================================================
  // AUTHENTICATION
  // ==========================================================================

  /** Log a login event */
  login(data: AuthLoginData, user?: UserContext): void {
    const event = handleLogin(data, user);
    this.dispatch(event);
  }

  /** Log a registration event */
  register(data: AuthRegisterData, user?: UserContext): void {
    const event = handleRegister(data, user);
    this.dispatch(event);
  }

  /** Log a password change/reset event */
  passwordChange(data: AuthPasswordData, user?: UserContext): void {
    const event = handlePasswordChange(data, user);
    this.dispatch(event);
  }

  /** Log an email change/verification event */
  emailChange(data: AuthEmailData, user?: UserContext): void {
    const event = handleEmailChange(data, user);
    this.dispatch(event);
  }

  /** Log a 2FA enable/disable event */
  twoFactor(data: Auth2FAData, user?: UserContext): void {
    const event = handle2FA(data, user);
    this.dispatch(event);
  }

  /** Log a session event (created, expired, logout) */
  session(data: AuthSessionData, user?: UserContext): void {
    const event = handleSession(data, user);
    this.dispatch(event);
  }

  /** Log a logout event */
  logout(user?: UserContext): void {
    this.session({ action: 'logout' }, user);
  }

  // ==========================================================================
  // USERS
  // ==========================================================================

  /** Log a profile update event */
  profileUpdate(data: UserProfileData, user?: UserContext): void {
    const event = handleProfileUpdate(data, user);
    this.dispatch(event);
  }

  /** Log an account action (delete, restrict, role change, subscription) */
  accountAction(data: UserAccountData, user?: UserContext): void {
    const event = handleAccountAction(data, user);
    this.dispatch(event);
  }

  // ==========================================================================
  // AI SYSTEM
  // ==========================================================================

  /** Log any AI system event */
  aiRequest(
    eventType: AIEventType,
    data: AIRequestData,
    user?: UserContext
  ): void {
    const event = handleAIRequest(eventType, data, user);
    this.dispatch(event);
  }

  /** Shorthand: Log an AI chat request */
  aiChat(data: AIRequestData, user?: UserContext): void {
    this.aiRequest('chat_request', data, user);
  }

  /** Shorthand: Log an agent event */
  agent(
    action: 'started' | 'finished',
    data: AIRequestData,
    user?: UserContext
  ): void {
    this.aiRequest(
      action === 'started' ? 'agent_started' : 'agent_finished',
      data,
      user
    );
  }

  // ==========================================================================
  // BILLING
  // ==========================================================================

  /** Log any billing event */
  payment(
    eventType: BillingEventType,
    data: BillingPaymentData,
    user?: UserContext
  ): void {
    const event = handleBillingEvent(eventType, data, user);
    this.dispatch(event);
  }

  /** Shorthand: Log a successful payment */
  paymentSuccess(data: BillingPaymentData, user?: UserContext): void {
    this.payment('payment_success', { ...data, success: true }, user);
  }

  /** Shorthand: Log a failed payment */
  paymentFailed(data: BillingPaymentData, user?: UserContext): void {
    this.payment('payment_failed', { ...data, success: false }, user);
  }

  // ==========================================================================
  // API
  // ==========================================================================

  /** Log any API event */
  api(
    eventType: APIEventType,
    data: APIRequestData,
    user?: UserContext
  ): void {
    const event = handleAPIEvent(eventType, data, user);
    this.dispatch(event);
  }

  /** Shorthand: Log an API request */
  apiRequest(data: APIRequestData, user?: UserContext): void {
    this.api('api_request', data, user);
  }

  // ==========================================================================
  // ADMIN
  // ==========================================================================

  /** Log any admin event */
  admin(
    eventType: AdminEventType,
    data: AdminActionData,
    user?: UserContext
  ): void {
    const event = handleAdminEvent(eventType, data, user);
    this.dispatch(event);
  }

  /** Shorthand: Log a ban event */
  ban(data: AdminActionData, user?: UserContext): void {
    this.admin('ban', data, user);
  }

  /** Shorthand: Log an unban event */
  unban(data: AdminActionData, user?: UserContext): void {
    this.admin('unban', data, user);
  }

  // ==========================================================================
  // SECURITY
  // ==========================================================================

  /** Log any security event */
  security(
    eventType: SecurityEventType,
    data: SecurityAlertData,
    user?: UserContext
  ): void {
    const event = handleSecurityEvent(eventType, data, user);
    this.dispatch(event);
  }

  /** Shorthand: Log a failed login from security perspective */
  securityAlert(data: SecurityAlertData, user?: UserContext): void {
    this.security(data.alertType, data, user);
  }

  // ==========================================================================
  // SYSTEM
  // ==========================================================================

  /** Log any system event */
  system(
    eventType: SystemEventType,
    data: SystemEventData,
    user?: UserContext
  ): void {
    const event = handleSystemEvent(eventType, data, user);
    this.dispatch(event);
  }

  /** Shorthand: Log system startup */
  startup(data?: Partial<SystemEventData>): void {
    this.system('startup', { success: true, ...data });
  }

  /** Shorthand: Log system shutdown */
  shutdownEvent(data?: Partial<SystemEventData>): void {
    this.system('shutdown', { success: true, ...data });
  }

  /** Shorthand: Log a deployment */
  deploy(data: SystemEventData): void {
    this.system('deploy', data);
  }

  /** Shorthand: Log a health check */
  healthCheck(data: SystemEventData): void {
    this.system('health_check', data);
  }

  // ==========================================================================
  // ERRORS
  // ==========================================================================

  /** Log any error event */
  error(
    eventType: ErrorEventType,
    data: ErrorLogData,
    user?: UserContext
  ): void {
    const event = handleErrorEvent(eventType, data, user);
    this.dispatch(event);
  }

  /** Shorthand: Log an exception from an Error object */
  exception(err: Error, context?: { component?: string; endpoint?: string }, user?: UserContext): void {
    this.error(
      'exception',
      {
        errorName: err.name,
        errorMessage: err.message,
        errorStack: err.stack,
        component: context?.component,
        endpoint: context?.endpoint,
        severity: 'error',
      },
      user
    );
  }

  /** Shorthand: Log a warning */
  warn(message: string, context?: Record<string, unknown>): void {
    this.error('warning', {
      errorMessage: message,
      severity: 'warning',
      ...context,
    } as ErrorLogData);
  }

  /** Shorthand: Log a crash */
  crash(err: Error, context?: { component?: string }): void {
    this.error('crash', {
      errorName: err.name,
      errorMessage: err.message,
      errorStack: err.stack,
      component: context?.component,
      severity: 'error',
    });
  }

  // ==========================================================================
  // AUDIT
  // ==========================================================================

  /** Log any audit event */
  audit(
    eventType: AuditEventType,
    data: AuditEventData,
    user?: UserContext
  ): void {
    const event = handleAuditEvent(eventType, data, user);
    this.dispatch(event);
  }

  /** Shorthand: Log a database modification */
  dbModification(data: AuditEventData, user?: UserContext): void {
    this.audit('database_modification', data, user);
  }

  /** Shorthand: Log a config change */
  configChange(data: AuditEventData, user?: UserContext): void {
    this.audit('config_change', data, user);
  }

  // ==========================================================================
  // GENERIC
  // ==========================================================================

  /**
   * Send a raw LogEventData. Use this when you need full control
   * over the event data, bypassing the handler layer.
   */
  raw(event: LogEventData): void {
    this.dispatch(event);
  }

  // ==========================================================================
  // USER CONTEXT HELPERS
  // ==========================================================================

  /**
   * Builds a UserContext from a request-like object.
   * Automatically parses the user agent and enriches with geo data.
   */
  async buildUserContext(params: {
    userId?: string;
    username?: string;
    email?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<UserContext> {
    const deviceInfo = parseUserAgent(params.userAgent);

    let country: string | undefined;
    let city: string | undefined;

    if (params.ipAddress) {
      try {
        const geo = await lookupIP(params.ipAddress);
        country = geo.country;
        city = geo.city;
      } catch {
        // Geo lookup failed, continue without it
      }
    }

    return {
      userId: params.userId,
      username: params.username,
      email: params.email,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      device: deviceInfo.device,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      country,
      city,
    };
  }

  // ==========================================================================
  // INTERNAL DISPATCH
  // ==========================================================================

  /**
   * Core dispatch method. Builds the embed, routes to the correct channel,
   * and either queues or sends immediately.
   */
  private dispatch(event: LogEventData, attachments?: LogAttachment[]): void {
    try {
      // Console logging
      if (this.config.enableConsoleLog) {
        console.log(
          `[Discord Logger] ${event.severity.toUpperCase()} | ` +
            `${event.category} | ${event.eventTitle}`,
          event.metadata ?? ''
        );
      }

      // Build the Discord embed
      const embed = embedBuilder.buildEmbed(event);

      // Get the target channel
      const channelRoute = getEventChannel(event.category, event.eventType);

      // Also send to all-logs channel
      const allLogsRoute = getAllLogsChannel();
      const liveEventsRoute = getLiveEventsChannel();

      if (this.config.enableQueue) {
        // Queue for rate-limited delivery
        const baseItem: Omit<QueueItem, 'id' | 'channelRoute'> = {
          embed,
          attachments,
          retryCount: 0,
          maxRetries: this.config.maxRetries,
          createdAt: new Date(),
          priority: this.getPriority(event),
        };

        // Primary channel
        this.queue.enqueue({
          ...baseItem,
          id: generateEventId(),
          channelRoute,
        });

        // All-logs mirror (if configured)
        if (allLogsRoute.channelId || allLogsRoute.webhookUrl) {
          this.queue.enqueue({
            ...baseItem,
            id: generateEventId(),
            channelRoute: allLogsRoute,
            priority: 'low', // Lower priority for mirror
          });
        }

        // Live events mirror (if configured)
        if (liveEventsRoute.channelId || liveEventsRoute.webhookUrl) {
          this.queue.enqueue({
            ...baseItem,
            id: generateEventId(),
            channelRoute: liveEventsRoute,
            priority: 'low',
          });
        }
      } else {
        // Send immediately (fire and forget)
        this.discordService
          .send(channelRoute, embed, attachments)
          .catch((err) =>
            console.error('[Discord Logger] Send failed:', err)
          );
      }
    } catch (err) {
      // Never let logging crash the application
      console.error(
        '[Discord Logger] Dispatch error:',
        err instanceof Error ? err.message : err
      );
    }
  }

  /**
   * Determines queue priority based on event severity.
   */
  private getPriority(
    event: LogEventData
  ): QueueItem['priority'] {
    switch (event.severity) {
      case 'error':
        return 'high';
      case 'warning':
        return 'normal';
      default:
        return 'normal';
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/** Global logger instance */
export const logger = new LoggerService();

/** Re-export LoggerService class for custom instances */
export { LoggerService };

/** Re-export all types for convenience */
export type * from '@/lib/logger/types';
