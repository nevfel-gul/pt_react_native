import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
export const PASSWORD_RE = /^(?=[\s\S]*[a-z])(?=[\s\S]*[A-Z])(?=[\s\S]*[0-9])(?=[\s\S]*[\p{P}\p{S}])[\s\S]{10,128}$/u;
export const passwordChecks = (password: string) => ({
  length: password.length >= 10 && password.length <= 128,
  upper: /[A-Z]/.test(password), lower: /[a-z]/.test(password), digit: /[0-9]/.test(password),
  special: /[\p{P}\p{S}]/u.test(password),
});
export const registerEmailAccount = httpsCallable<Record<string, unknown>, { ok: boolean }>(functions, 'registerEmailAccount');
export const requestEmailCode = httpsCallable(functions, 'requestEmailCode');
export const confirmEmailCode = httpsCallable<{ code: string }, { ok: boolean }>(functions, 'confirmEmailCode');
