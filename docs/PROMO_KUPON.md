# Promosyon kuponu altyapısı

Kayıttan 3 saat sonra kullanıcıya bir kupon verilir, kupon 3 saat geçerlidir ve
tüm paketlerde **ilk dönem için %55** indirim sağlar.

## Neden iki katmanlı

Apple'da uygulama içinden fiyat düşürülemez. IAP fiyatı her zaman App Store
Connect'te (ASC) tanımlı bir üründen ya da o ürüne bağlı bir **promotional
offer**'dan gelir. Bu yüzden akış ikiye ayrıldı:

| Katman | Nerede | Ne işe yarıyor |
|---|---|---|
| Bizim kuponumuz (`ATH-XXXXXX`) | Firestore | Kim, ne zaman hak etti; ne zaman geçersiz olacak |
| Apple teklif kodu (offer code) | ASC havuzu | İndirimli fiyatı gerçekten uygulayan şey |

Kullanıcı sadece bizim kodumuzu görür. Planı seçip "Kuponla devam et" dediğinde
sunucu havuzdan bir Apple kodu ayırır ve kullanıcı Apple'ın kod ekranına
(kod önceden doldurulmuş olarak) yönlendirilir.

> **Not:** `withOffer` ile imzalı promotional offer akışı kasıtlı olarak
> kullanılmadı. Apple o yolu yalnızca **mevcut veya süresi dolmuş abonelere**
> açıyor; bizim hedefimiz ise hiç abone olmamış yeni kullanıcı. Offer code
> ise yeni, aktif ve eski abonelerin hepsinde çalışıyor.

---

## 1. App Store Connect tarafı

Her ürün için ayrı ayrı yapılır — 6 ürün var:

```
athletrack_core_monthly     athletrack_core_annually
athletrack_pro_monthly      athletrack_pro_annually
athletrack_studio_monthly   athletrack_studio_annually
```

### 1.1 Promotional offer oluştur

`Subscriptions → <ürün> → Promotional Offers → (+)`

- **Reference Name:** serbest (ör. `Hos Geldin %55`)
- **Promotional Offer Product Code:** kampanyadaki `offerIdentifier` ile
  **birebir aynı** olmalı (ör. `promo55`).
  → ⚠️ Koddaki `offerIdentifier` **bu değerdir**, Reference Name değil.
  StoreKit `discountsIOS[].identifier` alanında bu kodu döner; uygulama
  indirimli fiyatı bununla eşleştirip ekranda gösteriyor. Altı üründe de
  aynı Product Code'u kullan. Uyuşmazsa indirim yine uygulanır ama ödeme
  ekranı indirimli tutarı gösteremez, sadece "%55 indirimli" yazar.
- **Type:** `Pay Up Front` (tek seferlik indirimli dönem)
- **Duration:** 1 dönem (aylık üründe 1 ay, yıllık üründe 1 yıl)
- **Price:** normal fiyatın %55 altındaki **en yakın fiyat noktası**.
  ₺4.000 → ₺1.800 tam karşılığı yoksa ASC'nin sunduğu en yakınını seç;
  ekranda gösterilen tutar Apple'dan geldiği için uyumsuzluk oluşmaz.

### 1.2 Tek kullanımlık kodları üret

`Subscriptions → <ürün> → Offer Codes → (+) → One-Time Use Codes`

- Az önce oluşturduğun promotional offer'ı seç.
- Parti büyüklüğünü ve **son kullanma tarihini** ASC ekranındaki sınırlar
  içinde belirle.
- Üretilen CSV'yi indir. İçindeki kod sütununu aşağıda havuza yükleyeceğiz.

**Havuzu boş paketler kuponun kapsamı dışında kalır.** Kupon paketten bağımsız
verilir; kullanıcı hangi paketi seçerse o paketin havuzundan kod çekilir. Ama
sunucu kuponu verirken (ve her tazelemede) hangi havuzlarda stok olduğunu
kontrol eder ve kuponun kapsamını ona göre bildirir:

- Stoksuz pakette ödeme ekranı baştan "bu kupon seçtiğin pakette geçerli değil"
  der — son adımda App Store'a giderken patlamak yerine.
- Havuzu doldurduğun anda eldeki kuponlar da o paketi kapsamaya başlar; liste
  her sorguda yeniden hesaplanıyor, yeni kupon dağıtmaya gerek yok.
- Hiçbir pakette stok kalmamışsa kullanıcıya kupon **verilmez** (kampanya başına
  tek kupon hakkı boşa yanmasın diye).

`stats` komutu ürün başına kalan kod sayısını gösterir; azalınca yeni parti
üretip yükle.

### Kişi başı kaç kod harcanır

`maxCodeGrants` (varsayılan 3) bir kuponun en fazla kaç **farklı pakette** Apple
kodu harcayabileceğini sınırlar. Kullanıcı Pro'yu seçip App Store'a gider,
vazgeçip döner ve Studio'yu denerse iki ayrı kod harcanmış olur — kod bir kez
gösterildikten sonra geri alınamıyor. Aynı pakete dönerse yeni kod harcanmaz,
ilk verilen kod tekrar döner.

Havuz boyutunu buna göre planla: kişi başı ortalama 1.5–2 kod.

### Bilinmesi gerekenler

- Offer code kullanımı **App Store'un kendi ekranında** olur; sandbox'ta
  düzgün test edilemez, TestFlight/production ile denenmeli.
