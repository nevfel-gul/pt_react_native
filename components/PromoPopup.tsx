import { usePromo } from '@/constants/PromoContext';
import type { ThemeUI } from '@/constants/types';
import { useTheme } from '@/constants/usetheme';
import { formatRemaining } from '@/services/promo';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ─────────────────────────────────────────────────────────────
// Kayıttan bir süre sonra bir kez çıkan indirim popup'ı.
//
// Kupon kodu burada gösterilir ama kullanıcı elle yazmak zorunda değil:
// "Kullan" ödeme ekranına kodu taşıyarak gider.
// ─────────────────────────────────────────────────────────────

export default function PromoPopup() {
  const { coupon, remainingMs, popupPending, dismissPopup } = usePromo();
  const { theme, mode } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  const styles = useMemo(() => makeStyles(theme, mode), [theme, mode]);

  // Ödeme ekranındayken popup'ı üste bindirme — kupon zaten orada görünüyor.
  const onPaywall = pathname?.includes('premium');
  const visible = !!coupon && popupPending && !onPaywall;

  if (!coupon) return null;

  const goToPaywall = () => {
    dismissPopup();
    router.push({ pathname: '/(tabs)/premium', params: { promo: coupon.code } } as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismissPopup}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <LinearGradient
            colors={[theme.colors.premium, theme.colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badge}
          >
            <Text style={styles.badgeText}>
              {t('promo.popup.badge', { percent: coupon.discountPercent })}
            </Text>
          </LinearGradient>

          <Text style={styles.title}>{t('promo.popup.title')}</Text>
          <Text style={styles.desc}>
            {t('promo.popup.description', { percent: coupon.discountPercent })}
          </Text>

          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>{t('promo.popup.code_label')}</Text>
            <Text style={styles.code}>{coupon.code}</Text>
          </View>

          <Text style={styles.timer}>
            {t('promo.popup.expires_in', { time: formatRemaining(remainingMs) })}
          </Text>

          <TouchableOpacity activeOpacity={0.9} onPress={goToPaywall} style={styles.ctaWrap}>
            <LinearGradient
              colors={[theme.colors.premium, theme.colors.accent]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>{t('promo.popup.cta')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={dismissPopup} style={styles.laterBtn}>
            <Text style={styles.laterText}>{t('promo.popup.later')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(theme: ThemeUI, mode: 'light' | 'dark') {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 22,
      alignItems: 'center',
      ...theme.shadow.strong,
    },
    badge: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: theme.radius.pill,
      marginBottom: 14,
    },
    badgeText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: theme.fontSize.lg,
      letterSpacing: 0.5,
    },
    title: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.title,
      fontWeight: '800',
      textAlign: 'center',
    },
    desc: {
      color: theme.colors.text.muted,
      fontSize: theme.fontSize.md,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },
    codeBox: {
      marginTop: 16,
      alignSelf: 'stretch',
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.colors.premium,
      backgroundColor: theme.colors.premiumSoft,
      paddingVertical: 12,
      alignItems: 'center',
    },
    codeLabel: {
      color: theme.colors.text.muted,
      fontSize: theme.fontSize.xs,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    code: {
      color: mode === 'light' ? theme.colors.premium : theme.colors.text.primary,
      fontSize: 24,
      fontWeight: '900',
      letterSpacing: 3,
      marginTop: 4,
    },
    timer: {
      color: theme.colors.warning,
      fontSize: theme.fontSize.sm,
      fontWeight: '700',
      marginTop: 12,
    },
    ctaWrap: { alignSelf: 'stretch', marginTop: 18, borderRadius: theme.radius.pill },
    cta: {
      borderRadius: theme.radius.pill,
      paddingVertical: 14,
      alignItems: 'center',
    },
    ctaText: { color: '#fff', fontWeight: '800', fontSize: theme.fontSize.lg },
    laterBtn: { marginTop: 10, paddingVertical: 8 },
    laterText: { color: theme.colors.text.muted, fontSize: theme.fontSize.sm, fontWeight: '600' },
  });
}
