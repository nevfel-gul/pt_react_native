const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const crypto = require('node:crypto');
const docs = new Map();
const users = new Map();
let sent = [];
let deliveryFails = false;
let nextUid = 0;
let contactUnsubscribed = false;
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const snapshot = path => ({ exists: docs.has(path), data: () => docs.get(path) });
const doc = path => ({ path,
  collection: name => collection(path + '/' + name),
  get: async () => snapshot(path),
  set: async (data, options) => docs.set(path, options?.merge ? { ...docs.get(path), ...data } : data),
  update: async data => docs.set(path, { ...docs.get(path), ...data }),
  delete: async () => docs.delete(path),
});
const collection = path => {
  let predicate = () => true, orderField, descending = false, count = Infinity;
  const query = {
    where: (field, op, value) => { predicate = data => data[field] === value; return query; },
    orderBy: (field, direction) => { orderField = field; descending = direction === 'desc'; return query; },
    limit: value => { count = value; return query; },
    get: async () => {
      let entries = [...docs.entries()].filter(([key, value]) => key.startsWith(path + '/') && !key.slice(path.length + 1).includes('/') && predicate(value));
      if (orderField) entries = entries.filter(([, value]) => value[orderField]).sort((a, b) => (a[1][orderField].toMillis() - b[1][orderField].toMillis()) * (descending ? -1 : 1));
      return { docs: entries.slice(0, count).map(([key]) => ({ ...snapshot(key), id: key.split('/').at(-1), ref: doc(key) })) };
    },
  };
  return query;
};
const db = { doc, collection, runTransaction: async cb => cb({
  get: async ref => ref.get(), set: (ref, data, options) => ref.set(data, options), update: (ref, data) => ref.update(data),
}), recursiveDelete: async ref => { for (const path of docs.keys()) if (path === ref.path || path.startsWith(ref.path + '/')) docs.delete(path); } };
const firestore = Object.assign(() => db, { FieldValue: { serverTimestamp: () => 'server-time' }, Timestamp: { fromMillis: n => n } });
const admin = { firestore, auth: () => ({
  getUser: async uid => { if (!users.has(uid)) throw Object.assign(new Error(), { code: 'auth/user-not-found' }); return users.get(uid); },
  createUser: async data => { const user = { ...data, uid: 'new-' + ++nextUid }; users.set(user.uid, user); return user; },
  setCustomUserClaims: async (uid, claims) => { users.get(uid).customClaims = claims; },
  createCustomToken: async uid => 'token:' + uid,
  updateUser: async (uid, data) => Object.assign(users.get(uid), data),
  deleteUser: async uid => users.delete(uid),
}) };
const originalLoad = Module._load;
Module._load = function (name, ...args) {
  if (name === 'firebase-admin') return admin;
  if (name === 'firebase-functions/v2/https') return { HttpsError, onCall: (...args) => args.at(-1), onRequest: (...args) => args.at(-1) };
  if (name === 'firebase-functions/v2/firestore') return { onDocumentWritten: (...args) => args.at(-1) };
  if (name === 'firebase-functions/v2/scheduler') return { onSchedule: (...args) => args.at(-1) };
  if (name === 'firebase-functions/v1') return { region: () => ({ auth: { user: () => ({ onDelete: fn => fn }) } }) };
  return originalLoad.call(this, name, ...args);
};
const security = require('../lib/accountSecurity');
const newsletter = require('../lib/newsletter');
Module._load = originalLoad;
global.fetch = async (url, options) => {
  const body = options?.body ? JSON.parse(options.body) : null;
  sent.push({ url, method: options?.method, body });
  return { ok: !deliveryFails, status: deliveryFails ? 500 : 200, json: async () => ({ id: 'mail-1', unsubscribed: contactUnsubscribed }) };
};
const request = data => ({ auth: { uid: 'alice' }, data });
beforeEach(() => {
  docs.clear(); users.clear(); sent = []; deliveryFails = false; contactUnsubscribed = false;
  users.set('alice', { uid: 'alice', email: 'alice@example.com', emailVerified: false });
});

