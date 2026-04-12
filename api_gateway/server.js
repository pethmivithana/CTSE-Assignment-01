const app = require('./app');
const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log('');
  console.log('Services:');
  console.log(`  🔐 User Service:         ${process.env.USER_SERVICE_URL || 'http://localhost:3001'}`);
  console.log(`  🏪 Restaurant Service:   ${process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3002'}`);
  console.log(`  📦 Order Service:        ${process.env.ORDER_SERVICE_URL || 'http://localhost:3004'}`);
  console.log(`  🚗 Delivery Service:     ${process.env.DELIVERY_SERVICE_URL || 'http://localhost:3003'}`);
  console.log(`  📧 Notification Service: ${process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005'}`);
  console.log(`  💳 Payment Service:      ${process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006'}`);
  console.log('');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = server;
