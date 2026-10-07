import { usePopupSlot } from '@/constants/PopupContext';
import {
  markFirstOpen,
  registerPositiveMoment,
  requestStoreReview,
  type PositiveMoment,
} from '@/services/rating';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// ─────────────────────────────────────────────────────────────
// Değerlendirme isteği.
//
// Ekranlar iyi bir an yaşandığında `notifyPositiveMoment('record_created')`
// çağırır; uygunsa istek popup sırasına girer ve sırası gelince sistemin
// kendi değerlendirme penceresi açılır (kendi ekranımız yok — bkz. services/rating.ts).
// ─────────────────────────────────────────────────────────────

type RatingContextValue = {
  notifyPositiveMoment: (kind: PositiveMoment) => void;
};

const RatingContext = createContext<RatingContextValue>({
  notifyPositiveMoment: () => { },
});

export function RatingProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    markFirstOpen();
  }, []);

  const notifyPositiveMoment = useCallback((kind: PositiveMoment) => {
    registerPositiveMoment(kind).then((eligible) => {
      if (eligible) setPending(true);
    });
  }, []);

  return (
    <RatingContext.Provider value={{ notifyPositiveMoment }}>
      {children}
      <RatingRequester pending={pending} onDone={() => setPending(false)} />
    </RatingContext.Provider>
  );
}

function RatingRequester({ pending, onDone }: { pending: boolean; onDone: () => void }) {
  const { visible, done } = usePopupSlot('rating', pending, { priority: 10 });

  useEffect(() => {
    if (!visible) return;
    requestStoreReview().finally(() => {
      done();
      onDone();
    });
  }, [visible, done, onDone]);

  return null;
}

export function useRating() {
  return useContext(RatingContext);
}
