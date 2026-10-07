import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as StoreReview from "expo-store-review";
import { Linking, Platform } from "react-native";
import { track } from "./analytics";
import { auth } from "./firebase";

// ─────────────────────────────────────────────────────────────
// Mağaza değerlendirmesi.
//
// Apple 5.6.1 ve Google Play kuralları gereği:
//  - Otomatik istek SADECE sistemin kendi penceresiyle yapılır
//    (StoreReview.requestReview). Kendi "5 yıldız ver" ekranımız yok,
//    belirli bir puan istenmez, memnuniyete göre filtrelenmez.
//  - İstek "iyi bir anın" hemen ardından gelir: başarıyla kaydedilen
//    ölçüm gibi. Hata, ödeme ya da form ortasında asla.
//  - iOS zaten yılda en fazla 3 kez gösterir; biz daha da seyrek soruyoruz.
//
// Kullanıcının kendi isteğiyle "Bizi değerlendirin" satırına basması
// ise serbesttir: openStoreReviewPage().
// ─────────────────────────────────────────────────────────────

const IOS_APP_ID = "6757748679";
const ANDROID_PACKAGE = "com.athletrack.athletrack";

const K = {
  firstOpenAt: "rating:firstOpenAt",
  positiveMoments: "rating:positiveMoments",
  lastRequestAt: "rating:lastRequestAt",
  lastRequestVersion: "rating:lastRequestVersion",
};

/** Hesap açıldıktan (ya da bu cihazda ilk açılıştan) sonra en az bu kadar gün geçmeli. */
const MIN_DAYS_SINCE_FIRST_OPEN = 5;
/** En az bu kadar "iyi an" (ör. başarıyla kaydedilmiş ölçüm) yaşanmalı. */
const MIN_POSITIVE_MOMENTS = 3;
/** İki istek arasında en az bu kadar gün. */
const MIN_DAYS_BETWEEN_REQUESTS = 120;

const DAY = 24 * 60 * 60 * 1000;

export type PositiveMoment = "record_created" | "student_created" | "appointment_created";

/** Uygulama açılışında bir kez çağrılır. */
export async function markFirstOpen() {
  try {
    const v = await AsyncStorage.getItem(K.firstOpenAt);
    if (!v) await AsyncStorage.setItem(K.firstOpenAt, String(Date.now()));
  } catch { }
}

/**
 * Bir "iyi an" kaydeder ve değerlendirme istemeye uygunsa true döner.
 * true dönerse çağıran taraf RatingContext üzerinden isteği sıraya koyar.
 */
export async function registerPositiveMoment(kind: PositiveMoment): Promise<boolean> {
  try {
    // Ölçüm kaydı uygulamanın asıl değer anı; diğerleri yarım puan sayılır.
    const weight = kind === "record_created" ? 1 : 0.5;
    const prev = Number((await AsyncStorage.getItem(K.positiveMoments)) ?? "0") || 0;
    const moments = prev + weight;
    await AsyncStorage.setItem(K.positiveMoments, String(moments));
    return await isEligible(moments);
  } catch {
    return false;
  }
}

async function isEligible(moments: number): Promise<boolean> {
  if (moments < MIN_POSITIVE_MOMENTS) return false;

  const now = Date.now();
  // Hesap yaşı öncelikli: güncellemeyi alan eski kullanıcılar 5 gün beklemesin.
  const createdAt = Date.parse(auth.currentUser?.metadata.creationTime ?? "");
  const firstOpenAt = Number((await AsyncStorage.getItem(K.firstOpenAt)) ?? "0");
  const since = createdAt || firstOpenAt;
  if (!since || now - since < MIN_DAYS_SINCE_FIRST_OPEN * DAY) return false;

  const lastAt = Number((await AsyncStorage.getItem(K.lastRequestAt)) ?? "0");
  if (lastAt && now - lastAt < MIN_DAYS_BETWEEN_REQUESTS * DAY) return false;

  // Aynı sürüm için ikinci kez sorma.
  const version = Constants.expoConfig?.version ?? "";
  const lastVersion = await AsyncStorage.getItem(K.lastRequestVersion);
  if (lastVersion && lastVersion === version) return false;

  return StoreReview.isAvailableAsync().catch(() => false);
}

/** Sistem değerlendirme penceresini aç. Sadece popup sırası izin verince çağrılır. */
export async function requestStoreReview() {
  try {
    await AsyncStorage.multiSet([
      [K.lastRequestAt, String(Date.now())],
      [K.lastRequestVersion, Constants.expoConfig?.version ?? ""],
    ]);
    track("rating_prompt_requested");
    await StoreReview.requestReview();
  } catch (e) {
    console.warn("[Rating] requestReview hatası:", e);
  }
}

/** Kullanıcı kendi isteğiyle "Bizi değerlendirin"e bastığında mağazadaki yorum sayfası. */
export async function openStoreReviewPage() {
  track("rate_app_tapped");
  const url =
    Platform.OS === "ios"
      ? `itms-apps://apps.apple.com/app/id${IOS_APP_ID}?action=write-review`
      : `market://details?id=${ANDROID_PACKAGE}&showAllReviews=true`;
  const fallback =
    Platform.OS === "ios"
      ? `https://apps.apple.com/app/id${IOS_APP_ID}?action=write-review`
      : `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}&showAllReviews=true`;
  try {
    await Linking.openURL(url);
  } catch {
    Linking.openURL(fallback).catch(() => { });
  }
}
