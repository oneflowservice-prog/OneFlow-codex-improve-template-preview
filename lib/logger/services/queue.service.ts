// ============================================================================
// Discord Logger - Message Queue Service
// ============================================================================

import type { QueueItem } from '@/lib/logger/types';
import type { DiscordService } from './discord.service';
import { RateLimitError } from './discord.service';
import { withRetry } from './retry.service';

// ----------------------------------------------------------------------------
// Queue Configuration
// ----------------------------------------------------------------------------

interface QueueConfig {
  /** Max messages to send per flush cycle */
  batchSize: number;
  /** Interval between flush cycles in ms */
  flushInterval: number;
  /** Maximum retries per message */
  maxRetries: number;
}

const DEFAULT_CONFIG: QueueConfig = {
  batchSize: 5,
  flushInterval: 2000,
  maxRetries: 3,
};

// Priority weights for ordering
const PRIORITY_WEIGHTS: Record<string, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

// ----------------------------------------------------------------------------
// Queue Service
// ----------------------------------------------------------------------------

/**
 * In-memory message queue with per-channel rate limiting.
 * Buffers messages and sends them in batches to avoid Discord rate limits.
 */
export class QueueService {
  /** Per-channel message queues */
  private queues: Map<string, QueueItem[]> = new Map();

  /** Per-channel rate limit pause timestamps */
  private rateLimitPauses: Map<string, number> = new Map();

  /** Reference to the discord service (set during startProcessing) */
  private discordService: DiscordService | null = null;

  /** Flush interval handle */
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  /** Whether the queue is currently being processed */
  private isProcessing = false;

  /** Queue configuration */
  private config: QueueConfig;

  constructor(config?: Partial<QueueConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Add an item to the queue, sorted by priority.
   */
  enqueue(item: QueueItem): void {
    const key = item.channelRoute.channelName;

    if (!this.queues.has(key)) {
      this.queues.set(key, []);
    }

    const queue = this.queues.get(key)!;
    queue.push(item);

    // Sort by priority (high first)
    queue.sort(
      (a, b) =>
        (PRIORITY_WEIGHTS[a.priority] ?? 1) -
        (PRIORITY_WEIGHTS[b.priority] ?? 1)
    );
  }

  /**
   * Start automatic queue processing on an interval.
   */
  startProcessing(discordService: DiscordService): void {
    this.discordService = discordService;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.processQueue().catch((err) => {
        console.error('[Discord Logger] Queue processing error:', err);
      });
    }, this.config.flushInterval);

    console.log(
      `[Discord Logger] Queue started (flush every ${this.config.flushInterval}ms, batch size ${this.config.batchSize})`
    );
  }

  /**
   * Stop automatic queue processing.
   */
  stopProcessing(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    console.log('[Discord Logger] Queue stopped');
  }

  /**
   * Immediately process all queued items.
   */
  async flush(): Promise<void> {
    await this.processQueue();
  }

  /**
   * Returns the total number of items across all queues.
   */
  getQueueSize(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  /**
   * Returns queue sizes per channel (for monitoring).
   */
  getQueueStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [key, queue] of this.queues.entries()) {
      if (queue.length > 0) {
        stats[key] = queue.length;
      }
    }
    return stats;
  }

  // --------------------------------------------------------------------------
  // Processing
  // --------------------------------------------------------------------------

  /**
   * Process all queued items, sending up to batchSize per channel per cycle.
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || !this.discordService) return;
    if (this.getQueueSize() === 0) return;

    this.isProcessing = true;

    try {
      const now = Date.now();

      for (const [channelName, queue] of this.queues.entries()) {
        if (queue.length === 0) continue;

        // Check if this channel is rate-limited
        const pauseUntil = this.rateLimitPauses.get(channelName);
        if (pauseUntil && now < pauseUntil) {
          continue; // Skip this channel, still rate limited
        }

        // Clear expired pause
        if (pauseUntil && now >= pauseUntil) {
          this.rateLimitPauses.delete(channelName);
        }

        // Process up to batchSize items
        const batch = queue.splice(0, this.config.batchSize);

        for (const item of batch) {
          await this.sendItem(item, channelName);
        }
      }

      // Clean up empty queues
      for (const [key, queue] of this.queues.entries()) {
        if (queue.length === 0) {
          this.queues.delete(key);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Attempt to send a single queue item with retry logic.
   */
  private async sendItem(
    item: QueueItem,
    channelName: string
  ): Promise<void> {
    if (!this.discordService) return;

    const service = this.discordService;

    try {
      await withRetry(
        () =>
          service.send(item.channelRoute, item.embed, item.attachments).then(
            (success) => {
              if (!success) {
                throw new Error('Send returned false');
              }
            }
          ),
        {
          maxRetries: Math.min(item.maxRetries - item.retryCount, 3),
          baseDelay: 1000,
        }
      );
    } catch (error) {
      if (error instanceof RateLimitError) {
        // Pause this channel's queue
        this.rateLimitPauses.set(
          channelName,
          Date.now() + error.retryAfter
        );

        // Re-queue the item at the front
        const queue = this.queues.get(channelName) ?? [];
        queue.unshift(item);
        this.queues.set(channelName, queue);

        console.warn(
          `[Discord Logger] Channel "${channelName}" rate limited. ` +
            `Pausing for ${error.retryAfter}ms. ` +
            `${queue.length} items queued.`
        );
        return;
      }

      // Increment retry count
      item.retryCount++;

      if (item.retryCount < item.maxRetries) {
        // Re-queue for later
        const queue = this.queues.get(channelName) ?? [];
        queue.push(item);
        this.queues.set(channelName, queue);

        console.warn(
          `[Discord Logger] Re-queued message for "${channelName}" ` +
            `(attempt ${item.retryCount}/${item.maxRetries})`
        );
      } else {
        console.error(
          `[Discord Logger] Dropped message for "${channelName}" ` +
            `after ${item.maxRetries} attempts.`,
          error instanceof Error ? error.message : error
        );
      }
    }
  }
}

// Singleton instance
export const queueService = new QueueService();
