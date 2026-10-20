const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const modules = new Map();
const data = new Map(), storage = new Map();
let autoId = 0, queue = Promise.resolve(), writeBarrier = Promise.resolve();
const stamp = () => ({ toMillis: () => 1000, toDate: () => new Date(1000) });
const fieldDelete = Symbol('delete');
const ref = (...args) => ({ path: args.flatMap(x => x === db ? [] : [typeof x === 'string' ? x : x.path]).join('/') });
const collection = (...args) => ref(...args);
const doc = (...args) => args.length === 1 ? ref(args[0], 'auto-' + ++autoId) : ref(...args);
const snap = (map, r) => ({ exists: () => map.has(r.path), data: () => map.get(r.path) });
const update = (map, r, patch) => { if (!map.has(r.path)) throw Error('missing document'); const next = { ...map.get(r.path) }; for (const [key, value] of Object.entries(patch)) if (value === fieldDelete) delete next[key]; else next[key] = value; map.set(r.path, next); };
const db = {};
const firestore = {
  collection, doc, serverTimestamp: stamp, deleteField: () => fieldDelete,
  Timestamp: { fromDate: d => ({ toMillis: () => d.getTime(), toDate: () => d }) },
  runTransaction: async (_, fn) => {
    const task = queue.catch(() => {}).then(async () => {
      const copy = new Map([...data].map(([key, value]) => [key, { ...value }])); let wrote = false;
      await fn({ get: async r => { if (wrote) throw Error('read after write'); return snap(copy, r); },
        set: (r, v) => { wrote = true; copy.set(r.path, v); }, update: (r, v) => { wrote = true; update(copy, r, v); }, delete: r => { wrote = true; copy.delete(r.path); } });
      data.clear(); for (const entry of copy) data.set(...entry);
    }); queue = task; return task;
  },
  writeBatch: () => { const ops = []; return { set: (r, v) => ops.push(() => data.set(r.path, v)), update: (r, v) => ops.push(() => update(data, r, v)), commit: async () => ops.forEach(op => op()) }; },
};
const mocks = {
  'firebase/firestore': firestore,
  'expo-localization': { getLocales: () => [{ currencyCode: 'TRY' }] },
  '@react-native-async-storage/async-storage': {
    getItem: async key => storage.get(key) ?? null,
    setItem: async (key, value) => { await writeBarrier; storage.set(key, value); },
    removeItem: async key => storage.delete(key),
  },
};
function load(file) {
  file = path.resolve(file); if (modules.has(file)) return modules.get(file);
  if (file.endsWith('/services/firebase.ts')) return { db };
  const source = fs.readFileSync(file, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} }; modules.set(file, module.exports);
  vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename: file })(name => {
    if (mocks[name]) return mocks[name];
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'));
    throw Error('Unexpected module ' + name);
  }, module, module.exports);
  return module.exports;
}
const { appointmentsOverlap } = load(root + '/services/appointment-conflicts.ts');
const { DraftStore, draftKey } = load(root + '/services/form-drafts.ts');
const packages = load(root + '/services/packages.ts');
const { saveMeasurement, measurementVersion } = load(root + '/services/measurements.ts');
const { parseMoneyInput } = load(root + '/services/payment-policy.ts');
beforeEach(() => { data.clear(); storage.clear(); queue = Promise.resolve(); writeBarrier = Promise.resolve(); });
const date = (day, hour, minute = 0) => new Date(2026, 9, day, hour, minute);

test('adjacent appointments are allowed, partial overlaps are rejected, and legacy sessions default to 60 minutes', () => {
  assert.equal(appointmentsOverlap({ date: date(20, 9), durationMinutes: 45 }, { date: date(20, 9, 45) }), false);
  assert.equal(appointmentsOverlap({ date: date(20, 9) }, { date: date(20, 9, 30) }), true);
  assert.equal(appointmentsOverlap({ date: date(20, 9) }, { date: date(21, 9) }), false);
});

