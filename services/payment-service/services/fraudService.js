const Payment = require('../models/Payment');

const DUPLICATE_WINDOW_MS = Number(process.env.PAYMENT_DUPLICATE_WINDOW_MS || 5 * 60 * 1000);
const VELOCITY_WINDOW_MS = Number(process.env.PAYMENT_VELOCITY_WINDOW_MS || 60 * 60 * 1000);
const HIGH_AMOUNT_LKR = Number(process.env.PAYMENT_HIGH_AMOUNT_LKR || 50000);

function isCosmosOrderByIndexError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('index path corresponding to the specified order-by item is excluded');
}

/**
 * Duplicate: same customer + same amount + same orderRef (or empty) within window, non-failed.
 */
async function findDuplicateTransaction(customerId, amount, orderRef) {
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
  const q = {
    customerId: String(customerId),
    amount: Number(amount),
    createdAt: { $gte: since },
    status: { $in: ['PENDING', 'COMPLETED', 'PARTIALLY_REFUNDED'] },
  };
  if (orderRef) q.orderRef = String(orderRef);
  // Cosmos Mongo can reject ORDER BY when the sort field is excluded from indexing.
  // Duplicate check only needs existence within the recent window, so avoid sort().
  try {
    return await Payment.findOne(q);
  } catch (err) {
    // Keep checkout flow available on Cosmos indexing edge-cases.
    if (isCosmosOrderByIndexError(err)) return null;
    throw err;
  }
}

/**
 * Risk score 0–100 (higher = riskier). Returns { score, factors }.
 */
async function computeRiskScore({ customerId, amount, paymentMethod }) {
  const factors = [];
  let score = 5;

  if (Number(amount) >= HIGH_AMOUNT_LKR) {
    score += 25;
    factors.push('HIGH_AMOUNT');
  }
  if (Number(amount) > HIGH_AMOUNT_LKR * 3) {
    score += 15;
    factors.push('VERY_HIGH_AMOUNT');
  }

  const since = new Date(Date.now() - VELOCITY_WINDOW_MS);
  let recentCount = 0;
  try {
    recentCount = await Payment.countDocuments({
      customerId: String(customerId),
      createdAt: { $gte: since },
      status: { $in: ['COMPLETED', 'PENDING'] },
    });
  } catch (err) {
    if (!isCosmosOrderByIndexError(err)) throw err;
  }
  if (recentCount >= 8) {
    score += 30;
    factors.push('HIGH_VELOCITY');
  } else if (recentCount >= 4) {
    score += 15;
    factors.push('ELEVATED_VELOCITY');
  }

  if (paymentMethod === 'WALLET') {
    score += 5;
    factors.push('WALLET');
  }

  score = Math.min(100, score);
  return { score, factors };
}

function shouldBlockOnRisk(score) {
  const threshold = Number(process.env.PAYMENT_RISK_BLOCK_THRESHOLD || 95);
  return score >= threshold;
}

module.exports = {
  findDuplicateTransaction,
  computeRiskScore,
  shouldBlockOnRisk,
  DUPLICATE_WINDOW_MS,
};
