// ============================================================================
// Discord Logger - Embed Color Constants
// ============================================================================

import type { LogSeverity, EventCategory } from '@/lib/logger/types';

// ----------------------------------------------------------------------------
// Embed Colors (Discord integer format)
// ----------------------------------------------------------------------------

/** Embed colors mapped to severity levels */
export const EMBED_COLORS = {
  /** Green - successful operations */
  SUCCESS: 0x2ecc71,
  /** Yellow - warnings and caution */
  WARNING: 0xf1c40f,
  /** Red - errors and failures */
  ERROR: 0xe74c3c,
  /** Blue - informational events */
  INFO: 0x3498db,
} as const;

// ----------------------------------------------------------------------------
// Status Icons
// ----------------------------------------------------------------------------

/** Emoji icons for each severity level */
export const STATUS_ICONS: Record<LogSeverity, string> = {
  success: '✅',
  warning: '⚠️',
  error: '❌',
  info: 'ℹ️',
};

/** Emoji icons for success/failure status */
export const RESULT_ICONS = {
  SUCCESS: '✅',
  FAILED: '❌',
  UNKNOWN: '❔',
} as const;

// ----------------------------------------------------------------------------
// Category Icons
// ----------------------------------------------------------------------------

/** Emoji icons for each event category */
export const CATEGORY_ICONS: Record<EventCategory, string> = {
  authentication: '🔐',
  users: '👤',
  ai: '🤖',
  billing: '💰',
  api: '🔌',
  admin: '🛡️',
  security: '🚨',
  system: '⚙️',
  errors: '🐛',
  audit: '📋',
};

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------

/**
 * Returns the embed color integer for a given severity level.
 */
export function getColorForSeverity(severity: LogSeverity): number {
  switch (severity) {
    case 'success':
      return EMBED_COLORS.SUCCESS;
    case 'warning':
      return EMBED_COLORS.WARNING;
    case 'error':
      return EMBED_COLORS.ERROR;
    case 'info':
      return EMBED_COLORS.INFO;
    default:
      return EMBED_COLORS.INFO;
  }
}

/**
 * Returns the status emoji for a success/failure boolean.
 */
export function getStatusEmoji(success: boolean | undefined): string {
  if (success === undefined) return RESULT_ICONS.UNKNOWN;
  return success ? RESULT_ICONS.SUCCESS : RESULT_ICONS.FAILED;
}

/**
 * Returns the severity icon emoji.
 */
export function getSeverityIcon(severity: LogSeverity): string {
  return STATUS_ICONS[severity] ?? 'ℹ️';
}

/**
 * Returns the category icon emoji.
 */
export function getCategoryIcon(category: EventCategory): string {
  return CATEGORY_ICONS[category] ?? '📝';
}