test('recurring conflicts include later occurrences and exclude dates before recurrence starts', () => {
  assert.equal(appointmentsOverlap({ date: date(20, 9), repeatDays: 7 }, { date: date(27, 9, 30) }), true);
  assert.equal(appointmentsOverlap({ date: date(27, 9), repeatDays: 7 }, { date: date(20, 9) }), false);
  assert.equal(appointmentsOverlap({ date: date(20, 9), repeatDays: 7 }, { date: date(21, 9), repeatDays: 7 }), false);
  assert.equal(appointmentsOverlap({ date: date(20, 9), repeatDays: 7 }, { date: date(21, 9), repeatDays: 2 }), true);
});

test('overnight appointments also collide across calendar dates and recurrences', () => {
  assert.equal(appointmentsOverlap({ date: date(20, 23, 30), durationMinutes: 90, repeatDays: 7 }, { date: date(28, 0, 30) }), true);
  assert.equal(appointmentsOverlap({ date: date(20, 23, 30), durationMinutes: 30 }, { date: date(21, 0) }), false);
});

test('drafts are isolated by account and form, and survive a store instance restart', async () => {
  const alice = new DraftStore(draftKey('alice', 'student:new'));
  await alice.save({ name: 'Draft', step: 2 });
  assert.deepEqual(await new DraftStore(alice.key).read(), { name: 'Draft', step: 2 });
  assert.equal(await new DraftStore(draftKey('bob', 'student:new')).read(), null);
  assert.equal(await new DraftStore(draftKey('alice', 'measurement:s1')).read(), null);
});

test('clearing after a slow autosave cannot recreate a submitted draft', async () => {
  let release; writeBarrier = new Promise(resolve => { release = resolve; });
  const store = new DraftStore('test-draft');
  const saving = store.save({ field: 'pending' });
  const clearing = store.clear(); release();
  await Promise.all([saving, clearing]);
  assert.equal(await store.read(), null);
});

test('expired and corrupt drafts are discarded without touching other drafts', async () => {
  storage.set('old', JSON.stringify({ version: 1, savedAt: Date.now() - 15 * 86400000, value: {} })); storage.set('corrupt', '{'); storage.set('other', 'keep');
  assert.equal(await new DraftStore('old').read(), null); assert.equal(await new DraftStore('corrupt').read(), null);
  assert.equal(storage.get('other'), 'keep');
});

const pkgPath = 'users/alice/students/s1/packages/p1';
function seedPackage(paidAmount = 100) {
  data.set('users/alice/students/s1', {});
  data.set(pkgPath, { totalSessions: 10, usedSessions: 1, price: 1000, paidAmount, currency: 'TRY', closedAt: null });
}

test('retrying the same payment records one movement and migrates the known previous balance once', async () => {
  seedPackage();
  await Promise.all([packages.recordPayment('alice', 's1', 'p1', 250.25, 'request1', 'Transfer'), packages.recordPayment('alice', 's1', 'p1', 250.25, 'request1', 'Transfer')]);
  assert.equal(data.get(pkgPath).paidAmount, 350.25);
  assert.equal(data.get('users/alice/payments/request1').note, 'Transfer');
  assert.equal(data.get('users/alice/payments/opening_p1').amount, 100);
  assert.equal(data.get('users/alice/payments/opening_p1').kind, 'opening');
  assert.equal([...data.keys()].filter(p => p.startsWith('users/alice/payments/')).length, 2);
});

test('invalid and excessive payments do not change the balance or create movements', async () => {
  seedPackage();
  for (const amount of [-1, 0, Infinity, NaN, 901]) await assert.rejects(packages.recordPayment('alice', 's1', 'p1', amount, 'bad'));
  assert.equal(data.get(pkgPath).paidAmount, 100);
  assert.equal(data.has('users/alice/payments/bad'), false);
});

test('canceling a payment is idempotent and retains the original movement', async () => {
  seedPackage(); await packages.recordPayment('alice', 's1', 'p1', 200, 'request1');
  await Promise.all([packages.voidPayment('alice', 's1', 'request1'), packages.voidPayment('alice', 's1', 'request1')]);
  assert.equal(data.get(pkgPath).paidAmount, 100);
  assert.equal(data.get('users/alice/students/s1').activePackage.unpaid, 900);
  assert.ok(data.get('users/alice/payments/request1').voidedAt);
  assert.equal(data.get('users/alice/payments/request1').amount, 200);
  await assert.rejects(packages.voidPayment('alice', 's1', 'opening_p1'));
});

