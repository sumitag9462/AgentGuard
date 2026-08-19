import { URL } from 'url';
import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

/**
 * Validates a webhook URL to prevent SSRF attacks.
 * @param urlString The URL to validate
 * @returns boolean indicating if the URL is safe
 */
export async function isSafeWebhookUrl(urlString: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(urlString);

    // 1. Enforce Protocol
    // In production, require HTTPS. In dev, allow HTTP but no file:// or others.
    if (process.env.NODE_ENV === 'production') {
      if (parsedUrl.protocol !== 'https:') return false;
    } else {
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') return false;
    }

    // 2. Reject obvious dangerous hostnames
    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return false;
    }

    // 3. DNS Lookup
    // Reject IPs directly in URL or resolved IPs that are private/loopback
    const resolved = await lookup(hostname);
    const ip = resolved.address;

    return isPublicIP(ip);
  } catch (error) {
    return false;
  }
}

function isPublicIP(ip: string): boolean {
  // IPv4 validation
  const parts = ip.split('.');
  if (parts.length === 4) {
    const [a, b, c, d] = parts.map(Number);
    
    // Loopback 127.0.0.0/8
    if (a === 127) return false;
    
    // Private 10.0.0.0/8
    if (a === 10) return false;
    
    // Private 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return false;
    
    // Private 192.168.0.0/16
    if (a === 192 && b === 168) return false;
    
    // Link-local 169.254.0.0/16
    if (a === 169 && b === 254) return false;

    // Zero 0.0.0.0/8
    if (a === 0) return false;
  }

  // IPv6 validation (simplified checks for localhost and private/unique local)
  if (ip.includes(':')) {
    if (ip === '::1') return false; // Loopback
    if (ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')) return false; // Unique local address
    if (ip.toLowerCase().startsWith('fe8') || ip.toLowerCase().startsWith('fe9') || 
        ip.toLowerCase().startsWith('fea') || ip.toLowerCase().startsWith('feb')) return false; // Link local
  }

  return true;
}
