const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Wallet = require('../models/Wallet');
const fraudService = require('../services/fraudService');
const paypalService = require('../services/paypalService');
const { notifyOrderPayment, notifyPaymentNotification } = require('../services/orderIntegration');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? require('stripe')(STRIPE_SECRET_KEY) : null;

const shouldFailPayment = () => process.env.FAIL_PAYMENTS === 'true';
const ENABLE_WALLET_TOPUP = process.env.ENABLE_WALLET_TOPUP === 'true';

function mapStatusForOrder(payment) {
  if (payment.status === 'COMPLETED') return 'COMPLETED';
  if (payment.status === 'FAILED') return 'FAILED';
  if (payment.status === 'REFUNDED' || payment.status === 'PARTIALLY_REFUNDED') return 'REFUNDED';
  return 'PENDING';
}

/** POST /api/payments/create-intent */
exports.createIntent = async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      success: false,
      message: 'Stripe not configured. Use Cash on Delivery or add STRIPE_SECRET_KEY.',
      useFallback: true,
    });
  }
  try {
    const { customerId, amount, currency, orderRef, metadata, orderId } = req.body;
    // Express lowercases headers; must read idempotency key or Stripe gets a second `{}` which stripe-node rejects
    const idempotencyKey =
      req.headers['idempotency-key'] || req.headers['Idempotency-Key'] || req.body.idempotencyKey;
    if (!customerId || amount == null || amount <= 0) {
      return res.status(400).json({ success: false, message: 'customerId and amount (positive) are required' });
    }

    const dup = await fraudService.findDuplicateTransaction(customerId, amount, orderRef);
    if (dup && dup.paymentId) {
      return res.status(409).json({
        success: false,
        duplicate: true,
        message: 'Possible duplicate transaction. Use Idempotency-Key or wait a few minutes.',
        existingPaymentId: dup.paymentId,
      });
    }

    const risk = await fraudService.computeRiskScore({
      customerId,
      amount,
      paymentMethod: 'CREDIT_CARD',
    });
    if (fraudService.shouldBlockOnRisk(risk.score)) {
      return res.status(403).json({
        success: false,
        message: 'Transaction blocked by risk policy',
        riskScore: risk.score,
        riskFactors: risk.factors,
      });
    }

    const amountCents = Math.round(Number(amount) * 100);
    // Stripe metadata values must be strings (no nested objects)
    const meta = {
      customerId: String(customerId),
      orderRef: orderRef != null ? String(orderRef) : '',
      ...(orderId ? { orderId: String(orderId) } : {}),
    };
    if (metadata && typeof metadata === 'object') {
      for (const [k, v] of Object.entries(metadata)) {
        if (v == null) continue;
        meta[k] = typeof v === 'object' && v.toString ? v.toString() : String(v);
      }
    }

    const intentParams = {
      amount: amountCents,
      currency: (currency || 'lkr').toLowerCase(),
      payment_method_types: ['card'],
      metadata: meta,
    };

    // Never pass a second `{}` — stripe-node only treats the 2nd arg as options if it has idempotencyKey, apiKey, etc.
    const paymentIntent = idempotencyKey
      ? await stripe.paymentIntents.create(intentParams, {
          idempotencyKey: String(idempotencyKey).slice(0, 255),
        })
      : await stripe.paymentIntents.create(intentParams);

    const payment = new Payment({
      customerId: String(customerId),
      orderRef,
      orderId: orderId ? String(orderId) : undefined,
      amount: Number(amount),
      currency: (currency || 'LKR').toUpperCase(),
      paymentMethod: 'CREDIT_CARD',
      paymentProvider: 'STRIPE',
      status: 'PENDING',
      paymentId: paymentIntent.id,
      gatewayTransactionId: paymentIntent.id,
      metadata: meta,
      idempotencyKey: idempotencyKey || undefined,
      riskScore: risk.score,
      riskFactors: risk.factors,
    });
    payment.addLog('CREATE_INTENT', 'Stripe PaymentIntent created', { id: paymentIntent.id });
    await payment.save();

    res.status(201).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentId: paymentIntent.id,
      riskScore: risk.score,
      riskFactors: risk.factors,
    });
  } catch (err) {
    console.error('Stripe create-intent error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create payment intent' });
  }
};

