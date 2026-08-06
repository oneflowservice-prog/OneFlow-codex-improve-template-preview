// ============================================================================
// Discord Logger - AI System Event Handler
// ============================================================================

import type {
  LogEventData,
  UserContext,
  AIEventType,
  AIRequestData,
  ChannelRoute,
} from '@/lib/logger/types';
import { getEventChannel } from '@/lib/logger/config/channels';
import { getEventTitle, getDefaultSeverity } from '@/lib/logger/config/events';
import { generateEventId, formatDuration, formatCurrency } from '@/lib/logger/utils/formatters';

// ----------------------------------------------------------------------------
// Channel Routing
// ----------------------------------------------------------------------------

export function getAIChannel(eventType: AIEventType): ChannelRoute {
  return getEventChannel('ai', eventType);
}

// ----------------------------------------------------------------------------
// Handler Function
// ----------------------------------------------------------------------------

/**
 * Handle any AI system event.
 */
export function handleAIRequest(
  eventType: AIEventType,
  data: AIRequestData,
  user?: UserContext
): LogEventData {
  return {
    eventId: generateEventId(),
    category: 'ai',
    eventType,
    eventTitle: getEventTitle(eventType),
    severity: data.success ? getDefaultSeverity(eventType) : 'error',
    user,
    success: data.success,
    timestamp: new Date(),
    metadata: {
      model: data.model,
      provider: data.provider,
      ...(data.promptTokens !== undefined && { promptTokens: data.promptTokens }),
      ...(data.completionTokens !== undefined && { completionTokens: data.completionTokens }),
      ...(data.totalTokens !== undefined && { totalTokens: data.totalTokens }),
      ...(data.cost !== undefined && { cost: formatCurrency(data.cost) }),
      ...(data.duration !== undefined && { duration: formatDuration(data.duration) }),
      ...(data.agentId && { agentId: data.agentId }),
      ...(data.agentName && { agentName: data.agentName }),
      ...(data.generationType && { generationType: data.generationType }),
      ...(data.creditsUsed !== undefined && { creditsUsed: data.creditsUsed }),
      ...(data.error && { error: data.error }),
    },
  };
}
