"use no memo";
import { requestWidgetUpdate } from 'react-native-android-widget';
import { ANDROID_WIDGET_NAME, type WidgetSnapshot } from '@/services/widgetData';
import { TodayWidget } from './TodayWidget';

/** Ana ekrandaki tüm "Bugün" widget'larını verilen snapshot ile yeniden çiz. */
export async function refreshAndroidWidgets(snapshot: WidgetSnapshot) {
  await requestWidgetUpdate({
    widgetName: ANDROID_WIDGET_NAME,
    renderWidget: (info) => TodayWidget({ snapshot, width: info.width }),
  });
}
