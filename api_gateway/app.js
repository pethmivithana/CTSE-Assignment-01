const express = require('express');
const httpProxy = require('http-proxy');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Enable CORS
app.use(cors());

// JSON parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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

// Create proxy instances for each service
const createProxy = (target) => {
  const proxy = httpProxy.createProxyServer({
    target,
    changeOrigin: true,
    ws: false,
  });

  proxy.on('error', (err, req, res) => {
    console.error('[Gateway] Proxy error:', err.message, 'Target:', target);
    res.status(503).json({
      error: 'Service unavailable',
      message: err.message,
    });
  });

  return proxy;
};

const userProxy = createProxy(USER_SERVICE_URL);
const restaurantProxy = createProxy(RESTAURANT_SERVICE_URL);
const orderProxy = createProxy(ORDER_SERVICE_URL);
const deliveryProxy = createProxy(DELIVERY_SERVICE_URL);
const notificationProxy = createProxy(NOTIFICATION_SERVICE_URL);
const paymentProxy = createProxy(PAYMENT_SERVICE_URL);

// User Service routes
app.all('/auth/*', (req, res) => {
  console.log(`[Gateway] ${req.method} /auth${req.path} → ${USER_SERVICE_URL}/auth${req.path}`);
  userProxy.web(req, res);
});
app.all('/users/*', (req, res) => {
  console.log(`[Gateway] ${req.method} /users${req.path} → ${USER_SERVICE_URL}/users${req.path}`);
  userProxy.web(req, res);
});

// Restaurant Service routes
app.all('/api/restaurants/*', (req, res) => {
  console.log(`[Gateway] ${req.method} /api/restaurants${req.path} → ${RESTAURANT_SERVICE_URL}/api/restaurants${req.path}`);
  restaurantProxy.web(req, res);
});
app.all('/api/menus/*', (req, res) => {
  console.log(`[Gateway] ${req.method} /api/menus${req.path} → ${RESTAURANT_SERVICE_URL}/api/menus${req.path}`);
  restaurantProxy.web(req, res);
});
app.all('/api/categories/*', (req, res) => {
  console.log(`[Gateway] ${req.method} /api/categories${req.path} → ${RESTAURANT_SERVICE_URL}/api/categories${req.path}`);
  restaurantProxy.web(req, res);
});

// Order Service routes
app.all('/api/orders/*', (req, res) => {
  console.log(`[Gateway] ${req.method} /api/orders${req.path} → ${ORDER_SERVICE_URL}/api/orders${req.path}`);
  orderProxy.web(req, res);
});
app.all('/api/coupons/*', (req, res) => {
  console.log(`[Gateway] ${req.method} /api/coupons${req.path} → ${ORDER_SERVICE_URL}/api/coupons${req.path}`);
  orderProxy.web(req, res);
});

// Delivery Service routes
app.all('/api/delivery/*', (req, res) => {
  console.log(`[Gateway] ${req.method} /api/delivery${req.path} → ${DELIVERY_SERVICE_URL}/api/delivery${req.path}`);
  deliveryProxy.web(req, res);
});

// Notification Service routes
app.all('/api/notifications/*', (req, res) => {
  console.log(`[Gateway] ${req.method} /api/notifications${req.path} → ${NOTIFICATION_SERVICE_URL}/api/notifications${req.path}`);
  notificationProxy.web(req, res);
});

// Payment Service routes
app.all('/api/payments/*', (req, res) => {
  console.log(`[Gateway] ${req.method} /api/payments${req.path} → ${PAYMENT_SERVICE_URL}/api/payments${req.path}`);
  paymentProxy.web(req, res);
});

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
