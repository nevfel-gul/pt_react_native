import { usePremium } from '@/constants/PremiumContext';
import { auth } from '@/services/firebase';
import { issuePromoCoupon, type PromoCoupon } from '@/services/promo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

// ─────────────────────────────────────────────────────────────
// Kupon durumu tek yerden yönetilir.
//
// Uygunluk kararını her zaman sunucu verir (kayıt tarihi, aktif abonelik,
// kampanya penceresi). İstemci sadece "şimdi sorulmalı mı" zamanlamasını
// yapar: açılışta, ön plana dönüşte ve sunucunun bildirdiği süre dolduğunda.
// ─────────────────────────────────────────────────────────────

type PromoContextValue = {
  coupon: PromoCoupon | null;
  /** Kuponun bitmesine kalan süre (ms). Kupon yoksa 0. */
  remainingMs: number;
  /** Kullanıcıya henüz gösterilmemiş bir kupon var mı. */
  popupPending: boolean;
  dismissPopup: () => void;
  refresh: () => Promise<void>;
};

const PromoContext = createContext<PromoContextValue>({
  coupon: null,
  remainingMs: 0,
  popupPending: false,
  dismissPopup: () => { },
  refresh: async () => { },
});

const seenKey = (code: string) => `promo:popupSeen:${code}`;

export function PromoProvider({ children }: { children: React.ReactNode }) {
  const { hasPremium, loading: premiumLoading } = usePremium();
  const [coupon, setCoupon] = useState<PromoCoupon | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [popupPending, setPopupPending] = useState(false);
  const [authed, setAuthed] = useState(!!auth.currentUser);

  // "Çok erken" cevabında sunucunun verdiği süre kadar bekleyip tekrar sorar.
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthed(!!u);
      if (!u) {
        setCoupon(null);
        setPopupPending(false);
      }
    });
    return unsub;
  }, []);

  const refresh = useCallback(async () => {
    if (!auth.currentUser || inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await issuePromoCoupon();

      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }

      if (res.coupon) {
        setCoupon(res.coupon);
        // Geliştirme build'inde "görüldü" bayrağı yok sayılır: popup her
        // açılışta çıkar, test için her seferinde yeni kupon üretmek gerekmez.
        const seen = __DEV__ ? null : await AsyncStorage.getItem(seenKey(res.coupon.code));
        setPopupPending(!seen);
        if (__DEV__) {
          console.log(`[Promo] kupon: ${res.coupon.code} — kapsam:`, res.coupon.productIds);
        }
        return;
      }

      // Popup çıkmadığında sebebini görmek testte çok zaman kazandırıyor:
      // already_subscribed, no_campaign, too_early, no_stock...
      if (__DEV__) {
        console.log('[Promo] kupon yok — sebep:', res.reason, res.availableInMinutes ?? '');
      }

      setCoupon(null);
      setPopupPending(false);

      // Henüz hak etmediyse, hak edeceği ana kadar bir kez daha sormak üzere
      // zamanlayıcı kur. Uygulama kapanırsa ön plana dönüşte zaten sorulacak.
      if (res.reason === 'too_early' && res.availableInMinutes) {
        const ms = Math.max(30_000, res.availableInMinutes * 60_000 + 5_000);
        retryTimer.current = setTimeout(() => {
          retryTimer.current = null;
          refresh();
        }, ms);
      }
    } catch (e) {
      console.warn('[Promo] kupon sorgulanamadı:', e);
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Abonelik durumu netleşmeden sormak anlamsız: abonesi olana kupon verilmiyor.
  useEffect(() => {
    if (!authed || premiumLoading) return;
    if (hasPremium) {
      setCoupon(null);
      setPopupPending(false);
      return;
    }
    refresh();
  }, [authed, hasPremium, premiumLoading, refresh]);

  // Uygulama ön plana döndüğünde tekrar kontrol et.
  useEffect(() => {
    if (!authed || hasPremium) return;
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') refresh();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [authed, hasPremium, refresh]);

  // Geri sayım — süre dolunca kupon kendiliğinden düşer.
  useEffect(() => {
    if (!coupon) {
      setRemainingMs(0);
      return;
    }
    const expiresAt = Date.parse(coupon.expiresAt);
    const tick = () => {
      const left = expiresAt - Date.now();
      if (left <= 0) {
        setCoupon(null);
        setPopupPending(false);
        setRemainingMs(0);
        return;
      }
      setRemainingMs(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [coupon]);

  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  const dismissPopup = useCallback(() => {
    setPopupPending(false);
    if (coupon) AsyncStorage.setItem(seenKey(coupon.code), '1').catch(() => { });
  }, [coupon]);

  return (
    <PromoContext.Provider
      value={{ coupon, remainingMs, popupPending, dismissPopup, refresh }}
    >
      {children}
    </PromoContext.Provider>
  );
}

export function usePromo() {
  return useContext(PromoContext);
}
