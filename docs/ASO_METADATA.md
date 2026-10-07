# App Store metadata paketi (v1.3)

Hazırlanma: 2026-10-08. Karakter sınırları ve dil içi tekrarlar
`app-store-aso-ru/scripts/validate-fields.py` ile doğrulandı (hata yok).

> **Ad, alt başlık ve anahtar kelimeler sadece yeni bir sürümle (yeni build) değişir.**
> Hepsini tek seferde, bir sonraki sürüm gönderiminde gir. Promosyon metni
> ise sürüm beklemeden her an değiştirilebilir.

## Neden bu kelimeler

Türkiye mağazasının arama önerileri (autosuggest) incelendi:

| Aranan | Sonuç |
|---|---|
| `personal trainer` | Türkiye'de gerçekten yazılıyor → **ada** kondu |
| `fitness takip`, `vücut analizi`, `spor salonu takip`, `antrenör` | Önerilerde var → alt başlık / anahtar kelime |
| `öğrenci takip` | Tamamen okul / YKS uygulamaları → adda **kullanılmadı** (yanlış kitle) |
| `pt` | Tek başına PTT uygulamalarına gidiyor → adda tek başına işe yaramaz |
| `üye takip` | Sendika uygulamaları → kullanılmadı |

**Türkiye iki dili birlikte tarar:** en-GB (ana) + Türkçe. en-US Türkiye'de
taranmaz. Bu yüzden App Store Connect'te **English (U.K.)** dilini ekle; Türkiye
için ikinci bir 100 karakterlik anahtar kelime alanı kazandırır. Türkçe ve
en-GB arasında marka dışında tekrar eden kelime yok (aynı ülkede tekrar boşa gider).

Anahtar kelime alanı kuralları: virgülle ayır, boşluk bırakma, ad/alt
başlıktaki kelimeleri tekrar yazma, çoğul/tekil ikisini birden yazma.

## Türkçe (tr)

| Alan | Değer | Uzunluk |
|---|---|---|
| Ad | `AthleTrack: Personal Trainer` | 28/30 |
| Alt başlık | `Fitness Takip & Vücut Analizi` | 29/30 |
| Anahtar kelimeler | `spor,salonu,antrenör,ölçüm,parq,postür,seans,paket,gelişim,danışan,öğrenci,koç,kilo,yağ,oranı,kas` | 97/100 |
| Promosyon metni | Yeni: Seans ve paket takibi! Kalan dersleri, ödemeleri ve randevuları tek yerden yönetin. Ana ekran widget'ı ile günün seanslarını bir bakışta görün. | 149/170 |

## English (U.K.) (en-GB) — yeni eklenecek

| Alan | Değer | Uzunluk |
|---|---|---|
| Ad | `AthleTrack: PT Client Tracker` | 29/30 |
| Alt başlık | `Body Composition & Assessment` | 29/30 |
| Anahtar kelimeler | `coach,gym,fat,tanita,posture,vo2max,test,studio,log,session,progress,measurement,crm,planner` | 92/100 |
| Promosyon metni | New: session & package tracking! Manage remaining sessions, payments and appointments in one place, and see today's sessions on your home screen widget. | 152/170 |

## English (U.S.) (en-US)

| Alan | Değer | Uzunluk |
|---|---|---|
| Ad | `AthleTrack: Personal Trainer` | 28/30 |
| Alt başlık | `Client Tracking & Assessments` | 29/30 |
| Anahtar kelimeler | `pt,coach,gym,crm,body,fat,tanita,posture,vo2max,parq,fitness,test,studio,session,package,progress` | 97/100 |
| Promosyon metni | (en-GB ile aynı) | 152/170 |

## Açıklamanın ilk paragrafı (öneri)

Açıklama aramada taranmaz ama "Daha fazla"ya basmadan görünen ilk 2–3 satır
indirme kararını etkiler. Mevcut açıklamanın başına:

**TR:** Personal trainer'lar için hepsi bir arada takip uygulaması: öğrenci
ölçümleri, vücut analizi, PAR-Q, fitness testleri, seans/paket ve ödeme
takibi, randevular — Excel ve kağıt kalem olmadan.

**EN:** The all-in-one app for personal trainers: client measurements, body
composition, PAR-Q, fitness tests, session packages & payments, and
appointments — no more spreadsheets or paper forms.

## Ekran görüntüsü başlıkları (ilk 3 kare en önemlisi)

1. **Her öğrencinin gelişimi tek ekranda** — ölçüm grafiği
2. **Kalan ders ve ödeme takibi** — yeni paket kartı
3. **Profesyonel test bataryası** — Tanita, YMCA, VO₂max, postür

## Gönderimden sonra

- 2–3 gün sonra alanların gerçekten yayına girdiğini kontrol et
  (`app-store-aso-ru` skill: `store-query.sh live 6757748679 tr gb us`).
- 3–4 hafta sonra App Store Connect → Analytics'te **App Store Search** kaynaklı
  gösterim / indirme karşılaştırması yap (önce/sonra).
- Uygulamanın kendisi artık Türkçe dil bildiriyor (`app.json` → `locales`),
  mağaza sayfasında "Diller: İngilizce, Türkçe" görünecek.
