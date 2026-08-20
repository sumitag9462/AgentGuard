/**
 * AgentEval — Webhook Routes
 * 
 * Secure webhook endpoint for receiving agent telemetry events.
 * 
 * POST /api/v1/webhooks/agent/:webhookId/events
 * 
 * Security:
 * - HMAC-SHA256 signature verification
 * - Timestamp validation (5-minute clock skew)
 * - Event ID deduplication
 * - Payload size limit (1MB)
 * - Rate limiting (basic)
 */

import express from 'express';
import { Webhook } from '../models/Webhook';
import { WebhookEvent } from '../models/WebhookEvent';
import { decryptCredential } from '../services/security/CredentialStore';
import { verifyWebhookRequest } from '../services/webhookVerifier';

const router = express.Router();

const MAX_PAYLOAD_BYTES = 1 * 1024 * 1024; // 1MB

// Rate limit tracking (simple in-memory — replace with Redis in production)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const MAX_EVENTS_PER_MINUTE = 100;

function checkRateLimit(webhookId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(webhookId);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(webhookId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= MAX_EVENTS_PER_MINUTE) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * POST /api/v1/webhooks/agent/:webhookId/events
 * 
 * Ingest a telemetry event from an external agent.
 */
router.post('/agent/:webhookId/events', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => {
  const { webhookId } = req.params;

  // Rate limit
  if (!checkRateLimit(webhookId)) {
    return res.status(429).json({ error: 'Rate limit exceeded', maxPerMinute: MAX_EVENTS_PER_MINUTE });
  }

  // Find webhook
  const webhook = await Webhook.findOne({ webhookId, status: 'ACTIVE' });
  if (!webhook) {
    return res.status(404).json({ error: 'Webhook not found or disabled' });
  }

  // Get raw body
  const rawBody = typeof req.body === 'string' ? req.body : req.body.toString('utf8');

  // Check payload size
  if (Buffer.byteLength(rawBody) > MAX_PAYLOAD_BYTES) {
    await Webhook.findByIdAndUpdate(webhook._id, { $inc: { eventsDropped: 1 } });
    return res.status(413).json({ error: 'Payload too large', maxBytes: MAX_PAYLOAD_BYTES });
  }

  // Verify signature
  const signature = req.headers['x-agenteval-signature'] as string | undefined;
  const timestamp = req.headers['x-agenteval-timestamp'] as string | undefined;
  const eventId = req.headers['x-agenteval-event-id'] as string | undefined;

  let secret: string;
  try {
    secret = decryptCredential(webhook.secretHash);
  } catch {
    return res.status(500).json({ error: 'Internal error: failed to load webhook secret' });
  }

  const verification = verifyWebhookRequest(
    secret,
    { signature, timestamp, eventId },
    rawBody
  );

  if (!verification.valid) {
    await Webhook.findByIdAndUpdate(webhook._id, { $inc: { failedVerifications: 1 } });
    return res.status(401).json({ error: verification.reason });
  }

  // Parse body
  let eventData: any;
  try {
    eventData = JSON.parse(rawBody);
  } catch {
    await Webhook.findByIdAndUpdate(webhook._id, { $inc: { eventsDropped: 1 } });
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  // Validate required fields
  const requiredFields = ['eventType', 'executionId', 'agentId', 'timestamp'];
  for (const field of requiredFields) {
    if (!eventData[field]) {
      return res.status(400).json({ error: `Missing required field: ${field}` });
    }
  }

  // Deduplicate by eventId
  const finalEventId = eventData.eventId || eventId || `auto_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  try {
    const newEvent = new WebhookEvent({
      webhookId,
      eventId: finalEventId,
      executionId: eventData.executionId,
      evaluationId: eventData.evaluationId,
      scenarioId: eventData.scenarioId,
      agentId: eventData.agentId,
      agentVersion: eventData.agentVersion,
      eventType: eventData.eventType,
      timestamp: new Date(eventData.timestamp),
      data: eventData.data || {},
      verificationStatus: 'VERIFIED',
      processed: false,
    });

    await newEvent.save();

    // Update webhook stats
    await Webhook.findByIdAndUpdate(webhook._id, {
      $inc: { eventsReceived: 1 },
      lastEventAt: new Date(),
    });

    return res.status(202).json({
      accepted: true,
      eventId: finalEventId,
    });
  } catch (err: any) {
    // Duplicate event — safely ignore
    if (err.code === 11000) {
      return res.status(200).json({
        accepted: true,
        duplicate: true,
        eventId: finalEventId,
      });
    }

    await Webhook.findByIdAndUpdate(webhook._id, { $inc: { eventsDropped: 1 } });
    return res.status(500).json({ error: 'Failed to store event' });
  }
});

export default router;
