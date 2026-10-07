import Constants from "expo-constants";
import PostHog from "posthog-react-native";
import { Platform } from "react-native";

// ─────────────────────────────────────────────────────────────
// Ürün analitiği (PostHog).
//
// Anahtar EAS ortam değişkeninden gelir: EXPO_PUBLIC_POSTHOG_KEY
// (opsiyonel host: EXPO_PUBLIC_POSTHOG_HOST). Anahtar yoksa her çağrı
// sessizce boşa düşer — geliştirme ve anahtarsız build'ler etkilenmez.
//
// KURAL: Event'lere öğrenci adı, e-posta, telefon, not ya da sağlık
// cevabı konmaz. Sadece sayılar, sabit kimlikler ve enum değerleri.
// ─────────────────────────────────────────────────────────────

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

export const posthog: PostHog | null = API_KEY
  ? new PostHog(API_KEY, {
      host: HOST,
      captureAppLifecycleEvents: true,
      // Geliştirme build'leri gerçek veriyi kirletmesin.
      disabled: __DEV__,
    })
  : null;

export type AnalyticsEvent =
  // Kayıt / giriş
  | "landing_viewed"
  | "landing_cta_tapped"
  | "signup_completed"
  | "login_completed"
  | "login_failed"
  | "signup_failed"
  | "logout"
  | "account_deleted"
  | "password_reset_requested"
  // Öğrenci & kayıt (ilk değer anı)
  | "student_form_opened"
  | "student_created"
  | "student_updated"
  | "student_status_changed"
  | "student_limit_hit"
  | "record_form_opened"
  | "record_step_viewed"
  | "record_created"
  | "first_record_created"
  | "record_viewed"
  | "student_note_added"
  | "follow_up_period_changed"
  // Paket / seans
  | "package_created"
  | "package_deleted"
  | "package_payment_recorded"
  | "session_used"
  | "session_undone"
  // Kullanım
  | "ai_search_used"
  | "ai_search_failed"
  | "analytics_viewed"
  | "calendar_viewed"
  | "appointment_created"
  | "appointment_deleted"
  | "language_changed"
  | "theme_changed"
  // Gelir
  | "paywall_viewed"
  | "paywall_plan_selected"
  | "purchase_started"
  | "purchase_completed"
  | "purchase_failed"
  | "purchase_cancelled"
  | "restore_tapped"
  | "restore_completed"
  | "promo_popup_shown"
  | "promo_popup_claimed"
  | "promo_popup_dismissed"
  // Popup / değerlendirme
  | "popup_shown"
  | "popup_dismissed"
  | "popup_cta_tapped"
  | "rating_prompt_requested"
  | "rate_app_tapped"
  // Bildirim & widget
  | "push_permission_result"
  | "push_opened"
  | "widget_opened";

type Props = Record<string, string | number | boolean | null | undefined>;

export function track(event: AnalyticsEvent, props?: Props) {
  try {
    posthog?.capture(event, clean(props));
  } catch {
    // Analitik asla uygulamayı bozmamalı.
  }
}

export function trackScreen(name: string, props?: Props) {
  try {
    posthog?.screen(name, clean(props));
  } catch { }
}

/** Firebase uid ile eşleştir. E-posta/ad gönderilmez. */
export function identifyUser(uid: string, props?: Props) {
  try {
    posthog?.identify(uid, {
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version ?? null,
      ...clean(props),
    });
  } catch { }
}

export function resetAnalytics() {
  try {
    posthog?.reset();
  } catch { }
}

/** Hesabın kalıcı özellikleri (plan, dil vb.) — sonraki tüm event'lere eklenir. */
export function setUserProperties(props: Props) {
  try {
    posthog?.register(clean(props) as any);
  } catch { }
}

function clean(props?: Props) {
  if (!props) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
