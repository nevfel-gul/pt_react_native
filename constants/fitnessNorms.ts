// ─────────────────────────────────────────────────────────────
// Fitness testi norm tabloları (yaş + cinsiyet).
//
// Sonuçlar mevcut kayıtlarla aynı biçimde Türkçe metin olarak döner
// ("Mükemmel", "Ortalama Altı"...); ekranda constants/statusLabels.ts
// kullanıcının diline çevirir. Tablonun kapsamadığı yaş / cinsiyet /
// varyasyon için "Geçersiz veri" döner (ekranda "Bu yaş/cinsiyet için
// norm yok").
//
// Bir tabloyu değiştirirken kaynağını da güncelleyin.
// ─────────────────────────────────────────────────────────────

type Gender = "M" | "F";

// ── YMCA 3 dakika basamak testi ──────────────────────────────
// Kaynak: YMCA of the USA, "Y's Way to Physical Fitness", 3. baskı (1989);
// Morrow, Jackson, Disch & Mood, "Measurement and Evaluation in Human
// Performance", 3. baskı (2005), s. 234'te yeniden basılmış hali.
// Protokol: 30,5 cm (12") basamak, metronom 96 bpm (dakikada 24 adım),
// 3 dk; bitişten sonraki 5 sn içinde başlayıp 1 TAM dakika nabız sayılır.
//
// Her satır, kategorinin ÜST sınırı (vuru/dk): Mükemmel, İyi, Ortanın Üstü,
// Orta, Ortanın Altı, Kötü. Üstündeki her değer "Çok Kötü".
// Kaynak tablodaki aralıklar arasında boşluk var (ör. 77–78); bu değerler
// bir alttaki (daha kötü) kategoriye düşer.

const YMCA_LABELS = ["Mükemmel", "İyi", "Ortanın Üstü", "Orta", "Ortanın Altı", "Kötü"] as const;

const YMCA: Record<Gender, { maxAge: number; max: number[] }[]> = {
    M: [
        { maxAge: 25, max: [76, 84, 93, 100, 107, 119] },
        { maxAge: 35, max: [76, 85, 94, 102, 110, 121] },
        { maxAge: 45, max: [76, 88, 98, 105, 113, 124] },
        { maxAge: 55, max: [82, 93, 101, 111, 119, 126] },
        { maxAge: 65, max: [77, 94, 100, 109, 117, 128] },
        { maxAge: Infinity, max: [81, 92, 102, 110, 118, 126] },
    ],
    F: [
        { maxAge: 25, max: [81, 93, 102, 110, 120, 131] },
        { maxAge: 35, max: [80, 92, 101, 110, 119, 129] },
        { maxAge: 45, max: [84, 96, 104, 112, 120, 132] },
        { maxAge: 55, max: [91, 101, 110, 118, 124, 132] },
        { maxAge: 65, max: [92, 103, 111, 118, 127, 135] },
        { maxAge: Infinity, max: [92, 101, 111, 121, 126, 133] },
    ],
};

/** Tablo 18 yaştan başlıyor. */
export function ymcaStepTestRating(recoveryHr: number, age: number, gender?: string): string {
    if (!recoveryHr || !age || (gender !== "M" && gender !== "F")) return "";
    if (age < 18) return "Geçersiz veri";
    const row = YMCA[gender].find((r) => age <= r.maxAge)!;
    const i = row.max.findIndex((limit) => recoveryHr <= limit);
    return i === -1 ? "Çok Kötü" : YMCA_LABELS[i];
}

// ── VO₂max (ml/kg/dk) ─────────────────────────────────────────
// Kaynak: The Cooper Institute, yaş ve cinsiyete göre VO₂max yüzdelikleri
// (Garmin "VO2 Max. Standard Ratings" tablosunda Cooper Institute izniyle
// yayımlanan hali). Kategoriler yüzdeliğe karşılık gelir:
//   Superior ≥95. → Mükemmel, Excellent 80–95. → İyi,
//   Good 60–80. → Ortalama Üstü, Fair 40–60. → Ortalama, Poor <40. → Zayıf
// Her satır kategorinin ALT sınırı: Superior, Excellent, Good, Fair.

