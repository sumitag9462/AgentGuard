import crypto from 'crypto';
import fetch from 'node-fetch';

export interface TelemetryEvent {
  executionId: string;
  eventType: 'TOOL_CALL' | 'TOOL_RESULT' | 'POLICY_CHECK' | 'ERROR';
  data: Record<string, any>;
}

export async function sendTelemetry(event: TelemetryEvent) {
  const webhookUrl = process.env.WEBHOOK_URL;
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!webhookUrl || !webhookSecret) {
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const eventId = `evt_${crypto.randomBytes(8).toString('hex')}`;
  
  const payload = {
    eventId,
    executionId: event.executionId,
    agentId: process.env.AGENT_ID || 'agt-demo-external',
    agentVersion: process.env.AGENT_VERSION || 'v1',
    eventType: event.eventType,
    timestamp: new Date().toISOString(),
    data: event.data,
  };

  const bodyString = JSON.stringify(payload);
  
  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(`${timestamp}.${bodyString}`);
  const signature = `sha256=${hmac.digest('hex')}`;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AgentEval-Signature': signature,
        'X-AgentEval-Timestamp': timestamp,
        'X-AgentEval-Event-Id': eventId,
      },
      body: bodyString,
    });
  } catch (error) {
    console.error('Failed to send telemetry:', error);
  }
}
