const axios = require('axios');

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3004';

exports.updateOrderStatus = async (orderId, status) => {
  try {
    const response = await axios.patch(
      `${ORDER_SERVICE_URL}/api/orders/${orderId}/status-update`,
      { status },
      { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
    );
    return response.data;
  } catch (err) {
    console.warn('Order service update failed:', err.message);
    return null;
  }
};
