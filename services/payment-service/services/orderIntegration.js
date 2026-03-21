const axios = require('axios');
const mongoose = require('mongoose');

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3004';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';

/**
 * Notify order-service that payment status changed (optional; order may not exist yet for Stripe redirect flow).
 */
async function notifyOrderPayment({ orderId, paymentId, status }) {
    if (!orderId || !mongoose.Types.ObjectId.isValid(String(orderId))) return;
    try {
        await axios.post(
            `${ORDER_SERVICE_URL}/api/orders/payment/webhook`,
            { orderId, paymentId, status },
            {
                timeout: 5000,
                headers: { 'Content-Type': 'application/json' },
                validateStatus: () => true,
            },
        );
    } catch (e) {
        console.warn('[payment] order notify failed:', e.message);
    }
}

/** Customer-facing payment success/failure (email + in-app) */
async function notifyPaymentNotification({ customerId, orderId, amount, status, message }) {
    if (!customerId) return;
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (process.env.INTERNAL_API_KEY) headers['x-internal-key'] = process.env.INTERNAL_API_KEY;
        await axios.post(
            `${NOTIFICATION_SERVICE_URL}/api/notifications/payment-result`,
            { customerId: String(customerId), orderId: orderId ? String(orderId) : undefined, amount, status, message },
            { timeout: 5000, headers },
        );
    } catch (e) {
        console.warn('[payment] notification service:', e.message);
    }
}

module.exports = { notifyOrderPayment, notifyPaymentNotification };
