const axios = require('axios');
const restaurantClient = require('./restaurantClient');

const DELIVERY_SERVICE_URL = process.env.DELIVERY_SERVICE_URL || 'http://localhost:3003';
const internalHeaders = () => ({
  'Content-Type': 'application/json',
  ...(process.env.INTERNAL_API_KEY ? { 'x-internal-key': process.env.INTERNAL_API_KEY } : {}),
});

exports.requestDriverAssignment = async (order) => {
  try {
    const restaurant = await restaurantClient.getRestaurantById(order.restaurantId);
    const pickupLat = restaurant?.location?.latitude ?? 6.9271;
    const pickupLon = restaurant?.location?.longitude ?? 79.8612;
    const dropoffLat = order.deliveryAddress?.latitude ?? pickupLat;
    const dropoffLon = order.deliveryAddress?.longitude ?? pickupLon;

    const deliveryNotes = (order.deliveryAddress?.additionalInfo || '').trim();

    const deliveryPayload = {
      orderId: order._id.toString(),
      restaurantId: order.restaurantId.toString(),
      customerId: order.customerId.toString(),
      orderDetails: {
        items: order.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
        totalAmount: order.totalAmount
      },
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      codAmountDue: order.paymentMethod === 'CASH_ON_DELIVERY' ? order.totalAmount : 0,
      pickupLocation: {
        address: restaurant?.location?.address || `${order.deliveryAddress?.street || ''}, ${order.deliveryAddress?.city || ''}`.trim() || 'Restaurant',
        latitude: pickupLat,
        longitude: pickupLon
      },
      dropoffLocation: {
        address: `${order.deliveryAddress?.street || ''}, ${order.deliveryAddress?.city || ''} ${order.deliveryAddress?.postalCode || ''}`.trim() || 'Customer address',
        latitude: dropoffLat,
        longitude: dropoffLon
      },
      ...(deliveryNotes ? { deliveryNotes } : {}),
      deliveryFee: order.deliveryFee || 0
    };

    const response = await axios.post(`${DELIVERY_SERVICE_URL}/api/delivery/deliveries`, deliveryPayload, {
      headers: internalHeaders(),
      timeout: 10000
    });
    return response.data;
  } catch (err) {
    if (err.response?.status === 409) {
      try {
        const existing = await axios.get(
          `${DELIVERY_SERVICE_URL}/api/delivery/deliveries/order/${order._id.toString()}`,
          { timeout: 7000 },
        );
        return { delivery: { id: existing?.data?.delivery?._id || existing?.data?.delivery?.id } };
      } catch (getErr) {
        console.warn('Delivery exists but fetch failed:', getErr.message);
      }
    }
    console.warn('Delivery service request failed:', err.message, err.response?.data);
    return null;
  }
};

exports.dispatchExistingDelivery = async (orderId) => {
  try {
    const response = await axios.post(
      `${DELIVERY_SERVICE_URL}/api/delivery/deliveries/order/${orderId}/dispatch`,
      {},
      { headers: internalHeaders(), timeout: 8000 },
    );
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    console.warn('Delivery dispatch failed:', err.message, err.response?.data);
    return null;
  }
};

exports.cancelDeliveryByOrderId = async (orderId) => {
  try {
    const response = await axios.post(
      `${DELIVERY_SERVICE_URL}/api/delivery/deliveries/cancel-by-order/${orderId}`,
      {},
      { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
    );
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    console.warn('Delivery cancel failed:', err.message);
    return null;
  }
};
