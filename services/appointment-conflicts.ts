import { toDateSafe } from './schedule';

export type AppointmentSlot = { date?: unknown; repeatDays?: number | null; durationMinutes?: number };
export const appointmentDuration = (slot: AppointmentSlot) =>
  Number.isFinite(slot.durationMinutes) && slot.durationMinutes! >= 15 && slot.durationMinutes! <= 240 ? slot.durationMinutes! : 60;
const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
const period = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : 0;
const dayNumber = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;

/** Exact recurrence intersection, including overnight sessions and future repeat collisions. */
export function appointmentsOverlap(a: AppointmentSlot, b: AppointmentSlot): boolean {
  const ad = toDateSafe(a.date), bd = toDateSafe(b.date);
  if (!ad || !bd) return false;
  const aDay = dayNumber(ad), bDay = dayNumber(bd);
  const am = ad.getHours() * 60 + ad.getMinutes(), bm = bd.getHours() * 60 + bd.getMinutes();
  const ap = period(a.repeatDays), bp = period(b.repeatDays);
  for (const offset of [-1, 0, 1]) {
    if (am >= bm + offset * 1440 + appointmentDuration(b) || am + appointmentDuration(a) <= bm + offset * 1440) continue;
    const shiftedB = bDay - offset;
    if (ap && bp && (shiftedB - aDay) % gcd(ap, bp) === 0) return true;
    if (ap && !bp && shiftedB >= aDay && (shiftedB - aDay) % ap === 0) return true;
    if (!ap && bp && aDay >= shiftedB && (aDay - shiftedB) % bp === 0) return true;
    if (!ap && !bp && aDay === shiftedB) return true;
  }
  return false;
}
