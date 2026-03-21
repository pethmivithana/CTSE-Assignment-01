const axios = require('axios');

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';

const notify = async (endpoint, payload) => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.INTERNAL_API_KEY) headers['x-internal-key'] = process.env.INTERNAL_API_KEY;
    const response = await axios.post(`${NOTIFICATION_SERVICE_URL}${endpoint}`, payload, {
      headers,
      timeout: 5000,
    });
    return response.data;
  } catch (err) {
    console.warn('Notification service call failed:', err.message);
    return null;
  }
};

exports.notifyOrderPlaced = async (order) => {
  await notify('/api/notifications/order-placed', {
    type: 'ORDER_PLACED',
    orderId: order._id,
    customerId: order.customerId,
    restaurantId: order.restaurantId,
    totalAmount: order.totalAmount,
    deliveryAddress: order.deliveryAddress
  });
};

exports.notifyOrderAccepted = async (order, customer = null) => {
  await notify('/api/notifications/order-accepted', {
    type: 'ORDER_ACCEPTED',
    orderId: order._id,
    customerId: order.customerId,
    restaurantId: order.restaurantId,
    customerEmail: customer?.email,
    customerName: customer?.fullName,
    totalAmount: order.totalAmount
  });
};

exports.notifyOrderStatusChange = async (order, previousStatus) => {
  await notify('/api/notifications/status-change', {
    type: 'ORDER_STATUS_CHANGE',
    orderId: order._id,
    customerId: order.customerId,
    restaurantId: order.restaurantId,
    status: order.status,
    previousStatus
  });
};

exports.notifyOrderDelivered = async (order) => {
  await notify('/api/notifications/order-delivered', {
    type: 'ORDER_DELIVERED',
    orderId: order._id,
    customerId: order.customerId,
    restaurantId: order.restaurantId
  });
};
