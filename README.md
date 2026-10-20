# Welcome to your Expo app 👋

## iPhone development alongside the App Store app

The EAS `development` profile sets `APP_VARIANT=development`, producing
**AthleTrack AI Dev** (`com.athletrack.athletrack.dev`). The production app keeps
`com.athletrack.athletrack`. Both can stay installed on the same iPhone.
This variant separation currently applies to iOS only.

Register the iPhone with `npx eas-cli@latest device:create`, then build in the cloud:

```bash
npx eas-cli@latest build --platform ios --profile development
```

Install from the resulting link and start the development server with:

```bash
npm run dev
```

For a tunnel, use `npm run dev -- --tunnel`. Rebuild after native dependency or
native configuration changes; ordinary JavaScript changes use the existing client.
The dev variant has its own URL scheme, app group, and widget data.
EAS must register/sign the new app ID, widget ID, and app group on first build.

External services also need the dev bundle ID registered:

- Google Sign-In: create an iOS OAuth client for `com.athletrack.athletrack.dev`
  and set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` for both the development EAS build
  and the local development server. The current fallback client and Google
  services plist belong to production; provide a matching Firebase iOS config
  if using native Firebase services in the dev app.
- Apple Sign-In: enable/configure it for the new dev app ID.
- App Store in-app purchases: the production app's products do not automatically
  belong to the dev bundle ID. Configure a separate App Store Connect app and
  sandbox products/backend validation for payment tests, or use the production
  bundle ID in TestFlight for those tests (that replaces the installed Store app).

The dev app still connects to the existing backend. Use a test account; this is
an installation variant, not a separate database environment.

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
