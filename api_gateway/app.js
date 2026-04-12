const express = require('express');
const { createProxyMiddleware } = require('express-http-proxy');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Enable CORS
app.use(cors());

// JSON parsing middleware
app.use(express.json());

// Service URLs from environment variables
// Local: http://localhost:PORT | Docker: http://service-name:PORT
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:5002';
const RESTAURANT_SERVICE_URL = process.env.RESTAURANT_SERVICE_URL || 'http://restaurant-service:3002';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:3004';
const DELIVERY_SERVICE_URL = process.env.DELIVERY_SERVICE_URL || 'http://delivery-service:3003';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3005';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3006';

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'API Gateway is healthy', timestamp: new Date().toISOString() });
});

// Proxy middleware configuration
const createProxyMiddlewareConfig = (target) => ({
  target,
  changeOrigin: true,
  pathRewrite: (path, req) => {
    console.log(`[Gateway] Proxying to ${target.split('://')[1].split(':')[0]}: ${req.method} ${path}`);
    return path;
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward JWT token if present
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Add gateway header
    proxyRes.headers['X-Gateway'] = 'Feedo-API-Gateway';
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(503).json({
      error: 'Service unavailable',
      message: err.message,
      service: req.baseUrl.split('/')[1],
    });
  },
});

// User Service routes
app.use('/auth', createProxyMiddleware(createProxyMiddlewareConfig(USER_SERVICE_URL)));
app.use('/users', createProxyMiddleware(createProxyMiddlewareConfig(USER_SERVICE_URL)));

// Restaurant Service routes
app.use('/api/restaurants', createProxyMiddleware(createProxyMiddlewareConfig(RESTAURANT_SERVICE_URL)));
app.use('/api/menus', createProxyMiddleware(createProxyMiddlewareConfig(RESTAURANT_SERVICE_URL)));
app.use('/api/categories', createProxyMiddleware(createProxyMiddlewareConfig(RESTAURANT_SERVICE_URL)));

// Order Service routes
app.use('/api/orders', createProxyMiddleware(createProxyMiddlewareConfig(ORDER_SERVICE_URL)));
app.use('/api/coupons', createProxyMiddleware(createProxyMiddlewareConfig(ORDER_SERVICE_URL)));

// Delivery Service routes
app.use('/api/delivery', createProxyMiddleware(createProxyMiddlewareConfig(DELIVERY_SERVICE_URL)));

// Notification Service routes
app.use('/api/notifications', createProxyMiddleware(createProxyMiddlewareConfig(NOTIFICATION_SERVICE_URL)));

// Payment Service routes
app.use('/api/payments', createProxyMiddleware(createProxyMiddlewareConfig(PAYMENT_SERVICE_URL)));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Feedo API Gateway',
    version: '1.0.0',
    services: {
      users: '/users',
      restaurants: '/api/restaurants',
      orders: '/api/orders',
      delivery: '/api/delivery',
      notifications: '/api/notifications',
      payments: '/api/payments',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

module.exports = app;
