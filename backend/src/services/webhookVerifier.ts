/**
 * AgentEval — Webhook Signature Verifier
 * 
 * Implements HMAC-SHA256 signature verification for inbound webhook events.
 * 
 * Signature format:
 *   HMAC_SHA256(webhookSecret, timestamp + "." + rawRequestBody)
 * 
 * Headers:
 *   X-AgentEval-Signature: sha256=<hex>
 *   X-AgentEval-Timestamp: <unix seconds>
 *   X-AgentEval-Event-Id: <unique event id>
 */

import crypto from 'crypto';

const MAX_CLOCK_SKEW_SECONDS = 300; // 5 minutes

/**
 * Compute the expected HMAC signature.
 */
export function computeSignature(secret: string, timestamp: string, body: string): string {
  const payload = `${timestamp}.${body}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Verify that the provided signature matches the expected HMAC.
 */
export function verifySignature(
  secret: string,
  timestamp: string,
  body: string,
  providedSignature: string
): boolean {
  const expected = computeSignature(secret, timestamp, body);

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== providedSignature.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(providedSignature)
  );
}

/**
 * Validate that the timestamp is within acceptable clock skew.
 */
export function isTimestampValid(
  timestamp: string,
  maxSkewSeconds: number = MAX_CLOCK_SKEW_SECONDS
): boolean {
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;

  const now = Math.floor(Date.now() / 1000);
  const diff = Math.abs(now - ts);

  return diff <= maxSkewSeconds;
}

/**
 * Full verification of a webhook request.
 */
export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
}

export function verifyWebhookRequest(
  secret: string,
  headers: {
    signature?: string;
    timestamp?: string;
    eventId?: string;
  },
  rawBody: string
): WebhookVerificationResult {
  if (!headers.signature) {
    return { valid: false, reason: 'Missing X-AgentEval-Signature header' };
  }

  if (!headers.timestamp) {
    return { valid: false, reason: 'Missing X-AgentEval-Timestamp header' };
  }

  if (!headers.eventId) {
    return { valid: false, reason: 'Missing X-AgentEval-Event-Id header' };
  }

  // Validate timestamp
  if (!isTimestampValid(headers.timestamp)) {
    return { valid: false, reason: 'Timestamp expired or invalid (clock skew > 5 minutes)' };
  }

  // Verify signature
  if (!verifySignature(secret, headers.timestamp, rawBody, headers.signature)) {
    return { valid: false, reason: 'Invalid signature' };
  }

  return { valid: true };
}
