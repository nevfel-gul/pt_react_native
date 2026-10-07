// Uygulama girişi: expo-router + Android widget arka plan görevi.
// Widget görevi uygulama kapalıyken de çalıştığı için kökte kaydedilmeli.
import 'expo-router/entry';
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./widgets/android/widgetTaskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
}
