import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import * as admin from 'firebase-admin';
import * as functionsV1 from 'firebase-functions/v1';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { lastActivityMillis } from './newsletterActivity';

const digest = (s: string) => createHash('sha256').update(s).digest('hex');
async function resend(path: string, method = 'GET', body?: unknown, key?: string) {
  const response = await fetch(`https://api.resend.com${path}`, { method, signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) throw new Error(`Resend ${response.status}`);
  return response.json();
}

export const setNewsletterPreference = onCall({ cors: true }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const enabled = request.data?.enabled;
  if (typeof enabled !== 'boolean') throw new HttpsError('invalid-argument', 'Boolean required.');
  const user = await admin.auth().getUser(request.auth.uid);
  if (!user.email || (enabled && !user.emailVerified)) throw new HttpsError('failed-precondition', 'Verify your email before subscribing.');
  const ref = admin.firestore().doc(`newsletterSubscribers/${user.uid}`);
  await admin.firestore().runTransaction(async tx => {
    const existing = (await tx.get(ref)).data();
    tx.set(ref, { uid: user.uid, email: user.email, enabled,
      unsubscribeToken: existing?.unsubscribeToken ?? randomBytes(32).toString('hex'),
      consentVersion: '2026-10-19', consentSource: 'settings',
      consentAt: admin.firestore.FieldValue.serverTimestamp(),
      revision: (existing?.revision ?? 0) + 1,
    }, { merge: true });
    tx.set(admin.firestore().doc(`users/${user.uid}`), { emailEnabled: enabled }, { merge: true });
  });
  return { ok: true };
});

export const getNewsletterPreference = onCall({ cors: true, secrets: ['RESEND_API_KEY'] }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const ref = admin.firestore().doc(`newsletterSubscribers/${request.auth.uid}`);
  const data = (await ref.get()).data();
  if (!data?.enabled) return { enabled: false };
  try {
    const contact = await resend(`/contacts/${encodeURIComponent(data.email)}`);
    if (contact.unsubscribed === true) {
      await ref.update({ enabled: false });
      await admin.firestore().doc(`users/${request.auth.uid}`).update({ emailEnabled: false });
      return { enabled: false };
    }
  } catch (error: any) {
    if (error.message !== 'Resend 404') throw new HttpsError('unavailable', 'Could not load email preference.');
  }
  return { enabled: true };
});

// Re-read current preference to avoid old Firestore events re-subscribing users.
export const syncNewsletterContact = onDocumentWritten({ document: 'newsletterSubscribers/{uid}', secrets: ['RESEND_API_KEY'], retry: true, maxInstances: 1, concurrency: 1 }, async event => {
  const current = (await event.data?.after.ref.get())?.data();
  const previous = event.data?.before.data();
  const data = current ?? previous;
  if (!data?.email) return;
  const path = `/contacts/${encodeURIComponent(data.email)}`;
  let contact;
  try {
    contact = await resend(path, 'PATCH', { unsubscribed: !current?.enabled });
  } catch (error: any) {
    if (error.message !== 'Resend 404') throw error;
    if (!current?.enabled) return;
    contact = await resend('/contacts', 'POST', { email: data.email, unsubscribed: false });
  }
  const segment = process.env.RESEND_NEWSLETTER_SEGMENT_ID;
  if (current?.enabled && segment) {
    await resend(`/contacts/${encodeURIComponent(contact.id)}/segments/${encodeURIComponent(segment)}`, 'POST');
  }
});

export const newsletterUnsubscribe = onRequest(async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) { res.status(405).send('Method not allowed'); return; }
  const uid = typeof req.query.uid === 'string' ? req.query.uid : '';
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid) || !/^[a-f0-9]{64}$/.test(token)) { res.status(400).send('Invalid link'); return; }
  const ref = admin.firestore().doc(`newsletterSubscribers/${uid}`);
  const data = (await ref.get()).data();
  if (!data || typeof data.unsubscribeToken !== 'string' || !timingSafeEqual(Buffer.from(digest(token)), Buffer.from(digest(data.unsubscribeToken)))) {
    res.status(400).send('Invalid link'); return;
  }
  res.set('Cache-Control', 'no-store').set('Referrer-Policy', 'no-referrer').set('Content-Security-Policy', "default-src 'none'; form-action 'self'; style-src 'unsafe-inline'");
  if (req.method === 'GET') {
    // Link scanners must not silently unsubscribe a subscriber.
    res.status(200).send('<!doctype html><meta name="viewport" content="width=device-width"><title>AthleTrack AI</title><main style="font-family:system-ui;padding:32px"><h1>AthleTrack AI</h1><p>E-posta aboneliğinden çık / Unsubscribe from emails</p><form method="post"><button type="submit" style="padding:16px">Abonelikten çık / Unsubscribe</button></form></main>');
    return;
  }
  await admin.firestore().runTransaction(async tx => {
    const userRef = admin.firestore().doc(`users/${uid}`);
    const user = await tx.get(userRef);
    tx.update(ref, { enabled: false, unsubscribedAt: admin.firestore.FieldValue.serverTimestamp() });
    if (user.exists) tx.update(userRef, { emailEnabled: false });
  });
  res.status(200).send('E-posta aboneliğiniz kapatıldı. / You have been unsubscribed.');
});

