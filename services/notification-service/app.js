require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const routes = require('./routes');
const { sendHtmlEmail } = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'], credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/notifications', routes);

app.post('/api/notifications/email', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject) return res.status(400).json({ error: 'to and subject required' });
    await sendHtmlEmail(to, subject, body || '');
    res.json({ message: 'Email sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/sms', (req, res) => {
  const { phone, message } = req.body;
  console.log(`[sms stub] ${phone}: ${message?.slice(0, 80)}`);
  res.json({ message: 'SMS stub' });
});

app.post('/api/notifications/push', (req, res) => {
  const { deviceToken, title, body } = req.body;
  console.log(`[push stub] ${deviceToken?.slice(0, 12)} ${title}`);
  res.json({ message: 'Push stub' });
});

app.post('/notifications/restaurant', (req, res) => {
  console.log('legacy restaurant notification', req.body);
  res.json({ message: 'ok' });
});

app.post('/notifications/customer', (req, res) => {
  console.log('legacy customer notification', req.body);
  res.json({ message: 'ok' });
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notification-service' }));

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/feedo-notifications')
  .then(() => {
    console.log('Notification service MongoDB connected');
    app.listen(PORT, () => console.log(`Notification service on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
