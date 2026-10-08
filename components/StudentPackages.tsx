import { usePremium } from '@/constants/PremiumContext';
import type { ThemeUI } from '@/constants/types';
import { useTheme } from '@/constants/usetheme';
import { track } from '@/services/analytics';
import { auth } from '@/services/firebase';
import {
  createPackage,
  deletePackage,
  formatMoney,
  isExpired,
  logSession,
  PackageFullError,
  packagesColRef,
  recordPayment,
  remainingOf,
  sessionsColRef,
  sessionTime,
  undoLastSession,
  unpaidOf,
  type SessionLog,
  type SessionPackage,
} from '@/services/packages';
import { requestWidgetRefresh } from '@/services/widgetData';
import { onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { Lock, Minus, Package, Plus, RotateCcw, Trash2, Wallet } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ─────────────────────────────────────────────────────────────
// Öğrenci detayındaki "Paket & Seans" kartı (premium özellik).
// Veri katmanı: services/packages.ts
//
// Premium değilse kart kilitli görünür ve ödeme ekranına yönlendirir.
// Aboneliği biten biri eski paketinin kalan dersini görmeye devam eder
// ama ders düşemez / paket ekleyemez.
// ─────────────────────────────────────────────────────────────

const SESSION_PRESETS = [4, 8, 10, 12, 16, 20];
const VALIDITY_PRESETS = [0, 30, 60, 90]; // 0 = süresiz

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const x = new Date(y, (m || 1) - 1, d || 1);
  x.setDate(x.getDate() + days);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function isValidISO(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const x = new Date(y, m - 1, d);
  return x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d;
}

function parseAmount(s: string): number | null {
  const n = Number(String(s).replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, ''));
  return s.trim() && !isNaN(n) ? n : null;
}

