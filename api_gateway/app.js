require('dotenv').config();
const express = require('express');
const httpProxy = require('http-proxy');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
const proxy = httpProxy.createProxyServer();

// NOTE: Do NOT add express.json() here - it consumes the request body stream
// and breaks http-proxy's ability to forward POST bodies to backend services.

// Environment variables
const PORT = process.env.PORT || 5001;
// User service: 5002 when running locally (npm start), user-service:3001 in Docker
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const RESTAURANT_SERVICE_URL = process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3002';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3004';
const DELIVERY_SERVICE_URL = process.env.DELIVERY_SERVICE_URL || 'http://localhost:3003';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006';
const JWT_SECRET = process.env.JWT_SECRET || 'jasonwebtoken';

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  exposedHeaders: ['x-user-id', 'x-user-role']
}));

// Authentication middleware for the gateway
const authenticate = (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
          status: false,
          message: 'Access Denied: No token provided' 
      });
  }

  const token = authHeader.split(' ')[1].trim();
  
  try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      
      req.headers['x-user-id'] = decoded.id;
      req.headers['x-user-role'] = decoded.role;
      
      next();
  } catch (error) {
      console.error('Token verification failed:', error.message);
      const message = error.name === 'TokenExpiredError' ? 'Token expired' :
                     error.name === 'JsonWebTokenError' ? 'Malformed token' : 
                     'Invalid Token';
      return res.status(401).json({ status: false, message });
  }
};

app.post('/auth/login', (req, res) => {
    proxy.web(req, res, { target: USER_SERVICE_URL });
});

app.post('/auth/register', (req, res) => {
  proxy.web(req, res, { target: USER_SERVICE_URL });
});

app.post('/auth/refresh', (req, res) => {
  proxy.web(req, res, { target: USER_SERVICE_URL });
});

app.post('/auth/forgot-password', (req, res) => {
  proxy.web(req, res, { target: USER_SERVICE_URL });
});

app.post('/auth/reset-password', (req, res) => {
  proxy.web(req, res, { target: USER_SERVICE_URL });
});

app.put('/auth/change-password', authenticate, (req, res) => {
  proxy.web(req, res, {
    target: USER_SERVICE_URL,
    headers: {
      ...req.headers,
      'x-user-id': req.user.id,
      'x-user-role': req.user.role
    }
  });
});

app.post('/auth/logout', authenticate, (req, res) => {
  proxy.web(req, res, {
    target: USER_SERVICE_URL,
    headers: { 'x-user-id': req.user.id, 'x-user-role': req.user.role },
  });
});

app.use('/auth/verify', (req, res) => {
  proxy.web(req, res, { target: USER_SERVICE_URL });
});

app.use('/auth', (req, res) => {
  proxy.web(req, res, { target: USER_SERVICE_URL });
});

// User service - profile, addresses, etc. (auth forwarded so user service can validate)
app.use('/users', async (req, res) => {
  const path = req.originalUrl;
  const targetUrl = `${USER_SERVICE_URL}${path}`;
  console.log('[Gateway] Users:', req.method, path, '->', targetUrl);
  const headers = { 'Content-Type': req.headers['content-type'] || 'application/json' };
  if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization'];
  try {
    const config = { method: req.method, url: targetUrl, headers, validateStatus: () => true };
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const body = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
      if (body.length) config.data = body;
    }
    const response = await axios(config);
    res.status(response.status).json(response.data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      return res.status(502).json({ error: 'User service unavailable - ensure it is running', path });
    }
    res.status(502).json({ error: 'User service error', message: err.message });
  }
});
// User service - axios proxy (path /api/users -> /users for user service)
const proxyToUserService = async (req, res) => {
  const path = req.originalUrl.replace(/^\/api\/users/, '/users');
  const targetUrl = `${USER_SERVICE_URL}${path}`;
  const headers = { 'Content-Type': req.headers['content-type'] || 'application/json' };
  if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization'];
  if (req.user) {
    headers['x-user-id'] = req.user.id || req.user._id;
    headers['x-user-role'] = req.user.role;
  }
  try {
    const config = { method: req.method, url: targetUrl, headers, validateStatus: () => true, timeout: 10000 };
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const body = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
      if (body.length) config.data = body;
    }
    const response = await axios(config);
    res.status(response.status).json(response.data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('User service not reachable at', USER_SERVICE_URL, '- ensure it is running on port 5002');
      return res.status(502).json({ error: 'User service unavailable - ensure it is running on port 5002' });
    }
    console.error('User proxy error:', err.message);
    res.status(502).json({ error: 'User service unavailable' });
  }
};
app.use('/api/users', authenticate, proxyToUserService);

app.get('/auth/profile', authenticate, (req, res) => {
  proxy.web(req, res, { 
      target: USER_SERVICE_URL,
      headers: {
          'x-user-id': req.user.id,
          'x-user-role': req.user.role
      }
  });
});

