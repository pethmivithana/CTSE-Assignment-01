require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { handleStripeWebhook } = require('./controllers/stripeWebhookController');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();
const PORT = process.env.PORT || 3006;

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/payment_db';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Payment service connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:5001', 'http://127.0.0.1:3000'],
    credentials: true,
  }),
);

/** Stripe webhooks require raw body for signature verification */
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json({ limit: '2mb' }));
app.use('/api/payments', paymentRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'payment-service',
    stripe: !!process.env.STRIPE_SECRET_KEY,
    paypal: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
  });
});

app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
});

module.exports = app;
