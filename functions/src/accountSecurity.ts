import { createHash, randomInt } from 'crypto';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const PASSWORD_RE = /^(?=[\s\S]*[a-z])(?=[\s\S]*[A-Z])(?=[\s\S]*[0-9])[\s\S]{10,128}$/;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const ttl = 10 * 60 * 1000;

// Registration is server-owned so the verification requirement cannot be removed
// by editing the user's Firestore profile. Existing accounts are grandfathered.
export const registerEmailAccount = onCall({ cors: true }, async request => {
  const { email, password, name, username, language, units, acceptLegal } = request.data ?? {};
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== 'string' || !PASSWORD_RE.test(password) ||
      typeof name !== 'string' || !name.trim() || name.length > 100 ||
      typeof username !== 'string' || !username.trim() || username.length > 100 || acceptLegal !== true) {
    throw new HttpsError('invalid-argument', 'Invalid registration details.');
  }
  const now = Date.now();
  const throttle = admin.firestore().doc(`registrationThrottle/${hash(request.rawRequest?.ip ?? 'unknown')}`);
  await admin.firestore().runTransaction(async tx => {
    const data = (await tx.get(throttle)).data();
    const sameWindow = now - (data?.windowStartMs ?? 0) < 3600000;
    if (sameWindow && (data?.count ?? 0) >= 10) throw new HttpsError('resource-exhausted', 'Too many registrations. Try again later.');
    tx.set(throttle, { windowStartMs: sameWindow ? data?.windowStartMs : now, count: sameWindow ? data!.count + 1 : 1,
      expiresAt: admin.firestore.Timestamp.fromMillis(now + 86400000) });
  });
  const cleanEmail = email.trim().toLowerCase();
  let user: admin.auth.UserRecord;
  try {
    user = await admin.auth().createUser({ email: cleanEmail, password, displayName: name.trim(), emailVerified: false });
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'Email already in use.');
    throw new HttpsError('internal', 'Could not create account.');
  }
  try {
    await admin.auth().setCustomUserClaims(user.uid, { email_verification_required: true });
    await admin.firestore().doc(`users/${user.uid}`).set({
      uid: user.uid, email: cleanEmail, displayName: name.trim(), username: username.trim().toLowerCase(),
      language: ['tr','en','de','es','pt','fr','it'].includes(language) ? language : 'en',
      units: units === 'imperial' ? 'imperial' : 'metric', pushEnabled: true, emailEnabled: false,
      legalApprovals: { terms: true, privacy: true, kvkk: true, explicitConsent: true },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true };
  } catch {
    // Do not leave a usable, partially initialized account after a failed signup.
    await admin.auth().deleteUser(user.uid).catch(() => {});
    await admin.firestore().doc(`users/${user.uid}`).delete().catch(() => {});
    throw new HttpsError('internal', 'Could not finish registration. Please try again.');
  }
});

export const requestEmailCode = onCall({ cors: true, secrets: ['RESEND_API_KEY'] }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const user = await admin.auth().getUser(request.auth.uid);
  if (user.emailVerified) return { ok: true };
  if (!user.email) throw new HttpsError('failed-precondition', 'Email required.');
  const ref = admin.firestore().doc(`emailVerification/${user.uid}`);
  const code = String(randomInt(100000, 1000000));
  const now = Date.now();
  const generation = hash(`${user.uid}:${now}:${code}`);
  await admin.firestore().runTransaction(async tx => {
    const data = (await tx.get(ref)).data();
    if (now - (data?.sentAtMs ?? 0) < 60000 ||
        (now - (data?.windowStartMs ?? 0) < 3600000 && (data?.sendCount ?? 0) >= 5)) {
      throw new HttpsError('resource-exhausted', 'Please wait before requesting another code.');
    }
    const sameWindow = now - (data?.windowStartMs ?? 0) < 3600000;
    tx.set(ref, { email: user.email, hash: hash(`${user.uid}:${code}`), generation,
      expiresAtMs: now + ttl, sentAtMs: now, attempts: 0,
      windowStartMs: sameWindow ? data?.windowStartMs : now, sendCount: sameWindow ? data!.sendCount + 1 : 1 });
  });
  const profile = (await admin.firestore().doc(`users/${user.uid}`).get()).data();
  const copy: Record<string, [string,string]> = {
    tr: ['E-posta doğrulama kodun', 'Bu kod 10 dakika geçerlidir. Kodu kimseyle paylaşma.'],
    en: ['Your email verification code', 'This code expires in 10 minutes. Do not share it.'],
    de: ['Dein E-Mail-Bestätigungscode', 'Dieser Code ist 10 Minuten gültig. Teile ihn mit niemandem.'],
    es: ['Tu código de verificación', 'Este código caduca en 10 minutos. No lo compartas.'],
    pt: ['Seu código de verificação', 'Este código expira em 10 minutos. Não o compartilhe.'],
    fr: ['Votre code de vérification', 'Ce code expire dans 10 minutes. Ne le partagez pas.'],
    it: ['Il tuo codice di verifica', 'Questo codice scade tra 10 minuti. Non condividerlo.'],
  };
  const [title, body] = copy[profile?.language] ?? copy.en;
  try {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `verify-${generation}` },
      body: JSON.stringify({ from: 'AthleTrack AI <noreply@athletrackai.com>', to: [user.email],
        reply_to: 'support@athletrackai.com', subject: `AthleTrack AI — ${title}`,
        text: `${title}: ${code}\n\n${body}`, html: `<h2>${title}</h2><p style="font-size:32px;letter-spacing:8px">${code}</p><p>${body}</p>` }) });
    if (!response.ok) throw new Error('Delivery rejected');
  } catch {
    await admin.firestore().runTransaction(async tx => {
      const data = (await tx.get(ref)).data();
      if (data?.generation === generation) tx.update(ref, { expiresAtMs: 0, sentAtMs: 0 });
    });
    throw new HttpsError('unavailable', 'Could not send code. Please try again.');
  }
  return { ok: true };
});

export const confirmEmailCode = onCall({ cors: true }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const uid = request.auth.uid;
  const user = await admin.auth().getUser(uid);
  if (user.emailVerified) return { ok: true };
  const code = request.data?.code;
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) throw new HttpsError('invalid-argument', 'Enter a six-digit code.');
  const ref = admin.firestore().doc(`emailVerification/${uid}`);
  const valid = await admin.firestore().runTransaction(async tx => {
    const data = (await tx.get(ref)).data();
    if (!data || data.email !== user.email || data.expiresAtMs <= Date.now() || data.attempts >= 5) return false;
    if (data.hash !== hash(`${uid}:${code}`)) { tx.update(ref, { attempts: data.attempts + 1 }); return false; }
    tx.update(ref, { expiresAtMs: 0, hash: null });
    return true;
  });
  if (!valid) throw new HttpsError('invalid-argument', 'Code invalid or expired.');
  await admin.auth().updateUser(uid, { emailVerified: true });
  return { ok: true };
});
