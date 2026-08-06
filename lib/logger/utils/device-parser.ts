// ============================================================================
// Discord Logger - User Agent Parser
// ============================================================================

import type { DeviceInfo } from '@/lib/logger/types';

/**
 * Parses a user agent string into device, browser, and OS information.
 * Uses regex matching — no external dependencies required.
 */
export function parseUserAgent(userAgent?: string): DeviceInfo {
  if (!userAgent || userAgent.trim() === '') {
    return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };
  }

  const ua = userAgent;

  return {
    device: parseDevice(ua),
    browser: parseBrowser(ua),
    os: parseOS(ua),
  };
}

// ----------------------------------------------------------------------------
// Browser Detection
// ----------------------------------------------------------------------------

function parseBrowser(ua: string): string {
  // Order matters: more specific browsers must be checked before generic ones

  // Samsung Internet
  const samsung = ua.match(/SamsungBrowser\/([\d.]+)/);
  if (samsung) return `Samsung Internet ${samsung[1]}`;

  // Opera / Opera GX
  const operaGX = ua.match(/OPR\/([\d.]+)/);
  if (operaGX) return `Opera ${operaGX[1]}`;
  const opera = ua.match(/Opera\/([\d.]+)/);
  if (opera) return `Opera ${opera[1]}`;

  // Edge (Chromium)
  const edg = ua.match(/Edg\/([\d.]+)/);
  if (edg) return `Microsoft Edge ${edg[1]}`;

  // Edge (Legacy)
  const edgeLegacy = ua.match(/Edge\/([\d.]+)/);
  if (edgeLegacy) return `Microsoft Edge ${edgeLegacy[1]}`;

  // Brave
  const brave = ua.match(/Brave\/([\d.]+)/);
  if (brave) return `Brave ${brave[1]}`;

  // Vivaldi
  const vivaldi = ua.match(/Vivaldi\/([\d.]+)/);
  if (vivaldi) return `Vivaldi ${vivaldi[1]}`;

  // Chrome
  const chrome = ua.match(/Chrome\/([\d.]+)/);
  if (chrome && !ua.includes('Chromium')) return `Chrome ${chrome[1]}`;

  // Chromium
  const chromium = ua.match(/Chromium\/([\d.]+)/);
  if (chromium) return `Chromium ${chromium[1]}`;

  // Firefox
  const firefox = ua.match(/Firefox\/([\d.]+)/);
  if (firefox) return `Firefox ${firefox[1]}`;

  // Safari (must be after Chrome since Chrome UA includes Safari)
  const safari = ua.match(/Version\/([\d.]+).*Safari/);
  if (safari) return `Safari ${safari[1]}`;

  // IE
  const ie = ua.match(/MSIE\s([\d.]+)/);
  if (ie) return `Internet Explorer ${ie[1]}`;
  const ie11 = ua.match(/Trident.*rv:([\d.]+)/);
  if (ie11) return `Internet Explorer ${ie11[1]}`;

  return 'Unknown Browser';
}

// ----------------------------------------------------------------------------
// OS Detection
// ----------------------------------------------------------------------------

function parseOS(ua: string): string {
  // Windows
  if (ua.includes('Windows NT 10.0')) {
    // Windows 11 is also NT 10.0 but can sometimes be detected
    if (ua.includes('Windows NT 10.0; Win64; x64') && ua.match(/Build\/(\d+)/)) {
      const build = ua.match(/Build\/(\d+)/);
      if (build && parseInt(build[1]) >= 22000) return 'Windows 11';
    }
    return 'Windows 10';
  }
  if (ua.includes('Windows NT 6.3')) return 'Windows 8.1';
  if (ua.includes('Windows NT 6.2')) return 'Windows 8';
  if (ua.includes('Windows NT 6.1')) return 'Windows 7';
  if (ua.includes('Windows')) return 'Windows';

  // iOS (check before macOS since iPad can masquerade)
  if (ua.includes('iPhone')) {
    const ver = ua.match(/iPhone OS ([\d_]+)/);
    return ver ? `iOS ${ver[1].replace(/_/g, '.')}` : 'iOS';
  }
  if (ua.includes('iPad')) {
    const ver = ua.match(/CPU OS ([\d_]+)/);
    return ver ? `iPadOS ${ver[1].replace(/_/g, '.')}` : 'iPadOS';
  }

  // macOS
  if (ua.includes('Mac OS X') || ua.includes('Macintosh')) {
    const ver = ua.match(/Mac OS X ([\d_.]+)/);
    return ver ? `macOS ${ver[1].replace(/_/g, '.')}` : 'macOS';
  }

  // Android
  if (ua.includes('Android')) {
    const ver = ua.match(/Android ([\d.]+)/);
    return ver ? `Android ${ver[1]}` : 'Android';
  }

  // Chrome OS
  if (ua.includes('CrOS')) return 'Chrome OS';

  // Linux distributions
  if (ua.includes('Ubuntu')) return 'Ubuntu Linux';
  if (ua.includes('Fedora')) return 'Fedora Linux';
  if (ua.includes('Linux')) return 'Linux';

  return 'Unknown OS';
}

// ----------------------------------------------------------------------------
// Device Type Detection
// ----------------------------------------------------------------------------

function parseDevice(ua: string): string {
  const lowerUA = ua.toLowerCase();

  // Bots / Crawlers
  if (
    lowerUA.includes('bot') ||
    lowerUA.includes('crawler') ||
    lowerUA.includes('spider') ||
    lowerUA.includes('curl') ||
    lowerUA.includes('wget') ||
    lowerUA.includes('postman')
  ) {
    return 'Bot/Crawler';
  }

  // Tablets (check before mobile since some tablets include "Mobile")
  if (
    lowerUA.includes('ipad') ||
    (lowerUA.includes('android') && !lowerUA.includes('mobile')) ||
    lowerUA.includes('tablet')
  ) {
    return 'Tablet';
  }

  // Mobile
  if (
    lowerUA.includes('mobile') ||
    lowerUA.includes('iphone') ||
    lowerUA.includes('ipod') ||
    lowerUA.includes('android') ||
    lowerUA.includes('windows phone')
  ) {
    return 'Mobile';
  }

  // Desktop (default)
  return 'Desktop';
}
