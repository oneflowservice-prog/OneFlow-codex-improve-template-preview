// ============================================================================
// Discord Logger - Formatting Utilities
// ============================================================================

/**
 * Generates a unique event ID using timestamp + random hex.
 * Format: evt_<timestamp_hex>_<random_hex>
 */
export function generateEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `evt_${timestamp}_${random}`;
}

/**
 * Formats a Date as a human-readable string.
 */
export function formatTimestamp(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', ' UTC');
}

/**
 * Formats milliseconds as a human-readable duration.
 *
 * @example
 * formatDuration(150)    // "150ms"
 * formatDuration(2500)   // "2.5s"
 * formatDuration(90000)  // "1m 30s"
 * formatDuration(3661000) // "1h 1m 1s"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    const decimal = ms % 1000 >= 100 ? `.${Math.floor((ms % 1000) / 100)}` : '';
    return `${seconds}${decimal}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const parts = [`${hours}h`];
  if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`);
  if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);
  return parts.join(' ');
}

/**
 * Formats bytes into a human-readable size.
 *
 * @example
 * formatBytes(1024)     // "1.00 KB"
 * formatBytes(1048576)  // "1.00 MB"
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);

  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

/**
 * Formats a monetary value with currency symbol.
 *
 * @example
 * formatCurrency(29.99)           // "$29.99"
 * formatCurrency(29.99, 'EUR')    // "€29.99"
 * formatCurrency(29.99, 'GBP')    // "£29.99"
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD'
): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'CA$',
    AUD: 'A$',
    INR: '₹',
  };

  const symbol = symbols[currency.toUpperCase()] ?? `${currency} `;
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Truncates a string to maxLength, appending "..." if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Masks an email for privacy.
 *
 * @example
 * maskEmail("john@example.com")  // "j***@example.com"
 * maskEmail("ab@test.com")       // "a***@test.com"
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***.***';
  const masked = local.charAt(0) + '***';
  return `${masked}@${domain}`;
}

/**
 * Partially masks an IP address for privacy.
 *
 * @example
 * maskIP("192.168.1.100")  // "192.168.***.***"
 */
export function maskIP(ip: string): string {
  if (ip.includes(':')) {
    // IPv6: mask last 4 groups
    const parts = ip.split(':');
    if (parts.length >= 4) {
      return parts.slice(0, 4).join(':') + ':***:***:***:***';
    }
    return ip;
  }

  // IPv4: mask last 2 octets
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return ip;
}

/**
 * Wraps text in a Discord code block.
 *
 * @example
 * codeBlock("hello")              // "```\nhello\n```"
 * codeBlock("const x = 1", "ts") // "```ts\nconst x = 1\n```"
 */
export function codeBlock(text: string, language?: string): string {
  const lang = language ?? '';
  return `\`\`\`${lang}\n${text}\n\`\`\``;
}

/**
 * Wraps text in Discord bold markdown.
 */
export function bold(text: string): string {
  return `**${text}**`;
}

/**
 * Wraps text in Discord italic markdown.
 */
export function italic(text: string): string {
  return `*${text}*`;
}

/**
 * Wraps text in Discord spoiler tags.
 */
export function spoiler(text: string): string {
  return `||${text}||`;
}

/**
 * Escapes special Discord markdown characters.
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([*_~`|\\>])/g, '\\$1');
}

/**
 * Wraps text in inline code.
 */
export function inlineCode(text: string): string {
  return `\`${text}\``;
}
