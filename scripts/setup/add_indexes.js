const mongoose = require('mongoose');

async function addIndexes() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/agentguard');
  console.log('Adding database indexes...');
  
  // Agent
  await mongoose.connection.collection('agents').createIndex({ agentId: 1 }, { unique: true });
  await mongoose.connection.collection('agents').createIndex({ organizationId: 1, deleted: 1 });
  
  // Evaluation
  await mongoose.connection.collection('evaluations').createIndex({ runId: 1 }, { unique: true });
  await mongoose.connection.collection('evaluations').createIndex({ agentId: 1, timestamp: -1 });
  await mongoose.connection.collection('evaluations').createIndex({ status: 1 });
  await mongoose.connection.collection('evaluations').createIndex({ version: 1 });
  
  // Scenario
  await mongoose.connection.collection('scenarios').createIndex({ scenarioId: 1 }, { unique: true });
  await mongoose.connection.collection('scenarios').createIndex({ agentId: 1, batchId: 1 });
  await mongoose.connection.collection('scenarios').createIndex({ category: 1, severity: 1 });
  
  // Failure
  await mongoose.connection.collection('failures').createIndex({ evaluationId: 1 });
  await mongoose.connection.collection('failures').createIndex({ agentId: 1, timestamp: -1 });
  await mongoose.connection.collection('failures').createIndex({ severity: 1, failureType: 1 });
  await mongoose.connection.collection('failures').createIndex({ testId: 1 });
  
  // Trace
  await mongoose.connection.collection('traces').createIndex({ traceId: 1 }, { unique: true });
  await mongoose.connection.collection('traces').createIndex({ evaluationId: 1 });
  await mongoose.connection.collection('traces').createIndex({ testId: 1 });
  
  console.log('Indexes added successfully.');
  await mongoose.disconnect();
}

addIndexes().catch(console.error);
