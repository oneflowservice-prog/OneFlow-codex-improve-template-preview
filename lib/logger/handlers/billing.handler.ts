// ============================================================================
// Discord Logger - Billing Event Handler
// ============================================================================

import type {
  LogEventData,
  UserContext,
  BillingEventType,
  BillingPaymentData,
  ChannelRoute,
} from '@/lib/logger/types';
import { getEventChannel } from '@/lib/logger/config/channels';
import { getEventTitle, getDefaultSeverity } from '@/lib/logger/config/events';
import { generateEventId, formatCurrency } from '@/lib/logger/utils/formatters';

// ----------------------------------------------------------------------------
// Channel Routing
// ----------------------------------------------------------------------------

export function getBillingChannel(eventType: BillingEventType): ChannelRoute {
  return getEventChannel('billing', eventType);
}

// ----------------------------------------------------------------------------
// Handler Function
// ----------------------------------------------------------------------------

/**
 * Handle any billing/payment event.
 */
export function handleBillingEvent(
  eventType: BillingEventType,
  data: BillingPaymentData,
  user?: UserContext
): LogEventData {
  return {
    eventId: generateEventId(),
    category: 'billing',
    eventType,
    eventTitle: getEventTitle(eventType),
    severity: data.success ? getDefaultSeverity(eventType) : 'error',
    user,
    success: data.success,
    timestamp: new Date(),
    metadata: {
      ...(data.amount !== undefined && {
        amount: formatCurrency(data.amount, data.currency),
      }),
      ...(data.currency && { currency: data.currency }),
      ...(data.stripePaymentId && { stripePaymentId: data.stripePaymentId }),
      ...(data.stripeCustomerId && { stripeCustomerId: data.stripeCustomerId }),
      ...(data.invoiceId && { invoiceId: data.invoiceId }),
      ...(data.plan && { plan: data.plan }),
      ...(data.interval && { interval: data.interval }),
      ...(data.credits !== undefined && { credits: data.credits }),
      ...(data.refundReason && { refundReason: data.refundReason }),
      ...(data.failureReason && { failureReason: data.failureReason }),
    },
  };
}
