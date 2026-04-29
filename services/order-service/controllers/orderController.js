const mongoose = require('mongoose');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const notificationService = require('../services/notificationService');
const deliveryService = require('../services/deliveryService');
const restaurantClient = require('../services/restaurantClient');
const userClient = require('../services/userClient');

const TAX_RATE = Number(process.env.ORDER_TAX_RATE || 0.05);
const CANCEL_WINDOW_MINUTES = Number(process.env.ORDER_CANCEL_WINDOW_MINUTES || 15);

/** Map legacy / API aliases to stored canonical status */
function canonicalStatus(s) {
  const map = {
    PENDING: 'CREATED',
    ACCEPTED: 'CONFIRMED',
    OUT_FOR_DELIVERY: 'PICKED_UP',
  };
  return map[s] || s;
}

function isCreatedLike(status) {
  return status === 'CREATED' || status === 'PENDING';
}

async function validateCouponCode(code, orderTotal) {
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
  if (!coupon) return { valid: false, message: 'Invalid coupon' };
  const now = new Date();
  if (coupon.validFrom && new Date(coupon.validFrom) > now) return { valid: false, message: 'Coupon not yet valid' };
  if (coupon.validUntil && new Date(coupon.validUntil) < now) return { valid: false, message: 'Coupon expired' };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return { valid: false, message: 'Coupon limit reached' };
  if (orderTotal < (coupon.minOrderAmount || 0)) return { valid: false, message: `Minimum order LKR ${coupon.minOrderAmount}` };
  let discount = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    discount = (orderTotal * coupon.discountValue) / 100;
    if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = Math.min(coupon.discountValue, orderTotal);
  }
  return { valid: true, discountAmount: Math.round(discount * 100) / 100, coupon };
}

function couponAppliesToRestaurant(coupon, restaurantId) {
  if (!coupon?.restaurantId) return true; // global coupon
  if (!restaurantId) return false;
  return String(coupon.restaurantId) === String(restaurantId);
}

exports.validateCoupon = async (req, res) => {
  try {
    const { code, orderTotal, restaurantId } = req.body;
    if (!code || orderTotal == null) {
      return res.status(400).json({ success: false, message: 'code and orderTotal required' });
    }
    const result = await validateCouponCode(code.trim().toUpperCase(), Number(orderTotal));
    if (result.valid && !couponAppliesToRestaurant(result.coupon, restaurantId)) {
      return res.status(200).json({ success: false, valid: false, message: 'Coupon not available for this restaurant' });
    }
    if (!result.valid) {
      return res.status(200).json({ success: false, valid: false, message: result.message });
    }
    res.json({ success: true, valid: true, discountAmount: result.discountAmount, code: code.trim().toUpperCase() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const {
      restaurantId,
      items,
      deliveryAddress,
      contactPhone,
      paymentMethod,
      couponCode,
      paymentId,
      paymentStatus,
      deliveryFee = 0,
      addressId,
    } = req.body;
    const userRole = String(req.user?.role || '').toLowerCase();
    if (userRole !== 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Only customers can place orders',
      });
    }

    if (!items?.length) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const restaurant = await restaurantClient.getRestaurantById(restaurantId);
    if (!restaurant) {
      return res.status(400).json({ success: false, message: 'Restaurant not found' });
    }
    if (restaurant.isOpen === false) {
      return res.status(400).json({ success: false, message: 'Restaurant is closed for orders' });
    }

    const menuItems = await restaurantClient.getMenuItemsForRestaurant(restaurantId);
    const menuCheck = restaurantClient.validateOrderItemsAgainstMenu(items, menuItems);
    if (!menuCheck.ok) {
      return res.status(400).json({ success: false, message: menuCheck.message });
    }

    const addrCheck = await userClient.validateUserAddress(req.token, deliveryAddress, addressId);
    if (!addrCheck.ok) {
      return res.status(400).json({ success: false, message: addrCheck.message });
    }

    const customerId = req.user._id;
    let subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discountAmount = 0;

    if (couponCode && couponCode.trim()) {
      const couponResult = await validateCouponCode(couponCode.trim().toUpperCase(), subtotal);
      if (couponResult.valid && couponAppliesToRestaurant(couponResult.coupon, restaurantId)) {
        discountAmount = couponResult.discountAmount;
        subtotal = Math.max(0, subtotal - discountAmount);
      }
    }

    const afterDiscount = subtotal;
    const taxAmount = Math.round(afterDiscount * TAX_RATE * 100) / 100;
    const totalAmount = Math.round((afterDiscount + taxAmount + (Number(deliveryFee) || 0)) * 100) / 100;

    const isPrepaid = ['CREDIT_CARD', 'DEBIT_CARD', 'ONLINE_PAYMENT'].includes(paymentMethod);
    const orderPaymentStatus = isPrepaid && paymentId && paymentStatus === 'COMPLETED' ? 'COMPLETED' : 'PENDING';

    const order = new Order({
      customerId,
      restaurantId,
      items,
      deliveryAddress,
      ...(addressId && mongoose.Types.ObjectId.isValid(addressId) ? { addressId } : {}),
      contactPhone,
      subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      taxAmount,
      totalAmount,
      paymentMethod,
      ...(paymentId && { paymentId }),
      paymentStatus: orderPaymentStatus,
      couponCode: discountAmount > 0 ? (couponCode || '').trim().toUpperCase() : undefined,
      discountAmount: discountAmount || undefined,
      deliveryFee: Number(deliveryFee) || 0,
      status: 'CREATED',
    });

    const savedOrder = await order.save();

    if (discountAmount > 0 && couponCode) {
      await Coupon.findOneAndUpdate({ code: couponCode.trim().toUpperCase() }, { $inc: { usedCount: 1 } });
    }

    try {
      await notificationService.notifyOrderPlaced(savedOrder);
    } catch (notifyErr) {
      console.warn('Order created but failed to notify:', notifyErr.message);
    }

    res.status(201).json({ success: true, data: savedOrder });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ success: false, message: 'Failed to create order', error: error.message });
  }
};