test('registration rejects missing password conditions and creates a server-owned verification requirement', async () => {
  const base = { email: 'alice@example.com', name: 'Alice', username: 'alice', acceptLegal: true };
  for (const password of ['ShortA1', 'lowercase123', 'UPPERCASE123', 'NoNumbersHere']) {
    await assert.rejects(security.registerEmailAccount({ data: { ...base, password } }), { code: 'invalid-argument' });
  }
  const result = await security.registerEmailAccount({ data: { ...base, password: 'ValidPassword1' } });
  assert.equal(result.ok, true);
  const uid = [...users.keys()].find(uid => uid.startsWith('new-'));
  assert.equal(users.get(uid).customClaims.email_verification_required, true);
  assert.equal(docs.get('users/' + uid).emailEnabled, false);
});

test('email code requires authentication and rate-limits resend', async () => {
  await assert.rejects(security.requestEmailCode({}), { code: 'unauthenticated' });
  await security.requestEmailCode(request({}));
  await assert.rejects(security.requestEmailCode(request({})), { code: 'resource-exhausted' });
  assert.match(sent[0].body.text, /\b\d{6}\b/);
  assert.ok(!sent[0].body.html.includes('<a '));
});

test('wrong code attempts persist and lock a valid code after five failures', async () => {
  await security.requestEmailCode(request({}));
  const code = sent[0].body.text.match(/\b\d{6}\b/)[0];
  const wrong = code === '100000' ? '100001' : '100000';
  for (let i = 0; i < 5; i++) await assert.rejects(security.confirmEmailCode(request({ code: wrong })), { code: 'invalid-argument' });
  assert.equal(docs.get('emailVerification/alice').attempts, 5);
  await assert.rejects(security.confirmEmailCode(request({ code })), { code: 'invalid-argument' });
  assert.equal(users.get('alice').emailVerified, false);
});

test('expired code cannot verify; valid code is consumed and verifies the account', async () => {
  await security.requestEmailCode(request({}));
  const code = sent[0].body.text.match(/\b\d{6}\b/)[0];
  const data = docs.get('emailVerification/alice');
  docs.set('emailVerification/alice', { ...data, expiresAtMs: 0 });
  await assert.rejects(security.confirmEmailCode(request({ code })), { code: 'invalid-argument' });
  docs.set('emailVerification/alice', data);
  await security.confirmEmailCode(request({ code }));
  assert.equal(users.get('alice').emailVerified, true);
  assert.equal(docs.get('emailVerification/alice').hash, null);
});

test('a failed email delivery invalidates its code and allows a new delivery attempt', async () => {
  deliveryFails = true;
  await assert.rejects(security.requestEmailCode(request({})), { code: 'unavailable' });
  assert.equal(docs.get('emailVerification/alice').expiresAtMs, 0);
  deliveryFails = false;
  await security.requestEmailCode(request({}));
  assert.equal(sent.length, 2);
});

test('newsletter requires a verified address and explicit consent; disabling works for unverified accounts', async () => {
  await assert.rejects(newsletter.setNewsletterPreference(request({ enabled: true })), { code: 'failed-precondition' });
  users.get('alice').emailVerified = true;
  await newsletter.setNewsletterPreference(request({ enabled: true }));
  assert.equal(docs.get('newsletterSubscribers/alice').enabled, true);
  assert.equal(docs.get('users/alice').emailEnabled, true);
  users.get('alice').emailVerified = false;
  await newsletter.setNewsletterPreference(request({ enabled: false }));
  assert.equal(docs.get('newsletterSubscribers/alice').enabled, false);
});

