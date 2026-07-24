const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}
const db = admin.firestore();

async function pushToAll(title, body, excludeUid) {
  const snap = await db.collection('users').get();
  const tokens = [];
  snap.forEach(d => {
    if (excludeUid && d.id === excludeUid) return;
    const t = d.data().fcmToken;
    if (t) tokens.push(t);
  });
  if (!tokens.length) return { success: 0, fail: 0, note: 'kayitli token yok' };
  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
  });
  return { success: res.successCount, fail: res.failureCount };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'POST') {
      let p = {};
      try { p = JSON.parse(event.body || '{}'); } catch (_) {}
      const title = p.title || 'Bizİki';
      const body = p.body || '';
      if (!body) return { statusCode: 200, body: JSON.stringify({ ok: true, note: 'bos body' }) };
      const r = await pushToAll(title, body, p.excludeUid || null);
      return { statusCode: 200, body: JSON.stringify({ ok: true, ...r }) };
    }
    const r = await pushToAll('Bizİki', 'Kapaliyken bildirim testi calisti!', null);
    return { statusCode: 200, body: JSON.stringify({ ok: true, ...r }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String((e && e.message) || e) }) };
  }
};
