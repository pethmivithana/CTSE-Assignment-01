const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const PushDevice = require('../models/PushDevice');
const { getUserEmail } = require('./userClient');
const { getManagerId } = require('./restaurantClient');
const { enqueueEmail } = require('./queueService');
const { sendToToken } = require('./pushService');
const { renderEmail } = require('./templateService');

async function getPrefs(userId) {
  let p = await NotificationPreference.findOne({ userId: String(userId) });
  if (!p) {
    p = await NotificationPreference.create({ userId: String(userId) });
  }
  return p;
}

function inferBody(title, data) {
  if (data?.message) return String(data.message);
  if (data?.orderId) return `${title} — Order ${data.orderId}`;
  return title;
}

async function resolveInboxUserId({ recipientType, recipientId, recipientUserId }) {
  if (recipientUserId) return String(recipientUserId);
  if (recipientType === 'customer') return String(recipientId);
  if (recipientType === 'driver') {
    console.warn('[dispatch] driver notification without recipientUserId — inbox may be wrong');
    return String(recipientId);
  }
  if (recipientType === 'restaurant') {
    const managerId = await getManagerId(recipientId);
    return managerId;
  }
  return String(recipientId);
}

function allowEmailForType(prefs, type) {
  if (!prefs.email) return false;
  if (type?.startsWith('PAYMENT')) return prefs.paymentAlerts !== false;
  if (type?.includes('DELIVERY') || type?.includes('RIDER') || type?.includes('ORDER')) return prefs.orderUpdates !== false;
  if (type === 'MARKETING' || type?.includes('PROMO')) return prefs.marketing === true;
  return prefs.orderUpdates !== false;
}

/**
 * Main entry: persist in-app, queue email, send push per preferences.
 */
exports.dispatch = async ({
  recipientType,
  recipientId,
  recipientUserId,
  type,
  title,
  data = {},
  emailTemplate,
  emailSubject,
  skipEmail,
  skipPush,
  skipInApp,
}) => {
  const inboxUserId = await resolveInboxUserId({ recipientType, recipientId, recipientUserId });
  if (!inboxUserId) {
    console.warn('[dispatch] could not resolve user for notification', { recipientType, recipientId });
    return { ok: false, reason: 'no_inbox_user' };
  }

  const prefs = await getPrefs(inboxUserId);
  const body = inferBody(title, data);

  let doc = null;
  if (!skipInApp) {
    doc = await Notification.create({
      userId: inboxUserId,
      type: type || 'GENERIC',
      title,
      body,
      data,
    });
  }

  const templateKey = emailTemplate || type;
  const wantsEmail = allowEmailForType(prefs, type) && !skipEmail;

  if (wantsEmail) {
    const email = data?.recipientEmail || (await getUserEmail(inboxUserId));
    if (email) {
      const subject = emailSubject || title;
      const html =
        data?.emailHtml ||
        renderEmail(templateKey, {
          ...data,
          title,
          name: data?.customerName || data?.name,
          orderId: data?.orderId,
        });
      enqueueEmail({ to: email, subject, html });
      if (doc) {
        doc.channels.emailSent = true;
        await doc.save();
      }
    }
  }

  if (!skipPush && prefs.push !== false) {
    const devices = await PushDevice.find({ userId: inboxUserId });
    for (const d of devices) {
      await sendToToken(d.token, title, body, { type: type || 'GENERIC', orderId: data?.orderId ? String(data.orderId) : '' });
    }
    if (doc && devices.length) {
      doc.channels.pushSent = true;
      await doc.save();
    }
  }

  return { ok: true, notificationId: doc?._id };
};