const response = () => ({ code: 200, body: '', status(code) { this.code = code; return this; }, set() { return this; }, send(body) { this.body = body; return this; } });
test('unsubscribe requires the secret token; GET is scanner-safe and POST revokes consent', async () => {
  const token = crypto.randomBytes(32).toString('hex');
  docs.set('newsletterSubscribers/alice', { email: 'alice@example.com', enabled: true, unsubscribeToken: token });
  docs.set('users/alice', { emailEnabled: true });
  const bad = response();
  await newsletter.newsletterUnsubscribe({ method: 'POST', query: { uid: 'alice', token: '0'.repeat(64) } }, bad);
  assert.equal(bad.code, 400);
  const get = response();
  await newsletter.newsletterUnsubscribe({ method: 'GET', query: { uid: 'alice', token } }, get);
  assert.equal(docs.get('newsletterSubscribers/alice').enabled, true);
  assert.match(get.body, /form method="post"/);
  await newsletter.newsletterUnsubscribe({ method: 'POST', query: { uid: 'alice', token } }, response());
  assert.equal(docs.get('newsletterSubscribers/alice').enabled, false);
  assert.equal(docs.get('users/alice').emailEnabled, false);
});

test('account deletion removes subscription, verification code and user subcollections', async () => {
  for (const path of ['users/alice', 'users/alice/students/s1', 'newsletterSubscribers/alice', 'emailVerification/alice']) docs.set(path, {});
  await newsletter.removeNewsletterOnAccountDelete({ uid: 'alice' });
  assert.equal(docs.size, 0);
});

const daysAgo = days => { const ms = Date.now() - days * 86400000; return { toMillis: () => ms }; };
function idleSubscriber(days = 15) {
  process.env.NEWSLETTER_REACTIVATION_ENABLED = 'true';
  users.get('alice').emailVerified = true;
  docs.set('newsletterSubscribers/alice', { email: 'alice@example.com', enabled: true, unsubscribeToken: 'a'.repeat(64) });
  docs.set('users/alice', { language: 'tr', createdAt: daysAgo(60), lastActiveAt: daysAgo(days) });
}
const campaignEmails = () => sent.filter(item => item.url.endsWith('/emails'));

test('inactivity campaign sends once at 14 days and once at 30 days in the same inactive period', async () => {
  idleSubscriber();
  await newsletter.newsletterReactivation();
  await newsletter.newsletterReactivation();
  assert.equal(campaignEmails().length, 1);
  assert.match(campaignEmails()[0].body.text, /Yeni bir öğrenci/);
  assert.ok(campaignEmails()[0].body.headers['List-Unsubscribe']);
  const profile = docs.get('users/alice');
  const active = profile.lastActiveAt.toMillis();
  const originalNow = Date.now;
  try {
    Date.now = () => active + 31 * 86400000;
    await newsletter.newsletterReactivation();
    await newsletter.newsletterReactivation();
  } finally { Date.now = originalNow; }
  assert.equal(campaignEmails().length, 2);
});

test('recent app activity, student creation or measurement prevents reactivation mail', async () => {
  for (const kind of ['app', 'students', 'records']) {
    docs.clear(); sent = []; idleSubscriber();
    if (kind === 'app') docs.get('users/alice').lastActiveAt = daysAgo(1);
    else docs.set(`users/alice/${kind}/recent`, { createdAt: daysAgo(1) });
    await newsletter.newsletterReactivation();
    assert.equal(campaignEmails().length, 0, kind);
  }
});

test('a member with no saved work becomes eligible 14 days after signup', async () => {
  idleSubscriber();
  docs.set('users/alice', { language: 'tr', createdAt: daysAgo(15) });
  await newsletter.newsletterReactivation();
  assert.equal(campaignEmails().length, 1);
});

test('local opt-out and Resend unsubscribe both suppress automatic mail', async () => {
  idleSubscriber();
  docs.get('newsletterSubscribers/alice').enabled = false;
  await newsletter.newsletterReactivation();
  assert.equal(campaignEmails().length, 0);
  docs.get('newsletterSubscribers/alice').enabled = true;
  contactUnsubscribed = true;
  await newsletter.newsletterReactivation();
  assert.equal(campaignEmails().length, 0);
  assert.equal(docs.get('newsletterSubscribers/alice').enabled, false);
});
