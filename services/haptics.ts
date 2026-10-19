import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export async function hapticFeedback(kind: 'selection' | 'success' = 'selection') {
  try {
    const raw = await AsyncStorage.getItem('settings_v1');
    if (raw && JSON.parse(raw).hapticEnabled === false) return;
    if (kind === 'success') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else await Haptics.selectionAsync();
  } catch { /* Haptics are optional on unsupported devices. */ }
}
