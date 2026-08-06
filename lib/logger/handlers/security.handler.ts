// ============================================================================
// Discord Logger - Security Event Handler
// ============================================================================

import type {
  LogEventData,
  UserContext,
  SecurityEventType,
  SecurityAlertData,
  ChannelRoute,
  LogSeverity,
} from '@/lib/logger/types';
import { getEventChannel } from '@/lib/logger/config/channels';
import { getEventTitle } from '@/lib/logger/config/events';
import { generateEventId } from '@/lib/logger/utils/formatters';

// ----------------------------------------------------------------------------
// Channel Routing
// ----------------------------------------------------------------------------

export function getSecurityChannel(eventType: SecurityEventType): ChannelRoute {
  return getEventChannel('security', eventType);
}

// ----------------------------------------------------------------------------
// Risk Level → Severity Mapping
// ----------------------------------------------------------------------------

function riskToSeverity(
  riskLevel: SecurityAlertData['riskLevel']
): LogSeverity {
  switch (riskLevel) {
    case 'low':
      return 'info';
    case 'medium':
      return 'warning';
    case 'high':
    case 'critical':
      return 'error';
    default:
      return 'warning';
  }
}

// ----------------------------------------------------------------------------
// Handler Function
// ----------------------------------------------------------------------------

/**
 * Handle any security event.
 */
export function handleSecurityEvent(
  eventType: SecurityEventType,
  data: SecurityAlertData,
  user?: UserContext
): LogEventData {
  // Brute force always gets error severity
  const severity: LogSeverity =
    eventType === 'brute_force' ? 'error' : riskToSeverity(data.riskLevel);

  return {
    eventId: generateEventId(),
    category: 'security',
    eventType,
    eventTitle: getEventTitle(eventType),
    severity,
    user,
    success: data.success,
    timestamp: new Date(),
    metadata: {
      riskLevel: data.riskLevel,
      ...(data.description && { description: data.description }),
      ...(data.ipAddress && { ipAddress: data.ipAddress }),
      ...(data.previousIp && { previousIp: data.previousIp }),
      ...(data.previousCountry && { previousCountry: data.previousCountry }),
      ...(data.newCountry && { newCountry: data.newCountry }),
      ...(data.vpnProvider && { vpnProvider: data.vpnProvider }),
      ...(data.attemptCount !== undefined && { attemptCount: data.attemptCount }),
      ...(data.blocked !== undefined && { blocked: data.blocked }),
    },
  };
}
