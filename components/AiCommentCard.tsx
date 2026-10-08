import { usePremium } from '@/constants/PremiumContext';
import type { ThemeUI } from '@/constants/types';
import { useTheme } from '@/constants/usetheme';
import { aiCommentErrorKey, generateRecordAiComment, type RecordAiComment } from '@/services/aiComment';
import { track } from '@/services/analytics';
import { auth } from '@/services/firebase';
import { recordDocRef } from '@/services/firestorePaths';
import { useRouter } from 'expo-router';
import { onSnapshot } from 'firebase/firestore';
import { Lock, RefreshCw, Sparkles } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ─────────────────────────────────────────────────────────────
// Kayıt detayındaki "AI yorumu" kartı.
//
// Yorum ölçüm kaydedilince arka planda üretilir (newrecord). Kart kaydı
// canlı dinler: yorum gelince kendiliğinden görünür. Kayıtta yorum yoksa
// (eski kayıt ya da üretim başarısız olduysa) kart bir kez kendisi ister.
// Premium değilse kilitli tanıtım gösterir.
// ─────────────────────────────────────────────────────────────

/** Ölçüm ekranındaki arka plan isteğine tanınan süre. */
const BACKGROUND_GRACE_MS = 45_000;

export default function AiCommentCard({ recordId }: { recordId: string }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { hasPremium, loading: premiumLoading } = usePremium();
  const uid = auth.currentUser?.uid;

  const [comment, setComment] = useState<RecordAiComment | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requested = useRef(false);
  const [createdMs, setCreatedMs] = useState<number | null>(null);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(recordDocRef(uid, recordId), (snap) => {
      const c = (snap.data()?.aiComment as RecordAiComment) ?? null;
      setComment(c);
      if (c) setBusy(false);
      setCreatedMs(snap.data()?.createdAt?.toMillis?.() ?? null);
      setLoaded(true);
    });
  }, [uid, recordId]);

  const generate = async (force: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const c = await generateRecordAiComment(recordId, force);
      setComment(c);
      track(force ? 'ai_comment_regenerated' : 'ai_comment_generated', { compared: c.comparedToPrevious, source: 'record_detail' });
    } catch (e: any) {
      const key = aiCommentErrorKey(e);
      setError(key);
      track('ai_comment_failed', { code: e?.code ?? 'unknown' });
      if (force) Alert.alert(t('aiComment.title'), t(key));
    } finally {
      setBusy(false);
    }
  };

  // Yorum yoksa bir kez iste. Kayıt yeni kaydedildiyse ölçüm ekranının
  // arka planda başlattığı istek sürüyor olabilir: model iki kez çağrılmasın
  // diye önce onun yetişmesini bekle.
  useEffect(() => {
    if (!loaded || comment || requested.current || premiumLoading || !hasPremium) return;
    const age = createdMs ? Date.now() - createdMs : Infinity;
    const wait = age < BACKGROUND_GRACE_MS ? BACKGROUND_GRACE_MS - age : 0;
    const timer = setTimeout(() => {
      if (requested.current) return;
      requested.current = true;
      generate(false);
    }, wait);
    if (wait > 0) setBusy(true);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, comment, premiumLoading, hasPremium, createdMs]);

  if (!uid || !loaded || premiumLoading) return null;

  if (!hasPremium) {
    return (
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Sparkles size={18} color={theme.colors.premium} />
          <Text style={styles.title}>{t('aiComment.title')}</Text>
          <Lock size={14} color={theme.colors.premium} />
        </View>
        <Text style={styles.muted}>{t('aiComment.locked')}</Text>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: theme.colors.premium }]}
          onPress={() => {
            track('premium_feature_tapped', { feature: 'ai_comment' });
            router.push({ pathname: '/(tabs)/premium', params: { source: 'ai_comment' } } as any);
          }}
        >
          <Text style={styles.ctaText}>{t('packages.locked.cta')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Sparkles size={18} color={theme.colors.accent} />
        <Text style={styles.title}>{t('aiComment.title')}</Text>
        {comment && !busy ? (
          <TouchableOpacity onPress={() => generate(true)} hitSlop={10} accessibilityLabel={t('aiComment.regenerate')}>
            <RefreshCw size={15} color={theme.colors.text.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {busy && !comment ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={styles.muted}>{t('aiComment.generating')}</Text>
        </View>
      ) : !comment ? (
        <View>
          <Text style={styles.muted}>{t(error ?? 'aiComment.error.generic')}</Text>
          <TouchableOpacity onPress={() => generate(false)} style={{ marginTop: 8 }}>
            <Text style={styles.link}>{t('aiComment.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={busy ? { opacity: 0.5 } : undefined}>
          <Text style={styles.summary}>{comment.summary}</Text>

          {comment.highlights.length > 0 && (
            <Section title={t('aiComment.highlights')} items={comment.highlights} color={theme.colors.success} styles={styles} />
          )}
          {comment.warnings.length > 0 && (
            <Section title={t('aiComment.warnings')} items={comment.warnings} color={theme.colors.warning} styles={styles} />
          )}
          {comment.nextSteps.length > 0 && (
            <Section title={t('aiComment.nextSteps')} items={comment.nextSteps} color={theme.colors.accent} styles={styles} />
          )}

          <Text style={styles.disclaimer}>
            {comment.comparedToPrevious ? t('aiComment.comparedNote') : t('aiComment.firstNote')} · {t('aiComment.disclaimer')}
          </Text>
        </View>
      )}
    </View>
  );
}

function Section({ title, items, color, styles }: { title: string; items: string[]; color: string; styles: Styles }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      {items.map((it, i) => (
        <View key={i} style={styles.itemRow}>
          <View style={[styles.bullet, { backgroundColor: color }]} />
          <Text style={styles.item}>{it}</Text>
        </View>
      ))}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(theme: ThemeUI) {
  return StyleSheet.create({
    card: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      padding: theme.spacing.md,
      ...(theme.shadow?.soft ?? {}),
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    title: { flex: 1, color: theme.colors.text.primary, fontSize: theme.fontSize.lg - 1, fontWeight: '800' },
    summary: { color: theme.colors.text.primary, fontSize: theme.fontSize.md, lineHeight: 21 },
    sectionTitle: { fontSize: theme.fontSize.xs, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
    itemRow: { flexDirection: 'row', gap: 8, marginTop: 5, alignItems: 'flex-start' },
    bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
    item: { flex: 1, color: theme.colors.text.primary, fontSize: theme.fontSize.sm, lineHeight: 19 },
    muted: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, lineHeight: 19 },
    link: { color: theme.colors.accent, fontSize: theme.fontSize.sm, fontWeight: '700' },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
    disclaimer: { color: theme.colors.text.muted, fontSize: theme.fontSize.xs, marginTop: 12 },
    cta: { marginTop: 12, paddingVertical: 11, borderRadius: theme.radius.pill, alignItems: 'center' },
    ctaText: { color: '#fff', fontWeight: '800', fontSize: theme.fontSize.md },
  });
}
