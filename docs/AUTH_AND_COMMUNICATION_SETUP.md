# Authentication and communication — 1.4

Implemented in the app and Functions source. The Firebase password policy was applied and confirmed on 2026-10-19 using the existing service account. Apple native sign-in was also enabled in Firebase for `com.athletrack.athletrack`. New registration/verification callables, newsletter preference/unsubscribe callables, the reactivation scheduler, account-deletion cleanup and Firestore rules have been deployed. The Eventarc contact-sync trigger was successfully deployed on retry after service-agent permission propagation. All nine new Functions are deployed. No app binary was built and no marketing email was sent.

## Release prerequisites

1. **Google/Apple providers:** Both providers are enabled in Firebase `pt-app-native`. Google was enabled through Firebase, which created its web and iOS OAuth clients. The public client IDs are in `constants/google-auth.json`; `GoogleService-Info.plist` was refreshed from Firebase. The iOS callback scheme is derived by `app.config.ts`. The product scope is iOS. Google branding was saved with the existing homepage/privacy/terms links and `athletrackai.com` authorized domain. Publishing status was confirmed **In production** on 2026-10-19.  Native device validation is still required before release. Apple native provider is enabled for `com.athletrack.athletrack`, but the Apple Developer capability and signing profile still require validation.
2. Google OAuth client IDs are public configuration and are checked in. Optional `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` values override them for separate build environments. Never put a Google client secret or Apple private key in `EXPO_PUBLIC_*` values. The extra manually created `AthleTrack AI Firebase Web` client is unused; Firebase's generated client is the configured provider. The branded support address is an alternate address of the business Google account, so Google only offers its primary Gmail address as OAuth support contact. App and email replies continue to use `support@athletrackai.com`. Both Google policies were accepted with explicit user approval. The business identity has only the approved Browser and OAuth Config Editor roles; no general Editor/Owner role was added. Existing Cloudflare/MX records were preserved.
3. Enable Sign in with Apple for the Apple App ID, configure Apple's provider credentials privately in Firebase and regenerate the signing profile as needed. Apple native sign-in appears only when supported; Android uses Google/email. Web uses Firebase popups and requires an authorized origin / Apple web configuration.
4. Keep the existing Secret Manager secret `RESEND_API_KEY`. The checked-in service account could not read its latest version (`secretmanager.versions.access` denied); the existing authorized Firebase CLI account could. The checked-in account was not granted extra IAM permission. Firebase deployment bound the existing mail secret to the Cloud Functions runtime service account. The key was used only in memory. Contact/segment read access was confirmed and a dedicated newsletter segment was created. A sending-only key is insufficient for newsletter sync. The existing reset and new code emails use `noreply@athletrackai.com`, with replies to `support@athletrackai.com`.
5. The Firebase password policy described below is already applied. All new Functions and Firestore rules are deployed. Complete provider setup and device tests before distributing the new app.
6. Build a **new native binary**. These dependencies cannot be added to an existing binary through an OTA update. Version was moved from 1.3 to 1.4 as requested; runtime compatibility follows `appVersion`, isolating the new native dependencies.

## Password policy

The app and registration callable enforce 10–128 characters, at least one ASCII uppercase letter, lowercase letter and digit. Special characters are optional. Existing passwords continue to work.

Firebase must enforce the same policy for password changes, web password resets and legacy clients. The script prints the exact intended change by default:

```sh
node scripts/configure-auth-security.cjs
```

After reviewing it, apply with authorized Application Default Credentials (or `GOOGLE_APPLICATION_CREDENTIALS` pointing to a private service-account file):

```sh
node scripts/configure-auth-security.cjs --apply
```

It updates only `passwordPolicyConfig` for `pt-app-native`; `forceUpgradeOnSignin` stays false. The external reset-password webpage is outside this repository: update its instructional text to the same policy. Firebase rejects weak resets after the policy is applied.

## Verification codes

New email/password registration is performed by `registerEmailAccount`. It creates a server-owned `email_verification_required` custom claim before the client signs in with its email and password. New users enter a six-digit email code in the app; emails contain the code with no verification button or link. Existing accounts retain access. Social providers use their own identity verification.

Codes expire after 10 minutes, allow five verification attempts and can be sent at most once per minute / five times per hour per account. Codes are stored as SHA-256 hashes in an Admin-only Firestore collection. Registration has an IP-hash rate limit. Never log passwords or verification codes.

Firestore rules prevent accounts with the verification-required claim from accessing user data until their token has `email_verified: true`. The app refreshes the ID token after verification. The new claim belongs to the new registration path; do not describe this as a blanket block on Firebase's public signup endpoint or on old app versions. An account-creation blocking function would require a separate Identity Platform rollout.

Registration uses normal email/password sign-in after the server creates the account and assigns the verification requirement. No custom-token signing IAM role is needed. If sign-in is interrupted, the user can sign in with their chosen email/password and continue verification.

