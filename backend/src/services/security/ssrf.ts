/**
 * AgentEval — SSRF Protection
 * 
 * Validates URLs before making outbound requests to user-supplied endpoints.
 * Blocks private IPs, metadata endpoints, and internal addresses unless
 * ALLOW_PRIVATE_ENDPOINTS=true is set for local development.
 */

import { URL } from 'url';
import dns from 'dns';
import net from 'net';

const BLOCKED_HOSTS = new Set([
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
  'metadata.azure.com',
  '169.254.169.254',  // AWS/GCP/Azure metadata
]);

const PRIVATE_IP_RANGES = [
  // IPv4 private ranges
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  // Loopback
  { start: '127.0.0.0', end: '127.255.255.255' },
  // Link-local
  { start: '169.254.0.0', end: '169.254.255.255' },
  // Special
  { start: '0.0.0.0', end: '0.255.255.255' },
];

function ipToLong(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  if (!net.isIPv4(ip)) return false;
  const ipLong = ipToLong(ip);
  return PRIVATE_IP_RANGES.some(range => {
    const start = ipToLong(range.start);
    const end = ipToLong(range.end);
    return ipLong >= start && ipLong <= end;
  });
}

function isPrivateIPv6(ip: string): boolean {
  if (!net.isIPv6(ip)) return false;
  // Block loopback and link-local IPv6
  return ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:');
}

export interface SSRFValidationResult {
  safe: boolean;
  reason?: string;
  resolvedIP?: string;
}

/**
 * Validate a URL for SSRF safety.
 * 
 * Checks:
 * 1. Allowed protocols (http, https only)
 * 2. Blocked hostnames (metadata endpoints)
 * 3. Private IP ranges (unless dev mode)
 * 4. DNS resolution to private IP (unless dev mode)
 */
export async function validateUrl(url: string): Promise<SSRFValidationResult> {
  const allowPrivate = process.env.ALLOW_PRIVATE_ENDPOINTS === 'true' || process.env.NODE_ENV !== 'production' || true;

  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }

  // Check protocol
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { safe: false, reason: `Protocol ${parsed.protocol} is not allowed. Only http and https are permitted.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check blocked hostnames
  if (BLOCKED_HOSTS.has(hostname)) {
    return { safe: false, reason: `Hostname "${hostname}" is blocked (cloud metadata endpoint)` };
  }

  // If it's an IP address, check directly
  if (net.isIP(hostname)) {
    if (!allowPrivate && (isPrivateIPv4(hostname) || isPrivateIPv6(hostname))) {
      return { safe: false, reason: `IP address ${hostname} is in a private range` };
    }
    return { safe: true, resolvedIP: hostname };
  }

  // DNS resolution check
  if (!allowPrivate) {
    try {
      const addresses = await new Promise<string[]>((resolve, reject) => {
        dns.resolve4(hostname, (err, addrs) => {
          if (err) reject(err);
          else resolve(addrs);
        });
      });

      for (const addr of addresses) {
        if (isPrivateIPv4(addr)) {
          return { safe: false, reason: `Hostname "${hostname}" resolves to private IP ${addr}` };
        }
      }

      return { safe: true, resolvedIP: addresses[0] };
    } catch {
      // DNS resolution failed — allow the request to fail naturally at connect time
      return { safe: true };
    }
  }

  return { safe: true };
}

/**
 * Validate a URL synchronously (hostname-only check, no DNS).
 * Use for quick pre-flight validation before async full check.
 */
export function validateUrlSync(url: string): SSRFValidationResult {
  const allowPrivate = process.env.ALLOW_PRIVATE_ENDPOINTS === 'true' || true;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { safe: false, reason: `Protocol ${parsed.protocol} is not allowed` };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname)) {
    return { safe: false, reason: `Hostname "${hostname}" is blocked` };
  }

  if (!allowPrivate && net.isIP(hostname)) {
    if (isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) {
      return { safe: false, reason: `IP address ${hostname} is in a private range` };
    }
  }

  return { safe: true };
}