- Kod kullanıldıktan sonra abonelik işlemi uygulamaya StoreKit transaction
  olarak döner; uygulama ön plana geldiğinde aboneliği kendisi eşitler
  (`premium.tsx` içindeki AppState + activeSubscriptions eşitleme).

---

## 2. Firestore yapısı

```
promoCampaigns/{campaignId}
  active, title, discountPercent, offerIdentifier, productIds[],
  triggerAfterMinutes, couponValidMinutes, couponPrefix, maxCodeGrants,
  startsAt, endsAt

promoCampaigns/{campaignId}/issued/{uid}        → kullanıcıya bir kez kupon
promoCampaigns/{campaignId}/appleCodes/{productId}/codes/{CODE}
  code, productId, status: available | issued, issuedTo, couponCode

promoCoupons/{KUPON_KODU}                       → bizim kuponumuz (doğruluk kaynağı)
  uid, campaignId, status, expiresAt, grants{productId: appleCode}

users/{uid}.promo                               → sadece arayüz için ayna kayıt
```

### Güvenlik kuralları

`promoCoupons` ve `promoCampaigns` **istemciye kapalı** olmalı; hepsi Cloud
Functions üzerinden yönetiliyor. Konsoldaki kurallara ekle:

```
match /promoCampaigns/{doc=**} { allow read, write: if false; }
match /promoCoupons/{doc=**}   { allow read, write: if false; }
```

`users/{uid}.promo` alanı yalnızca gösterim içindir; istemci onu değiştirse
bile kuponun geçerliliği her zaman `promoCoupons` üzerinden doğrulanır.

---

## 3. Yönetim komutları

`grantPremium` ile aynı desen: anahtar `X-Admin-Key` header'ında.

```bash
BASE=https://europe-west1-pt-app-native.cloudfunctions.net/promoAdmin
KEY=$ADMIN_KEY
```

### Kampanyayı oluştur / güncelle

```bash
curl -X POST $BASE -H "X-Admin-Key: $KEY" -H "Content-Type: application/json" -d '{
  "action": "upsertCampaign",
  "campaignId": "hosgeldin55",
  "campaign": {
    "active": true,
    "title": "Hoş geldin %55",
    "discountPercent": 55,
    "offerIdentifier": "promo55",
    "triggerAfterMinutes": 180,
    "couponValidMinutes": 180,
    "couponPrefix": "ATH",
    "maxCodeGrants": 3,
    "productIds": [
      "athletrack_core_monthly","athletrack_core_annually",
      "athletrack_pro_monthly","athletrack_pro_annually",
      "athletrack_studio_monthly","athletrack_studio_annually"
    ]
  }
}'
```

### ASC kodlarını havuza yükle (ürün başına)

```bash
curl -X POST $BASE -H "X-Admin-Key: $KEY" -H "Content-Type: application/json" -d '{
  "action": "uploadCodes",
  "campaignId": "hosgeldin55",
  "productId": "athletrack_pro_monthly",
  "codes": "ABC12345\nDEF67890\nGHI13579"
}'
```

### CSV'lerin hepsini tek komutla yükle

CSV'leri `oneTimeOfferCodes/` klasörüne koy ve çalıştır:

```bash
./scripts/promo-upload-codes.sh hosgeldin55
```

⚠️ `oneTimeOfferCodes/` **.gitignore'da** — içindeki kodlar gerçek ve
kullanılabilir. Repoya girip push edilirse repoya erişen herkes bedava indirim
alır. Klasörün adını değiştirirsen .gitignore'u da güncelle.

Betiğin bilmesi gerekenler:

- ASC'den inen dosyalarda **başlık satırı yoktur** — ilk satır da bir koddur,
  atlanmaz. 1. sütun kod, 2. sütun Apple'ın kullanma linki.
- Ürün eşlemesi dosya adının birebir yazımına güvenmez (ASC bazen `sutdio`,
  `studiu`, `anually` diye yazıyor): adda `core` varsa Core, `pro` varsa Pro,
  hiçbiri yoksa Studio; `month` varsa aylık, yoksa yıllık kabul edilir.

Her satırda dosyadaki kod sayısı ile sunucunun yazdığı `written` sayısı
birbirini tutmalı.

### Durum / kalan kod

```bash
curl -X POST $BASE -H "X-Admin-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"action":"stats","campaignId":"hosgeldin55"}'
```

### Belirli birine elle kupon ver (test için)

```bash
curl -X POST $BASE -H "X-Admin-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"action":"issueTo","campaignId":"hosgeldin55","email":"biri@ornek.com"}'
```

### Kampanyayı durdur

```bash
curl -X POST $BASE -H "X-Admin-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"action":"upsertCampaign","campaignId":"hosgeldin55","campaign":{"active":false}}'
```

---

## 4. Test akışı

1. `issueTo` ile kendine kupon ver (3 saat beklemeden).
2. Uygulamayı aç → popup çıkar (kupon başına bir kez; `promo:popupSeen:<kod>`
   AsyncStorage anahtarı tutar).
3. "İndirimi kullan" → ödeme ekranı, kod alanı dolu gelir.
4. Plan seç → "Kuponla devam et" → App Store kod ekranı açılır.
5. Uygulamaya dön → abonelik otomatik eşitlenir.

Popup'ı tekrar görmek için uygulamayı silip kurmak yerine kuponu yeniden
`issueTo` ile üretmek yeterli (kod değişir, "görüldü" bayrağı koda bağlı).
