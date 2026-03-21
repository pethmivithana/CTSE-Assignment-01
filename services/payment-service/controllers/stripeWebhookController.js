const Payment = require('../models/Payment');
const { notifyOrderPayment, notifyPaymentNotification } = require('../services/orderIntegration');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

exports.handleStripeWebhook = async (req, res) => {
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ success: false, message: 'Stripe webhook not configured' });
  }
  const stripe = require('stripe')(STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const payment = await Payment.findOne({ paymentId: pi.id });
      if (payment) {
        payment.status = 'COMPLETED';
        payment.gatewayTransactionId = pi.id;
        payment.gatewayResponse = { stripe: pi.id, event: event.type };
        payment.addLog('WEBHOOK', 'payment_intent.succeeded', { paymentIntentId: pi.id });
        await payment.save();
        const oid = payment.metadata?.orderId || payment.orderId;
        if (oid) await notifyOrderPayment({ orderId: oid, paymentId: payment.paymentId, status: 'COMPLETED' });
        await notifyPaymentNotification({
          customerId: payment.customerId,
          orderId: oid,
          amount: payment.amount,
          status: 'COMPLETED',
        });
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object;
      const payment = await Payment.findOne({ paymentId: pi.id });
      if (payment) {
        payment.status = 'FAILED';
        payment.gatewayResponse = { stripe: pi.id, error: pi.last_payment_error };
        payment.addLog('WEBHOOK', 'payment_intent.payment_failed', { err: pi.last_payment_error?.message });
        await payment.save();
        await notifyPaymentNotification({
          customerId: payment.customerId,
          orderId: payment.metadata?.orderId || payment.orderId,
          amount: payment.amount,
          status: 'FAILED',
          message: pi.last_payment_error?.message || 'Payment failed',
        });
      }
    } else if (event.type === 'charge.refunded') {
      const ch = event.data.object;
      const piId = ch.payment_intent;
      if (piId) {
        const payment = await Payment.findOne({ paymentId: piId });
        if (payment) {
          const refunded = (ch.amount_refunded || 0) / 100;
          if (payment.currency && ['JPY', 'KRW'].includes(payment.currency.toUpperCase())) {
            // zero-decimal — keep amount as-is if needed; LKR uses cents in Stripe
          }
          const totalRefunded = Math.min(
            Number(payment.amount),
            Number(payment.refundedTotal || 0) + refunded,
          );
          payment.refundedTotal = totalRefunded;
          payment.status =
            totalRefunded >= Number(payment.amount) - 0.01 ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
          payment.addLog('WEBHOOK', 'charge.refunded', { amount: refunded });
          await payment.save();
        }
      }
    }
  } catch (e) {
    console.error('Stripe webhook handler error:', e);
    return res.status(500).json({ received: false, error: e.message });
  }

  res.json({ received: true });
};
