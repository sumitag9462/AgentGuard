import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import apiRoutes from './routes/api';
import webhookRoutes from './routes/webhooks';
import { startWorker, closeWorker } from './queue/worker';

dotenv.config();

const app = express();
const server = http.createServer(app);

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Export a getter for the IO instance to be used by pythonRunner
let ioInstance = io;
export const getIo = () => ioInstance;

app.use(cors({ origin: CORS_ORIGIN }));

// Mount webhook routes FIRST because they need raw body parsing for HMAC verification
app.use('/api/v1/webhooks', webhookRoutes);

app.use(express.json({ limit: '1mb' }));

// API Routes
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/agentguard';

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Start BullMQ Worker
    startWorker();
    
    server.listen(PORT, () => {
      console.log(`AgentGuard Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown handling
async function gracefulShutdown() {
  console.log('\nReceived shutdown signal, gracefully shutting down...');
  try {
    await closeWorker();
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
    
    // Force exit if things take too long (5s)
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 5000);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}

process.once('SIGTERM', gracefulShutdown);
process.once('SIGINT', gracefulShutdown);
process.once('SIGUSR2', gracefulShutdown); // For nodemon/tsx restarts
