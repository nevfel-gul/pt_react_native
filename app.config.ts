import type { ConfigContext, ExpoConfig } from 'expo/config';
import googleAuth from './constants/google-auth.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || googleAuth.iosClientId;
  const plugins = (config.plugins ?? []).filter(plugin =>
    (typeof plugin === 'string' ? plugin : plugin[0]) !== '@react-native-google-signin/google-signin');
  if (iosClientId) {
    plugins.push(['@react-native-google-signin/google-signin', {
      iosUrlScheme: iosClientId.split('.').reverse().join('.'),
    }]);
  }
  return { ...config, name: config.name ?? 'AthleTrack AI', slug: config.slug ?? 'pt_react_native', plugins };
};
