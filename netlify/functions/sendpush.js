const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}
const db = admin.firestore();

exports.handler = async (event) => {
  try {
    const snap = await db.collection('users').get();
    const tokens = [];
    snap.forEach(d => { const t = d.data().fcmToken; if (t) tokens.push(t); });
    if (!tokens.length) return { statusCode: 200, body: JSON.stringify({ ok: true, success: 0, fail: 0, note: 'kayitli token yok' }) };
    const payload = {
      notification: { title: 'Bizİki', body: 'Kapaliyken bildirim testi calisti!' },
    };
    const res = await admin.messaging().sendEachForMulticast({ tokens, ...payload });
    return { statusCode: 200, body: JSON.stringify({ ok: true, success: res.successCount, fail: res.failureCount }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String((e && e.message) || e) }) };
  }
};
