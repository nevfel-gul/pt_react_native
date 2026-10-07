import { ANNOUNCEMENTS, type Announcement } from '@/constants/announcements';
import { usePopupSlot } from '@/constants/PopupContext';
import type { ThemeUI } from '@/constants/types';
import { useTheme } from '@/constants/usetheme';
import { track } from '@/services/analytics';
import { auth } from '@/services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ─────────────────────────────────────────────────────────────
// Yeni özellik duyurusu. İçerik constants/announcements.ts'ten gelir.
//
// Yeni kayıt olmuş birine "yeni" bir şey duyurmak anlamsız: hesabı son
// 24 saatte açılmış kullanıcılar için duyurular gösterilmeden "görüldü"
// sayılır. (Hesap yaşına bakıyoruz, cihazdaki ilk açılışa değil: güncellemeyi
// alan eski kullanıcılarda o bilgi henüz yok.)
// ─────────────────────────────────────────────────────────────

const seenKey = (id: string) => `announcement:seen:${id}`;
const NEW_USER_GRACE_MS = 24 * 60 * 60 * 1000;

export default function AnnouncementPopup() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [current, setCurrent] = useState<Announcement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = ANNOUNCEMENTS.filter((a) => !a.platform || a.platform === Platform.OS);
        const createdAt = Date.parse(auth.currentUser?.metadata.creationTime ?? '');
        const isNewUser = !createdAt || Date.now() - createdAt < NEW_USER_GRACE_MS;

        if (isNewUser) {
          await AsyncStorage.multiSet(list.map((a) => [seenKey(a.id), '1'] as [string, string]));
          return;
        }

        for (let i = list.length - 1; i >= 0; i--) {
          const seen = await AsyncStorage.getItem(seenKey(list[i].id));
          if (!seen) {
            if (!cancelled) setCurrent(list[i]);
            return;
          }
        }
      } catch { }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { visible, done } = usePopupSlot('announcement', !!current, { priority: 5 });

  if (!current) return null;

  const close = (viaCta: boolean) => {
    AsyncStorage.setItem(seenKey(current.id), '1').catch(() => { });
    track(viaCta ? 'popup_cta_tapped' : 'popup_dismissed', {
      popup: 'announcement',
      announcement: current.id,
    });
    done();
    setCurrent(null);
    if (viaCta && current.route) router.push(current.route as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => close(false)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Sparkles size={26} color={theme.colors.accent} />
          </View>
          <Text style={styles.title}>{t(current.titleKey)}</Text>
          <Text style={styles.body}>{t(current.bodyKey)}</Text>

          <TouchableOpacity style={styles.cta} activeOpacity={0.9} onPress={() => close(true)}>
            <Text style={styles.ctaText}>{t(current.ctaKey ?? 'common.ok')}</Text>
          </TouchableOpacity>
          {current.route ? (
            <TouchableOpacity onPress={() => close(false)} style={styles.laterBtn}>
              <Text style={styles.laterText}>{t('announcement.later')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(theme: ThemeUI) {
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
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    title: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.title,
      fontWeight: '800',
      textAlign: 'center',
    },
    body: {
      color: theme.colors.text.muted,
      fontSize: theme.fontSize.md,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },
    cta: {
      alignSelf: 'stretch',
      marginTop: 18,
      borderRadius: theme.radius.pill,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: theme.colors.accent,
    },
    ctaText: { color: theme.colors.text.onAccent, fontWeight: '800', fontSize: theme.fontSize.lg },
    laterBtn: { marginTop: 10, paddingVertical: 8 },
    laterText: { color: theme.colors.text.muted, fontSize: theme.fontSize.sm, fontWeight: '600' },
  });
}
