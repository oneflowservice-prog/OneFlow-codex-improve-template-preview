// ============================================================================
// Discord Logger - User Event Handler
// ============================================================================

import type {
  LogEventData,
  UserContext,
  UserEventType,
  UserProfileData,
  UserAccountData,
  ChannelRoute,
} from '@/lib/logger/types';
import { getEventChannel } from '@/lib/logger/config/channels';
import { getEventTitle, getDefaultSeverity } from '@/lib/logger/config/events';
import { generateEventId } from '@/lib/logger/utils/formatters';

// ----------------------------------------------------------------------------
// Channel Routing
// ----------------------------------------------------------------------------

export function getUserChannel(eventType: UserEventType): ChannelRoute {
  return getEventChannel('users', eventType);
}

// ----------------------------------------------------------------------------
// Handler Functions
// ----------------------------------------------------------------------------

/**
 * Handle profile update events (profile, username, avatar, preferences).
 */
export function handleProfileUpdate(
  data: UserProfileData,
  user?: UserContext
): LogEventData {
  const eventType: UserEventType = data.action;
  return {
    eventId: generateEventId(),
    category: 'users',
    eventType,
    eventTitle: getEventTitle(eventType),
    severity: data.success ? getDefaultSeverity(eventType) : 'error',
    user,
    success: data.success,
    timestamp: new Date(),
    metadata: {
      action: data.action,
      ...(data.changes && { changes: data.changes }),
    },
  };
}

/**
 * Handle account-level events (deleted, restricted, role changed, subscription).
 */
export function handleAccountAction(
  data: UserAccountData,
  user?: UserContext
): LogEventData {
  const eventType: UserEventType = data.action;
  return {
    eventId: generateEventId(),
    category: 'users',
    eventType,
    eventTitle: getEventTitle(eventType),
    severity: data.success ? getDefaultSeverity(eventType) : 'error',
    user,
    success: data.success,
    timestamp: new Date(),
    metadata: {
      action: data.action,
      reason: data.reason,
      ...(data.newRole && { newRole: data.newRole }),
      ...(data.oldRole && { oldRole: data.oldRole }),
      ...(data.newPlan && { newPlan: data.newPlan }),
      ...(data.oldPlan && { oldPlan: data.oldPlan }),
      ...(data.restrictionType && { restrictionType: data.restrictionType }),
    },
  };
}
