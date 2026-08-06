// ============================================================================
// Discord Logger - IP Geolocation Lookup
// ============================================================================

import type { GeoInfo } from '@/lib/logger/types';

// ----------------------------------------------------------------------------
// Cache
// ----------------------------------------------------------------------------

interface CacheEntry {
  data: GeoInfo;
  expiresAt: number;
}

/** In-memory IP → GeoInfo cache with TTL */
const geoCache = new Map<string, CacheEntry>();

/** Cache TTL: 1 hour */
const CACHE_TTL_MS = 60 * 60 * 1000;

// ----------------------------------------------------------------------------
// Rate Limiting
// ----------------------------------------------------------------------------

/** Maximum requests per minute for ip-api.com free tier */
const MAX_REQUESTS_PER_MINUTE = 45;

/** Sliding window tracker */
let requestTimestamps: number[] = [];

/**
 * Checks if we can make another request within the rate limit.
 */
function canMakeRequest(): boolean {
  const now = Date.now();
  // Remove timestamps older than 1 minute
  requestTimestamps = requestTimestamps.filter(
    (ts) => now - ts < 60_000
  );
  return requestTimestamps.length < MAX_REQUESTS_PER_MINUTE;
}

/**
 * Records a request timestamp.
 */
function recordRequest(): void {
  requestTimestamps.push(Date.now());
}

// ----------------------------------------------------------------------------
// Private IP Detection
// ----------------------------------------------------------------------------

/** Regular expressions for private/reserved IP ranges */
const PRIVATE_IP_PATTERNS = [
  /^127\./,                // Loopback
  /^10\./,                 // Class A private
  /^172\.(1[6-9]|2\d|3[01])\./, // Class B private
  /^192\.168\./,           // Class C private
  /^0\./,                  // Current network
  /^169\.254\./,           // Link-local
  /^::1$/,                 // IPv6 loopback
  /^fc00:/i,               // IPv6 unique local
  /^fe80:/i,               // IPv6 link-local
  /^localhost$/i,          // Hostname
];

/**
 * Checks whether an IP address is private/local.
 */
function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

// ----------------------------------------------------------------------------
// Default Values
// ----------------------------------------------------------------------------

const LOCAL_GEO: GeoInfo = {
  country: 'Local Network',
  city: 'Local',
  region: 'Local',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

const UNKNOWN_GEO: GeoInfo = {
  country: 'Unknown',
  city: 'Unknown',
  region: 'Unknown',
  timezone: 'Unknown',
};

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Looks up geographic information for an IP address.
 *
 * - Returns cached results if available (1-hour TTL).
 * - Returns "Local Network" for private/reserved IPs.
 * - Uses ip-api.com free tier with rate limiting (45 req/min).
 * - Returns "Unknown" on errors.
 *
 * @param ipAddress - The IP address to look up
 * @returns Geographic information
 */
export async function lookupIP(ipAddress: string): Promise<GeoInfo> {
  if (!ipAddress || ipAddress.trim() === '') {
    return UNKNOWN_GEO;
  }

  const ip = ipAddress.trim();

  // Private/local IPs
  if (isPrivateIP(ip)) {
    return LOCAL_GEO;
  }

  // Check cache
  const cached = geoCache.get(ip);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  // Rate limit check
  if (!canMakeRequest()) {
    console.warn(
      '[Discord Logger] IP lookup rate limited. Returning cached or unknown.'
    );
    return cached?.data ?? UNKNOWN_GEO;
  }

  try {
    recordRequest();

    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=country,city,regionName,timezone,status,message`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) {
      console.warn(`[Discord Logger] IP lookup HTTP ${response.status}`);
      return UNKNOWN_GEO;
    }

    const data = (await response.json()) as {
      status: string;
      message?: string;
      country?: string;
      city?: string;
      regionName?: string;
      timezone?: string;
    };

    if (data.status !== 'success') {
      console.warn(`[Discord Logger] IP lookup failed: ${data.message}`);
      return UNKNOWN_GEO;
    }

    const geoInfo: GeoInfo = {
      country: data.country ?? 'Unknown',
      city: data.city ?? 'Unknown',
      region: data.regionName ?? 'Unknown',
      timezone: data.timezone ?? 'Unknown',
    };

    // Cache the result
    geoCache.set(ip, {
      data: geoInfo,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return geoInfo;
  } catch (error) {
    console.warn(
      '[Discord Logger] IP lookup error:',
      error instanceof Error ? error.message : error
    );
    return UNKNOWN_GEO;
  }
}

/**
 * Clears the geo cache (for testing or memory management).
 */
export function clearGeoCache(): void {
  geoCache.clear();
}
