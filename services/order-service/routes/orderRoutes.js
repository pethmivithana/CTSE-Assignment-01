// routes/orderRoutes.js

const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const orderController = require('../controllers/orderController');
const { 
  authMiddleware, 
  customerMiddleware, 
  restaurantManagerMiddleware,
} = require('../middleware/authMiddleware');
const { requireInternalKey } = require('../middleware/internalAuth');

// Payment webhook - called by payment provider (no auth)
router.post('/payment/webhook', orderController.paymentWebhook);

// Validate coupon - customer auth
router.post('/validate-coupon', authMiddleware, customerMiddleware, orderController.validateCoupon);

// Internal: status update from delivery service (no auth - consider adding service-to-service auth)
router.patch('/:id/status-update', requireInternalKey, orderController.updateOrderStatusInternal);

// Order tracking - public (track by order ID)
router.get('/track/:id', orderController.trackOrder);

// Create a new order - only customers can create orders
router.post(
  '/', 
  authMiddleware, 
  customerMiddleware, 
  orderController.createOrder
);

// Get orders by customer ID - customers can only view their own orders
router.get(
  '/me', 
  authMiddleware, 
  customerMiddleware, 
  (req, res, next) => {
    // Set customerId from authenticated user
    req.params.customerId = req.user?._id || req.user?.id;
    next();
  },
  orderController.getCustomerOrders
);

// Reorder payload (must be before GET /:id)
router.get(
  '/:id/reorder',
  authMiddleware,
  customerMiddleware,
  orderController.reorder
);

router.get(
  '/restaurant/analytics',
  authMiddleware,
  restaurantManagerMiddleware,
  orderController.getRestaurantAnalytics
);

// Restaurant managers get their restaurant's orders
router.get(
  '/restaurant', 
  authMiddleware, 
  restaurantManagerMiddleware, 
  async (req, res) => {
    try {
      const restaurantId = req.user.restaurantInfo?._id || req.user.restaurantInfo?.restaurantId;
      if (!restaurantId) {
        return res.status(400).json({ 
          success: false, 
          message: 'No restaurant linked. Please complete your restaurant profile in the dashboard first.' 
        });
      }
      // Cosmos Mongo may reject DB-level ORDER BY if the index path is excluded.
      // Fetch first, then sort in memory to keep this endpoint resilient.
      let orders = await Order.find({ restaurantId });
      orders = orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      
      res.status(200).json({ 
        success: true, 
        count: orders.length, 
        data: orders 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch restaurant orders', 
        error: error.message 
      });
    }
  }
);

// Get order by ID - accessible to customers (their own orders) and restaurant managers
router.get(
  '/:id', 
  authMiddleware, 
  orderController.getOrderById
);

// Update order status - only restaurant managers can update status
router.patch(
  '/:id/status', 
  authMiddleware, 
  restaurantManagerMiddleware,
  orderController.updateOrderStatus
);

// Modify order - only customers can modify their pending orders
router.put(
  '/:id', 
  authMiddleware, 
  customerMiddleware,
  orderController.modifyOrder
);

// Cancel order - customers can cancel their own orders
router.patch(
  '/:id/cancel', 
  authMiddleware, 
  customerMiddleware,
  orderController.cancelOrder
);

module.exports = router;