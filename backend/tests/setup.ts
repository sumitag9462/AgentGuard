import mongoose from 'mongoose';

// Ensure tests use the test database
const TEST_DB_URI = 'mongodb://localhost:27017/agentguard_test';

beforeAll(async () => {
  // Disconnect if already connected
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(TEST_DB_URI);
});

afterAll(async () => {
  // Drop the test database to keep it clean
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
