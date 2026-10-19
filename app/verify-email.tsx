import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { AuthButton, AuthForm, AuthInput } from '@/components/auth-form';
import { auth } from '@/services/firebase';
import { confirmEmailCode, requestEmailCode } from '@/services/account-security';
import { useTheme } from '@/constants/usetheme';

export default function VerifyEmail() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const started = useRef(false);
  const [message, setMessage] = useState('');
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const send = useCallback(async () => {
    if (busy || cooldown > 0) return;
    setBusy(true); setMessage('');
    try { await requestEmailCode(); setCooldown(60); setMessage(t('verify.sent')); }
    catch (e: any) { setMessage(t(e?.code === 'functions/resource-exhausted' ? 'verify.wait' : 'verify.sendFailed')); }
    finally { setBusy(false); }
  }, [busy, cooldown, t]);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void send();
  }, [send]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const confirm = async () => {
    if (busy || code.length !== 6) return;
    setBusy(true); setMessage('');
    try {
      await confirmEmailCode({ code });
      await auth.currentUser?.reload();
      await auth.currentUser?.getIdToken(true);
      router.replace('/(tabs)');
    } catch { setMessage(t('verify.invalid')); }
    finally { setBusy(false); }
  };
  return <AuthForm title={t('verify.title')} description={t('verify.description', { email: auth.currentUser?.email ?? '' })}>
    <Stack.Screen options={{ headerShown: false }} />
    <AuthInput value={code} onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))}
      keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} editable={!busy}
      placeholder="000000" accessibilityLabel={t('verify.code')} style={{ textAlign: 'center', fontSize: 28, letterSpacing: 8 }} />
    {!!message && <Text accessibilityRole="alert" style={{ color: theme.colors.text.primary }}>{message}</Text>}
    <AuthButton title={t('verify.confirm')} onPress={confirm} busy={busy} disabled={code.length !== 6} />
    <AuthButton title={`${t('verify.send')}${cooldown > 0 ? ` (${cooldown})` : ''}`} onPress={send} secondary disabled={busy || cooldown > 0} />
    <AuthButton title={t('settings.logout')} onPress={() => { void signOut(auth).then(() => router.replace('/login')); }} secondary disabled={busy} />
  </AuthForm>;
}
