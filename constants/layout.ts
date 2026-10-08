import { useWindowDimensions } from "react-native";

// ─────────────────────────────────────────────────────────────
// iPad / geniş ekran düzeni.
//
// Geniş ekranda içerik kenardan kenara gerilmez; ortada okunabilir bir
// genişlikte durur (app/_layout.tsx → Stack contentStyle). Ölçüm formu
// gibi uzun ekranlar bu genişlikte kartları iki sütuna dizer.
// ─────────────────────────────────────────────────────────────

export const TABLET_MIN_WIDTH = 768;
export const CONTENT_MAX_WIDTH = 820;

export function useIsTablet() {
    const { width } = useWindowDimensions();
    return width >= TABLET_MIN_WIDTH;
}
