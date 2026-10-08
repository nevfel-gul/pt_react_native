import { LANGUAGE_META, SUPPORTED_LANGUAGES, currentLanguage, type AppLanguage } from '@/constants/languages';
import type { ThemeUI } from '@/constants/types';
import { useTheme } from '@/constants/usetheme';
import { track } from '@/services/analytics';
import { setAppLanguage } from '@/services/i18n';
import { Check } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ─────────────────────────────────────────────────────────────
// Dil seçici (giriş ve ayarlar ekranı). Diller constants/languages.ts'ten.
// Android'de Alert en fazla 3 buton gösterdiği için ayrı bir pencere.
// ─────────────────────────────────────────────────────────────

export default function LanguagePicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const current = currentLanguage();

  const pick = async (lang: AppLanguage) => {
    onClose();
    if (lang === current) return;
    track('language_changed', { language: lang });
    await setAppLanguage(lang);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => { }}>
          <Text style={styles.title}>{t('settings.preference.language')}</Text>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const meta = LANGUAGE_META[lang];
            const active = lang === current;
            return (
              <TouchableOpacity key={lang} style={[styles.row, active && styles.rowActive]} onPress={() => pick(lang)}>
                <Text style={styles.flag}>{meta.flag}</Text>
                <Text style={[styles.label, active && styles.labelActive]}>{meta.label}</Text>
                {active ? <Check size={18} color={theme.colors.accent} /> : null}
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(theme: ThemeUI) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: theme.colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      ...theme.shadow.strong,
    },
    title: { color: theme.colors.text.primary, fontSize: theme.fontSize.lg, fontWeight: '800', marginBottom: 8, paddingHorizontal: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10, borderRadius: theme.radius.md },
    rowActive: { backgroundColor: theme.colors.accentSoft },
    flag: { fontSize: 20 },
    label: { flex: 1, color: theme.colors.text.primary, fontSize: theme.fontSize.md, fontWeight: '600' },
    labelActive: { color: theme.colors.accent, fontWeight: '800' },
  });
}
