// ============================================================================
// Discord Logger - System Event Handler
// ============================================================================

import type {
  LogEventData,
  UserContext,
  SystemEventType,
  SystemEventData,
  ChannelRoute,
  LogSeverity,
} from '@/lib/logger/types';
import { getEventChannel } from '@/lib/logger/config/channels';
import { getEventTitle, getDefaultSeverity } from '@/lib/logger/config/events';
import {
  generateEventId,
  formatDuration,
  formatBytes,
} from '@/lib/logger/utils/formatters';

// ----------------------------------------------------------------------------
// Channel Routing
// ----------------------------------------------------------------------------

export function getSystemChannel(eventType: SystemEventType): ChannelRoute {
  return getEventChannel('system', eventType);
}

// ----------------------------------------------------------------------------
// Handler Function
// ----------------------------------------------------------------------------

/**
 * Handle any system event.
 */
export function handleSystemEvent(
  eventType: SystemEventType,
  data: SystemEventData,
  user?: UserContext
): LogEventData {
  let severity: LogSeverity = getDefaultSeverity(eventType);

  // Override severity based on data
  if (!data.success) {
    severity = 'error';
  } else if (
    eventType === 'health_check' &&
    data.healthStatus === 'degraded'
  ) {
    severity = 'warning';
  } else if (
    eventType === 'health_check' &&
    data.healthStatus === 'unhealthy'
  ) {
    severity = 'error';
  }

  return {
    eventId: generateEventId(),
    category: 'system',
    eventType,
    eventTitle: getEventTitle(eventType),
    severity,
    user,
    success: data.success,
    timestamp: new Date(),
    metadata: {
      ...(data.service && { service: data.service }),
      ...(data.version && { version: data.version }),
      ...(data.environment && { environment: data.environment }),
      ...(data.buildId && { buildId: data.buildId }),
      ...(data.deployId && { deployId: data.deployId }),
      ...(data.duration !== undefined && {
        duration: formatDuration(data.duration),
      }),
      ...(data.queryText && { query: data.queryText }),
      ...(data.queryDuration !== undefined && {
        queryDuration: formatDuration(data.queryDuration),
      }),
      ...(data.cacheKey && { cacheKey: data.cacheKey }),
      ...(data.cacheHit !== undefined && { cacheHit: data.cacheHit }),
      ...(data.healthStatus && { healthStatus: data.healthStatus }),
      ...(data.uptime !== undefined && {
        uptime: formatDuration(data.uptime),
      }),
      ...(data.memoryUsage !== undefined && {
        memoryUsage: formatBytes(data.memoryUsage),
      }),
      ...(data.cpuUsage !== undefined && {
        cpuUsage: `${data.cpuUsage.toFixed(1)}%`,
      }),
    },
  };
}
