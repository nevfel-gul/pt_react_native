import type { ThemeUI } from '@/constants/types';
import { appLocale, formatPercent } from "@/constants/languages";
import { useTheme } from '@/constants/usetheme';
import { normalizeGoals } from '@/constants/studentForm';
import { track } from '@/services/analytics';
import { auth } from '@/services/firebase';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { Share2, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';

// ─────────────────────────────────────────────────────────────
// Instagram / WhatsApp "dönüşüm kartı" (hikâye boyutu, 1080×1920).
//
// İlk ve son ölçüm karşılaştırılır; hedefe göre en çok gelişen ölçüler
// otomatik seçilir, hoca istediğini açıp kapatır. Fotoğraf yok, sadece
// rakamlar. Öğrencinin adı varsayılan olarak GİZLİ (paylaşım öğrencinin
// onayını gerektirir); hoca baş harf ya da ilk isim seçebilir.
// Köşedeki küçük "AthleTrack" yazısı uygulamanın tanıtımı.
// ─────────────────────────────────────────────────────────────

type MetricId = 'weight' | 'bodyFat' | 'waist' | 'hip' | 'muscle' | 'plank' | 'pushup' | 'vo2';

type Metric = {
  id: MetricId;
  from: number;
  to: number;
  unit: string;
  /** Bu öğrenci için "iyi" yön: -1 azalma iyi, +1 artış iyi. */
  goodDir: 1 | -1;
  decimals: number;
};

type NameMode = 'hidden' | 'initials' | 'first';

const THEMES = {
  ocean: ['#0c4a6e', '#0284c7', '#38bdf8'],
  violet: ['#2e1065', '#6d28d9', '#a78bfa'],
  night: ['#020617', '#0f172a', '#334155'],
} as const;
type ThemeId = keyof typeof THEMES;

const num = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const ms = (r: any) => r?.createdAt?.toMillis?.() ?? 0;

function buildMetrics(records: any[], goals: string[]): Metric[] {
  const sorted = [...records].sort((a, b) => ms(a) - ms(b));
  const muscleGoal = goals.includes('muscle_gain') && !goals.includes('fat_loss');
  const defs: { id: MetricId; get: (r: any) => number | null; unit: string; goodDir: 1 | -1; decimals: number }[] = [
    { id: 'weight', get: (r) => num(r.weight), unit: 'kg', goodDir: muscleGoal ? 1 : -1, decimals: 1 },
    { id: 'bodyFat', get: (r) => num(r.bodyFat), unit: '%', goodDir: -1, decimals: 1 },
    { id: 'waist', get: (r) => num(r.bel), unit: 'cm', goodDir: -1, decimals: 0 },
    { id: 'hip', get: (r) => num(r.kalca), unit: 'cm', goodDir: -1, decimals: 0 },
    { id: 'muscle', get: (r) => num(r.totalMuscleMass), unit: 'kg', goodDir: 1, decimals: 1 },
    { id: 'plank', get: (r) => num(r.plank), unit: 'sn', goodDir: 1, decimals: 0 },
    { id: 'pushup', get: (r) => num(r.pushup), unit: '', goodDir: 1, decimals: 0 },
    { id: 'vo2', get: (r) => num(r.analysis?.bruceVO2Max), unit: '', goodDir: 1, decimals: 1 },
  ];
  const out: Metric[] = [];
  for (const d of defs) {
    const first = sorted.find((r) => d.get(r) != null);
    const last = [...sorted].reverse().find((r) => d.get(r) != null);
    if (!first || !last || first === last) continue;
    out.push({ id: d.id, from: d.get(first)!, to: d.get(last)!, unit: d.unit, goodDir: d.goodDir, decimals: d.decimals });
  }
  return out;
}

/** Hedef yönünde göreli gelişim (0 = değişim yok / kötüleşme). */
const gain = (m: Metric) => Math.max(0, ((m.to - m.from) / m.from) * m.goodDir);

function fmt(n: number, decimals: number, locale: string) {
  return n.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Yüzde işareti dile göre (constants/languages.ts → formatPercent). */
function pct(m: Metric, value: string, _locale: string) {
  return m.unit === '%' ? formatPercent(value) : value;
}

function displayName(full: string, mode: NameMode, fallback: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (mode === 'hidden' || !parts.length) return fallback;
  if (mode === 'first') return parts[0];
  return parts.map((p) => p[0].toUpperCase() + '.').join(' ');
}

export default function TransformationCard({
  visible,
  onClose,
  student,
  records,
}: {
  visible: boolean;
  onClose: () => void;
  student: { name: string; trainingGoals?: string[] };
  records: any[];
}) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width: screenW } = useWindowDimensions();
  const locale = appLocale();
  const cardRef = useRef<View>(null);

  const goals = useMemo(() => normalizeGoals(student.trainingGoals), [student.trainingGoals]);
  const metrics = useMemo(() => buildMetrics(records, goals), [records, goals]);
  const improved = useMemo(() => metrics.filter((m) => gain(m) > 0), [metrics]);

  const [selected, setSelected] = useState<MetricId[]>([]);
  const [nameMode, setNameMode] = useState<NameMode>('hidden');
  const [themeId, setThemeId] = useState<ThemeId>('ocean');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!visible) return;
    // Varsayılan: en çok gelişen 4 ölçü.
    setSelected([...improved].sort((a, b) => gain(b) - gain(a)).slice(0, 4).map((m) => m.id));
    track('transformation_card_opened', { improved: improved.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const sorted = useMemo(() => [...records].sort((a, b) => ms(a) - ms(b)), [records]);
  const weeks = sorted.length >= 2 ? Math.max(1, Math.round((ms(sorted[sorted.length - 1]) - ms(sorted[0])) / (7 * 86_400_000))) : 0;
  const shown = metrics.filter((m) => selected.includes(m.id));
  const coach = auth.currentUser?.displayName?.trim() || '';

  // Önizleme 9:16; paylaşımda 1080×1920'e ölçeklenir.
  const previewW = Math.min(screenW - 64, 300);
  const previewH = (previewW * 16) / 9;
  const s = previewW / 300; // tasarım 300 genişliğe göre

  const toggle = (id: MetricId) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 4 ? prev : [...prev, id]));

  const share = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, width: 1080, height: 1920, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) throw new Error('sharing_unavailable');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: t('transformation.title') });
      track('transformation_card_shared', { metrics: shown.length, nameMode, theme: themeId, weeks });
    } catch (e) {
      console.warn('[TransformationCard]', e);
      Alert.alert(t('common.error'), t('transformation.shareError'));
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('transformation.title')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <X size={22} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>

        {metrics.length === 0 || weeks === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('transformation.needTwo')}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 40, alignItems: 'center' }}>
            {/* ── Paylaşılacak kart ── */}
            <View ref={cardRef} collapsable={false} style={{ width: previewW, height: previewH, borderRadius: 16 * s, overflow: 'hidden' }}>
              <LinearGradient colors={THEMES[themeId] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 22 * s }}>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 * s, fontWeight: '800', letterSpacing: 2 * s }}>
                  {t('transformation.kicker')}
                </Text>
                <Text style={{ color: '#fff', fontSize: 34 * s, fontWeight: '900', marginTop: 6 * s, lineHeight: 38 * s }}>
                  {t('transformation.headline', { count: weeks })}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 * s, marginTop: 6 * s, fontWeight: '600' }}>
                  {displayName(student.name, nameMode, t('transformation.anonymous'))}
                </Text>

                <View style={{ flex: 1, justifyContent: 'center', gap: 10 * s }}>
                  {shown.map((m) => {
                    const d = m.to - m.from;
                    const good = d * m.goodDir > 0;
                    const sign = d > 0 ? '+' : '−';
                    const unit = m.unit === '%' ? t('transformation.points') : m.unit;
                    return (
                      <View key={m.id} style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12 * s, paddingVertical: 10 * s, paddingHorizontal: 14 * s }}>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 * s, fontWeight: '700' }}>
                          {t(`transformation.metric.${m.id}`)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                          <Text style={{ color: good ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: 26 * s, fontWeight: '900' }}>
                            {sign}{fmt(Math.abs(d), m.decimals, locale)}{unit ? ` ${unit}` : ''}
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 * s, fontWeight: '600' }}>
                            {pct(m, fmt(m.from, m.decimals, locale), locale)} → {pct(m, fmt(m.to, m.decimals, locale), locale)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <View>
                    {coach ? (
                      <>
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 * s }}>{t('transformation.coachedBy')}</Text>
                        <Text style={{ color: '#fff', fontSize: 14 * s, fontWeight: '800' }}>{coach}</Text>
                      </>
                    ) : null}
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9 * s, fontWeight: '700' }}>AthleTrack</Text>
                </View>
              </LinearGradient>
            </View>

            {/* ── Ayarlar ── */}
            <View style={styles.controls}>
              <Text style={styles.label}>{t('transformation.pickMetrics')}</Text>
              <View style={styles.chipRow}>
                {metrics.map((m) => {
                  const on = selected.includes(m.id);
                  return (
                    <TouchableOpacity key={m.id} style={[styles.chip, on && styles.chipOn]} onPress={() => toggle(m.id)}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(`transformation.metric.${m.id}`)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>{t('transformation.nameLabel')}</Text>
              <View style={styles.chipRow}>
                {(['hidden', 'initials', 'first'] as NameMode[]).map((mode) => (
                  <TouchableOpacity key={mode} style={[styles.chip, nameMode === mode && styles.chipOn]} onPress={() => setNameMode(mode)}>
                    <Text style={[styles.chipText, nameMode === mode && styles.chipTextOn]}>{t(`transformation.name.${mode}`)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {nameMode !== 'hidden' ? <Text style={styles.hint}>{t('transformation.consentHint')}</Text> : null}

              <Text style={styles.label}>{t('transformation.color')}</Text>
              <View style={styles.chipRow}>
                {(Object.keys(THEMES) as ThemeId[]).map((id) => (
                  <TouchableOpacity
                    key={id}
                    onPress={() => setThemeId(id)}
                    style={[styles.swatch, { backgroundColor: THEMES[id][1] }, themeId === id && styles.swatchOn]}
                  />
                ))}
              </View>

              <TouchableOpacity style={[styles.shareBtn, (sharing || !shown.length) && { opacity: 0.6 }]} disabled={sharing || !shown.length} onPress={share}>
                {sharing ? <ActivityIndicator color="#fff" /> : <Share2 size={18} color="#fff" />}
                <Text style={styles.shareText}>{t('transformation.share')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function makeStyles(theme: ThemeUI) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background, paddingTop: 56 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
    headerTitle: { color: theme.colors.text.primary, fontSize: theme.fontSize.title, fontWeight: '800' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyText: { color: theme.colors.text.secondary, fontSize: theme.fontSize.md, textAlign: 'center', lineHeight: 22 },
    controls: { alignSelf: 'stretch', paddingHorizontal: 20, marginTop: 20, maxWidth: 560, width: '100%' },
    label: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, fontWeight: '700', marginTop: 14, marginBottom: 8 },
    hint: { color: theme.colors.warning, fontSize: theme.fontSize.xs, marginTop: -2 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSoft,
    },
    chipOn: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
    chipText: { color: theme.colors.text.primary, fontSize: theme.fontSize.sm, fontWeight: '700' },
    chipTextOn: { color: theme.colors.text.onAccent },
    swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
    swatchOn: { borderColor: theme.colors.text.primary },
    shareBtn: {
      marginTop: 22,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.accent,
    },
    shareText: { color: theme.colors.text.onAccent, fontWeight: '800', fontSize: theme.fontSize.md },
  });
}
