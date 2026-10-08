import { usePremium } from '@/constants/PremiumContext';
import { auth } from '@/services/firebase';
import {
  buildWidgetSnapshot,
  onWidgetRefreshRequested,
  publishWidgetSnapshot,
  signedOutSnapshot,
} from '@/services/widgetData';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────
// Widget verisini güncel tutar. Görünmez; kök layout'ta durur.
//
// Tetikleyiciler: giriş/çıkış, uygulamanın ön plana gelmesi, dil
// değişimi ve ekranlardan gelen requestWidgetRefresh() çağrıları.
// Art arda gelen istekler tek hesaplamada birleştirilir.
// ─────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 1500;
// Ön plana her dönüşte tüm kayıtları okumamak için (Firestore okuma maliyeti).
const FOREGROUND_MIN_INTERVAL_MS = 15 * 60 * 1000;

export default function WidgetSync() {
  const { i18n } = useTranslation();
  // Paket/ödeme bilgisi premium: plan değişince widget da güncellensin.
  const { hasPremium, loading: premiumLoading } = usePremium();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRunAt = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    if (premiumLoading) return;

    const run = async () => {
      const uid = auth.currentUser?.uid;
      lastRunAt.current = Date.now();
      try {
        const snapshot = uid ? await buildWidgetSnapshot(uid, { premium: hasPremium }) : signedOutSnapshot();
        await publishWidgetSnapshot(snapshot);
        if (__DEV__) {
          console.log('[Widget] snapshot yazıldı:', {
            signedIn: snapshot.signedIn,
            appointments: snapshot.appointments.length,
            overdue: snapshot.overdue,
            premium: snapshot.premium,
          });
        }
      } catch (e) {
        console.warn('[Widget] snapshot güncellenemedi:', e instanceof Error ? e.message : e);
      }
    };

    const schedule = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        run();
      }, DEBOUNCE_MS);
    };

    const unsubAuth = onAuthStateChanged(auth, schedule);
    const unsubRefresh = onWidgetRefreshRequested(schedule);
    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active' && Date.now() - lastRunAt.current > FOREGROUND_MIN_INTERVAL_MS) schedule();
    });

    return () => {
      unsubAuth();
      unsubRefresh();
      appState.remove();
      if (timer.current) clearTimeout(timer.current);
    };
    // Dil ya da plan değişince etiketler / paket bilgisi değiştiği için yeniden kur.
  }, [i18n.language, hasPremium, premiumLoading]);

  return null;
}
