# AthleTrack yol haritası

Ekiple konuşulacak / sıradaki işler. Bitenler en alttaki listeye taşınır.

## Ekiple görüşülecek

- [ ] **Gelir ve bekleyen ödemeler paneli** — Paket verisinden: bu ay tahsil edilen,
      bekleyen ödemeler (kimden, ne kadar), paketi bitmek üzere olanlar. Analiz
      sekmesinde ya da ayrı bir "Kasa" görünümünde. Premium'u en iyi satacak ekran.
- [ ] **Aday öğrenci takibi** — İlk görüşme / deneme dersi yapanlar için basit liste:
      Aday → Deneme dersi → Paket aldı / Almadı. Paket alınca tek dokunuşla öğrenciye
      dönüşür; "kaç adaydan kaçını kazandım" oranı görünür. WhatsApp şablonlarıyla
      (deneme dersi hatırlatma) birleşebilir.
- [ ] **Davet programı (hoca → hoca)** — Ödül, davet edilen *ödeme yapınca* verilmeli
      (aşağıdaki "Davet ödülü" notuna bakın).

## Planlı (öncelik sırasıyla)

- [ ] **Gelişim raporu (PDF + WhatsApp görseli)** — İçerik planı ve örnek:
      `docs/rapor-ornegi/`. Hoca bölüm bölüm açıp kapatabilmeli; sağlık bilgisi
      varsayılan kapalı. Excel/CSV dışa aktarma bununla birlikte yapılacak.
- [ ] **Sayısal hedefler** (yağ oranı %26, bel 76 cm…) — Öğrenciler de uygulamayı
      kullanmaya başladığında.
- [ ] **Android yayını** — Widget ve bildirim altyapısı Android'de hazır.
- [ ] **Antrenman programı oluşturma** — Büyük iş; ayrı tasarım turu gerekiyor.
- [ ] **Stüdyo / çoklu antrenör hesabı** — Studio planını gerçek bir ekip planına çevirir.

## Rafta

- [ ] **İlerleme fotoğrafları** — Depolama: Firebase Storage (Blaze'de 5 GB ücretsiz,
      yalnızca ABD bölgesi → KVKK yurt dışı aktarım notu gerekir).

## Teknik borç / zamanı gelince

- [ ] **Abonelik kilidi** — 1.3+ kullanıcılar çoğunluk olunca `firestore.rules` →
      `clientMaySetSubscription()` = `false`, deploy; `premium.tsx`'teki istemci
      yedeğini kaldır.
- [ ] **firebase-functions güncellemesi** — Deploy'daki "outdated" uyarısı.
- [ ] **App Store Connect abonelik açıklamaları** — Öğrenci limitleri (Core 10 / Pro 30)
      metinlerle uyumlu mu kontrol et.

## Notlar

### Davet ödülü — suistimale dayanıklı seçenekler
Bedava Premium ayı sahte hesaplarla toplanabilir. Daha sağlam olanlar:
1. **Ödülü ödemeye bağla:** Davet edilen hoca ilk ücretli dönemini tamamlayınca
   (iade süresi geçince) ödül verilir. Sahte hesap ödeme yapmadığı için işe yaramaz.
2. **Kalıcı +öğrenci kotası:** Her ücretli davet için +3 öğrenci hakkı (üst sınır +15).
   Abonelik bitince değeri sıfırlanır; tek başına bedava kullanım sağlamaz.
3. **Yıllık plana indirim kodu:** Apple teklif kodu (offer code) ile bir sonraki
   yenilemede indirim. Para değil, Apple kurallarına uygun.
4. **Görünür statü:** "Kurucu Koç" rozeti, raporlarda kendi logosu/markası gibi
   prestij özellikleri. Maliyeti sıfır.
Öneri: 1 + 2 birlikte (ödeme şartı + kota ödülü).
