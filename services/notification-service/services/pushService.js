let admin = null;

function getAdmin() {
  if (admin !== null && admin !== false) return admin;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    admin = false;
    return null;
  }
  try {
    const firebaseAdmin = require('firebase-admin');
    const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (!firebaseAdmin.apps.length) {
      firebaseAdmin.initializeApp({ credential: firebaseAdmin.credential.cert(cred) });
    }
    admin = firebaseAdmin;
    return admin;
  } catch (e) {
    console.warn('[push] Firebase not available:', e.message);
    admin = false;
    return null;
  }
}

exports.sendToToken = async (token, title, body, data = {}) => {
  const fa = getAdmin();
  if (!fa || !token) {
    console.log(`[push] (stub) ${title} — ${String(body).slice(0, 80)}`);
    return { sent: false, stub: true };
  }
  try {
    await fa.messaging().send({
      token,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v ?? '')])),
    });
    return { sent: true };
  } catch (e) {
    console.warn('[push] FCM error:', e.message);
    return { sent: false, error: e.message };
  }
};
