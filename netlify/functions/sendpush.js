const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}
const db = admin.firestore();

const HUNGER_MSGS = ['Karnim gurulduyor, bir seyler verir misin?', 'Aciktim biraz, mama zamani', 'Midem kaziniyor, besler misin?'];
const HAPPY_MSGS  = ['Biraz oynasak mi, sikildim', 'Canim sikiliyor, ilgilenir misin?', 'Mutlu degilim biraz, oynat beni'];
const ENERGY_MSGS = ['Gozlerim kapaniyor, uyutur musun?', 'Cok yoruldum, kestireyim mi?', 'Uykum geldi, yatirir misin?'];
const CLEAN_MSGS  = ['Beni artik yikar misin, kirlendim', 'Ustum basim batti, banyo zamani', 'Kirlendim galiba, yikar misin?'];

function decay(pet) {
  const t = pet.lastTick; let ms = Date.now();
  if (t) { if (t.toMillis) ms = t.toMillis(); else if (typeof t === 'number') ms = t; else if (t.seconds != null) ms = t.seconds * 1000; }
  const hours = Math.max(0, (Date.now() - ms) / 3600000);
  const cl = v => Math.max(0, Math.min(100, v));
  return {
    hunger: cl((pet.hunger ?? 80) - hours * 8),
    happy:  cl((pet.happy  ?? 80) - hours * 7.2),
    energy: cl((pet.energy ?? 80) - hours * 5.6),
    clean:  cl((pet.clean  ?? 80) - hours * 6),
  };
}
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

async function pushToTokens(tokens, title, body) {
  if (!tokens.length) return 0;
  const res = await admin.messaging().sendEachForMulticast({ tokens, notification: { title, body } });
  return res.successCount;
}
async function pushToAll(title, body, excludeUid) {
  const snap = await db.collection('users').get();
  const tokens = [];
  snap.forEach(d => { if (excludeUid && d.id === excludeUid) return; const t = d.data().fcmToken; if (t) tokens.push(t); });
  return pushToTokens(tokens, title, body);
}
async function pushToCouple(code, title, body) {
  const info = await db.collection('couples').doc(code).collection('meta').doc('info').get();
  if (!info.exists) return 0;
  const s = info.data();
  const uids = [s.uid1, s.uid2].filter(Boolean);
  const tokens = [];
  for (const uid of uids) {
    const u = await db.collection('users').doc(uid).get();
    if (u.exists && u.data().fcmToken) tokens.push(u.data().fcmToken);
  }
  return pushToTokens(tokens, title, body);
}

async function scanPets(force) {
  const couples = await db.collection('couples').get();
  let scanned = 0, sent = 0;
  const TH = force ? 101 : 50;
  for (const c of couples.docs) {
    const code = c.id;
    const petRef = db.collection('couples').doc(code).collection('meta').doc('pet');
    let petSnap; try { petSnap = await petRef.get(); } catch (_) { continue; }
    if (!petSnap.exists) continue;
    scanned++;
    const pet = petSnap.data();
    const cc = decay(pet);
    const flags = pet.notifFlags || {};
    const checks = [
      { key: 'hunger', val: cc.hunger, msgs: HUNGER_MSGS },
      { key: 'happy',  val: cc.happy,  msgs: HAPPY_MSGS },
      { key: 'energy', val: cc.energy, msgs: ENERGY_MSGS },
      { key: 'clean',  val: cc.clean,  msgs: CLEAN_MSGS },
    ];
    const newFlags = { ...flags };
    let chosen = null;
    for (const ck of checks) {
      if (ck.val >= TH) { if (newFlags[ck.key]) newFlags[ck.key] = false; }
      else if (!newFlags[ck.key]) { if (!chosen || ck.val < chosen.val) chosen = ck; }
    }
    if (chosen) {
      if (!force) newFlags[chosen.key] = true;
      const body = pick(chosen.msgs);
      const title = pet.name || 'Pet';
      try { sent += await pushToCouple(code, title, body); } catch (e) {}
    }
    if (!force && JSON.stringify(newFlags) !== JSON.stringify(flags)) {
      try { await petRef.update({ notifFlags: newFlags }); } catch (e) {}
    }
  }
  return { scanned, sent };
}

exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    if (event.httpMethod === 'POST') {
      let p = {}; try { p = JSON.parse(event.body || '{}'); } catch (_) {}
      const title = p.title || 'BizIki';
      const body = p.body || '';
      if (!body) return { statusCode: 200, body: JSON.stringify({ ok: true, note: 'bos body' }) };
      const success = await pushToAll(title, body, p.excludeUid || null);
      return { statusCode: 200, body: JSON.stringify({ ok: true, success }) };
    }
    if (q.test === '1') {
      const success = await pushToAll('BizIki', 'Kapaliyken bildirim testi calisti!', null);
      return { statusCode: 200, body: JSON.stringify({ ok: true, success }) };
    }
    const r = await scanPets(q.force === '1');
    return { statusCode: 200, body: JSON.stringify({ ok: true, mode: 'petscan', ...r }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String((e && e.message) || e) }) };
  }
};
