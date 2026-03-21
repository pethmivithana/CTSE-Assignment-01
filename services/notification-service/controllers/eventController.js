const { dispatch } = require('../services/dispatchService');

exports.orderPlaced = async (req, res) => {
  try {
    const { orderId, customerId, restaurantId, totalAmount, deliveryAddress, customerName } = req.body;

    await dispatch({
      recipientType: 'customer',
      recipientId: customerId,
      type: 'ORDER_PLACED',
      title: 'Order placed successfully',
      data: { orderId, totalAmount, deliveryAddress, name: customerName },
      emailTemplate: 'ORDER_PLACED_CUSTOMER',
      emailSubject: 'Your Feedo order was placed',
    });

    await dispatch({
      recipientType: 'restaurant',
      recipientId: restaurantId,
      type: 'ORDER_PLACED',
      title: 'New order received',
      data: { orderId, totalAmount },
      emailTemplate: 'ORDER_PLACED_RESTAURANT',
      emailSubject: 'New order on Feedo',
    });

    res.json({ message: 'Order placed notifications sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.orderAccepted = async (req, res) => {
  try {
    const { orderId, customerId, restaurantId, customerEmail, customerName, totalAmount } = req.body;

    await dispatch({
      recipientType: 'customer',
      recipientId: customerId,
      type: 'ORDER_ACCEPTED',
      title: 'Restaurant accepted your order',
      data: {
        orderId,
        totalAmount,
        name: customerName,
        customerName,
        ...(customerEmail ? { recipientEmail: customerEmail } : {}),
      },
      emailTemplate: 'ORDER_ACCEPTED',
      emailSubject: 'Feedo — Your order was accepted!',
    });

    await dispatch({
      recipientType: 'restaurant',
      recipientId: restaurantId,
      type: 'ORDER_ACCEPTED',
      title: 'Order confirmed',
      data: { orderId },
      skipEmail: true,
    });

    res.json({ message: 'Order accepted notifications sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.statusChange = async (req, res) => {
  try {
    const { orderId, customerId, restaurantId, status, previousStatus } = req.body;
    const title = `Order status: ${status}`;

    await dispatch({
      recipientType: 'customer',
      recipientId: customerId,
      type: 'ORDER_STATUS',
      title,
      data: { orderId, status, previousStatus },
      emailTemplate: 'ORDER_STATUS',
      emailSubject: `Feedo order ${status}`,
    });

    await dispatch({
      recipientType: 'restaurant',
      recipientId: restaurantId,
      type: 'ORDER_STATUS',
      title,
      data: { orderId, status },
      skipEmail: true,
    });

    res.json({ message: 'Status change notifications sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.orderDelivered = async (req, res) => {
  try {
    const { orderId, customerId, restaurantId } = req.body;

    await dispatch({
      recipientType: 'customer',
      recipientId: customerId,
      type: 'ORDER_DELIVERED',
      title: 'Your order was delivered',
      data: { orderId },
      emailTemplate: 'ORDER_DELIVERED',
      emailSubject: 'Feedo — Enjoy your meal!',
    });

    await dispatch({
      recipientType: 'restaurant',
      recipientId: restaurantId,
      type: 'ORDER_DELIVERED',
      title: 'Order delivered',
      data: { orderId },
      skipEmail: true,
    });

    res.json({ message: 'Order delivered notifications sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.riderPickedUp = async (req, res) => {
  try {
    const { orderId, customerId, driverId, driverName, estimatedTime } = req.body;
    await dispatch({
      recipientType: 'customer',
      recipientId: customerId,
      type: 'RIDER_PICKED_UP',
      title: 'Driver picked up your order',
      data: { orderId, driverName, estimatedTime },
      emailTemplate: 'DELIVERY_ARRIVAL',
      emailSubject: 'Your order is on the way',
    });
    res.json({ message: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.riderEnRoute = async (req, res) => {
  try {
    const { orderId, customerId } = req.body;
    await dispatch({
      recipientType: 'customer',
      recipientId: customerId,
      type: 'RIDER_EN_ROUTE',
      title: 'Driver is on the way',
      data: { orderId },
      emailTemplate: 'DELIVERY_ARRIVAL',
      emailSubject: 'Driver en route',
    });
    res.json({ message: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** Payment service — success or failure */
exports.paymentResult = async (req, res) => {
  try {
    const { customerId, orderId, amount, status, message } = req.body;
    if (!customerId) return res.status(400).json({ error: 'customerId required' });

    const isOk = status === 'COMPLETED' || status === 'SUCCESS';
    await dispatch({
      recipientType: 'customer',
      recipientId: customerId,
      type: isOk ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
      title: isOk ? 'Payment successful' : 'Payment failed',
      data: { orderId, amount, status, message },
      emailTemplate: isOk ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
      emailSubject: isOk ? 'Feedo — Payment received' : 'Feedo — Payment issue',
    });

    res.json({ message: 'Payment notification queued' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
