import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import apiRoutes from './routes/api';
import { startWorker } from './queue/worker';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // For hackathon dev purposes
    methods: ['GET', 'POST']
  }
});

// Export a getter for the IO instance to be used by pythonRunner
let ioInstance = io;
export const getIo = () => ioInstance;

app.use(cors());
app.use(express.json());

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
