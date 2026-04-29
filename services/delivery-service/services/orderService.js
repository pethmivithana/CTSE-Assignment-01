const axios = require('axios');

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3004';

exports.updateOrderStatus = async (orderId, status) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(process.env.INTERNAL_API_KEY ? { 'x-internal-key': process.env.INTERNAL_API_KEY } : {}),
    };
    const response = await axios.patch(
      `${ORDER_SERVICE_URL}/api/orders/${orderId}/status-update`,
      { status },
      { headers, timeout: 5000 }
    );
    return response.data;
  } catch (err) {
    console.warn('Order service update failed:', err.message);
    return null;
  }
};

exports.collectCodPayment = async (orderId) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(process.env.INTERNAL_API_KEY ? { 'x-internal-key': process.env.INTERNAL_API_KEY } : {}),
    };
    const response = await axios.patch(
      `${ORDER_SERVICE_URL}/api/orders/${orderId}/payment/collect-cod`,
      {},
      { headers, timeout: 5000 }
    );
    return response.data;
  } catch (err) {
    console.warn('Order COD payment update failed:', err.message);
    return null;
  }
};
