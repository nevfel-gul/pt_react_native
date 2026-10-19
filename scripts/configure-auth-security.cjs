// Dry run by default. Use --apply after reviewing the printed policy.
// Uses GOOGLE_APPLICATION_CREDENTIALS / Application Default Credentials.
const admin = require('../functions/node_modules/firebase-admin');
const PROJECT = 'pt-app-native';
const passwordPolicyConfig = {
  passwordPolicyEnforcementState: 'ENFORCE',
  forceUpgradeOnSignin: false,
  passwordPolicyVersions: [{ customStrengthOptions: {
    minPasswordLength: 10, maxPasswordLength: 128,
    containsLowercaseCharacter: true, containsUppercaseCharacter: true,
    containsNumericCharacter: true, containsNonAlphanumericCharacter: false,
  } }],
};
async function main() {
  console.log(JSON.stringify({ project: PROJECT, passwordPolicyConfig }, null, 2));
  if (!process.argv.includes('--apply')) { console.log('Dry run. Add --apply to update the Firebase password policy.'); return; }
  const credential = admin.credential.applicationDefault();
  const token = await credential.getAccessToken();
  const response = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config?updateMask=passwordPolicyConfig`, {
    method: 'PATCH', signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ passwordPolicyConfig }),
  });
  if (!response.ok) throw new Error(`Firebase rejected the policy (HTTP ${response.status}). Check IAM permissions and Identity Platform support.`);
  const result = await response.json();
  console.log(JSON.stringify({ passwordPolicyConfig: result.passwordPolicyConfig }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
