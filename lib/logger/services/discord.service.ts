// ============================================================================
// Discord Logger - Discord Delivery Service
// ============================================================================

import type {
  ChannelRoute,
  DiscordEmbed,
  LogAttachment,
  LoggerConfig,
  DeliveryMode,
} from '@/lib/logger/types';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

// ----------------------------------------------------------------------------
// Rate Limit Error
// ----------------------------------------------------------------------------

/**
 * Thrown when Discord returns a 429 rate-limit response.
 * Contains the retry_after value so callers can wait.
 */
export class RateLimitError extends Error {
  public readonly retryAfter: number;

  constructor(retryAfter: number, channelName?: string) {
    super(
      `Rate limited${channelName ? ` on ${channelName}` : ''}. ` +
        `Retry after ${retryAfter}ms`
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// ----------------------------------------------------------------------------
// Discord Service
// ----------------------------------------------------------------------------

/**
 * Sends Discord embeds via Webhooks or the Bot REST API.
 * Uses native fetch — no external Discord library needed.
 */
export class DiscordService {
  private readonly deliveryMode: DeliveryMode;
  private readonly botToken?: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.deliveryMode = config.deliveryMode ?? 'webhook';
    this.botToken = config.botToken ?? process.env.DISCORD_BOT_TOKEN;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Send an embed to a channel via the appropriate delivery method.
   * Automatically chooses webhook or bot based on what's available.
   */
  async send(
    channelRoute: ChannelRoute,
    embed: DiscordEmbed,
    attachments?: LogAttachment[]
  ): Promise<boolean> {
    try {
      // Attach image from attachments if present
      const enrichedEmbed = this.enrichEmbedWithAttachments(
        embed,
        attachments
      );

      // Try webhook first if available and enabled
      if (
        (this.deliveryMode === 'webhook' || this.deliveryMode === 'both') &&
        channelRoute.webhookUrl
      ) {
        const webhookResult = await this.sendViaWebhook(
          channelRoute.webhookUrl,
          enrichedEmbed
        );
        if (webhookResult) return true;
      }

      // Fall back to bot if available and enabled
      if (
        (this.deliveryMode === 'bot' || this.deliveryMode === 'both') &&
        channelRoute.channelId &&
        this.botToken
      ) {
        return await this.sendViaBot(channelRoute.channelId, enrichedEmbed);
      }

      // If both mode and neither worked, warn
      if (!channelRoute.webhookUrl && !channelRoute.channelId) {
        console.warn(
          `[Discord Logger] No webhook URL or channel ID configured ` +
            `for channel "${channelRoute.channelName}". Skipping.`
        );
        return false;
      }

      return false;
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error; // Let the queue handle rate limits
      }

      console.error(
        `[Discord Logger] Failed to send to "${channelRoute.channelName}":`,
        error instanceof Error ? error.message : error
      );
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Webhook Delivery
  // --------------------------------------------------------------------------

  /**
   * Send an embed via a Discord Webhook URL.
   */
  async sendViaWebhook(
    webhookUrl: string,
    embed: DiscordEmbed
  ): Promise<boolean> {
    const payload = {
      embeds: [embed],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.status === 429) {
      const body = (await response.json()) as { retry_after?: number };
      throw new RateLimitError((body.retry_after ?? 5) * 1000);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      console.error(
        `[Discord Logger] Webhook error ${response.status}: ${text}`
      );
      return false;
    }

    return true;
  }

  // --------------------------------------------------------------------------
  // Bot REST API Delivery
  // --------------------------------------------------------------------------

  /**
   * Send an embed via the Discord Bot REST API.
   * Requires a bot token and channel ID.
   */
  async sendViaBot(
    channelId: string,
    embed: DiscordEmbed
  ): Promise<boolean> {
    if (!this.botToken) {
      console.error(
        '[Discord Logger] Bot token not configured. Cannot send via bot.'
      );
      return false;
    }

    const url = `${DISCORD_API_BASE}/channels/${channelId}/messages`;
    const payload = { embeds: [embed] };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${this.botToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 429) {
      const body = (await response.json()) as { retry_after?: number };
      throw new RateLimitError(
        (body.retry_after ?? 5) * 1000,
        channelId
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      console.error(
        `[Discord Logger] Bot API error ${response.status}: ${text}`
      );
      return false;
    }

    return true;
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  /**
   * If attachments contain images, set the first image as the embed's image field.
   */
  private enrichEmbedWithAttachments(
    embed: DiscordEmbed,
    attachments?: LogAttachment[]
  ): DiscordEmbed {
    if (!attachments?.length) return embed;

    const imageAttachment = attachments.find(
      (a) => a.type === 'image' || a.type === 'screenshot'
    );

    if (imageAttachment && !embed.image) {
      return {
        ...embed,
        image: { url: imageAttachment.url },
      };
    }

    return embed;
  }
}

// ----------------------------------------------------------------------------
// Factory
// ----------------------------------------------------------------------------

/**
 * Creates a new DiscordService instance with the given configuration.
 */
export function createDiscordService(
  config?: Partial<LoggerConfig>
): DiscordService {
  return new DiscordService(config);
}
