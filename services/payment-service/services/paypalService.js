const axios = require('axios');

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_MODE = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase();
const BASE =
  PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)');
  }
  const now = Date.now();
  if (cachedToken && now < tokenExpiry - 60000) return cachedToken;

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const { data } = await axios.post(
    `${BASE}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in || 30000) * 1000;
  return cachedToken;
}

async function createOrder({ amount, currency, orderRef, returnUrl, cancelUrl }) {
  const token = await getAccessToken();
  const value = Number(amount).toFixed(2);
  const body = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: orderRef || `feedo_${Date.now()}`,
        amount: {
          currency_code: (currency || 'LKR').toUpperCase(),
          value,
        },
      },
    ],
    application_context: {
      return_url: returnUrl,
      cancel_url: cancelUrl,
      brand_name: 'Feedo',
      user_action: 'PAY_NOW',
    },
  };

  const { data } = await axios.post(`${BASE}/v2/checkout/orders`, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const approve = (data.links || []).find((l) => l.rel === 'approve');
  return {
    paypalOrderId: data.id,
    approvalUrl: approve?.href,
    raw: data,
  };
}

async function captureOrder(paypalOrderId) {
  const token = await getAccessToken();
  const { data } = await axios.post(
    `${BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );
  return data;
}

function isConfigured() {
  return !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET);
}

module.exports = {
  createOrder,
  captureOrder,
  isConfigured,
  getAccessToken,
};
