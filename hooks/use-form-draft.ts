import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DraftStore, draftKey } from '@/services/form-drafts';
import { auth } from '@/services/firebase';

export function useFormDraft<T>(uid: string | undefined, scope: string, value: T, enabled: boolean, restore: (value: T) => void) {
  const { t } = useTranslation();
  const key = uid ? draftKey(uid, scope) : '';
  const [loadedKey, setLoadedKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const current = useRef({ key, uid, value, restore });
  current.current = { key, uid, value, restore };
  const control = useRef<{ store: DraftStore; baseline: string; cleared: boolean; hydrated: boolean } | null>(null);

  useEffect(() => {
    if (!key || !enabled) return;
    let live = true;
    const state = { store: new DraftStore(key), baseline: JSON.stringify(current.current.value), cleared: false, hydrated: false };
    control.current = state;
    setLoadedKey('');
    setStatus('idle');
    const owner = () => live && current.current.key === key && auth.currentUser?.uid === uid;
    const finish = () => { if (owner()) { state.hydrated = true; setLoadedKey(key); } };
    void state.store.read<T>().then(saved => {
      if (!owner()) return;
      if (saved === null) { finish(); return; }
      Alert.alert(t('draft.title'), t('draft.message'), [
        { text: t('draft.discard'), style: 'destructive', onPress: () => {
          if (!owner()) return;
          void state.store.clear().then(finish).catch(() => { setStatus('error'); finish(); });
        } },
        { text: t('draft.resume'), onPress: () => { if (owner()) { current.current.restore(saved); finish(); } } },
      ], { cancelable: false });
    }).catch(() => { if (owner()) { setStatus('error'); finish(); } });
    const flush = () => {
      if (!owner() || !state.hydrated || state.cleared || JSON.stringify(current.current.value) === state.baseline) return;
      void state.store.save(current.current.value).catch(() => { if (live) setStatus('error'); });
    };
    const sub = AppState.addEventListener('change', next => { if (next !== 'active') flush(); });
    return () => { flush(); live = false; sub.remove(); };
  }, [key, enabled, t, uid]);

  const serialized = JSON.stringify(value);
  useEffect(() => {
    const state = control.current;
    if (loadedKey !== key || !state?.hydrated || state.cleared || !key || serialized === state.baseline) return;
    setStatus('saving');
    const timer = setTimeout(() => {
      if (auth.currentUser?.uid !== uid || current.current.key !== key || state.cleared) return;
      void state.store.save(JSON.parse(serialized)).then(() => { if (current.current.key === key && control.current === state && !state.cleared) setStatus('saved'); }).catch(() => { if (current.current.key === key && control.current === state) setStatus('error'); });
    }, 350);
    return () => clearTimeout(timer);
  }, [serialized, loadedKey, key, uid]);

  const clear = useCallback(async () => {
    const state = control.current;
    if (!state) return;
    state.cleared = true;
    await state.store.clear().catch(() => setStatus('error'));
  }, []);
  const flush = useCallback(async () => {
    const state = control.current;
    if (!state?.hydrated || state.cleared || auth.currentUser?.uid !== current.current.uid) return;
    try { await state.store.save(current.current.value); setStatus('saved'); }
    catch { setStatus('error'); }
  }, []);
  return { ready: enabled && !!key && loadedKey === key && !!control.current?.hydrated, status, clear, flush };
}
