import React, { useState } from 'react';
import { Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthButton, AuthForm, AuthInput } from '@/components/auth-form';
import { requestPasswordReset } from '@/services/passwordReset';
import { normalizeLanguage } from '@/constants/languages';
import { track } from '@/services/analytics';
import { useTheme } from '@/constants/usetheme';

export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const submit = async () => {
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError(t('login.error.invalid_email')); return; }
    setBusy(true); setError('');
    try {
      await requestPasswordReset({ email: email.trim(), locale: normalizeLanguage(i18n.language) });
      track('password_reset_requested'); setSent(true);
    } catch (e: any) { setError(t(e?.code === 'functions/resource-exhausted' ? 'login.forgot.tooMany' : 'login.forgot.failed')); }
    finally { setBusy(false); }
  };
  return <AuthForm title={t('login.forgot_password')} description={t(sent ? 'login.forgot.sent' : 'forgot.description')}>
    <Stack.Screen options={{ headerShown: false }} />
    {!sent && <><AuthInput value={email} onChangeText={setEmail} editable={!busy} autoCapitalize="none" autoCorrect={false}
      keyboardType="email-address" textContentType="emailAddress" autoComplete="email" placeholder={t('login.placeholder.email')} accessibilityLabel={t('login.placeholder.email')} />
      <AuthButton title={t('forgot.send')} busy={busy} onPress={submit} /></>}
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.colors.text.primary }}>{error}</Text>}
    <AuthButton title={t('forgot.back')} secondary disabled={busy} onPress={() => router.replace('/login')} />
  </AuthForm>;
}
