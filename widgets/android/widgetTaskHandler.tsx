"use no memo";
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { ANDROID_WIDGET_NAME, readAndroidSnapshot } from '@/services/widgetData';
import { TodayWidget } from './TodayWidget';

// Android, widget eklendiğinde / periyodik güncellemede / boyut değişince
// uygulama kapalıyken bile bu görevi başlatır. Ağa çıkmıyoruz: uygulamanın
// en son yazdığı snapshot'ı çiziyoruz (gün geçişini TodayWidget kendisi süzer).
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetInfo.widgetName !== ANDROID_WIDGET_NAME) return;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const snapshot = await readAndroidSnapshot();
      renderWidget(TodayWidget({ snapshot, width: widgetInfo.width, height: widgetInfo.height }));
      break;
    }
    default:
      break;
  }
}