/** POST /api/payments/create — simulated card when Stripe Elements not used */
exports.createSimulated = async (req, res) => {
  try {
    const { customerId, orderRef, amount, currency, paymentMethod, metadata, orderId } = req.body;
    if (!customerId || amount == null || amount <= 0) {
      return res.status(400).json({ success: false, message: 'customerId and amount (positive) are required' });
    }
    const method = paymentMethod || 'CREDIT_CARD';
    if (!['CREDIT_CARD', 'DEBIT_CARD', 'ONLINE_PAYMENT'].includes(method)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    const risk = await fraudService.computeRiskScore({ customerId, amount, paymentMethod: method });
    const payment = new Payment({
      customerId: String(customerId),
      orderRef,
      orderId: orderId ? String(orderId) : undefined,
      amount: Number(amount),
      currency: currency || 'LKR',
      paymentMethod: method,
      paymentProvider: 'SIMULATED',
      status: 'PENDING',
      metadata,
      riskScore: risk.score,
      riskFactors: risk.factors,
    });
    payment.addLog('CREATE', 'Simulated payment initiated', {});
    await payment.save();

    if (shouldFailPayment()) {
      payment.status = 'FAILED';
      payment.gatewayResponse = { error: 'Card declined', code: 'DECLINED' };
      payment.addLog('FAIL', 'Simulated decline', {});
      await payment.save();
      await notifyPaymentNotification({
        customerId,
        orderId,
        amount: payment.amount,
        status: 'FAILED',
        message: 'Payment failed - card declined',
      });
      return res.status(200).json({
        success: false,
        paymentId: payment.paymentId,
        status: 'FAILED',
        message: 'Payment failed - card declined',
      });
    }

    payment.status = 'COMPLETED';
    payment.gatewayTransactionId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    payment.gatewayResponse = { authorization: 'approved', code: '00' };
    payment.addLog('CAPTURE', 'Simulated approval', { txn: payment.gatewayTransactionId });
    await payment.save();

    if (orderId) {
      await notifyOrderPayment({
        orderId,
        paymentId: payment.paymentId,
        status: mapStatusForOrder(payment),
      });
    }

    res.status(201).json({
      success: true,
      paymentId: payment.paymentId,
      status: payment.status,
      transactionId: payment.gatewayTransactionId,
      amount: payment.amount,
      currency: payment.currency,
      riskScore: risk.score,
    });
  } catch (err) {
    console.error('Payment create error:', err);
    res.status(500).json({ success: false, message: err.message || 'Payment processing failed' });
  }
};

/** POST /api/payments/cod — record cash-on-delivery (no online capture) */
exports.createCod = async (req, res) => {
  try {
    const { customerId, amount, currency, orderRef, orderId, metadata } = req.body;
    if (!customerId || amount == null || amount < 0) {
      return res.status(400).json({ success: false, message: 'customerId and amount required' });
    }
    const payment = new Payment({
      customerId: String(customerId),
      orderRef,
      orderId: orderId ? String(orderId) : undefined,
      amount: Number(amount),
      currency: currency || 'LKR',
      paymentMethod: 'CASH_ON_DELIVERY',
      paymentProvider: 'INTERNAL',
      status: 'PENDING',
      metadata: { ...metadata, note: 'Collect cash on delivery' },
    });
    payment.addLog('COD', 'Cash on delivery recorded', { amount });
    await payment.save();
    res.status(201).json({
      success: true,
      paymentId: payment.paymentId,
      status: payment.status,
      message: 'COD payment record created — collect on delivery',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/payments/wallet/balance */
exports.walletBalance = async (req, res) => {
  try {
    const customerId = req.query.customerId || req.body.customerId;
    if (!customerId) return res.status(400).json({ success: false, message: 'customerId required' });
    const w = await Wallet.getOrCreate(String(customerId));
    res.json({ success: true, balance: w.balance, currency: w.currency });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/payments/wallet/topup — dev / demo only */
exports.walletTopup = async (req, res) => {
  if (!ENABLE_WALLET_TOPUP) {
    return res.status(403).json({ success: false, message: 'Wallet top-up disabled (set ENABLE_WALLET_TOPUP=true)' });
  }
  try {
    const { customerId, amount } = req.body;
    if (!customerId || amount == null || amount <= 0) {
      return res.status(400).json({ success: false, message: 'customerId and positive amount required' });
    }
    const w = await Wallet.getOrCreate(String(customerId));
    w.balance = Number(w.balance) + Number(amount);
    w.version += 1;
    await w.save();
    res.json({ success: true, balance: w.balance, currency: w.currency });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/payments/wallet/pay */
exports.walletPay = async (req, res) => {
  try {
    const { customerId, amount, currency, orderRef, orderId, metadata } = req.body;
    if (!customerId || amount == null || amount <= 0) {
      return res.status(400).json({ success: false, message: 'customerId and amount required' });
    }

    const risk = await fraudService.computeRiskScore({ customerId, amount, paymentMethod: 'WALLET' });
    if (fraudService.shouldBlockOnRisk(risk.score)) {
      return res.status(403).json({ success: false, message: 'Blocked by risk policy', riskScore: risk.score });
    }

    const w = await Wallet.getOrCreate(String(customerId));
    if (Number(w.balance) < Number(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
        balance: w.balance,
        required: amount,
      });
    }

    w.balance = Number(w.balance) - Number(amount);
    w.version += 1;
    await w.save();

    const payment = new Payment({
      customerId: String(customerId),
      orderRef,
      orderId: orderId ? String(orderId) : undefined,
      amount: Number(amount),
      currency: currency || w.currency || 'LKR',
      paymentMethod: 'WALLET',
      paymentProvider: 'WALLET',
      status: 'COMPLETED',
      gatewayTransactionId: `wal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      metadata,
      riskScore: risk.score,
      riskFactors: risk.factors,
    });
    payment.addLog('WALLET_DEBIT', 'Wallet debited', { balanceAfter: w.balance });
    await payment.save();

    if (orderId) {
      await notifyOrderPayment({
        orderId,
        paymentId: payment.paymentId,
        status: 'COMPLETED',
      });
    }
    await notifyPaymentNotification({
      customerId,
      orderId,
      amount: payment.amount,
      status: 'COMPLETED',
    });

    res.status(201).json({
      success: true,
      paymentId: payment.paymentId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      remainingBalance: w.balance,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/payments/paypal/create-order */
exports.paypalCreate = async (req, res) => {
  try {
    if (!paypalService.isConfigured()) {
      return res.status(503).json({ success: false, message: 'PayPal not configured' });
    }
    const { customerId, amount, currency, orderRef, metadata, returnUrl, cancelUrl } = req.body;
    if (!customerId || amount == null || amount <= 0) {
      return res.status(400).json({ success: false, message: 'customerId and amount required' });
    }
    const base = process.env.PUBLIC_APP_URL || 'http://localhost:3000';
    const ret = returnUrl || `${base}/checkout/paypal-return`;
    const can = cancelUrl || `${base}/checkout`;

    const risk = await fraudService.computeRiskScore({ customerId, amount, paymentMethod: 'PAYPAL' });
    const po = await paypalService.createOrder({
      amount,
      currency: currency || 'LKR',
      orderRef: orderRef || `feedo_${Date.now()}`,
      returnUrl: ret,
      cancelUrl: can,
    });

    const payment = new Payment({
      customerId: String(customerId),
      orderRef,
      amount: Number(amount),
      currency: (currency || 'LKR').toUpperCase(),
      paymentMethod: 'PAYPAL',
      paymentProvider: 'PAYPAL',
      status: 'PENDING',
      paymentId: po.paypalOrderId,
      gatewayTransactionId: po.paypalOrderId,
      metadata: { ...metadata, paypalOrderId: po.paypalOrderId },
      riskScore: risk.score,
      riskFactors: risk.factors,
    });
    payment.addLog('PAYPAL_CREATE', 'PayPal order created', { paypalOrderId: po.paypalOrderId });
    await payment.save();

    res.status(201).json({
      success: true,
      approvalUrl: po.approvalUrl,
      paypalOrderId: po.paypalOrderId,
      paymentRecordId: payment.paymentId,
      riskScore: risk.score,
    });
  } catch (err) {
    console.error('PayPal create error:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: err.response?.data?.message || err.message });
  }
};

/** POST /api/payments/paypal/capture */
exports.paypalCapture = async (req, res) => {
  try {
    if (!paypalService.isConfigured()) {
      return res.status(503).json({ success: false, message: 'PayPal not configured' });
    }
    const { paypalOrderId, orderId } = req.body;
    if (!paypalOrderId) return res.status(400).json({ success: false, message: 'paypalOrderId required' });

    const cap = await paypalService.captureOrder(paypalOrderId);
    const capId = cap.purchase_units?.[0]?.payments?.captures?.[0]?.id;

    let payment = await Payment.findOne({ paymentId: paypalOrderId });
    if (!payment) {
      payment = await Payment.findOne({ gatewayTransactionId: paypalOrderId });
    }
    if (payment) {
      payment.status = 'COMPLETED';
      payment.gatewayResponse = cap;
      if (capId) payment.gatewayTransactionId = capId;
      payment.addLog('PAYPAL_CAPTURE', 'Captured', { captureId: capId });
      if (orderId) payment.orderId = String(orderId);
      await payment.save();
      if (orderId) {
        await notifyOrderPayment({
          orderId,
          paymentId: payment.paymentId,
          status: 'COMPLETED',
        });
      }
      if (payment) {
        await notifyPaymentNotification({
          customerId: payment.customerId,
          orderId,
          amount: payment.amount,
          status: 'COMPLETED',
        });
      }
    }

    res.json({
      success: true,
      status: 'COMPLETED',
      paypalOrderId,
      captureId: capId,
      raw: cap,
    });
  } catch (err) {
    console.error('PayPal capture error:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: err.response?.data?.message || err.message });
  }
};

/** POST /api/payments/:id/refund */
exports.refund = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason, orderId } = req.body;
    const or = [{ paymentId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) or.push({ _id: id });
    const payment = await Payment.findOne({ $or: or });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (!['COMPLETED', 'PARTIALLY_REFUNDED'].includes(payment.status)) {
      return res.status(400).json({ success: false, message: 'Payment not refundable in current status' });
    }

    const refundable = payment.amountRefundable();
    const refundAmt = amount != null ? Math.min(Number(amount), refundable) : refundable;
    if (refundAmt <= 0) return res.status(400).json({ success: false, message: 'Nothing to refund' });

    let providerRefundId;

    if (payment.paymentProvider === 'STRIPE' && stripe && payment.paymentId?.startsWith('pi_')) {
      const cents = Math.round(refundAmt * 100);
      const refParams = {
        payment_intent: payment.paymentId,
        reason: 'requested_by_customer',
        metadata: { reason: reason || '' },
      };
      if (refundAmt < Number(payment.amount) - 0.01) refParams.amount = cents;
      const ref = await stripe.refunds.create(refParams);
      providerRefundId = ref.id;
    } else if (payment.paymentProvider === 'WALLET') {
      const w = await Wallet.getOrCreate(payment.customerId);
      w.balance = Number(w.balance) + refundAmt;
      await w.save();
      providerRefundId = `wal_ref_${Date.now()}`;
    } else if (payment.paymentProvider === 'PAYPAL' && paypalService.isConfigured()) {
      // PayPal refund requires capture id — stored in gatewayTransactionId after capture
      const axios = require('axios');
      const captureId = payment.gatewayTransactionId;
      if (!captureId || captureId.startsWith('wal_')) {
        return res.status(400).json({ success: false, message: 'PayPal capture id missing for refund' });
      }
      const token = await paypalService.getAccessToken();
      const mode = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase();
      const base = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
      const { data } = await axios.post(
        `${base}/v2/payments/captures/${captureId}/refund`,
        { amount: { currency_code: payment.currency || 'LKR', value: refundAmt.toFixed(2) } },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      );
      providerRefundId = data.id;
    } else {
      providerRefundId = `int_ref_${Date.now()}`;
    }

    payment.refundedTotal = Number(payment.refundedTotal || 0) + refundAmt;
    payment.refunds.push({
      amount: refundAmt,
      reason,
      status: 'COMPLETED',
      providerRefundId,
    });
    payment.status =
      payment.refundedTotal >= Number(payment.amount) - 0.01 ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    payment.addLog('REFUND', `Refunded ${refundAmt}`, { providerRefundId });
    await payment.save();

    if (orderId) {
      await notifyOrderPayment({
        orderId,
        paymentId: payment.paymentId,
        status: 'REFUNDED',
      });
    }

    res.json({
      success: true,
      paymentId: payment.paymentId,
      refundedAmount: refundAmt,
      status: payment.status,
      remainingRefundable: payment.amountRefundable(),
    });
  } catch (err) {
    console.error('Refund error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/payments/:id */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    let doc = await Payment.findOne({ paymentId: id });
    if (!doc && mongoose.Types.ObjectId.isValid(id)) doc = await Payment.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({
      success: true,
      paymentId: doc.paymentId,
      status: doc.status,
      statusLabel: statusLabel(doc.status),
      amount: doc.amount,
      currency: doc.currency,
      createdAt: doc.createdAt,
      paymentMethod: doc.paymentMethod,
      paymentProvider: doc.paymentProvider,
      riskScore: doc.riskScore,
      refundedTotal: doc.refundedTotal,
      transactionLogs: doc.transactionLogs?.slice(-20),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

function statusLabel(s) {
  const m = {
    PENDING: 'Pending',
    COMPLETED: 'Success',
    FAILED: 'Failed',
    REFUNDED: 'Refunded',
    PARTIALLY_REFUNDED: 'Partially refunded',
  };
  return m[s] || s;
}

/** POST /api/payments/verify */
exports.verify = async (req, res) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) return res.status(400).json({ success: false, message: 'paymentId is required' });
    const payment = await Payment.findOne({ paymentId });
    if (!payment) return res.status(404).json({ success: false, valid: false, message: 'Payment not found' });
    const valid = payment.status === 'COMPLETED';
    res.json({
      success: true,
      valid,
      status: payment.status,
      statusLabel: statusLabel(payment.status),
      amount: payment.amount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/payments/history/me */
exports.history = async (req, res) => {
  try {
    const customerId = req.query.customerId;
    if (!customerId) return res.status(400).json({ success: false, message: 'customerId query required' });
    const list = await Payment.find({ customerId: String(customerId) })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({
      success: true,
      data: list.map((p) => ({
        paymentId: p.paymentId,
        status: p.status,
        statusLabel: statusLabel(p.status),
        amount: p.amount,
        currency: p.currency,
        paymentMethod: p.paymentMethod,
        paymentProvider: p.paymentProvider,
        createdAt: p.createdAt,
        orderRef: p.orderRef,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/payments/receipt/:paymentId */
exports.receipt = async (req, res) => {
  try {
    const doc = await Payment.findOne({ paymentId: req.params.paymentId });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    const receipt = {
      receiptNo: doc.paymentId,
      date: doc.createdAt,
      customerId: doc.customerId,
      amount: doc.amount,
      currency: doc.currency,
      status: doc.status,
      paymentMethod: doc.paymentMethod,
      provider: doc.paymentProvider,
      orderRef: doc.orderRef,
      lines: doc.transactionLogs || [],
    };
    if (req.query.format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      return res.send(receiptHtml(receipt));
    }
    res.json({ success: true, receipt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

function receiptHtml(r) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${r.receiptNo}</title>
  <style>body{font-family:system-ui,sans-serif;max-width:480px;margin:40px auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px}
  h1{font-size:1.25rem} .muted{color:#6b7280;font-size:12px}</style></head><body>
  <h1>Payment receipt</h1>
  <p class="muted">Feedo · ${new Date(r.date).toISOString()}</p>
  <p><strong>Receipt #</strong> ${r.receiptNo}</p>
  <p><strong>Amount</strong> ${r.currency} ${Number(r.amount).toFixed(2)}</p>
  <p><strong>Status</strong> ${r.status}</p>
  <p><strong>Method</strong> ${r.paymentMethod} (${r.provider})</p>
  ${r.orderRef ? `<p><strong>Order ref</strong> ${r.orderRef}</p>` : ''}
  </body></html>`;
}
