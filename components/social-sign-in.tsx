import React, { useEffect, useState } from 'react';
import { getAdditionalUserInfo } from 'firebase/auth';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/constants/usetheme';
import { signInSocial } from '@/services/social-auth';
import { track } from '@/services/analytics';

export function SocialSignIn({ busy, legalAccepted, onBusyChange }: { busy: boolean; legalAccepted: boolean; onBusyChange: (busy: boolean) => void }) {
  const [working, setWorking] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS === 'web');
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
  }, []);
  const signIn = async (provider: 'google' | 'apple') => {
    if (busy || working) return;
    if (!legalAccepted) { Alert.alert(t('login.error.prefix'), t('login.error.legal_required')); return; }
    setWorking(true);
    onBusyChange(true);
    try {
      const result = await signInSocial(provider, legalAccepted);
      if (!result) return;
      track(getAdditionalUserInfo(result)?.isNewUser ? 'signup_completed' : 'login_completed', { method: provider });
      router.replace('/(tabs)');
    } catch (error: any) {
      if (['ERR_REQUEST_CANCELED', 'SIGN_IN_CANCELLED', 'auth/popup-closed-by-user'].includes(error?.code)) return;
      Alert.alert(t('login.error.prefix'), t(error?.code === 'social/not-configured' ? 'social.notConfigured' : error?.code === 'auth/account-exists-with-different-credential' ? 'social.existing' : 'login.error.generic'));
    } finally { setWorking(false); onBusyChange(false); }
  };
  return <View style={{ gap: 12, marginBottom: 18, opacity: busy || working ? 0.5 : 1 }}>
    <Pressable accessibilityRole="button" disabled={busy || working} onPress={() => signIn('google')}
      style={{ height: 48, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.colors.text.primary, fontWeight: '600' }}>{t('social.google')}</Text>
    </Pressable>
    {appleAvailable && Platform.OS === 'ios' && <View pointerEvents={busy || working ? 'none' : 'auto'}>
      <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={mode === 'dark' ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={10} style={{ height: 48, width: '100%' }} onPress={() => signIn('apple')} />
    </View>}
    {appleAvailable && Platform.OS === 'web' && <Pressable disabled={busy || working} onPress={() => signIn('apple')} accessibilityRole="button">
      <Text style={{ color: theme.colors.text.primary, textAlign: 'center', padding: 14 }}>{t('social.apple')}</Text>
    </Pressable>}
  </View>;
}
