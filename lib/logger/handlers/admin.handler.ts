// ============================================================================
// Discord Logger - Admin Event Handler
// ============================================================================

import type {
  LogEventData,
  UserContext,
  AdminEventType,
  AdminActionData,
  ChannelRoute,
} from '@/lib/logger/types';
import { getEventChannel } from '@/lib/logger/config/channels';
import { getEventTitle } from '@/lib/logger/config/events';
import { generateEventId } from '@/lib/logger/utils/formatters';

// ----------------------------------------------------------------------------
// Channel Routing
// ----------------------------------------------------------------------------

export function getAdminChannel(eventType: AdminEventType): ChannelRoute {
  return getEventChannel('admin', eventType);
}

// ----------------------------------------------------------------------------
// Handler Function
// ----------------------------------------------------------------------------

/**
 * Handle any admin/staff event.
 */
export function handleAdminEvent(
  eventType: AdminEventType,
  data: AdminActionData,
  user?: UserContext
): LogEventData {
  // Determine severity based on event type and success
  let severity: LogEventData['severity'] = 'info';
  if (!data.success) {
    severity = 'error';
  } else if (eventType === 'ban' || eventType === 'permission_change') {
    severity = 'warning';
  }

  return {
    eventId: generateEventId(),
    category: 'admin',
    eventType,
    eventTitle: getEventTitle(eventType),
    severity,
    user,
    success: data.success,
    timestamp: new Date(),
    metadata: {
      action: data.action,
      performedBy: data.performedBy,
      ...(data.targetUserId && { targetUserId: data.targetUserId }),
      ...(data.targetUsername && { targetUsername: data.targetUsername }),
      ...(data.reason && { reason: data.reason }),
      ...(data.duration && { duration: data.duration }),
      ...(data.changes && { changes: data.changes }),
      ...(data.messageContent && { messageContent: data.messageContent }),
      ...(data.overrideDetails && { overrideDetails: data.overrideDetails }),
    },
  };
}