// Restaurant Service - direct proxy (public, no auth) - avoids http-proxy path stripping
const proxyToRestaurantService = async (req, res) => {
  const path = req.originalUrl;
  const targetUrl = `${RESTAURANT_SERVICE_URL}${path}`;
  console.log('[Gateway] Proxying to restaurant:', req.method, targetUrl);
  const headers = { 'Content-Type': req.headers['content-type'] || 'application/json' };
  if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization'];
  try {
    const config = { method: req.method, headers, validateStatus: () => true, timeout: 10000 };
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const body = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
      if (body.length) config.data = body;
    }
    const response = await axios(targetUrl, config);
    if (typeof response.data === 'object' && response.data !== null) {
      res.status(response.status).json(response.data);
    } else {
      res.status(response.status).send(response.data);
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('Restaurant service not reachable at', RESTAURANT_SERVICE_URL, '- is it running?');
      return res.status(502).json({ error: 'Restaurant service unavailable - ensure it is running on port 3002' });
    }
    console.error('Restaurant proxy error:', err.message);
    res.status(502).json({ error: 'Restaurant service unavailable' });
  }
};
app.use('/api/restaurants', proxyToRestaurantService);
app.use('/api/categories', proxyToRestaurantService);
app.use('/api/menu-items', proxyToRestaurantService);
app.use('/api/uploads', (req, res) => {
  req.url = '/uploads' + (req.url === '/' ? '' : req.url || '');
  proxy.web(req, res, { target: RESTAURANT_SERVICE_URL });
});

// Stripe / payment webhooks — raw body, no JWT (signature verified by payment service)
app.post('/api/payments/webhook', async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    const response = await axios.post(`${PAYMENT_SERVICE_URL}/api/payments/webhook`, raw, {
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'stripe-signature': req.headers['stripe-signature'],
      },
      validateStatus: () => true,
    });
    const ct = response.headers['content-type'] || '';
    if (ct.includes('application/json')) res.status(response.status).json(response.data);
    else res.status(response.status).send(response.data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      return res.status(502).json({ error: 'Payment service unavailable', path: '/api/payments/webhook' });
    }
    res.status(502).json({ error: 'Payment webhook proxy failed', message: err.message });
  }
});

// Payment Service - auth required
app.use('/api/payments', authenticate, async (req, res) => {
  const path = req.originalUrl;
  const targetUrl = `${PAYMENT_SERVICE_URL}${path}`;
  console.log('[Gateway] Payments:', req.method, path, '->', targetUrl);
  const headers = {
    'Content-Type': req.headers['content-type'] || 'application/json',
    'Authorization': req.headers['authorization'],
  };
  try {
    const config = { method: req.method, url: targetUrl, headers, validateStatus: () => true };
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const body = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
      if (body.length) config.data = body;
    }
    const response = await axios(config);
    res.status(response.status).json(response.data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      return res.status(502).json({ error: 'Payment service unavailable - ensure it is running on port 3006', path });
    }
    res.status(502).json({ error: 'Payment service error', message: err.message });
  }
});

// Order Service - auth for most, public for tracking & webhook
app.post('/api/orders/payment/webhook', (req, res) => {
  proxy.web(req, res, { target: ORDER_SERVICE_URL });
});
app.get('/api/orders/track/:id', (req, res) => {
  proxy.web(req, res, { target: ORDER_SERVICE_URL });
});
app.use('/api/orders', authenticate, (req, res) => {
  req.url = req.originalUrl;
  proxy.web(req, res, { 
    target: ORDER_SERVICE_URL,
    headers: {
      'x-user-id': req.user?.id,
      'x-user-role': req.user?.role,
      'Authorization': req.headers['authorization']
    }
  });
});

// Coupons - direct proxy to avoid path stripping issues
app.use('/api/coupons', authenticate, async (req, res) => {
  const path = req.originalUrl;
  const targetUrl = `${ORDER_SERVICE_URL}${path}`;
  const headers = {
    'Content-Type': req.headers['content-type'] || 'application/json',
    'Authorization': req.headers['authorization'],
    'x-user-id': req.user?.id,
    'x-user-role': req.user?.role,
  };
  try {
    const config = { method: req.method, headers, validateStatus: () => true };
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const body = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
      if (body.length) config.data = body;
    }
    const response = await axios(targetUrl, config);
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error('Coupon proxy error:', err.message);
    res.status(502).json({ success: false, message: 'Coupon service unavailable' });
  }
});

// Delivery Service - axios proxy (avoids http-proxy path issues)
const proxyToDeliveryService = async (req, res) => {
  const path = req.originalUrl;
  const targetUrl = `${DELIVERY_SERVICE_URL}${path}`;
  const headers = { 'Content-Type': req.headers['content-type'] || 'application/json' };
  if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization'];
  try {
    const config = { method: req.method, url: targetUrl, headers, validateStatus: () => true, timeout: 10000 };
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const body = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
      if (body.length) config.data = body;
    }
    const response = await axios(config);
    res.status(response.status).json(response.data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('Delivery service not reachable at', DELIVERY_SERVICE_URL, '- is it running on port 3003?');
      return res.status(502).json({ error: 'Delivery service unavailable' });
    }
    console.error('Delivery proxy error:', err.message);
    res.status(502).json({ error: 'Delivery service unavailable' });
  }
};
app.use('/api/delivery', proxyToDeliveryService);

// Notification Service - internal/callback (services call directly; gateway can proxy if needed)
app.use('/api/notifications', (req, res) => {
  proxy.web(req, res, { target: NOTIFICATION_SERVICE_URL });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'API Gateway is running' });
});

// 404 - log unmatched routes
app.use((req, res) => {
  console.warn('Gateway 404:', req.method, req.originalUrl);
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

// Error handling
proxy.on('error', (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ status: false, message: 'Service unavailable' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: false, message: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});