## Push and haptics

Startup refreshes tokens only for existing OS permission. It does not request OS permission. After a successful student addition, the success confirmation is followed by an explanatory prompt. Refusing/postponing reserves a 30-day interval. Reminders are evaluated on the home screen and when it returns to the foreground, for accounts that have students. Explicitly disabling push in app settings opts out of reminders. If the OS cannot ask again, the explanatory prompt links to OS settings. Opening app settings directly remains available.

Haptic preference controls tab selection and successful student/measurement saves. Turning the preference on gives a preview. Unsupported hardware fails silently.

## Resend newsletter and Cloudflare

Do not overwrite the root domain's Cloudflare inbound MX records. Keep the existing receiving/routing setup. Verify the sending domain with Resend using its exact DNS records; use a dedicated bounce/sending subdomain where requested. Confirm SPF/DKIM/DMARC alignment, actual delivery to external mailboxes and reply routing. The Resend API confirmed `athletrackai.com` is verified. DNS credentials and records were not changed.

Created Resend segment **AthleTrack AI Newsletter** (`c35c81e1-1dae-4605-8793-b1a7d2521a01`). Its ID is saved in `functions/.env.pt-app-native` as `RESEND_NEWSLETTER_SEGMENT_ID`; automatic reactivation is enabled. Use Resend **Broadcasts**, targeting this segment, to author and send manual newsletters. Include Resend's unsubscribe component. Created the first Turkish welcome/newsletter draft in Resend: `b133a440-e687-4ad3-b50d-9057464992cf`. Its source is `docs/email/newsletter-welcome-tr.html`. No broadcast was sent during implementation. Automatic eligible inactivity emails are authorized and enabled. Translate or target the language before sending this Turkish draft to an international audience.

Only a verified user who enables the newsletter setting is added. Old device-local email settings are not migrated as consent. The Admin-only `newsletterSubscribers` collection stores the account, explicit preference, consent source/version/time and a private unsubscribe token. A retrying Firestore trigger syncs contact and segment state to Resend. Settings reads and automatic sends also check Resend's global unsubscribe state, so unsubscribing through Broadcasts is respected. Contact sync needs a working segment configuration for panel-based targeting.

Automatic reactivation is **enabled** with `NEWSLETTER_REACTIVATION_ENABLED=true` following the user’s explicit direction. It evaluates once daily at 12:00 Europe/Istanbul, checks the most recent app activity, student creation, measurement creation, or signup timestamp and sends at the 14/30-day stages, with at most 50 successful messages per invocation. Confirm your Resend plan and actual shared daily capacity; the cap is not a guarantee that other senders have not used the quota. App uninstall is not treated as observable fact. Users who return reset their inactivity cycle. Users with no saved work are evaluated from signup. Accounts with no usable signup or activity timestamp are excluded.

Reactivation mail includes an unsubscribe URL and one-click unsubscribe headers. GET displays a confirmation form to avoid mail scanners changing preferences. POST revokes consent and triggers Resend suppression. Only use live HTTPS endpoints after Functions deployment. Account deletion removes newsletter consent and verification state, suppresses the Resend contact and recursively removes the user's Firestore data. It does not preserve deleted accounts as a marketing list.

## Validation

```sh
npx tsc --noEmit
npm run lint
npm test --prefix functions
npx expo export --platform ios --no-bytecode --output-dir /tmp/athletrack-ios-export
```

Thirteen server/push-flow tests passed; TypeScript checks passed; iOS and Android JavaScript exports succeeded. Live malformed/unauthenticated callable probes returned the expected INVALID_ARGUMENT/UNAUTHENTICATED statuses without creating accounts or sending mail. Resend confirmed the first broadcast is `draft`, with no send or scheduled time. The server tests use mocked Firebase/Resend boundaries; they do not prove external provider setup or mail delivery. Before release, test on a physical iOS and Android device: native Google/Apple login and cancellation, duplicate email, missing network, code delivery/expiry/resend, verification after relaunch, old-account sign-in, password reset, first-student push permission, denied-permission Settings return, explicit push opt-out, haptics off, newsletter opt-in/out and account deletion. Use a staging Resend inbox/list for sends.

After wiring the generated Google client IDs, TypeScript, focused ESLint, all 13 existing tests, Expo public config resolution (including the expected reversed iOS client scheme), `git diff --check`, and a fresh iOS JavaScript export passed. These checks are not a native binary build or an actual provider sign-in.

The inactivity campaign now includes existing student/measurement timestamps, so older clients do not get treated as inactive after saving work. Four scheduler tests cover 14/30-day delivery deduplication, recent app/student/measurement activity, never-active signups, and both unsubscribe paths; all 17 server/push tests and TypeScript passed.
