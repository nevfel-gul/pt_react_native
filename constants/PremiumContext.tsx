import { auth, db } from '@/services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type PremiumTier = 'free' | 'core' | 'pro' | 'studio';

export type SubscriptionData = {
  productId: string;
  tier: PremiumTier;
  billing: 'monthly' | 'annual';
  isActive: boolean;
  studentLimit: number | null; // null = sınırsız
  isUnlimited: boolean;
  purchasedAt?: string;
};

// Plan başına öğrenci limiti
export const TIER_STUDENT_LIMITS: Record<PremiumTier, number | null> = {
  free: 5,
  core: 10,
  pro: 30,
  studio: null, // sınırsız
};

type PremiumContextValue = {
  hasPremium: boolean;
  tier: PremiumTier;
  studentLimit: number | null; // null = sınırsız
  isUnlimited: boolean;
  loading: boolean;
  subscription: SubscriptionData | null;
  updateSubscription: (data: SubscriptionData) => Promise<void>;
  clearSubscription: () => Promise<void>;
};

const PremiumContext = createContext<PremiumContextValue>({
  hasPremium: false,
  tier: 'free',
  studentLimit: TIER_STUDENT_LIMITS.free,
  isUnlimited: false,
  loading: true,
  subscription: null,
  updateSubscription: async () => {},
  clearSubscription: async () => {},
});

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // Önceki Firestore listener'ı temizle
      unsubFirestore?.();
      unsubFirestore = null;

      if (!user) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      // User doc'u real-time dinle — satın alım sonrası anında güncellensin
      const userRef = doc(db, 'users', user.uid);
      unsubFirestore = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const sub = data?.subscription;
            if (sub?.isActive) {
              setSubscription(sub as SubscriptionData);
            } else {
              setSubscription(null);
            }
          } else {
            setSubscription(null);
          }
          setLoading(false);
        },
        (err) => {
          console.warn('[Premium] Firestore dinleme hatası:', err);
          setLoading(false);
        },
      );
    });

    return () => {
      unsubAuth();
      unsubFirestore?.();
    };
  }, []);

  const updateSubscription = useCallback(async (data: SubscriptionData) => {
    const user = auth.currentUser;
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { subscription: data }, { merge: true });
    // Real-time listener local state'i otomatik güncelleyecek
  }, []);

  const clearSubscription = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { subscription: { isActive: false } }, { merge: true });
  }, []);

  const tier: PremiumTier = subscription?.tier ?? 'free';
  const hasPremium = !!subscription?.isActive;
  const isUnlimited = subscription?.isUnlimited ?? false;
  const studentLimit: number | null = isUnlimited
    ? null
    : (TIER_STUDENT_LIMITS[tier] ?? TIER_STUDENT_LIMITS.free);

  return (
    <PremiumContext.Provider
      value={{
        hasPremium,
        tier,
        studentLimit,
        isUnlimited,
        loading,
        subscription,
        updateSubscription,
        clearSubscription,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  return useContext(PremiumContext);
}