test('new package upfront payments receive an actual payment movement', async () => {
  data.set('users/alice/students/s1', {});
  const id = await packages.createPackage('alice', 's1', { totalSessions: 10, price: 1000, paidAmount: 300, currency: 'TRY', startDate: '2026-10-20', endDate: null, note: null });
  const payments = [...data.values()].filter(v => v.kind === 'payment');
  assert.equal(payments.length, 1); assert.equal(payments[0].packageId, id); assert.equal(payments[0].amount, 300);
});

test('money parsing respects decimal and grouping separators for supported locales', () => {
  assert.equal(parseMoneyInput('1.250,75', 'tr-TR'), 1250.75);
  assert.equal(parseMoneyInput('1,250.75', 'en-US'), 1250.75);
  assert.equal(parseMoneyInput('12,5', 'de-DE'), 12.5);
  assert.equal(parseMoneyInput('12.5', 'en-US'), 12.5);
  assert.equal(parseMoneyInput('invalid', 'tr-TR'), null);
});

test('measurement editing preserves creation date and student follow-up while invalidating old AI results', async () => {
  seedPackage(); const createdAt = stamp();
  data.set('users/alice/records/r1', { studentId: 's1', weight: '70', createdAt, contentVersion: 'v1', aiComment: { summary: 'Old' } });
  data.get('users/alice/students/s1').lastRecordedAt = createdAt;
  await saveMeasurement('alice', 's1', 'r1', { weight: '71', analysis: { bmi: 23 } }, 'v1');
  const saved = data.get('users/alice/records/r1');
  assert.equal(saved.weight, '71'); assert.equal(saved.createdAt, createdAt); assert.equal(saved.aiComment, undefined);
  assert.equal(data.get('users/alice/students/s1').lastRecordedAt, createdAt);
  assert.notEqual(measurementVersion(saved), 'v1');
});

test('a stale edit cannot overwrite newer changes or recreate a deleted measurement', async () => {
  seedPackage(); data.set('users/alice/records/r1', { studentId: 's1', weight: '75', contentVersion: 'newer' });
  await assert.rejects(saveMeasurement('alice', 's1', 'r1', { weight: '70' }, 'older'), /record_conflict/);
  assert.equal(data.get('users/alice/records/r1').weight, '75');
  data.delete('users/alice/records/r1');
  await assert.rejects(saveMeasurement('alice', 's1', 'r1', { weight: '70' }, 'older'), /record_conflict/);
  assert.equal(data.has('users/alice/records/r1'), false);
});

test('retrying new measurement submission creates only one record', async () => {
  seedPackage();
  await saveMeasurement('alice', 's1', 'new-record', { weight: '70' });
  await saveMeasurement('alice', 's1', 'new-record', { weight: '70' });
  assert.equal([...data.keys()].filter(p => p.startsWith('users/alice/records/')).length, 1);
});

test('a resumed draft retries its original measurement id after a cloud save', async () => {
  seedPackage();
  const key = draftKey('alice', 'measurement:s1:new:metric');
  await new DraftStore(key).save({ submissionId: 'stable-request', formData: { weight: '70' } });
  await saveMeasurement('alice', 's1', 'stable-request', { weight: '70' });
  const resumed = await new DraftStore(key).read();
  await saveMeasurement('alice', 's1', resumed.submissionId, resumed.formData);
  assert.equal([...data.keys()].filter(p => p.startsWith('users/alice/records/')).length, 1);
  await assert.rejects(saveMeasurement('alice', 'another-student', resumed.submissionId, resumed.formData));
});

test('canceling a closed package payment leaves the current active package alone', async () => {
  seedPackage(); await packages.recordPayment('alice', 's1', 'p1', 200, 'request1');
  data.get(pkgPath).closedAt = stamp();
  data.get('users/alice/students/s1').activePackage = { id: 'p2', unpaid: 500 };
  await packages.voidPayment('alice', 's1', 'request1');
  assert.equal(data.get(pkgPath).paidAmount, 100);
  assert.equal(data.get('users/alice/students/s1').activePackage.id, 'p2');
  assert.equal(data.get('users/alice/students/s1').activePackage.unpaid, 500);
});
