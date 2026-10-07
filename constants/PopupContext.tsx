import { track } from '@/services/analytics';
import { usePathname } from 'expo-router';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

// ─────────────────────────────────────────────────────────────
// Popup sırası.
//
// Uygulamadaki tüm otomatik popup'lar (kupon, değerlendirme, yenilik
// duyurusu...) buradan sıra alır; böylece üst üste binmezler ve kullanıcı
// bir oturumda popup yağmuruna tutulmaz.
//
//   const { visible, done } = usePopupSlot('rating', wantsToShow, { priority: 10 });
//
// Kurallar:
//  - Aynı anda tek popup.
//  - Oturum başına en fazla MAX_PER_SESSION popup (`bypassSessionCap` hariç).
//  - Form ve ödeme ekranlarında popup açılmaz; kullanıcı işini bitirince sırası gelir.
//  - Açılıştan hemen sonra değil, kısa bir gecikmeyle gösterilir.
// ─────────────────────────────────────────────────────────────

export type PopupId = 'promo' | 'rating' | 'announcement';

type SlotOptions = {
  /** Büyük olan önce gösterilir. */
  priority?: number;
  /** Oturum sınırına takılmaz (ör. süreli kupon). */
  bypassSessionCap?: boolean;
  /** Bu popup'ın engellenmediği ekranlar (varsayılan engelleri deler). */
  allowOnPaths?: string[];
};

const MAX_PER_SESSION = 1;
const SHOW_DELAY_MS = 1200;

// Kullanıcının bir işin ortasında olduğu ekranlar.
const BLOCKED_PATH_PARTS = ['premium', 'newrecord', 'newstudent', 'login', 'landing'];

type Candidate = { id: PopupId } & Required<Omit<SlotOptions, 'allowOnPaths'>> & {
  allowOnPaths: string[];
};

type PopupContextValue = {
  active: PopupId | null;
  want: (c: Candidate) => void;
  unwant: (id: PopupId) => void;
  finish: (id: PopupId) => void;
};

const PopupContext = createContext<PopupContextValue>({
  active: null,
  want: () => { },
  unwant: () => { },
  finish: () => { },
});

export function PopupProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const [candidates, setCandidates] = useState<Record<string, Candidate>>({});
  const [active, setActive] = useState<PopupId | null>(null);
  const shownCount = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const want = useCallback((c: Candidate) => {
    setCandidates((prev) => (prev[c.id] ? prev : { ...prev, [c.id]: c }));
  }, []);

  const unwant = useCallback((id: PopupId) => {
    setCandidates((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setActive((cur) => (cur === id ? null : cur));
  }, []);

  const finish = useCallback((id: PopupId) => {
    setActive((cur) => {
      if (cur !== id) return cur;
      shownCount.current += 1;
      return null;
    });
    setCandidates((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // Sıradaki popup'ı seç.
  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (active) return;

    const blocked = (c: Candidate) =>
      BLOCKED_PATH_PARTS.some((p) => pathname.includes(p)) &&
      !c.allowOnPaths.some((p) => pathname.includes(p));

    const next = Object.values(candidates)
      .filter((c) => !blocked(c))
      .filter((c) => c.bypassSessionCap || shownCount.current < MAX_PER_SESSION)
      .sort((a, b) => b.priority - a.priority)[0];

    if (!next) return;

    timer.current = setTimeout(() => {
      timer.current = null;
      setActive(next.id);
    }, SHOW_DELAY_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [candidates, active, pathname]);

  // Aktif popup engelli bir ekrana geçilirse kapat; sırası korunur.
  useEffect(() => {
    if (!active) return;
    const c = candidates[active];
    if (!c) return;
    const blocked =
      BLOCKED_PATH_PARTS.some((p) => pathname.includes(p)) &&
      !c.allowOnPaths.some((p) => pathname.includes(p));
    if (blocked) setActive(null);
  }, [pathname, active, candidates]);

  return (
    <PopupContext.Provider value={{ active, want, unwant, finish }}>
      {children}
    </PopupContext.Provider>
  );
}

/**
 * Bir popup için sıra iste. `wants` true olduğu sürece sırada bekler;
 * `visible` true olunca göster, kapanınca `done()` çağır.
 */
export function usePopupSlot(id: PopupId, wants: boolean, options: SlotOptions = {}) {
  const { active, want, unwant, finish } = useContext(PopupContext);
  const { priority = 0, bypassSessionCap = false } = options;
  const allowKey = (options.allowOnPaths ?? []).join('|');

  useEffect(() => {
    if (wants) {
      want({
        id,
        priority,
        bypassSessionCap,
        allowOnPaths: allowKey ? allowKey.split('|') : [],
      });
    } else {
      unwant(id);
    }
  }, [id, wants, priority, bypassSessionCap, allowKey, want, unwant]);

  useEffect(() => () => unwant(id), [id, unwant]);

  const visible = active === id;

  useEffect(() => {
    if (visible) track('popup_shown', { popup: id });
  }, [visible, id]);

  const done = useCallback(() => finish(id), [finish, id]);

  return { visible, done };
}
