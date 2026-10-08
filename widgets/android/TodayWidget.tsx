"use no memo";
// React Compiler bu dosyayı dönüştürmemeli: widget ağacı düz fonksiyon çağrılarıyla kurulur.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetSnapshot, WidgetStudentRow } from '@/services/widgetData';

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
const OPEN_OVERDUE = { uri: 'ptreactnative://calendar?source=widget&filter=overdue' };
const OPEN_HOME = { uri: 'ptreactnative://?source=widget' };
const openStudent = (sid?: string) =>
  sid ? { uri: `ptreactnative://student/${encodeURIComponent(sid)}?source=widget` } : OPEN_CALENDAR;

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

function Chip({ text, color, p, uri }: { text: string; color: Hex; p: Palette; uri?: { uri: string } }) {
  return (
    <FlexWidget
      clickAction={uri ? 'OPEN_URI' : undefined}
      clickActionData={uri}
      style={{ backgroundColor: p.chip, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6, marginTop: 4 }}
    >
      <TextWidget text={text} style={{ fontSize: 11, fontWeight: '700', color }} maxLines={1} />
    </FlexWidget>
  );
}

function StudentList({ title, rows, color, p, empty }: {
  title: string; rows: WidgetStudentRow[]; color: Hex; p: Palette; empty?: string;
}) {
  return (
    <FlexWidget style={{ flex: 1, marginRight: 8 }}>
      <TextWidget text={title} style={{ fontSize: 11, fontWeight: '700', color: p.muted }} maxLines={1} />
      {rows.length === 0 && empty ? <TextWidget text={empty} style={{ fontSize: 11, color: p.muted, marginTop: 3 }} maxLines={2} /> : null}
      {rows.map((r) => (
        <FlexWidget
          key={r.sid}
          clickAction="OPEN_URI"
          clickActionData={openStudent(r.sid)}
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, width: 'match_parent' }}
        >
          <TextWidget text="●" style={{ fontSize: 8, color, marginRight: 4 }} />
          <TextWidget text={r.name} style={{ fontSize: 12, color: p.text }} maxLines={1} truncate="END" />
          {r.detail ? <TextWidget text={`  ${r.detail}`} style={{ fontSize: 10, color: p.muted }} maxLines={1} /> : null}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

type Size = 'compact' | 'normal' | 'tall';

function Body({ snapshot, p, size }: { snapshot: WidgetSnapshot | null; p: Palette; size: Size }) {
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
  const next = visible[0];
  const rows = size === 'tall' ? 4 : size === 'normal' ? 2 : 1;
  const rest = visible.slice(1);
  const shown = rest.slice(0, rows);
  const more = rest.length - shown.length;
  const L = snapshot.labels;
  // Eski snapshot'ta bu alanlar olmayabilir.
  const premium = snapshot.premium === true;
  const ending = snapshot.packagesEnding ?? 0;

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

      <FlexWidget style={{ marginTop: 6, width: 'match_parent' }}>
        {next ? (
          <FlexWidget clickAction="OPEN_URI" clickActionData={openStudent(next.sid)} style={{ width: 'match_parent' }}>
            <TextWidget text={(L.next ?? '').toUpperCase()} style={{ fontSize: 9, fontWeight: '800', color: p.muted }} />
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextWidget text={timeLabel(next.ts, snapshot.locale)} style={{ fontSize: 18, fontWeight: '800', color: p.accent, marginRight: 6 }} />
              <TextWidget text={next.name} style={{ fontSize: 14, fontWeight: '600', color: p.text }} maxLines={1} truncate="END" />
            </FlexWidget>
            {next.left ? <TextWidget text={next.left} style={{ fontSize: 11, fontWeight: '600', color: p.warn }} maxLines={1} /> : null}
          </FlexWidget>
        ) : (
          <TextWidget text={L.noSessions} style={{ fontSize: 13, color: p.muted }} maxLines={2} />
        )}
        {shown.map((a) => (
          <FlexWidget
            key={String(a.ts) + a.name}
            clickAction="OPEN_URI"
            clickActionData={openStudent(a.sid)}
            style={{ flexDirection: 'row', marginTop: 4, width: 'match_parent' }}
          >
            <TextWidget text={timeLabel(a.ts, snapshot.locale)} style={{ fontSize: 13, fontWeight: '700', color: p.accent, width: 48 }} />
            <TextWidget text={a.name} style={{ fontSize: 13, color: p.text }} maxLines={1} truncate="END" />
            {size !== 'compact' && a.left ? <TextWidget text={`  ${a.left}`} style={{ fontSize: 11, color: p.muted }} maxLines={1} /> : null}
          </FlexWidget>
        ))}
        {more > 0 ? <TextWidget text={`+${more} ${L.more}`} style={{ fontSize: 12, color: p.muted, marginTop: 2 }} /> : null}
      </FlexWidget>

      {size === 'tall' ? (
        <FlexWidget style={{ flexDirection: 'row', marginTop: 10, width: 'match_parent' }}>
          <StudentList
            title={L.overdueTitle ?? L.overdue}
            rows={(snapshot.overdueList ?? []).slice(0, premium ? 4 : 6)}
            color={p.danger}
            p={p}
            empty={L.allClear}
          />
          {premium ? (
            <StudentList title={L.endingTitle ?? ''} rows={(snapshot.endingList ?? []).slice(0, 4)} color={p.warn} p={p} />
          ) : null}
        </FlexWidget>
      ) : null}

      <FlexWidget style={{ flex: 1 }} />

      {/* RemoteViews'ta satır kaydırma yok: takip ve paket bilgisi ayrı satırlarda. */}
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent' }}>
        <Chip text={`${snapshot.overdue} ${L.overdue}`} color={snapshot.overdue > 0 ? p.danger : p.muted} p={p} uri={OPEN_OVERDUE} />
        {size !== 'compact' ? (
          <Chip text={`${snapshot.dueSoon} ${L.dueSoon}`} color={snapshot.dueSoon > 0 ? p.warn : p.muted} p={p} />
        ) : null}
      </FlexWidget>
      {premium && (ending > 0 || (size !== 'compact' && snapshot.unpaidText)) ? (
        <FlexWidget style={{ flexDirection: 'row', width: 'match_parent' }}>
          {ending > 0 ? <Chip text={`${ending} ${L.packagesEnding ?? ''}`} color={p.warn} p={p} /> : null}
          {size !== 'compact' && snapshot.unpaidText ? (
            <Chip text={`${snapshot.unpaidText} ${L.unpaid ?? ''}`} color={p.text} p={p} />
          ) : null}
        </FlexWidget>
      ) : null}
      {size === 'tall' && snapshot.weekText ? (
        <TextWidget text={`${L.thisWeek ?? ''} · ${snapshot.weekText}`} style={{ fontSize: 11, color: p.muted, marginTop: 6 }} maxLines={1} />
      ) : null}
    </FlexWidget>
  );
}

export function TodayWidget({ snapshot, width, height }: { snapshot: WidgetSnapshot | null; width?: number; height?: number }) {
  const size: Size = (width ?? 250) < 200 ? 'compact' : (height ?? 0) >= 250 ? 'tall' : 'normal';
  return {
    light: <Body snapshot={snapshot} p={C.light} size={size} />,
    dark: <Body snapshot={snapshot} p={C.dark} size={size} />,
  };
}
