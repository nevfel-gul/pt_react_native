import type { ThemeUI } from '@/constants/types';
import { useTheme } from '@/constants/usetheme';
import { track } from '@/services/analytics';
import { auth } from '@/services/firebase';
import { appointmentsColRef } from '@/services/firestorePaths';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { limit, onSnapshot, query } from 'firebase/firestore';
import { Check, ChevronRight, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ─────────────────────────────────────────────────────────────
// Ana sayfadaki "Başlarken" kartı.
//
// Yeni hocayı uygulamanın değerini gördüğü ana götürür:
//   1. İlk öğrenci   → 2. İlk ölçüm   → 3. İlk randevu   → 4. Widget
// İlk üç adım gerçek veriden anlaşılır (elle işaretlenmez); widget'ın
// eklenip eklenmediğini uygulama bilemediği için o adımı hoca onaylar.
// Hepsi bitince ya da kart kapatılınca bir daha görünmez (hesap başına).
// Her adım PostHog'a gider: hocaların nerede koptuğu oradan görülür.
// ─────────────────────────────────────────────────────────────

type StepId = 'student' | 'record' | 'appointment' | 'widget';

const keyFor = (uid: string, what: 'dismissed' | 'widget' | 'completed') => `onboarding:${uid}:${what}`;

export default function OnboardingChecklist({
  studentCount,
  recordCount,
  firstStudentId,
}: {
  studentCount: number;
  recordCount: number;
  firstStudentId: string | null;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const uid = auth.currentUser?.uid ?? null;

  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [widgetDone, setWidgetDone] = useState(false);
  const [hasAppointment, setHasAppointment] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const [d, w, c] = await AsyncStorage.multiGet([
          keyFor(uid, 'dismissed'),
          keyFor(uid, 'widget'),
          keyFor(uid, 'completed'),
        ]);
        if (cancelled) return;
        setDismissed(!!d[1] || !!c[1]);
        setWidgetDone(!!w[1]);
      } catch {
        if (!cancelled) setDismissed(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Randevu var mı — tek doküman yeter.
  useEffect(() => {
    if (!uid || dismissed) return;
    return onSnapshot(query(appointmentsColRef(uid), limit(1)), (snap) => setHasAppointment(!snap.empty));
  }, [uid, dismissed]);

  const steps: { id: StepId; done: boolean; title: string; desc: string; onPress: () => void }[] = [
    {
      id: 'student',
      done: studentCount > 0,
      title: t('onboarding.checklist.student.title'),
      desc: t('onboarding.checklist.student.desc'),
      onPress: () => router.push('/newstudent'),
    },
    {
      id: 'record',
      done: recordCount > 0,
      title: t('onboarding.checklist.record.title'),
      desc: t('onboarding.checklist.record.desc'),
      onPress: () =>
        firstStudentId
          ? router.push({ pathname: '/newrecord/[id]', params: { id: firstStudentId } })
          : router.push('/newstudent'),
    },
    {
      id: 'appointment',
      done: hasAppointment,
      title: t('onboarding.checklist.appointment.title'),
      desc: t('onboarding.checklist.appointment.desc'),
      onPress: () => router.push('/(tabs)/calendar'),
    },
    {
      id: 'widget',
      done: widgetDone,
      title: t('onboarding.checklist.widget.title'),
      desc: t('onboarding.checklist.widget.desc'),
      onPress: () =>
        Alert.alert(
          t('onboarding.checklist.widget.title'),
          Platform.OS === 'ios' ? t('onboarding.checklist.widget.howIos') : t('onboarding.checklist.widget.howAndroid'),
          [
            { text: t('onboarding.checklist.widget.later'), style: 'cancel' },
            {
              text: t('onboarding.checklist.widget.added'),
              onPress: () => {
                setWidgetDone(true);
                if (uid) AsyncStorage.setItem(keyFor(uid, 'widget'), '1').catch(() => { });
              },
            },
          ],
        ),
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const nextStep = steps.find((s) => !s.done) ?? null;

  // Adım tamamlanınca bir kez event at (açılışta zaten tamam olanları sayma).
  const seen = useRef<Record<string, boolean> | null>(null);
  useEffect(() => {
    if (!ready || dismissed) return;
    const now = Object.fromEntries(steps.map((s) => [s.id, s.done]));
    if (seen.current) {
      for (const s of steps) {
        if (s.done && !seen.current[s.id]) track('onboarding_step_completed', { step: s.id, doneCount });
      }
    }
    seen.current = now;
    if (allDone && uid) {
      track('onboarding_completed');
      AsyncStorage.setItem(keyFor(uid, 'completed'), '1').catch(() => { });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, dismissed, studentCount > 0, recordCount > 0, hasAppointment, widgetDone]);

  useEffect(() => {
    if (ready && !dismissed && !allDone) track('onboarding_viewed', { doneCount });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, dismissed]);

  if (!uid || !ready || dismissed || allDone) return null;

  const dismiss = () => {
    track('onboarding_dismissed', { doneCount });
    setDismissed(true);
    AsyncStorage.setItem(keyFor(uid, 'dismissed'), '1').catch(() => { });
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('onboarding.checklist.title')}</Text>
          <Text style={styles.subtitle}>
            {t('onboarding.checklist.progress', { done: doneCount, total: steps.length })}
          </Text>
        </View>
        <TouchableOpacity onPress={dismiss} hitSlop={12} accessibilityLabel={t('onboarding.checklist.dismiss')}>
          <X size={18} color={theme.colors.text.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${(doneCount / steps.length) * 100}%` }]} />
      </View>

      {steps.map((s, i) => {
        const isNext = s.id === nextStep?.id;
        return (
          <TouchableOpacity
            key={s.id}
            style={[styles.step, isNext && styles.stepNext]}
            disabled={s.done}
            onPress={() => {
              track('onboarding_step_tapped', { step: s.id });
              s.onPress();
            }}
          >
            <View style={[styles.dot, s.done && styles.dotDone, isNext && styles.dotNext]}>
              {s.done ? (
                <Check size={13} color="#fff" />
              ) : (
                <Text style={[styles.dotText, isNext && { color: theme.colors.text.onAccent }]}>{i + 1}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stepTitle, s.done && styles.stepTitleDone]}>{s.title}</Text>
              {isNext ? <Text style={styles.stepDesc}>{s.desc}</Text> : null}
            </View>
            {!s.done ? <ChevronRight size={16} color={isNext ? theme.colors.accent : theme.colors.text.muted} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function makeStyles(theme: ThemeUI) {
  return StyleSheet.create({
    card: {
      marginBottom: 14,
      padding: 14,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.surface,
      ...(theme.shadow?.soft ?? {}),
    },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    title: { color: theme.colors.text.primary, fontSize: theme.fontSize.lg, fontWeight: '800' },
    subtitle: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, marginTop: 2 },
    barTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.surfaceSoft,
      marginTop: 10,
      marginBottom: 6,
      overflow: 'hidden',
    },
    barFill: { height: 6, borderRadius: 3, backgroundColor: theme.colors.accent },
    step: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 9,
      paddingHorizontal: 8,
      borderRadius: theme.radius.md,
      marginTop: 4,
    },
    stepNext: { backgroundColor: theme.colors.accentSoft },
    dot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceSoft,
    },
    dotDone: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
    dotNext: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
    dotText: { color: theme.colors.text.secondary, fontSize: theme.fontSize.xs, fontWeight: '800' },
    stepTitle: { color: theme.colors.text.primary, fontSize: theme.fontSize.md, fontWeight: '700' },
    stepTitleDone: { color: theme.colors.text.muted, textDecorationLine: 'line-through' },
    stepDesc: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, marginTop: 2, lineHeight: 18 },
  });
}