exports.getCustomerOrders = async (req, res) => {
  try {
    const { customerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID format' });
    }
    const requesterId = (req.user?._id || req.user?.id || '').toString();
    if (req.user.role !== 'admin' && requesterId !== customerId) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own orders' });
    }
    // Cosmos Mongo may reject DB-level ORDER BY on excluded index paths.
    // Sort in memory to avoid hard failures in production.
    let orders = await Order.find({ customerId });
    orders = orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders', error: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const isCustomer = req.user.role === 'customer' && order.customerId.toString() !== req.user._id.toString();
    const managerRestaurantId = req.user.restaurantInfo?._id || req.user.restaurantInfo?.restaurantId;
    const isManager = req.user.role === 'restaurantManager' && (!managerRestaurantId || order.restaurantId.toString() !== managerRestaurantId.toString());
    if (isCustomer || isManager) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch order', error: error.message });
  }
};

exports.updateOrderStatusInternal = async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }
    status = canonicalStatus(status);
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOrderPaymentInfoInternal = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }
    const order = await Order.findById(id).select('paymentMethod paymentStatus totalAmount');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    return res.status(200).json({
      success: true,
      data: {
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.collectCodPaymentInternal = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.paymentMethod !== 'CASH_ON_DELIVERY') {
      return res.status(400).json({ success: false, message: 'Order is not cash on delivery' });
    }
    if (order.paymentStatus === 'COMPLETED') {
      return res.status(200).json({ success: true, message: 'COD already collected', data: order });
    }
    order.paymentStatus = 'COMPLETED';
    if (!order.paymentId) {
      order.paymentId = `COD-${Date.now()}`;
    }
    await order.save();
    return res.status(200).json({ success: true, message: 'COD payment collected', data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { status, estimatedPreparationTime, rejectionReason } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }

    status = canonicalStatus(status);
    const allowed = ['CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED', 'CANCELLED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const restaurantId = req.user.restaurantInfo?._id || req.user.restaurantInfo?.restaurantId;
    if (!restaurantId || order.restaurantId.toString() !== restaurantId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: Not your restaurant order' });
    }

    const cur = canonicalStatus(order.status);
    if (!isCreatedLike(order.status) && status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Can only reject orders that are not yet confirmed' });
    }

    const previousStatus = order.status;
    order.status = status;
    if (estimatedPreparationTime !== undefined) order.estimatedPreparationTime = Number(estimatedPreparationTime);
    if (status === 'CANCELLED' && isCreatedLike(previousStatus)) {
      order.rejectedAt = new Date();
      if (rejectionReason) order.rejectionReason = rejectionReason;
    }
    if (status === 'CONFIRMED' && order.estimatedPreparationTime) {
      const eta = new Date(Date.now() + order.estimatedPreparationTime * 60000 + 25 * 60000);
      order.estimatedDeliveryTime = eta;
    }
    const updatedOrder = await order.save();

    if (status === 'CONFIRMED') {
      try {
        const userClient = require('../services/userClient');
        const customer = await userClient.getCustomerForNotification(updatedOrder.customerId?.toString());
        await notificationService.notifyOrderAccepted(updatedOrder, customer);
      } catch (notifyErr) {
        console.warn('Failed to notify order accepted:', notifyErr.message);
      }
    }

    // Real-world flow: only start rider assignment once restaurant marks order READY.
    if (status === 'READY') {
      try {
        if (!updatedOrder.deliveryId) {
          const delivery = await deliveryService.requestDriverAssignment(updatedOrder);
          if (delivery?.delivery?.id) {
            updatedOrder.deliveryId = delivery.delivery.id;
            await updatedOrder.save();
          }
        } else {
          await deliveryService.dispatchExistingDelivery(updatedOrder._id.toString());
        }
      } catch (err) {
        console.warn('Failed to dispatch delivery on READY:', err.message);
      }
    }

    try {
      await notificationService.notifyOrderStatusChange(updatedOrder, previousStatus);
    } catch (notifyErr) {
      console.warn('Failed to notify status change:', notifyErr.message);
    }

    if (status === 'DELIVERED') {
      try {
        await notificationService.notifyOrderDelivered(updatedOrder);
      } catch (notifyErr) {
        console.warn('Failed to notify delivered:', notifyErr.message);
      }
    }

    res.status(200).json({ success: true, data: updatedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update order status', error: error.message });
  }
};

exports.modifyOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, deliveryAddress, contactPhone } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: Not your order' });
    }
    if (!isCreatedLike(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot modify order after restaurant confirmation' });
    }
    if (items) {
      const menuItems = await restaurantClient.getMenuItemsForRestaurant(order.restaurantId);
      const check = restaurantClient.validateOrderItemsAgainstMenu(items, menuItems);
      if (!check.ok) return res.status(400).json({ success: false, message: check.message });
      order.items = items;
      const sub = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      order.subtotal = sub;
      let afterDiscount = sub - (order.discountAmount || 0);
      if (afterDiscount < 0) afterDiscount = 0;
      order.taxAmount = Math.round(afterDiscount * TAX_RATE * 100) / 100;
      order.totalAmount = Math.round((afterDiscount + order.taxAmount + (order.deliveryFee || 0)) * 100) / 100;
    }
    if (deliveryAddress) order.deliveryAddress = deliveryAddress;
    if (contactPhone) order.contactPhone = contactPhone;
    const updatedOrder = await order.save();
    res.status(200).json({ success: true, data: updatedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to modify order', error: error.message });
  }
};

exports.paymentWebhook = async (req, res) => {
  try {
    const { orderId, paymentId, status } = req.body;
    if (!orderId || !status) {
      return res.status(400).json({ success: false, message: 'orderId and status are required' });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    order.paymentStatus = status.toUpperCase();
    if (paymentId) order.paymentId = paymentId;
    await order.save();
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error('Payment webhook error:', error);
    res.status(500).json({ success: false, message: 'Payment webhook failed', error: error.message });
  }
};

const TIMELINE_LABELS = {
  CREATED: 'Order placed',
  CONFIRMED: 'Confirmed by restaurant',
  PREPARING: 'Being prepared',
  READY: 'Ready for pickup',
  PICKED_UP: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  PENDING: 'Order placed',
  ACCEPTED: 'Confirmed by restaurant',
  OUT_FOR_DELIVERY: 'Out for delivery',
};

exports.trackOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }
    const order = await Order.findById(id).select(
      'status paymentMethod paymentStatus totalAmount deliveryAddress estimatedDeliveryTime deliveryId createdAt estimatedPreparationTime items subtotal taxAmount deliveryFee',
    );
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const cur = canonicalStatus(order.status);
    const orderSequence = ['CREATED', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED'];
    let idx = orderSequence.indexOf(cur);
    if (idx < 0 && cur === 'CANCELLED') idx = -1;
    const timeline = orderSequence.map((st, i) => ({
      status: st,
      label: TIMELINE_LABELS[st] || st,
      done: idx >= i && cur !== 'CANCELLED',
      current: idx === i,
    }));
    if (cur === 'CANCELLED') {
      timeline.push({ status: 'CANCELLED', label: 'Cancelled', done: true, current: true });
    }

    let eta = order.estimatedDeliveryTime;
    if (!eta && order.estimatedPreparationTime && isCreatedLike(order.status)) {
      eta = new Date(Date.now() + order.estimatedPreparationTime * 60000 + 20 * 60000);
    }

    res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        status: order.status,
        statusLabel: TIMELINE_LABELS[canonicalStatus(order.status)] || order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        deliveryFee: order.deliveryFee,
        deliveryAddress: order.deliveryAddress,
        estimatedDeliveryTime: eta,
        deliveryId: order.deliveryId,
        createdAt: order.createdAt,
        timeline,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to track order', error: error.message });
  }
};

exports.getRestaurantAnalytics = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantInfo?._id || req.query.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ success: false, message: 'No restaurant associated' });
    }
    const rid = mongoose.Types.ObjectId.isValid(restaurantId) ? new mongoose.Types.ObjectId(restaurantId) : restaurantId;
    const orders = await Order.find({ restaurantId: rid, status: 'DELIVERED' });
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const dailyRevenue = orders

      .filter((o) => new Date(o.createdAt) >= todayStart)

      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const weeklyRevenue = orders

      .filter((o) => new Date(o.createdAt) >= weekStart)

      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const itemCounts = {};
    orders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const key = item.name || String(item.itemId);
        itemCounts[key] = (itemCounts[key] || 0) + (item.quantity || 1);
      });
    });
    const popularItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
    res.status(200).json({
      dailyRevenue,
      weeklyRevenue,
      dailyOrders: orders.filter((o) => new Date(o.createdAt) >= todayStart).length,
      weeklyOrders: orders.filter((o) => new Date(o.createdAt) >= weekStart).length,
      popularItems,
      totalOrders: orders.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: Not your order' });
    }
    if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel order in ${order.status} status` });
    }
    if (!isCreatedLike(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order already confirmed by restaurant. Contact support to cancel.',
      });
    }
    const minutes = (Date.now() - new Date(order.createdAt).getTime()) / 60000;
    if (minutes > CANCEL_WINDOW_MINUTES) {
      return res.status(400).json({
        success: false,
        message: `Cancellation window expired (${CANCEL_WINDOW_MINUTES} minutes after placing the order).`,
      });
    }

    order.status = 'CANCELLED';
    order.cancelledAt = new Date();
    if (reason) order.cancelReason = reason;
    if (order.paymentStatus === 'COMPLETED') {
      order.refundRequested = true;
      order.refundReason = 'Customer cancelled order';
    }
    const updatedOrder = await order.save();

    try {
      await deliveryService.cancelDeliveryByOrderId(id);
    } catch (delErr) {
      console.warn('Delivery cancel failed:', delErr.message);
    }

    res.status(200).json({ success: true, data: updatedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel order', error: error.message });
  }
};

/** Reorder: return payload for client to add items to cart */
exports.reorder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.json({
      success: true,
      data: {
        restaurantId: order.restaurantId,
        items: order.items.map((i) => ({
          itemId: i.itemId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          size: i.size,
          servings: i.servings,
          imageUrl: i.imageUrl,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
