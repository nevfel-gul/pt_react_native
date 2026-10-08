import { appLocale } from '@/constants/languages';
import {
  formatHeight,
  formatQuantity,
  quantityOf,
  unitKey,
  type Quantity,
  type UnitSystem,
} from '@/constants/units';
import { track, setUserProperties } from '@/services/analytics';
import { auth, db } from '@/services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

// ─────────────────────────────────────────────────────────────
// Hocanın ölçü birimi tercihi (users/{uid}.units).
//
// - Alan yoksa METRİK: mevcut kullanıcılar için hiçbir şey değişmez.
// - Yeni kayıtlarda cihaz bölgesinden başlar (ABD → imperial).
// - Önbellek AsyncStorage'da: uygulama açılır açılmaz doğru birim görünsün.
// ─────────────────────────────────────────────────────────────

const CACHE_KEY = 'units:system';

/** Kayıt sırasında varsayılan: cihaz ABD ölçü sistemindeyse imperial. */
export function deviceUnitSystem(): UnitSystem {
  try {
    return Localization.getLocales()?.[0]?.measurementSystem === 'us' ? 'imperial' : 'metric';
  } catch {
    return 'metric';
  }
}

type UnitsValue = {
  system: UnitSystem;
  setSystem: (s: UnitSystem) => Promise<void>;
  /** Firestore alan adına göre biçimle: fmtField('weight', '72.5') → "159,8 lb". */
  fmtField: (field: string, metric: unknown) => string;
  fmt: (q: Quantity, metric: unknown) => string;
  fmtHeight: (cm: unknown) => string;
  /** Kısa birim etiketi: "kg" / "lb" / "cm" / "in". */
  unit: (q: Quantity) => string;
};

const UnitsContext = createContext<UnitsValue>({
  system: 'metric',
  setSystem: async () => { },
  fmtField: (_f, v) => (v == null ? '-' : String(v)),
  fmt: (_q, v) => (v == null ? '-' : String(v)),
  fmtHeight: (v) => (v == null ? '-' : String(v)),
  unit: () => '',
});

export function UnitsProvider({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const [system, setLocal] = useState<UnitSystem>('metric');
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);

  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then((v) => {
        if (v === 'imperial' || v === 'metric') setLocal(v);
      })
      .catch(() => { });
    return onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
  }, []);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, 'users', uid), (snap) => {
      const v = snap.data()?.units;
      const next: UnitSystem = v === 'imperial' ? 'imperial' : 'metric';
      setLocal(next);
      AsyncStorage.setItem(CACHE_KEY, next).catch(() => { });
    });
  }, [uid]);

  useEffect(() => {
    setUserProperties({ units: system });
  }, [system]);

  const setSystem = useCallback(async (s: UnitSystem) => {
    setLocal(s);
    AsyncStorage.setItem(CACHE_KEY, s).catch(() => { });
    track('units_changed', { units: s });
    const id = auth.currentUser?.uid;
    if (id) await setDoc(doc(db, 'users', id), { units: s }, { merge: true });
  }, []);

  const value = useMemo<UnitsValue>(() => {
    const locale = appLocale();
    const unit = (q: Quantity) => t(unitKey(q, system));
    const fmt = (q: Quantity, metric: unknown) => formatQuantity(q, metric, system, locale, unit(q));
    return {
      system,
      setSystem,
      unit,
      fmt,
      fmtField: (field, metric) => {
        const q = quantityOf(field);
        return q ? fmt(q, metric) : metric == null || metric === '' ? '-' : String(metric);
      },
      fmtHeight: (cm) => formatHeight(cm, system, t('common.unit.cm')),
    };
    // i18n.language: dil değişince biçim de değişsin
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system, setSystem, t, i18n.language]);

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  return useContext(UnitsContext);
}
