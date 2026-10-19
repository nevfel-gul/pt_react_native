import { Alert, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { collection, doc, getDoc, getDocs, limit, query, runTransaction, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import i18n from './i18n';
import { registerForPushNotificationsAsync } from './registerForPush';
import { track } from './analytics';

let prompting = false;
const INTERVAL = 30 * 24 * 60 * 60 * 1000;

export async function maybePromptForPush(studentJustAdded = false) {
  const user = auth.currentUser;
  if (!user || prompting || Platform.OS === 'web') return;
  prompting = true;
  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    const data = snap.data();
    if (data?.pushOptOut === true) return;
    const permission = await Notifications.getPermissionsAsync();
    if (permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return;
    if (!studentJustAdded) {
      const students = await getDocs(query(collection(ref, 'students'), limit(1)));
      if (students.empty) return;
    }
    const now = Date.now();
    const reserved = await runTransaction(db, async tx => {
      const current = (await tx.get(ref)).data();
      if (current?.pushOptOut || now - (current?.pushPromptAtMs ?? 0) < INTERVAL) return false;
      tx.set(ref, { pushPromptAtMs: now }, { merge: true });
      return true;
    });
    if (!reserved || auth.currentUser?.uid !== user.uid) return;
    Alert.alert(i18n.t('push.prompt.title'), i18n.t('push.prompt.body'), [
      { text: i18n.t('push.prompt.later'), style: 'cancel' },
      { text: i18n.t('push.prompt.enable'), onPress: async () => {
        try {
          if (auth.currentUser?.uid !== user.uid) return;
          if (!permission.canAskAgain) { await Linking.openSettings(); return; }
          const result = await registerForPushNotificationsAsync();
          track('push_permission_result', { status: result.status });
          if (result.status === 'granted' && auth.currentUser?.uid === user.uid) {
            await setDoc(ref, { pushEnabled: true, pushOptOut: false, pushToken: result.token,
              pushPlatform: Platform.OS, pushTokenUpdatedAt: new Date() }, { merge: true });
          }
        } catch (error) { console.warn('[Push] permission update failed', error); }
      } },
    ]);
  } catch (error) { console.warn('[Push] prompt failed', error); }
  finally { prompting = false; }
}
