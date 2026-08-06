// ============================================================================
// Discord Logger - API Event Handler
// ============================================================================

import type {
  LogEventData,
  UserContext,
  APIEventType,
  APIRequestData,
  ChannelRoute,
} from '@/lib/logger/types';
import { getEventChannel } from '@/lib/logger/config/channels';
import { getEventTitle, getDefaultSeverity } from '@/lib/logger/config/events';
import { generateEventId, formatDuration } from '@/lib/logger/utils/formatters';

// ----------------------------------------------------------------------------
// Channel Routing
// ----------------------------------------------------------------------------

export function getAPIChannel(eventType: APIEventType): ChannelRoute {
  return getEventChannel('api', eventType);
}

// ----------------------------------------------------------------------------
// Handler Function
// ----------------------------------------------------------------------------

/**
 * Handle any API-related event.
 */
export function handleAPIEvent(
  eventType: APIEventType,
  data: APIRequestData,
  user?: UserContext
): LogEventData {
  return {
    eventId: generateEventId(),
    category: 'api',
    eventType,
    eventTitle: getEventTitle(eventType),
    severity: data.success ? getDefaultSeverity(eventType) : 'error',
    user,
    success: data.success,
    timestamp: new Date(),
    metadata: {
      ...(data.method && { method: data.method }),
      ...(data.path && { path: data.path }),
      ...(data.statusCode !== undefined && { statusCode: data.statusCode }),
      ...(data.latencyMs !== undefined && { latency: formatDuration(data.latencyMs) }),
      ...(data.apiKeyId && { apiKeyId: data.apiKeyId }),
      ...(data.apiKeyName && { apiKeyName: data.apiKeyName }),
      ...(data.webhookId && { webhookId: data.webhookId }),
      ...(data.webhookUrl && { webhookUrl: data.webhookUrl }),
      ...(data.integrationName && { integrationName: data.integrationName }),
      ...(data.rateLimitRemaining !== undefined && {
        rateLimitRemaining: `${data.rateLimitRemaining}/${data.rateLimitTotal ?? '?'}`,
      }),
      ...(data.errorMessage && { errorMessage: data.errorMessage }),
    },
  };
}