const VO2_LABELS = ["Mükemmel", "İyi", "Ortalama Üstü", "Ortalama"] as const;

const VO2: Record<Gender, { maxAge: number; min: number[] }[]> = {
    M: [
        { maxAge: 29, min: [55.4, 51.1, 45.4, 41.7] },
        { maxAge: 39, min: [54.0, 48.3, 44.0, 40.5] },
        { maxAge: 49, min: [52.5, 46.4, 42.4, 38.5] },
        { maxAge: 59, min: [48.9, 43.4, 39.2, 35.6] },
        { maxAge: 69, min: [45.7, 39.5, 35.5, 32.3] },
        { maxAge: 79, min: [42.1, 36.7, 32.3, 29.4] },
    ],
    F: [
        { maxAge: 29, min: [49.6, 43.9, 39.5, 36.1] },
        { maxAge: 39, min: [47.4, 42.4, 37.8, 34.4] },
        { maxAge: 49, min: [45.3, 39.7, 36.3, 33.0] },
        { maxAge: 59, min: [41.1, 36.7, 33.0, 30.1] },
        { maxAge: 69, min: [37.8, 33.0, 30.0, 27.5] },
        { maxAge: 79, min: [36.7, 30.9, 28.1, 25.9] },
    ],
};

/** Tablo 20–79 yaşı kapsıyor. */
export function vo2maxRating(vo2: number, age: number, gender?: string): string {
    if (!vo2 || !age || (gender !== "M" && gender !== "F")) return "";
    if (age < 20 || age > 79) return "Geçersiz veri";
    const row = VO2[gender].find((r) => age <= r.maxAge)!;
    const i = row.min.findIndex((limit) => vo2 >= limit);
    return i === -1 ? "Zayıf" : VO2_LABELS[i];
}

// ── Şınav (push-up) ──────────────────────────────────────────
// Kaynak: McArdle, Katch & Katch, "Essentials of Exercise Physiology",
// 2. baskı (2000), "Training muscles to become stronger" bölümü
// (brianmac.co.uk "Press-up Test" sayfasında yeniden basılmış hali).
// Erkekler tam şınav, kadınlar dizler üstünde (modifiye) şınav ile
// değerlendirilir; tablo bu iki kombinasyonu kapsıyor.
// Kategoriler: Excellent → Mükemmel, Good → İyi, Average → Ortalama,
//   Fair → Ortalama Altı, Poor → Kötü.
// Her satır kategorinin ALT sınırı (tekrar): Excellent, Good, Average, Fair.

const PUSHUP_LABELS = ["Mükemmel", "İyi", "Ortalama", "Ortalama Altı"] as const;

const PUSHUP: Record<Gender, { maxAge: number; min: number[] }[]> = {
    // Tam şınav
    M: [
        { maxAge: 29, min: [55, 45, 35, 20] },
        { maxAge: 39, min: [45, 35, 25, 15] },
        { maxAge: 49, min: [40, 30, 20, 12] },
        { maxAge: 59, min: [35, 25, 15, 8] },
        { maxAge: Infinity, min: [30, 20, 10, 5] },
    ],
    // Modifiye (diz üstü) şınav
    F: [
        { maxAge: 29, min: [49, 34, 17, 6] },
        { maxAge: 39, min: [40, 25, 12, 4] },
        { maxAge: 49, min: [35, 20, 8, 3] },
        { maxAge: 59, min: [30, 15, 6, 2] },
        { maxAge: Infinity, min: [20, 5, 3, 1] },
    ],
};

/** Tablo 20 yaştan başlıyor; erkekte tam, kadında modifiye şınav için. */
export function pushUpRating(reps: number, age: number, gender?: string, isModified = false): string {
    if (!reps || reps < 0 || !age || (gender !== "M" && gender !== "F")) return "";
    if (age < 20) return "Geçersiz veri";
    // Erkekte modifiye ya da kadında tam şınav için kaynakta norm yok.
    if ((gender === "M" && isModified) || (gender === "F" && !isModified)) return "Geçersiz veri";
    const row = PUSHUP[gender].find((r) => age <= r.maxAge)!;
    const i = row.min.findIndex((limit) => reps >= limit);
    return i === -1 ? "Kötü" : PUSHUP_LABELS[i];
}
