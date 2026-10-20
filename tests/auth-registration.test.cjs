const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadService(file, dependencies) {
  const filename = path.join(__dirname, '..', file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, process,
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename });
  return exports;
}

function socialService(profile) {
  const writes = [];
  let signedOut = false;
  const result = { user: { uid: 'social-user', email: 'test@example.com', displayName: 'Test' } };
  const { signInSocial } = loadService('services/social-auth.ts', {
    'react-native': { Platform: { OS: 'web' } },
    'expo-apple-authentication': {}, 'expo-crypto': {},
    'firebase/auth': {
      GoogleAuthProvider: class {}, OAuthProvider: class {},
      signInWithPopup: async () => result,
      signOut: async () => { signedOut = true; },
    },
    'firebase/firestore': {
      doc: () => 'users/social-user', getDoc: async () => ({ data: () => profile }),
      serverTimestamp: () => 'server-time', setDoc: async (...args) => writes.push(args),
    },
    './firebase': { auth: {}, db: {} },
    '@/constants/languages': { normalizeLanguage: () => 'en' },
    './i18n': { language: 'en' },
    '@/constants/UnitsContext': { deviceUnitSystem: () => 'metric' },
    '@/constants/google-auth.json': {},
  });
  return { signInSocial, writes, isSignedOut: () => signedOut, result };
}

test('returning social users can log in without accepting registration terms again', async () => {
  const service = socialService({ createdAt: 'previous-signup' });
  assert.equal(await service.signInSocial('google', false), service.result);
  assert.equal(service.isSignedOut(), false);
  assert.equal(service.writes.length, 0);
});

test('an unknown social account cannot initialize a profile without signup consent', async () => {
  const service = socialService(undefined);
  await assert.rejects(service.signInSocial('google', false), { code: 'social/registration-required' });
  assert.equal(service.isSignedOut(), true);
  assert.equal(service.writes.length, 0);
});

test('social signup initializes the profile after explicit consent', async () => {
  const service = socialService(undefined);
  await service.signInSocial('apple', true);
  assert.equal(service.isSignedOut(), false);
  assert.equal(service.writes.length, 1);
  assert.equal(service.writes[0][1].legalApprovals.terms, true);
  assert.equal(service.writes[0][1].createdAt, 'server-time');
});

test('password checklist and validation agree across punctuation, missing rules and length limits', () => {
  const { PASSWORD_RE, passwordChecks } = loadService('services/account-security.ts', {
    'firebase/functions': { httpsCallable: () => () => {} },
    './firebase': { functions: {} },
  });
  const cases = [
    ['', false], ['ValidPassword1', false], ['ValidPassword1 ', false],
    ['ValidPassword1é', false], ['shortA1!', false], ['UPPERCASE1!', false],
    ['lowercase1!', false], ['NoNumbersHere!', false],
    ...['.', '!', '?', '@', '#', '_', '-', '/', '\\', '"', "'", '€', '₺', '+', '=', '~', '…', '！'].map(symbol => [`ValidPassword1${symbol}`, true]),
    ['Ab1!' + 'x'.repeat(124), true], ['Ab1!' + 'x'.repeat(125), false],
  ];
  for (const [password, valid] of cases) {
    assert.equal(PASSWORD_RE.test(password), valid, password);
    assert.equal(Object.values(passwordChecks(password)).every(Boolean), valid, password);
  }
});
