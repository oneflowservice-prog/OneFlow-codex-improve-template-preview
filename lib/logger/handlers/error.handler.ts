// ============================================================================
// Discord Logger - Error Event Handler
// ============================================================================

import type {
  LogEventData,
  UserContext,
  ErrorEventType,
  ErrorLogData,
  ChannelRoute,
  LogSeverity,
} from '@/lib/logger/types';
import { getEventChannel } from '@/lib/logger/config/channels';
import { getEventTitle } from '@/lib/logger/config/events';
import { generateEventId, truncate, codeBlock } from '@/lib/logger/utils/formatters';

// ----------------------------------------------------------------------------
// Channel Routing
// ----------------------------------------------------------------------------

export function getErrorChannel(eventType: ErrorEventType): ChannelRoute {
  return getEventChannel('errors', eventType);
}

// ----------------------------------------------------------------------------
// Handler Function
// ----------------------------------------------------------------------------

/**
 * Handle any error event.
 */
export function handleErrorEvent(
  eventType: ErrorEventType,
  data: ErrorLogData,
  user?: UserContext
): LogEventData {
  // Determine severity
  let severity: LogSeverity = data.severity;
  if (eventType === 'crash') severity = 'error';
  if (eventType === 'warning') severity = 'warning';
  if (eventType === 'performance_issue') severity = 'warning';

  return {
    eventId: generateEventId(),
    category: 'errors',
    eventType,
    eventTitle: getEventTitle(eventType),
    severity,
    user,
    success: false,
    timestamp: new Date(),
    metadata: {
      ...(data.errorName && { errorName: data.errorName }),
      errorMessage: data.errorMessage,
      ...(data.errorStack && {
        errorStack: codeBlock(truncate(data.errorStack, 500)),
      }),
      ...(data.errorCode && { errorCode: data.errorCode }),
      ...(data.component && { component: data.component }),
      ...(data.endpoint && { endpoint: data.endpoint }),
      ...(data.statusCode !== undefined && { statusCode: data.statusCode }),
      ...(data.responseTime !== undefined && {
        responseTime: `${data.responseTime}ms`,
      }),
      ...(data.threshold !== undefined && {
        threshold: `${data.threshold}ms`,
      }),
    },
  };
}
