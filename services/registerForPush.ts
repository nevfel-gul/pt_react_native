import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

export async function registerForPushNotificationsAsync() {
    if (!Device.isDevice) {
        return;
    }

    // 🔐 İzin iste
    const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } =
            await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        return;
    }

    // 📲 TOKEN AL
    const tokenData =
        await Notifications.getExpoPushTokenAsync();

    const token = tokenData.data;

    return token;
}
