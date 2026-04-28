// File: routes/index.js
const express = require('express');
const { validateRequest } = require('../middleware/validation');
const { authenticateToken, authorizeDriver, authorizeAdmin } = require('../middleware/auth');
const driverController = require('../controllers/driverController');
const deliveryController = require('../controllers/deliveryController');
const mapController = require('../controllers/mapController');
const analyticsController = require('../controllers/analyticsController');
const deliveryHistoryController = require('../controllers/deliveryHistoryController');
const { requireInternalKey } = require('../middleware/internalAuth');

const router = express.Router();

// Driver "me" - get current driver by JWT user id
router.get('/drivers/me', authenticateToken, driverController.getDriverByUser);
router.put('/drivers/me/profile', authenticateToken, validateRequest, driverController.updateMyProfile);
// Available deliveries for drivers to accept
router.get('/deliveries/available', authenticateToken, deliveryController.getAvailableDeliveries);

// Public routes
router.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));//ok

// Delivery tracking — authenticated customer gets OTP + full detail
router.get('/track/:orderId/customer', authenticateToken, deliveryController.trackDeliveryForCustomer);
router.get('/track/:orderId', deliveryController.trackDelivery);


// Driver registration (from user service)
router.post('/drivers/register', validateRequest, driverController.registerDriver);//ok

// Driver routes (driver authorization required)
router.get('/drivers/:id', authenticateToken, authorizeDriver, driverController.getDriverProfile);//ok
router.put('/drivers/:id/availability', authenticateToken, authorizeDriver, validateRequest, driverController.updateAvailability);//ok
router.put('/drivers/:id/location', authenticateToken, authorizeDriver, validateRequest, driverController.updateLocation);//ok
router.get('/drivers/:id/deliveries', authenticateToken, authorizeDriver, driverController.getDriverDeliveries);
router.post('/drivers/:id/accept', authenticateToken, authorizeDriver, validateRequest, driverController.acceptDelivery);//ok
router.post('/drivers/:id/reject', authenticateToken, authorizeDriver, validateRequest, driverController.rejectDelivery);
router.put('/drivers/:id/deliveries/:deliveryId/status', authenticateToken, authorizeDriver, validateRequest, driverController.updateDeliveryStatus);

// Map related routes
router.get('/map/directions', mapController.getDirections);

// Delivery routes - specific paths MUST come before /deliveries/:id
router.post('/deliveries/calculate-fee', deliveryController.calculateDeliveryFee);
router.post('/deliveries/order/:orderId/exception', authenticateToken, deliveryController.reportDeliveryException);
router.post('/deliveries', requireInternalKey, validateRequest, deliveryController.createDelivery);//ok
router.put('/deliveries/confirm/:orderId', validateRequest, deliveryController.confirmDelivery);
router.post('/deliveries/order/:orderId/dispatch', requireInternalKey, validateRequest, deliveryController.dispatchDeliveryByOrderId);
router.get('/deliveries/order/:orderId', deliveryController.getDeliveryByOrderId);
router.get('/deliveries/history', authenticateToken, deliveryHistoryController.getCustomerHistory);
router.get('/deliveries/:id', deliveryController.getDeliveryById);
router.post('/deliveries/:id/cancel', validateRequest, deliveryController.cancelDelivery);
router.post('/deliveries/:id/rate', validateRequest, deliveryController.rateDelivery);

// Admin routes
router.post('/admin/deliveries/:deliveryId/assign', authenticateToken, authorizeAdmin, validateRequest, deliveryController.adminAssignDelivery);
router.get('/admin/drivers', authenticateToken, authorizeAdmin, driverController.getAllDrivers);
router.get('/admin/deliveries', authenticateToken, authorizeAdmin, deliveryController.getAllDeliveries);
router.get('/admin/analytics', authenticateToken, authorizeAdmin, analyticsController.getDashboard);

router.get('/drivers/:id/history', deliveryHistoryController.getDriverHistory);

module.exports = router;
