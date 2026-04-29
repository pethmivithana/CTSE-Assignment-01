require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const socketIO = require('socket.io');
const routes = require('./routes');
const { setupSocketEvents } = require('./services/socketService');
const logger = require('./utils/logger');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Socket.IO for real-time tracking
setupSocketEvents(io);

// API Routes
app.use('/api/delivery', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'delivery-management' });
});

const { initSchedulers } = require('./schedulers');
initSchedulers();

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error'
    }
  });
});

// Database connection (Cosmos Mongo requires retryable writes off)
mongoose.connect(process.env.MONGODB_URI, { retryWrites: false })
  .then(() => {
    logger.info('Connected to MongoDB');
    
    // Start server
    const PORT = process.env.PORT || 3003;
    server.listen(PORT, () => {
      logger.info(`Delivery Management Service running on port ${PORT}`);
    });
  })
  .catch(err => {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// Export for testing
module.exports = { app, server };