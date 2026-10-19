import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { GoogleAuthProvider, OAuthProvider, signInWithCredential, signInWithPopup, updateProfile, type UserCredential } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { normalizeLanguage } from '@/constants/languages';
import i18n from './i18n';
import { deviceUnitSystem } from '@/constants/UnitsContext';
import googleAuth from '@/constants/google-auth.json';

export async function signInSocial(provider: 'google' | 'apple', legalAccepted: boolean): Promise<UserCredential | null> {
  let result: UserCredential;
  if (Platform.OS === 'web') {
    result = await signInWithPopup(auth, provider === 'google' ? new GoogleAuthProvider() : new OAuthProvider('apple.com'));
  } else if (provider === 'google') {
    // Loaded only when used, so an older binary can still open the email screen.
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || googleAuth.webClientId;
    if (!webClientId) throw Object.assign(new Error('Missing OAuth configuration'), { code: 'social/not-configured' });
    const { GoogleSignin, isSuccessResponse } = await import('@react-native-google-signin/google-signin');
    GoogleSignin.configure({ webClientId, iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || googleAuth.iosClientId });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    if (!response.data.idToken) throw new Error('Missing Google ID token');
    result = await signInWithCredential(auth, GoogleAuthProvider.credential(response.data.idToken));
  } else {
    const nonce = Crypto.randomUUID();
    const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
    const apple = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL], nonce: hashed,
    });
    if (!apple.identityToken) throw new Error('Missing Apple identity token');
    result = await signInWithCredential(auth, new OAuthProvider('apple.com').credential({ idToken: apple.identityToken, rawNonce: nonce }));
    const name = [apple.fullName?.givenName, apple.fullName?.familyName].filter(Boolean).join(' ');
    if (name && !result.user.displayName) await updateProfile(result.user, { displayName: name });
  }
  const ref = doc(db, 'users', result.user.uid);
  const snap = await getDoc(ref);
  if (!snap.data()?.createdAt) {
    // The shared login UI requires the legal checkboxes for all provider buttons.
    if (!legalAccepted) throw new Error('Legal consent required');
    await setDoc(ref, { uid: result.user.uid, email: result.user.email ?? '', displayName: result.user.displayName ?? '',
      username: '', language: normalizeLanguage(i18n.language), units: deviceUnitSystem(), pushEnabled: true,
      emailEnabled: false, createdAt: serverTimestamp(),
      legalApprovals: { terms: true, privacy: true, kvkk: true, explicitConsent: true } }, { merge: true });
  }
  return result;
}
