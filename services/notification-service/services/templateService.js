const APP_URL = process.env.APP_URL || 'http://localhost:3000';

function layout(inner) {
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#E31837 0%,#c41430 100%);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;">Feedo</h1>
    </div>
    <div style="background:#fff;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
      ${inner}
      <p style="color:#9ca3af;font-size:13px;margin:24px 0 0;">You can manage notification preferences in your Feedo account settings.</p>
    </div>
  </div>`;
}

const templates = {
  ORDER_PLACED_CUSTOMER: (vars) =>
    layout(`
    <p style="color:#374151;font-size:16px;">Hi <strong>${vars.name || 'there'}</strong>,</p>
    <p style="color:#4b5563;">Your order was placed successfully.</p>
    <p><strong>Order:</strong> ${vars.orderId}</p>
    ${vars.totalAmount != null ? `<p><strong>Total:</strong> LKR ${Number(vars.totalAmount).toFixed(2)}</p>` : ''}
    <a href="${APP_URL}/orders" style="display:inline-block;padding:12px 24px;background:#E31837;color:white;text-decoration:none;font-weight:600;border-radius:8px;">View orders</a>
  `),

  ORDER_PLACED_RESTAURANT: (vars) =>
    layout(`
    <p style="color:#374151;font-size:16px;">New order received!</p>
    <p><strong>Order ID:</strong> ${vars.orderId}</p>
    ${vars.totalAmount != null ? `<p><strong>Total:</strong> LKR ${Number(vars.totalAmount).toFixed(2)}</p>` : ''}
    <a href="${APP_URL}/restaurant/dashboard" style="display:inline-block;padding:12px 24px;background:#E31837;color:white;text-decoration:none;font-weight:600;border-radius:8px;">Open dashboard</a>
  `),

  ORDER_ACCEPTED: (vars) =>
    layout(`
    <p style="color:#374151;">Hi <strong>${vars.name || 'there'}</strong>,</p>
    <p style="color:#4b5563;">The restaurant accepted your order. We're preparing your food.</p>
    <p><strong>Order:</strong> ${vars.orderId}</p>
    ${vars.totalAmount != null ? `<p><strong>Total:</strong> LKR ${Number(vars.totalAmount).toFixed(2)}</p>` : ''}
    <a href="${APP_URL}/orders" style="display:inline-block;padding:12px 24px;background:#E31837;color:white;text-decoration:none;font-weight:600;border-radius:8px;">View order</a>
  `),

  ORDER_STATUS: (vars) =>
    layout(`
    <p style="color:#374151;">Order update</p>
    <p><strong>Order:</strong> ${vars.orderId}</p>
    <p><strong>Status:</strong> ${vars.status}</p>
    <a href="${APP_URL}/orders/track/${vars.orderId}" style="display:inline-block;padding:12px 24px;background:#E31837;color:white;text-decoration:none;font-weight:600;border-radius:8px;">Track order</a>
  `),

  ORDER_DELIVERED: (vars) =>
    layout(`
    <p style="color:#374151;">Your order has been delivered. Enjoy your meal!</p>
    <p><strong>Order:</strong> ${vars.orderId}</p>
    <a href="${APP_URL}/orders" style="display:inline-block;padding:12px 24px;background:#E31837;color:white;text-decoration:none;font-weight:600;border-radius:8px;">View orders</a>
  `),

  PAYMENT_SUCCESS: (vars) =>
    layout(`
    <p style="color:#374151;">Payment received</p>
    <p><strong>Amount:</strong> LKR ${Number(vars.amount || 0).toFixed(2)}</p>
    ${vars.orderId ? `<p><strong>Order:</strong> ${vars.orderId}</p>` : ''}
    <p style="color:#059669;font-weight:600;">Status: ${vars.status || 'COMPLETED'}</p>
  `),

  PAYMENT_FAILED: (vars) =>
    layout(`
    <p style="color:#374151;">Payment could not be completed</p>
    <p>${vars.message || 'Please try another payment method or contact support.'}</p>
    ${vars.orderId ? `<p><strong>Order:</strong> ${vars.orderId}</p>` : ''}
    <a href="${APP_URL}/profile/payments" style="display:inline-block;padding:12px 24px;background:#E31837;color:white;text-decoration:none;font-weight:600;border-radius:8px;">Payment history</a>
  `),

  DELIVERY_ARRIVAL: (vars) =>
    layout(`
    <p style="color:#374151;">${vars.title || 'Delivery update'}</p>
    <p style="color:#4b5563;white-space:pre-wrap;">${vars.message || ''}</p>
  `),
};

exports.renderEmail = (name, vars = {}) => {
  const fn = templates[name];
  if (!fn) return layout(`<p>${vars.title || 'Notification'}</p><pre style="font-size:12px;">${JSON.stringify(vars, null, 2)}</pre>`);
  return fn(vars);
};

exports.templateNames = Object.keys(templates);
