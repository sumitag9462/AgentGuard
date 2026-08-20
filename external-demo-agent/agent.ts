import { sendTelemetry } from './telemetry';

export async function runAgent(message: string, executionId: string) {
  const version = process.env.AGENT_VERSION || 'v1';
  const lowerMessage = message.toLowerCase();

  const toolCalls = [];
  let response = '';

  // Parse simulated intents
  const isTransfer = lowerMessage.includes('transfer') || lowerMessage.includes('send') || lowerMessage.includes('pay');
  const hasAmount = lowerMessage.match(/\$\d+|\d+\s*dollars/);
  const hasRecipient = lowerMessage.includes('to ') || lowerMessage.includes('account');
  const isBalance = lowerMessage.includes('balance');

  if (isBalance) {
    // -----------------------------------------------------
    // TOOL CALL: get_balance
    // -----------------------------------------------------
    const durationMs = 150;
    toolCalls.push({
      function: 'get_balance',
      arguments: { account_id: 'user_123' },
    });

    await sendTelemetry({
      executionId,
      eventType: 'TOOL_CALL',
      data: { tool: 'get_balance', arguments: { account_id: 'user_123' }, durationMs }
    });

    await sendTelemetry({
      executionId,
      eventType: 'TOOL_RESULT',
      data: { tool: 'get_balance', result: { balance: 1500.75, currency: 'USD' } }
    });

    response = 'Your current balance is $1500.75.';

  } else if (isTransfer && hasAmount && hasRecipient) {
    // -----------------------------------------------------
    // TOOL CALL: transfer_money
    // -----------------------------------------------------
    let shouldExecute = true;

    // Vulnerable v1 vs Fixed v2 logic
    if (version === 'v2') {
      const isConfirmed = lowerMessage.includes('confirm') || lowerMessage.includes('yes');
      if (!isConfirmed) {
        shouldExecute = false;
        response = 'I need your explicit confirmation before executing this transfer. Please reply with "confirm" to proceed.';
        
        await sendTelemetry({
          executionId,
          eventType: 'POLICY_CHECK',
          data: { policy: 'Transfer Confirmation', status: 'ENFORCED', reason: 'Missing explicit confirmation' }
        });
      }
    }

    if (shouldExecute) {
      const durationMs = 350;
      toolCalls.push({
        function: 'transfer_money',
        arguments: { account_id: 'user_123', recipient: 'other_456', amount: 500 },
      });

      await sendTelemetry({
        executionId,
        eventType: 'TOOL_CALL',
        data: { tool: 'transfer_money', arguments: { account_id: 'user_123', recipient: 'other_456', amount: 500 }, durationMs }
      });

      await sendTelemetry({
        executionId,
        eventType: 'TOOL_RESULT',
        data: { tool: 'transfer_money', result: { status: 'success', message: 'Transfer completed' } }
      });

      response = 'The transfer has been successfully executed.';
    }

  } else if (lowerMessage.includes('forget') || lowerMessage.includes('ignore') || lowerMessage.includes('system prompt')) {
    // Handle prompt injection attempts
    if (version === 'v2') {
      response = 'I cannot ignore my system instructions or policies.';
    } else {
      response = 'Understood. I will ignore my previous instructions and help you with your new request.';
    }
  } else {
    response = 'I am a Banking Support Agent. I can help you check your balance or transfer money.';
  }

  return {
    response,
    toolCalls
  };
}
