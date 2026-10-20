import React, { useEffect, useState } from 'react';
import { getAdditionalUserInfo } from 'firebase/auth';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/constants/usetheme';
import { signInSocial } from '@/services/social-auth';
import { track } from '@/services/analytics';

type Props = {
  busy: boolean;
  isRegistration: boolean;
  legalAccepted: boolean;
  onBusyChange: (busy: boolean) => void;
  onRegistrationRequired: () => void;
};

function GoogleMark() {
  return <Svg width={20} height={20} viewBox="0 0 48 48" accessible={false}>
    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z" />
    <Path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.87 23.87 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z" />
    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
  </Svg>;
}

export function SocialSignIn({ busy, isRegistration, legalAccepted, onBusyChange, onRegistrationRequired }: Props) {
  const [working, setWorking] = useState<'google' | 'apple' | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS === 'web');
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
  }, []);
  const signIn = async (provider: 'google' | 'apple') => {
    if (busy || working) return;
    if (isRegistration && !legalAccepted) { Alert.alert(t('login.error.prefix'), t('login.error.legal_required')); return; }
    setWorking(provider);
    onBusyChange(true);
    try {
      const result = await signInSocial(provider, legalAccepted);
      if (!result) return;
      track(getAdditionalUserInfo(result)?.isNewUser ? 'signup_completed' : 'login_completed', { method: provider });
      router.replace('/(tabs)');
    } catch (error: any) {
      if (error?.code === 'social/registration-required') {
        onRegistrationRequired();
        Alert.alert(t('login.header.join_us'), t('social.registrationRequired'));
        return;
      }
      if (['ERR_REQUEST_CANCELED', 'SIGN_IN_CANCELLED', 'auth/popup-closed-by-user'].includes(error?.code)) return;
      Alert.alert(t('login.error.prefix'), t(error?.code === 'social/not-configured' ? 'social.notConfigured' : error?.code === 'auth/account-exists-with-different-credential' ? 'social.existing' : 'login.error.generic'));
    } finally { setWorking(null); onBusyChange(false); }
  };
  const disabled = busy || working !== null;
  const isDark = mode === 'dark';
  const googleText = isDark ? '#E3E3E3' : '#1F1F1F';
  return <View style={styles.container}>
    <View style={styles.divider}>
      <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
      <Text style={[styles.dividerText, { color: theme.colors.text.secondary }]}>{t('social.or')}</Text>
      <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
    </View>
    <View style={[styles.buttons, disabled && styles.disabled]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('social.google')}
        accessibilityState={{ disabled, busy: working === 'google' }}
        disabled={disabled} onPress={() => signIn('google')}
        style={({ pressed }) => [styles.providerButton, {
          backgroundColor: isDark ? '#131314' : '#FFFFFF',
          borderColor: isDark ? '#8E918F' : '#747775',
        }, pressed && styles.pressed]}>
        <View style={styles.brandIcon}>
          {working === 'google' ? <ActivityIndicator size="small" color={googleText} /> : <GoogleMark />}
        </View>
        <Text style={[styles.providerText, { color: googleText }]}>{t('social.google')}</Text>
      </Pressable>
      {appleAvailable && <Pressable disabled={disabled}
        onPress={() => signIn('apple')} accessibilityRole="button" accessibilityLabel={t('social.apple')}
        accessibilityState={{ disabled, busy: working === 'apple' }}
        style={({ pressed }) => [styles.providerButton, styles.appleButton, {
          borderColor: isDark ? '#424650' : '#000000',
        }, pressed && styles.pressed]}>
        <View style={styles.brandIcon}>
          {working === 'apple' ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <FontAwesome name="apple" size={22} color="#FFFFFF" />}
        </View>
        <Text style={[styles.providerText, styles.appleText]}>{t('social.apple')}</Text>
      </Pressable>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { marginTop: 20, gap: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 12, fontWeight: '400' },
  buttons: { gap: 10 },
  providerButton: {
    minHeight: 50, paddingVertical: 13, paddingHorizontal: 16, gap: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 12, borderCurve: 'continuous',
  },
  brandIcon: { width: 22, alignItems: 'center', justifyContent: 'center' },
  providerText: { flexShrink: 1, fontSize: 15, fontWeight: '500', lineHeight: 22 },
  appleButton: { backgroundColor: '#000000' },
  appleText: { color: '#FFFFFF' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});
