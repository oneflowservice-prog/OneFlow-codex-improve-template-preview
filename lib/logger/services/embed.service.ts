// ============================================================================
// Discord Logger - Embed Builder Service
// ============================================================================

import type {
  LogEventData,
  DiscordEmbed,
  DiscordEmbedField,
} from '@/lib/logger/types';
import {
  getColorForSeverity,
  getStatusEmoji,
  getSeverityIcon,
  getCategoryIcon,
} from '@/lib/logger/config/colors';

/** Discord's maximum field value length */
const MAX_FIELD_LENGTH = 1024;

/** Discord's maximum embed description length */
const MAX_DESCRIPTION_LENGTH = 4096;

// ----------------------------------------------------------------------------
// Embed Builder
// ----------------------------------------------------------------------------

/**
 * Converts LogEventData into Discord-ready embed objects.
 */
export class EmbedBuilder {
  /**
   * Build a full Discord embed from a log event.
   */
  buildEmbed(event: LogEventData): DiscordEmbed {
    const statusEmoji = getStatusEmoji(event.success);
    const severityIcon = getSeverityIcon(event.severity);
    const categoryIcon = getCategoryIcon(event.category);

    // Build fields
    const fields: DiscordEmbedField[] = [];

    // Core event fields
    fields.push(
      { name: '🆔 Event ID', value: `\`${event.eventId}\``, inline: true },
      {
        name: `${severityIcon} Severity`,
        value: event.severity.toUpperCase(),
        inline: true,
      },
      {
        name: '📊 Status',
        value:
          event.success === undefined
            ? '❔ N/A'
            : event.success
              ? '✅ Success'
              : '❌ Failed',
        inline: true,
      }
    );

    // User context fields
    if (event.user) {
      const u = event.user;
      if (u.userId)
        fields.push({
          name: '👤 User ID',
          value: `\`${u.userId}\``,
          inline: true,
        });
      if (u.username)
        fields.push({
          name: '📛 Username',
          value: u.username,
          inline: true,
        });
      if (u.email)
        fields.push({
          name: '📧 Email',
          value: this.truncateField(u.email),
          inline: true,
        });
      if (u.ipAddress)
        fields.push({
          name: '🌐 IP Address',
          value: `\`${u.ipAddress}\``,
          inline: true,
        });
      if (u.device)
        fields.push({ name: '📱 Device', value: u.device, inline: true });
      if (u.browser)
        fields.push({ name: '🌍 Browser', value: u.browser, inline: true });
      if (u.os)
        fields.push({ name: '💻 OS', value: u.os, inline: true });
      if (u.country)
        fields.push({
          name: '🏳️ Country',
          value: u.country + (u.city ? `, ${u.city}` : ''),
          inline: true,
        });
    }

    // Metadata fields
    if (event.metadata) {
      const metadataFields = this.formatMetadata(event.metadata);
      fields.push(...metadataFields);
    }

    // Build the embed
    const embed: DiscordEmbed = {
      title: `${statusEmoji} ${event.eventTitle}`,
      description: this.buildDescription(event),
      color: getColorForSeverity(event.severity),
      fields,
      footer: {
        text:
          event.footer ??
          `OneFlow Logger • ${categoryIcon} ${event.category.charAt(0).toUpperCase() + event.category.slice(1)}`,
      },
      timestamp: event.timestamp.toISOString(),
    };

    return embed;
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  /**
   * Builds a brief description based on the event's success/failure status.
   */
  private buildDescription(event: LogEventData): string {
    const parts: string[] = [];

    if (event.success === true) {
      parts.push('The operation completed successfully.');
    } else if (event.success === false) {
      parts.push('The operation failed.');
    }

    if (event.user?.username) {
      parts.push(`User: **${event.user.username}**`);
    }

    const description = parts.join(' ');
    return this.truncateField(description, MAX_DESCRIPTION_LENGTH);
  }

  /**
   * Truncates a string to the specified max length, adding ellipsis if needed.
   */
  truncateField(value: string, maxLength: number = MAX_FIELD_LENGTH): string {
    if (value.length <= maxLength) return value;
    return value.slice(0, maxLength - 3) + '...';
  }

  /**
   * Converts a metadata object into an array of Discord embed fields.
   */
  formatMetadata(metadata: Record<string, unknown>): DiscordEmbedField[] {
    const fields: DiscordEmbedField[] = [];

    for (const [key, value] of Object.entries(metadata)) {
      if (value === undefined || value === null) continue;

      const fieldName = this.formatFieldName(key);
      let fieldValue: string;

      if (typeof value === 'object') {
        fieldValue = `\`\`\`json\n${JSON.stringify(value, null, 2)}\`\`\``;
      } else if (typeof value === 'boolean') {
        fieldValue = value ? '✅ Yes' : '❌ No';
      } else if (typeof value === 'number') {
        fieldValue = `\`${value.toLocaleString()}\``;
      } else {
        fieldValue = String(value);
      }

      fields.push({
        name: fieldName,
        value: this.truncateField(fieldValue),
        inline: typeof value !== 'object',
      });
    }

    return fields;
  }

  /**
   * Converts a camelCase or snake_case key to a human-readable field name.
   */
  private formatFieldName(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }
}

// Singleton instance
export const embedBuilder = new EmbedBuilder();
