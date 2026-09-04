import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const ANDROID_CHANNEL_ID = 'default';

export type PushRegisterResult =
    | { status: 'granted'; token: string }
    | { status: 'denied'; token: null }
    | { status: 'unsupported'; token: null }
    | { status: 'error'; token: null; error: unknown };

/**
 * EAS projectId olmadan getExpoPushTokenAsync() production build'de
 * "No projectId found" hatası verir → token hiç alınamaz.
 */
function getProjectId(): string | undefined {
    return (
        (Constants.expoConfig?.extra as any)?.eas?.projectId ??
        (Constants as any)?.easConfig?.projectId
    );
}

/**
 * Android'de kanal tanımlanmadan gönderilen bildirimler sessiz kalır
 * (heads-up göstermez). Uygulama açılışında bir kez çağrılmalı.
 */
export async function ensureAndroidChannelAsync() {
    if (Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Genel Bildirimler',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
}

/**
 * İzin ister ve Expo push token'ı döner.
 *
 * @param requestIfUndetermined false ise sistem izin popup'ı gösterilmez;
 *   sadece daha önce verilmiş izin varsa token alınır. (Uygulama açılışında
 *   kullanıcıyı popup ile karşılamamak için.)
 */
export async function registerForPushNotificationsAsync(
    requestIfUndetermined = true
): Promise<PushRegisterResult> {
    if (!Device.isDevice) {
        return { status: 'unsupported', token: null };
    }

    try {
        await ensureAndroidChannelAsync();

        // 🔐 İzin
        const existing = await Notifications.getPermissionsAsync();
        let granted =
            existing.granted ||
            existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

        if (!granted) {
            // Kullanıcı daha önce reddettiyse iOS ikinci kez popup göstermez;
            // bu durumda kullanıcıyı Ayarlar'a yönlendirmek çağıran tarafın işi.
            if (!existing.canAskAgain || !requestIfUndetermined) {
                return { status: 'denied', token: null };
            }

            const asked = await Notifications.requestPermissionsAsync();
            granted =
                asked.granted ||
                asked.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
        }

        if (!granted) {
            return { status: 'denied', token: null };
        }

        // 📲 TOKEN
        const projectId = getProjectId();
        const tokenData = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined
        );

        const token = tokenData?.data;
        if (!token) return { status: 'error', token: null, error: new Error('Empty push token') };

        return { status: 'granted', token };
    } catch (error) {
        console.warn('[Push] register error:', error);
        return { status: 'error', token: null, error };
    }
}
