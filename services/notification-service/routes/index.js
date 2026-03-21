const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireInternalKey } = require('../middleware/internalAuth');
const notificationController = require('../controllers/notificationController');
const eventController = require('../controllers/eventController');

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'notification-service' }));

// Microservice fan-in (optionally protected)
router.post('/send', requireInternalKey, notificationController.internalSend);

// User inbox & preferences (JWT from user-service)
router.get('/me', authenticateToken, notificationController.listMine);
router.patch('/:id/read', authenticateToken, notificationController.markRead);
router.post('/read-all', authenticateToken, notificationController.markAllRead);
router.get('/preferences/me', authenticateToken, notificationController.getPreferences);
router.put('/preferences/me', authenticateToken, notificationController.putPreferences);
router.post('/devices', authenticateToken, notificationController.registerDevice);
router.delete('/devices', authenticateToken, notificationController.unregisterDevice);

// Event triggers (other services)
router.post('/order-placed', requireInternalKey, eventController.orderPlaced);
router.post('/order-accepted', requireInternalKey, eventController.orderAccepted);
router.post('/status-change', requireInternalKey, eventController.statusChange);
router.post('/order-delivered', requireInternalKey, eventController.orderDelivered);
router.post('/rider-picked-up', requireInternalKey, eventController.riderPickedUp);
router.post('/rider-en-route', requireInternalKey, eventController.riderEnRoute);
router.post('/payment-result', requireInternalKey, eventController.paymentResult);

module.exports = router;
