const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
let profile, permission, students, alerts, settingsOpened, requests, registered;
const auth = { currentUser: { uid: 'alice' } };
const notifications = { IosAuthorizationStatus: { PROVISIONAL: 3 }, getPermissionsAsync: async () => permission };
const ref = {};
const mocks = {
  'react-native': { Platform: { OS: 'ios' }, Alert: { alert: (...args) => alerts.push(args) }, Linking: { openSettings: async () => settingsOpened++ } },
  'expo-notifications': notifications,
  'firebase/firestore': {
    doc: () => ref, collection: () => ({}), limit: () => ({}), query: () => ({}),
    getDoc: async () => ({ data: () => profile }), getDocs: async () => ({ empty: !students }),
    runTransaction: async (_, cb) => cb({ get: async () => ({ data: () => profile }), set: (_, patch) => Object.assign(profile, patch) }),
    setDoc: async (_, patch) => Object.assign(profile, patch),
  },
  './firebase': { auth, db: {} }, './i18n': { default: { t: key => key }, __esModule: true },
  './registerForPush': { registerForPushNotificationsAsync: async () => { requests++; return registered; } },
  './analytics': { track: () => {} },
};
const source = fs.readFileSync(path.resolve(__dirname, '../../services/push-permission.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const exportsObject = {};
vm.runInNewContext(`(function(require,exports){${compiled}\n})`, { console, Date, Promise })(name => {
  if (!(name in mocks)) throw new Error('Unexpected import ' + name);
  return mocks[name];
}, exportsObject);
const prompt = exportsObject.maybePromptForPush;
beforeEach(() => {
  profile = {}; students = true; permission = { granted: false, canAskAgain: true };
  alerts = []; settingsOpened = 0; requests = 0; registered = { status: 'granted', token: 'expo-token' };
  auth.currentUser = { uid: 'alice' };
});
test('new student prompts with context, then registers permission only after the user accepts', async () => {
  await prompt(true);
  assert.equal(alerts.length, 1);
  assert.equal(requests, 0);
  await alerts[0][2][1].onPress();
  assert.equal(requests, 1);
  assert.equal(profile.pushToken, 'expo-token');
});
test('dismissal respects the 30-day interval; explicit app opt-out prevents future reminders', async () => {
  await prompt(true);
  await prompt(true);
  assert.equal(alerts.length, 1);
  profile.pushPromptAtMs = Date.now() - 31 * 86400000;
  await prompt();
  assert.equal(alerts.length, 2);
  profile.pushPromptAtMs = 0; profile.pushOptOut = true;
  await prompt();
  assert.equal(alerts.length, 2);
});
test('no prompt for an account with no students or existing permission', async () => {
  students = false;
  await prompt();
  assert.equal(alerts.length, 0);
  students = true; permission.granted = true;
  await prompt(true);
  assert.equal(alerts.length, 0);
});
test('permanent OS denial links to settings instead of requesting a forbidden prompt', async () => {
  permission.canAskAgain = false;
  await prompt(true);
  await alerts[0][2][1].onPress();
  assert.equal(settingsOpened, 1);
  assert.equal(requests, 0);
});
test('an alert from a previous account cannot register push for a new account', async () => {
  await prompt(true);
  auth.currentUser = { uid: 'bob' };
  await alerts[0][2][1].onPress();
  assert.equal(requests, 0);
  assert.equal(profile.pushToken, undefined);
});