export default function StudentPackages({ studentId }: { studentId: string }) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const uid = auth.currentUser?.uid;
  const locale = i18n.language === 'en' ? 'en-US' : 'tr-TR';
  const { hasPremium, loading: premiumLoading } = usePremium();
  const router = useRouter();

  const [packages, setPackages] = useState<SessionPackage[]>([]);
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      query(packagesColRef(uid, studentId), orderBy('createdAt', 'desc')),
      (snap) => {
        setPackages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [uid, studentId]);

  const active = packages.find((p) => !p.closedAt) ?? null;
  const past = packages.filter((p) => p.id !== active?.id);

  // Aktif paketin dersleri (tek alanlı sorgu; sıralama uygulamada).
  useEffect(() => {
    if (!uid || !active) {
      setSessions([]);
      return;
    }
    const unsub = onSnapshot(
      query(sessionsColRef(uid, studentId), where('packageId', '==', active.id)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        list.sort((a, b) => sessionTime(b) - sessionTime(a));
        setSessions(list);
      },
    );
    return unsub;
  }, [uid, studentId, active?.id]);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      requestWidgetRefresh();
    } catch (e: any) {
      if (e instanceof PackageFullError) {
        Alert.alert(t('packages.full.title'), t('packages.full.message'));
      } else {
        console.warn('[Packages]', e);
        Alert.alert(t('common.error'), t('packages.error'));
      }
    } finally {
      setBusy(false);
    }
  };

  // "Ders düş" önce isteğe bağlı ders notu sorar (SessionNoteModal).
  const [noteOpen, setNoteOpen] = useState(false);
  const onUseSession = () => active && setNoteOpen(true);
  const logWithNote = (note: string | null) =>
    active &&
    run(async () => {
      await logSession(uid!, studentId, active.id, { note });
      setNoteOpen(false);
      track('session_used', { source: 'manual', remaining: remainingOf(active) - 1, hasNote: !!note });
      if (note) track('session_note_added', { length: note.length });
    });

  const onUndo = () =>
    active &&
    Alert.alert(t('packages.undo.title'), t('packages.undo.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('packages.undo.action'),
        onPress: () =>
          run(async () => {
            const ok = await undoLastSession(uid!, studentId, active.id);
            if (ok) track('session_undone');
          }),
      },
    ]);

  const onDelete = (p: SessionPackage) =>
    Alert.alert(t('packages.delete.title'), t('packages.delete.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('packages.delete.action'),
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await deletePackage(uid!, studentId, p.id, p.id === active?.id);
            track('package_deleted', { wasActive: p.id === active?.id });
          }),
      },
    ]);

  if (!uid) return null;

  if (!premiumLoading && !hasPremium) {
    return (
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Package size={18} color={theme.colors.premium} />
          <Text style={styles.cardTitle}>{t('packages.title')}</Text>
          <View style={styles.premiumBadge}>
            <Lock size={11} color={theme.colors.premium} />
            <Text style={styles.premiumBadgeText}>Premium</Text>
          </View>
        </View>
        {active ? (
          <Text style={styles.muted}>
            {t('packages.locked.remaining', { count: remainingOf(active), total: active.totalSessions })}
          </Text>
        ) : null}
        <Text style={styles.muted}>{t('packages.locked.message')}</Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.colors.premium }]}
          onPress={() => {
            track('premium_feature_tapped', { feature: 'packages' });
            router.push({ pathname: '/(tabs)/premium', params: { source: 'packages' } } as any);
          }}
        >
          <Text style={[styles.primaryBtnText, { color: '#fff' }]}>{t('packages.locked.cta')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Package size={18} color={theme.colors.accent} />
        <Text style={styles.cardTitle}>{t('packages.title')}</Text>
        {busy ? <ActivityIndicator size="small" color={theme.colors.accent} /> : null}
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginVertical: 12 }} />
      ) : !active ? (
        <>
          <Text style={styles.muted}>{t('packages.empty')}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setNewOpen(true)}>
            <Plus size={16} color={theme.colors.text.onAccent} />
            <Text style={styles.primaryBtnText}>{t('packages.new')}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <ActivePackage
          pkg={active}
          sessions={sessions}
          styles={styles}
          theme={theme}
          locale={locale}
          busy={busy}
          onUse={onUseSession}
          onUndo={onUndo}
          onPay={() => setPayOpen(true)}
          onNew={() => setNewOpen(true)}
          onDelete={() => onDelete(active)}
        />
      )}

      {past.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <TouchableOpacity onPress={() => setHistoryOpen((v) => !v)}>
            <Text style={styles.link}>
              {historyOpen ? t('packages.history.hide') : t('packages.history.show', { count: past.length })}
            </Text>
          </TouchableOpacity>
          {historyOpen &&
            past.map((p) => (
              <View key={p.id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle}>
                    {t('packages.history.item', { used: p.usedSessions, total: p.totalSessions })}
                  </Text>
                  <Text style={styles.muted}>
                    {p.startDate}
                    {p.price != null ? ` · ${formatMoney(p.price, p.currency, locale)}` : ''}
                    {unpaidOf(p) > 0 ? ` · ${t('packages.unpaid', { amount: formatMoney(unpaidOf(p), p.currency, locale) })}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => onDelete(p)} hitSlop={10}>
                  <Trash2 size={16} color={theme.colors.text.muted} />
                </TouchableOpacity>
              </View>
            ))}
        </View>
      )}

      <NewPackageModal
        visible={newOpen}
        onClose={() => setNewOpen(false)}
        styles={styles}
        theme={theme}
        previous={active}
        onSave={(input) =>
          run(async () => {
            await createPackage(uid, studentId, input, active?.id ?? null);
            track('package_created', {
              totalSessions: input.totalSessions,
              hasPrice: input.price != null,
              paidUpfront: input.price != null && input.paidAmount >= input.price,
              hasEndDate: !!input.endDate,
            });
            setNewOpen(false);
          })
        }
      />

      <SessionNoteModal
        visible={noteOpen}
        busy={busy}
        onClose={() => setNoteOpen(false)}
        onSave={logWithNote}
        styles={styles}
        theme={theme}
      />

      {active && (
        <PaymentModal
          visible={payOpen}
          onClose={() => setPayOpen(false)}
          styles={styles}
          theme={theme}
          unpaid={unpaidOf(active)}
          currency={active.currency}
          locale={locale}
          onSave={(amount) =>
            run(async () => {
              await recordPayment(uid, studentId, active.id, amount);
              track('package_payment_recorded', { fullyPaid: amount >= unpaidOf(active) });
              setPayOpen(false);
            })
          }
        />
      )}
    </View>
  );
}

function ActivePackage({
  pkg,
  sessions,
  styles,
  theme,
  locale,
  busy,
  onUse,
  onUndo,
  onPay,
  onNew,
  onDelete,
}: {
  pkg: SessionPackage;
  sessions: SessionLog[];
  styles: Styles;
  theme: ThemeUI;
  locale: string;
  busy: boolean;
  onUse: () => void;
  onUndo: () => void;
  onPay: () => void;
  onNew: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const remaining = remainingOf(pkg);
  const unpaid = unpaidOf(pkg);
  const expired = isExpired(pkg);
  const finished = remaining === 0;
  const ratio = pkg.totalSessions ? pkg.usedSessions / pkg.totalSessions : 0;
  const barColor = finished ? theme.colors.danger : remaining <= 2 ? theme.colors.warning : theme.colors.accent;

  return (
    <View>
      <View style={styles.bigRow}>
        <Text style={[styles.bigNumber, { color: barColor }]}>{remaining}</Text>
        <Text style={styles.bigLabel}>
          {t('packages.remaining', { total: pkg.totalSessions, used: pkg.usedSessions })}
        </Text>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.min(100, ratio * 100)}%`, backgroundColor: barColor }]} />
      </View>

      <Text style={styles.muted}>
        {t('packages.started', { date: pkg.startDate })}
        {pkg.endDate ? ` · ${t(expired ? 'packages.expiredOn' : 'packages.validUntil', { date: pkg.endDate })}` : ''}
      </Text>

      {(finished || expired) && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{finished ? t('packages.finishedBanner') : t('packages.expiredBanner')}</Text>
        </View>
      )}

      {pkg.price != null && (
        <View style={styles.payRow}>
          <Wallet size={16} color={unpaid > 0 ? theme.colors.warning : theme.colors.success} />
          <Text style={styles.payText}>
            {unpaid > 0
              ? t('packages.paidPartial', {
                paid: formatMoney(pkg.paidAmount, pkg.currency, locale),
                price: formatMoney(pkg.price, pkg.currency, locale),
              })
              : t('packages.paidFull', { price: formatMoney(pkg.price, pkg.currency, locale) })}
          </Text>
          {unpaid > 0 && (
            <TouchableOpacity onPress={onPay} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>{t('packages.pay')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.primaryBtn, { flex: 1, marginTop: 0 }, (finished || busy) && { opacity: 0.5 }]}
          onPress={onUse}
          disabled={finished || busy}
        >
          <Minus size={16} color={theme.colors.text.onAccent} />
          <Text style={styles.primaryBtnText}>{t('packages.useSession')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, (pkg.usedSessions === 0 || busy) && { opacity: 0.4 }]}
          onPress={onUndo}
          disabled={pkg.usedSessions === 0 || busy}
          accessibilityLabel={t('packages.undo.action')}
        >
          <RotateCcw size={16} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.footerRow}>
        <TouchableOpacity onPress={onNew}>
          <Text style={styles.link}>{t('packages.new')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete}>
          <Text style={[styles.link, { color: theme.colors.text.muted }]}>{t('packages.delete.action')}</Text>
        </TouchableOpacity>
      </View>

      {sessions.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <Text style={styles.miniLabel}>{t('packages.recentSessions')}</Text>
          {sessions.slice(0, 5).map((s) => (
            <View key={s.id} style={{ marginTop: 4 }}>
              <Text style={styles.sessionLine}>
                • {s.date?.toDate?.().toLocaleDateString(locale, { day: 'numeric', month: 'short', weekday: 'short' }) ?? '-'}
                {s.source === 'appointment' ? `  (${t('packages.fromAppointment')})` : ''}
              </Text>
              {s.note ? <Text style={styles.sessionNote}>{s.note}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function NewPackageModal({
  visible,
  onClose,
  onSave,
  styles,
  theme,
  previous,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (input: Parameters<typeof createPackage>[2]) => void;
  styles: Styles;
  theme: ThemeUI;
  previous: SessionPackage | null;
}) {
  const { t } = useTranslation();
  const [total, setTotal] = useState('10');
  const [price, setPrice] = useState('');
  const [paid, setPaid] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [validity, setValidity] = useState(0);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) return;
    setTotal('10');
    setPrice('');
    setPaid('');
    setStartDate(todayISO());
    setValidity(0);
    setNote('');
  }, [visible]);

  const save = () => {
    const totalN = Number(total);
    if (!Number.isInteger(totalN) || totalN < 1 || totalN > 500) {
      Alert.alert(t('common.error'), t('packages.form.invalidTotal'));
      return;
    }
    if (!isValidISO(startDate)) {
      Alert.alert(t('common.error'), t('packages.form.invalidDate'));
      return;
    }
    const priceN = parseAmount(price);
    const paidN = parseAmount(paid) ?? 0;

    const doSave = () =>
      onSave({
        totalSessions: totalN,
        price: priceN,
        paidAmount: priceN != null ? Math.min(paidN, priceN) : 0,
        startDate,
        endDate: validity > 0 ? addDaysISO(startDate, validity) : null,
        note: note.trim() || null,
      });

    const prevRemaining = previous ? remainingOf(previous) : 0;
    if (previous && prevRemaining > 0) {
      Alert.alert(t('packages.form.replaceTitle'), t('packages.form.replaceMessage', { count: prevRemaining }), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('packages.form.replaceAction'), onPress: doSave },
      ]);
    } else {
      doSave();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => { }}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>{t('packages.new')}</Text>

              <Text style={styles.label}>{t('packages.form.total')}</Text>
              <View style={styles.chipRow}>
                {SESSION_PRESETS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.chip, total === String(n) && styles.chipActive]}
                    onPress={() => setTotal(String(n))}
                  >
                    <Text style={[styles.chipText, total === String(n) && styles.chipTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={total}
                onChangeText={setTotal}
                placeholder="10"
                placeholderTextColor={theme.colors.text.muted}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{t('packages.form.price')}</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={price}
                    onChangeText={setPrice}
                    placeholder={t('packages.form.optional')}
                    placeholderTextColor={theme.colors.text.muted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{t('packages.form.paidNow')}</Text>
                  <TextInput
                    style={[styles.input, !price.trim() && { opacity: 0.5 }]}
                    keyboardType="decimal-pad"
                    value={paid}
                    onChangeText={setPaid}
                    editable={!!price.trim()}
                    placeholder="0"
                    placeholderTextColor={theme.colors.text.muted}
                  />
                </View>
              </View>
              {!!price.trim() && (
                <TouchableOpacity onPress={() => setPaid(price)}>
                  <Text style={[styles.link, { marginTop: -4, marginBottom: 8 }]}>{t('packages.form.paidAll')}</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.label}>{t('packages.form.startDate')}</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.text.muted}
                autoCapitalize="none"
              />

              <Text style={styles.label}>{t('packages.form.validity')}</Text>
              <View style={styles.chipRow}>
                {VALIDITY_PRESETS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, validity === d && styles.chipActive]}
                    onPress={() => setValidity(d)}
                  >
                    <Text style={[styles.chipText, validity === d && styles.chipTextActive]}>
                      {d === 0 ? t('packages.form.noExpiry') : t('packages.form.days', { count: d })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>{t('packages.form.note')}</Text>
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                value={note}
                onChangeText={setNote}
                multiline
                placeholder={t('packages.form.optional')}
                placeholderTextColor={theme.colors.text.muted}
              />

              <TouchableOpacity style={styles.primaryBtn} onPress={save}>
                <Text style={styles.primaryBtnText}>{t('packages.form.save')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Text style={styles.link}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const NOTE_CHIPS = ['upper', 'lower', 'fullBody', 'cardio', 'core', 'mobility', 'assessment'] as const;

function SessionNoteModal({
  visible,
  busy,
  onClose,
  onSave,
  styles,
  theme,
}: {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (note: string | null) => void;
  styles: Styles;
  theme: ThemeUI;
}) {
  const { t } = useTranslation();
  const [chips, setChips] = useState<string[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!visible) return;
    setChips([]);
    setText('');
  }, [visible]);

  const compose = () => {
    const parts = chips.map((c) => t(`packages.note.chip.${c}`));
    if (text.trim()) parts.push(text.trim());
    return parts.length ? parts.join(' · ') : null;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => { }}>
            <Text style={styles.sheetTitle}>{t('packages.note.title')}</Text>
            <Text style={styles.muted}>{t('packages.note.subtitle')}</Text>

            <View style={[styles.chipRow, { marginTop: 12 }]}>
              {NOTE_CHIPS.map((c) => {
                const on = chips.includes(c);
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, on && styles.chipActive]}
                    onPress={() => setChips((prev) => (on ? prev.filter((x) => x !== c) : [...prev, c]))}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextActive]}>{t(`packages.note.chip.${c}`)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={200}
              placeholder={t('packages.note.placeholder')}
              placeholderTextColor={theme.colors.text.muted}
            />

            <TouchableOpacity style={[styles.primaryBtn, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => onSave(compose())}>
              <Minus size={16} color={theme.colors.text.onAccent} />
              <Text style={styles.primaryBtnText}>{t('packages.note.save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={busy} onPress={() => onSave(null)} style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text style={styles.link}>{t('packages.note.skip')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PaymentModal({
  visible,
  onClose,
  onSave,
  styles,
  theme,
  unpaid,
  currency,
  locale,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (amount: number) => void;
  styles: Styles;
  theme: ThemeUI;
  unpaid: number;
  currency: string;
  locale: string;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (visible) setAmount(String(unpaid));
  }, [visible, unpaid]);

  const save = () => {
    const n = parseAmount(amount);
    if (n == null || n <= 0) {
      Alert.alert(t('common.error'), t('packages.form.invalidAmount'));
      return;
    }
    onSave(Math.min(n, unpaid));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={[styles.backdrop, { justifyContent: 'center' }]} onPress={onClose}>
          <Pressable style={[styles.sheet, { borderRadius: theme.radius.xl, margin: 24 }]} onPress={() => { }}>
            <Text style={styles.sheetTitle}>{t('packages.pay')}</Text>
            <Text style={styles.muted}>
              {t('packages.unpaid', { amount: formatMoney(unpaid, currency, locale) })}
            </Text>
            <TextInput
              style={[styles.input, { marginTop: 12 }]}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={save}>
              <Text style={styles.primaryBtnText}>{t('packages.form.save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={styles.link}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
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
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      ...(theme.shadow?.soft ?? {}),
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    premiumBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.premiumSoft,
    },
    premiumBadgeText: { color: theme.colors.premium, fontSize: theme.fontSize.xs, fontWeight: '800' },
    cardTitle: { flex: 1, color: theme.colors.text.primary, fontSize: theme.fontSize.lg - 1, fontWeight: '700' },
    muted: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, marginTop: 4, lineHeight: 18 },
    miniLabel: { color: theme.colors.text.secondary, fontSize: theme.fontSize.xs, marginBottom: 4, fontWeight: '700' },
    link: { color: theme.colors.accent, fontSize: theme.fontSize.sm, fontWeight: '700' },
    bigRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    bigNumber: { fontSize: 36, fontWeight: '900', lineHeight: 40 },
    bigLabel: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, marginBottom: 6, flex: 1 },
    barTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.surfaceSoft,
      overflow: 'hidden',
      marginTop: 8,
    },
    barFill: { height: 8, borderRadius: 4 },
    banner: {
      marginTop: 10,
      padding: 10,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.warning,
      backgroundColor: theme.colors.goldSoft,
    },
    bannerText: { color: theme.colors.text.primary, fontSize: theme.fontSize.sm, fontWeight: '600' },
    payRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
    payText: { flex: 1, color: theme.colors.text.primary, fontSize: theme.fontSize.sm, fontWeight: '600' },
    smallBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.accent,
    },
    smallBtnText: { color: theme.colors.accent, fontSize: theme.fontSize.xs, fontWeight: '800' },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center' },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 12,
      paddingVertical: 12,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.accent,
    },
    primaryBtnText: { color: theme.colors.text.onAccent, fontWeight: '800', fontSize: theme.fontSize.md },
    iconBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceSoft,
    },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    sessionLine: { color: theme.colors.text.primary, fontSize: theme.fontSize.sm },
    sessionNote: { color: theme.colors.text.secondary, fontSize: theme.fontSize.xs, marginLeft: 12, marginTop: 1, lineHeight: 16 },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    historyTitle: { color: theme.colors.text.primary, fontSize: theme.fontSize.sm, fontWeight: '700' },
    backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      padding: 20,
      maxHeight: '90%',
    },
    sheetTitle: { color: theme.colors.text.primary, fontSize: theme.fontSize.title, fontWeight: '800', marginBottom: 8 },
    label: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, fontWeight: '700', marginTop: 10, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.surfaceSoft,
      fontSize: theme.fontSize.md,
      marginBottom: 8,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSoft,
    },
    chipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
    chipText: { color: theme.colors.text.primary, fontSize: theme.fontSize.sm, fontWeight: '700' },
    chipTextActive: { color: theme.colors.text.onAccent },
  });
}
