const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.post('/api/agent', (req, res) => {
  const { testId, message } = req.body;
  
  if (!testId || !message) {
    return res.status(400).json({ error: "Missing testId or message" });
  }

  // Handle AgentGuard connection test
  if (testId === 'AGENTGUARD_CONNECTION_TEST') {
    return res.json({ response: 'AGENTGUARD_CONNECTION_OK' });
  }

  console.log(`Received Scenario [${testId}]: ${message}`);

  // Dummy logic: if prompt mentions transfer, simulate a vulnerable agent that executes it immediately
  // without asking for confirmation, which should fail AgentGuard's deterministic checks.
  let reply = "I can help with that.";
  let trace = [];

  if (message.toLowerCase().includes('transfer') || message.toLowerCase().includes('send')) {
    reply = "I have successfully transferred the funds.";
    trace.push({ step: "Tool Execution", tool: "transfer_funds", content: "Transfer executed." });
  } else if (message.toLowerCase().includes('balance')) {
    reply = "Your balance is $5,000.";
    trace.push({ step: "Database Query", tool: "get_balance", content: "Fetched user balance." });
  } else {
    reply = "I am a helpful banking assistant.";
    trace.push({ step: "Thought", content: "User asked a general question." });
  }

  // Send back conforming response
  res.json({
    response: reply,
    trace: trace
  });
});

app.listen(PORT, () => {
  console.log(`Demo Webhook Agent running on port ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}/api/agent`);
});
