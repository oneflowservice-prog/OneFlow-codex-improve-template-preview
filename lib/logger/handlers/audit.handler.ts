// ============================================================================
// Discord Logger - Audit Event Handler
// ============================================================================

import type {
  LogEventData,
  UserContext,
  AuditEventType,
  AuditEventData,
  ChannelRoute,
  LogSeverity,
} from '@/lib/logger/types';
import { getEventChannel } from '@/lib/logger/config/channels';
import { getEventTitle } from '@/lib/logger/config/events';
import { generateEventId, formatBytes } from '@/lib/logger/utils/formatters';

// ----------------------------------------------------------------------------
// Channel Routing
// ----------------------------------------------------------------------------

export function getAuditChannel(eventType: AuditEventType): ChannelRoute {
  return getEventChannel('audit', eventType);
}

// ----------------------------------------------------------------------------
// Handler Function
// ----------------------------------------------------------------------------

/**
 * Handle any audit event.
 */
export function handleAuditEvent(
  eventType: AuditEventType,
  data: AuditEventData,
  user?: UserContext
): LogEventData {
  let severity: LogSeverity = 'info';
  if (!data.success) {
    severity = 'error';
  } else if (
    eventType === 'object_deleted' ||
    eventType === 'env_variable_change'
  ) {
    severity = 'warning';
  }

  return {
    eventId: generateEventId(),
    category: 'audit',
    eventType,
    eventTitle: getEventTitle(eventType),
    severity,
    user,
    success: data.success,
    timestamp: new Date(),
    metadata: {
      ...(data.tableName && { tableName: data.tableName }),
      ...(data.recordId && { recordId: data.recordId }),
      ...(data.operation && { operation: data.operation }),
      ...(data.changes && { changes: data.changes }),
      ...(data.configKey && { configKey: data.configKey }),
      ...(data.configOldValue && { configOldValue: data.configOldValue }),
      ...(data.configNewValue && { configNewValue: data.configNewValue }),
      ...(data.backupId && { backupId: data.backupId }),
      ...(data.backupSize !== undefined && {
        backupSize: formatBytes(data.backupSize),
      }),
      ...(data.envKey && { envKey: data.envKey }),
      ...(data.performedBy && { performedBy: data.performedBy }),
    },
  };
}
