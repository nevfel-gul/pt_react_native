"use no memo";
// React Compiler bu dosyayı dönüştürmemeli: widget ağacı düz fonksiyon çağrılarıyla kurulur.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetSnapshot } from '@/services/widgetData';

// ─────────────────────────────────────────────────────────────
// Android ana ekran widget'ı: bugünkü seanslar + takip özeti.
// Bu bileşen gerçek RN bileşeni değil; react-native-android-widget onu
// native RemoteViews'e çevirir, bu yüzden sadece Flex/Text kullanılır.
// iOS karşılığı: targets/widget/TodayWidget.swift
// ─────────────────────────────────────────────────────────────

type Hex = `#${string}`;
type Palette = Record<'bg' | 'text' | 'muted' | 'accent' | 'danger' | 'warn' | 'chip', Hex>;

const C: { light: Palette; dark: Palette } = {
  light: { bg: '#ffffff', text: '#0f172a', muted: '#64748b', accent: '#0284c7', danger: '#dc2626', warn: '#d97706', chip: '#f1f5f9' },
  dark: { bg: '#0f172a', text: '#f1f5f9', muted: '#94a3b8', accent: '#38bdf8', danger: '#ef4444', warn: '#f59e0b', chip: '#1e293b' },
};


const OPEN_CALENDAR = { uri: 'ptreactnative://calendar?source=widget' };
const OPEN_HOME = { uri: 'ptreactnative://?source=widget' };

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function timeLabel(ts: number, locale: string) {
  const d = new Date(ts);
  try {
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

function Body({ snapshot, p, compact }: { snapshot: WidgetSnapshot | null; p: Palette; compact: boolean }) {
  if (!snapshot || !snapshot.signedIn) {
    return (
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={OPEN_HOME}
        style={{ height: 'match_parent', width: 'match_parent', backgroundColor: p.bg, borderRadius: 20, padding: 14, justifyContent: 'center' }}
      >
        <TextWidget text="AthleTrack" style={{ fontSize: 15, fontWeight: '700', color: p.accent }} />
        <TextWidget
          text={snapshot?.labels.signedOut ?? 'Giriş yapın'}
          style={{ fontSize: 13, color: p.muted, marginTop: 6 }}
          maxLines={3}
        />
      </FlexWidget>
    );
  }

  const now = new Date();
  const todays = snapshot.appointments.filter((a) => sameDay(new Date(a.ts), now));
  const visible = todays.filter((a) => a.ts >= now.getTime() - 60 * 60 * 1000);
  const shown = visible.slice(0, compact ? 2 : 3);
  const rest = visible.length - shown.length;
  const L = snapshot.labels;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={OPEN_CALENDAR}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: p.bg, borderRadius: 20, padding: 14 }}
    >
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: 'match_parent' }}>
        <TextWidget text={L.today} style={{ fontSize: 14, fontWeight: '700', color: p.text }} />
        <TextWidget text={String(todays.length)} style={{ fontSize: 14, fontWeight: '800', color: p.accent }} />
      </FlexWidget>

      <FlexWidget style={{ marginTop: 8, flex: 1, width: 'match_parent' }}>
        {shown.length === 0 ? (
          <TextWidget text={L.noSessions} style={{ fontSize: 13, color: p.muted }} maxLines={2} />
        ) : (
          shown.map((a) => (
            <FlexWidget key={String(a.ts) + a.name} style={{ flexDirection: 'row', marginBottom: 4, width: 'match_parent' }}>
              <TextWidget text={timeLabel(a.ts, snapshot.locale)} style={{ fontSize: 13, fontWeight: '700', color: p.accent, width: 48 }} />
              <TextWidget text={a.name} style={{ fontSize: 13, color: p.text }} maxLines={1} truncate="END" />
            </FlexWidget>
          ))
        )}
        {rest > 0 ? <TextWidget text={`+${rest} ${L.more}`} style={{ fontSize: 12, color: p.muted }} /> : null}
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent' }}>
        <FlexWidget style={{ backgroundColor: p.chip, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6 }}>
          <TextWidget text={`${snapshot.overdue} ${L.overdue}`} style={{ fontSize: 11, fontWeight: '700', color: snapshot.overdue > 0 ? p.danger : p.muted }} />
        </FlexWidget>
        {!compact ? (
          <FlexWidget style={{ backgroundColor: p.chip, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
            <TextWidget text={`${snapshot.dueSoon} ${L.dueSoon}`} style={{ fontSize: 11, fontWeight: '700', color: snapshot.dueSoon > 0 ? p.warn : p.muted }} />
          </FlexWidget>
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}

export function TodayWidget({ snapshot, width }: { snapshot: WidgetSnapshot | null; width?: number }) {
  const compact = (width ?? 250) < 200;
  return {
    light: <Body snapshot={snapshot} p={C.light} compact={compact} />,
    dark: <Body snapshot={snapshot} p={C.dark} compact={compact} />,
  };
}