export const removeNewsletterOnAccountDelete = functionsV1.region('europe-west1').auth.user().onDelete(async user => {
  // Deleting the subscription triggers Resend suppression using the old snapshot.
  await admin.firestore().doc(`newsletterSubscribers/${user.uid}`).delete();
  await admin.firestore().doc(`emailVerification/${user.uid}`).delete();
  await admin.firestore().recursiveDelete(admin.firestore().doc(`users/${user.uid}`));
});

const COPY: Record<string, [string, string, string]> = {
  tr: ['Kaldığın yerden devam edelim mi?', 'Bir süredir görüşemedik. AthleTrack AI seni bekliyor! Yeni bir öğrenci ekleyebilir, öğrencilerinin ölçümlerini güncelleyebilir ve gelişimlerini kaldığın yerden takip edebilirsin.', 'Abonelikten çık'],
  en: ['Ready when you are', 'Pick up where you left off tracking your clients’ progress and sessions with AthleTrack AI.', 'Unsubscribe'],
  de: ['Wir sind für dich da', 'Verfolge mit AthleTrack AI wieder die Fortschritte und Termine deiner Kunden.', 'Abmelden'],
  es: ['Estamos aquí para ti', 'Retoma el seguimiento del progreso y las sesiones de tus clientes con AthleTrack AI.', 'Cancelar suscripción'],
  pt: ['Estamos aqui para você', 'Volte a acompanhar o progresso e as sessões dos seus alunos com AthleTrack AI.', 'Cancelar inscrição'],
  fr: ['Nous sommes là pour vous', 'Reprenez le suivi des progrès et des séances de vos clients avec AthleTrack AI.', 'Se désabonner'],
  it: ['Siamo qui per te', 'Riprendi a seguire i progressi e le sessioni dei tuoi clienti con AthleTrack AI.', 'Annulla iscrizione'],
};

export const newsletterReactivation = onSchedule({ schedule: 'every day 12:00', timeZone: 'Europe/Istanbul', secrets: ['RESEND_API_KEY'], timeoutSeconds: 540 }, async () => {
  // Operational switch for the authorized inactivity campaign.
  if (process.env.NEWSLETTER_REACTIVATION_ENABLED !== 'true') return;
  const subscribers = await admin.firestore().collection('newsletterSubscribers').where('enabled', '==', true).get();
  let sent = 0;
  for (const subscriber of subscribers.docs) {
    if (sent >= 50) break; // Leave daily sending capacity for security emails.
    const s = subscriber.data();
    const userRef = admin.firestore().doc(`users/${subscriber.id}`);
    const user = (await userRef.get()).data();
    if (!user) continue;
    const [students, records] = await Promise.all([
      userRef.collection('students').orderBy('createdAt', 'desc').limit(1).get(),
      userRef.collection('records').orderBy('createdAt', 'desc').limit(1).get(),
    ]);
    const activeMs = lastActivityMillis(user, [students.docs[0]?.data().createdAt, records.docs[0]?.data().createdAt]);
    if (!activeMs) continue;
    const days = (Date.now() - activeMs) / 86400000;
    if (days < 14) continue;
    const phase = days >= 30 ? 30 : 14;
    const delivery = admin.firestore().doc(`newsletterDeliveries/${digest(`${subscriber.id}:${activeMs}:${phase}`)}`);
    // Check the account still exists and respect unsubscribes from Resend Broadcasts.
    let account;
    try { account = await admin.auth().getUser(subscriber.id); }
    catch (e: any) { if (e.code === 'auth/user-not-found') continue; throw e; }
    if (!account.emailVerified || account.email !== s.email) continue;
    let contact;
    try { contact = await resend(`/contacts/${encodeURIComponent(s.email)}`); }
    catch (error: any) { if (error.message === 'Resend 404') continue; throw error; }
    if (contact.unsubscribed === true) {
      await subscriber.ref.update({ enabled: false });
      await userRef.update({ emailEnabled: false });
      continue;
    }
    const reserved = await admin.firestore().runTransaction(async tx => {
      const data = (await tx.get(delivery)).data();
      const latest = (await tx.get(subscriber.ref)).data();
      const profile = (await tx.get(userRef)).data();
      if (!latest?.enabled || !profile || lastActivityMillis(profile) > activeMs || data?.sentAt || (data?.leaseUntilMs ?? 0) > Date.now()) return false;
      tx.set(delivery, { leaseUntilMs: Date.now() + 20 * 60000, uid: subscriber.id });
      return true;
    });
    if (!reserved) continue;
    const url = `https://europe-west1-pt-app-native.cloudfunctions.net/newsletterUnsubscribe?uid=${subscriber.id}&token=${s.unsubscribeToken}`;
    const [subject, body, unsubscribe] = COPY[user.language] ?? COPY.en;
    try {
      await resend('/emails', 'POST', { from: 'AthleTrack AI <noreply@athletrackai.com>', to: [s.email], reply_to: 'support@athletrackai.com',
        subject, text: `${body}\n\nhttps://www.athletrackai.com\n\n${unsubscribe}: ${url}`,
        html: `<h2>${subject}</h2><p>${body}</p><p><a href="https://www.athletrackai.com">AthleTrack AI</a></p><p><a href="${url}">${unsubscribe}</a></p>`,
        headers: { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      }, delivery.id);
      await delivery.set({ sentAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      sent++;
    } catch (error) {
      await delivery.set({ leaseUntilMs: 0 }, { merge: true });
      throw error;
    }
  }
});
