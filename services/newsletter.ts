import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
export const setNewsletterPreference = httpsCallable<{ enabled: boolean }, { ok: boolean }>(functions, 'setNewsletterPreference');

export const getNewsletterPreference = httpsCallable<void, { enabled: boolean }>(functions, 'getNewsletterPreference');
