import type { ConfigContext, ExpoConfig } from 'expo/config';
import googleAuth from './constants/google-auth.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  const isDevelopment = process.env.APP_VARIANT === 'development';
  const bundleIdentifier = isDevelopment
    ? 'com.athletrack.athletrack.dev'
    : config.ios?.bundleIdentifier ?? 'com.athletrack.athletrack';
  const appGroup = `group.${bundleIdentifier}`;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || googleAuth.iosClientId;
  const plugins = (config.plugins ?? []).filter(plugin =>
    (typeof plugin === 'string' ? plugin : plugin[0]) !== '@react-native-google-signin/google-signin');
  if (iosClientId) {
    plugins.push(['@react-native-google-signin/google-signin', {
      iosUrlScheme: iosClientId.split('.').reverse().join('.'),
    }]);
  }
  return {
    ...config,
    name: isDevelopment ? 'AthleTrack AI Dev' : config.name ?? 'AthleTrack AI',
    slug: config.slug ?? 'pt_react_native',
    scheme: isDevelopment ? 'ptreactnative-dev' : config.scheme,
    ios: {
      ...config.ios,
      bundleIdentifier,
      entitlements: {
        ...config.ios?.entitlements,
        'com.apple.security.application-groups': [appGroup],
      },
    },
    plugins,
  };
};
