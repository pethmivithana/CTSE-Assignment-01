const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    reason: { type: String },
    status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
    providerRefundId: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const logSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    action: { type: String, required: true },
    message: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false },
);

const paymentSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, index: true },
    orderRef: { type: String, index: true },
    orderId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'LKR' },
    /** How the customer paid */
    paymentMethod: {
      type: String,
      enum: [
        'CREDIT_CARD',
        'DEBIT_CARD',
        'ONLINE_PAYMENT',
        'CASH_ON_DELIVERY',
        'PAYPAL',
        'WALLET',
      ],
      required: true,
    },
    /** Acquirer / rail */
    paymentProvider: {
      type: String,
      enum: ['STRIPE', 'PAYPAL', 'WALLET', 'INTERNAL', 'SIMULATED'],
      default: 'INTERNAL',
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
      default: 'PENDING',
    },
    paymentId: { type: String, unique: true, sparse: true },
    gatewayTransactionId: { type: String },
    gatewayResponse: { type: mongoose.Schema.Types.Mixed },
    metadata: { type: mongoose.Schema.Types.Mixed },
    /** Stripe idempotency / client dedupe */
    idempotencyKey: { type: String, index: true },
    /** Fraud & risk */
    riskScore: { type: Number, min: 0, max: 100, default: 0 },
    riskFactors: [{ type: String }],
    duplicateDetected: { type: Boolean, default: false },
    /** Amount already refunded (partial refunds) */
    refundedTotal: { type: Number, default: 0 },
    refunds: [refundSchema],
    transactionLogs: [logSchema],
  },
  { timestamps: true },
);

paymentSchema.pre('save', function (next) {
  if (!this.paymentId) {
    this.paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
  next();
});

paymentSchema.methods.addLog = function (action, message, meta) {
  this.transactionLogs.push({ action, message, meta, at: new Date() });
};

paymentSchema.methods.amountRefundable = function () {
  const cap = Number(this.amount) || 0;
  const done = Number(this.refundedTotal) || 0;
  return Math.max(0, cap - done);
};

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
