// ═══════════════════════════════════════════════════════════════════════════
// DEMO MODE — sadece ekran görüntüsü almak için. Firebase'e HİÇBİR ŞEY yazmaz.
// SS aldıktan sonra DEMO_MODE = false yaparak normale döndür.
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_MODE = true;

// ─── Mock Timestamp (Firestore Timestamp gibi davranır) ─────────────────────
function mockTs(date: Date) {
  return { toDate: () => date };
}

function daysAgo(n: number, h = 10, m = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, m, 0, 0);
  return mockTs(d);
}

function daysFromNow(n: number, h = 10, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, min, 0, 0);
  return mockTs(d);
}

// ════════════════════════════════════════════════════════════════════════════
// TAKVİM — Öğrenciler
// ════════════════════════════════════════════════════════════════════════════
export const DEMO_STUDENTS = [
  { id: 's1', name: 'Ayşe Yılmaz', email: 'ayse.yilmaz@email.com', number: '0532 123 45 67', aktif: 'Aktif' as const, assessmentDate: '2024-09-01', followUpDays: 30 },
  { id: 's2', name: 'Mehmet Kaya', email: 'mehmet.kaya@email.com', number: '0541 234 56 78', aktif: 'Aktif' as const, assessmentDate: '2024-10-15', followUpDays: 14 },
  { id: 's3', name: 'Zeynep Demir', email: 'zeynep.demir@email.com', number: '0553 345 67 89', aktif: 'Aktif' as const, assessmentDate: '2024-11-03', followUpDays: 21 },
  { id: 's4', name: 'Can Öztürk', email: 'can.ozturk@email.com', number: '0507 456 78 90', aktif: 'Aktif' as const, assessmentDate: '2025-01-20', followUpDays: 7 },
  { id: 's5', name: 'Selin Arslan', email: 'selin.arslan@email.com', number: '0544 567 89 01', aktif: 'Aktif' as const, assessmentDate: '2025-02-08', followUpDays: 30 },
  { id: 's6', name: 'Burak Çelik', email: 'burak.celik@email.com', number: '0535 678 90 12', aktif: 'Aktif' as const, assessmentDate: '2025-03-14', followUpDays: 30 },
  { id: 's7', name: 'Elif Şahin', email: 'elif.sahin@email.com', number: '0546 789 01 23', aktif: 'Pasif' as const, assessmentDate: '2024-07-22', followUpDays: 14 },
  { id: 's8', name: 'Ali Koç', email: 'ali.koc@email.com', number: '0558 890 12 34', aktif: 'Aktif' as const, assessmentDate: '2025-01-05', followUpDays: 30 },
];

// ════════════════════════════════════════════════════════════════════════════
// TAKVİM — Son kayıt tarihleri (durum hesabı için)
// ════════════════════════════════════════════════════════════════════════════
export const DEMO_RECORDS_CAL = [
  // Ayşe: 45g önce → GECİKMİŞ (30g periyot)
  { id: 'r1', studentId: 's1', createdAt: daysAgo(45) },
  // Mehmet: 18g önce → GECİKMİŞ (14g periyot)
  { id: 'r2', studentId: 's2', createdAt: daysAgo(18) },
  // Zeynep: 15g önce → YAKLAŞAN (21g periyot, 6g kaldı)
  { id: 'r3', studentId: 's3', createdAt: daysAgo(15) },
  // Can: 3g önce → OK (7g periyot)
  { id: 'r4', studentId: 's4', createdAt: daysAgo(3) },
  // Selin: 10g önce → OK (30g periyot)
  { id: 'r5', studentId: 's5', createdAt: daysAgo(10) },
  // Burak: 26g önce → YAKLAŞAN (30g periyot, 4g kaldı)
  { id: 'r6', studentId: 's6', createdAt: daysAgo(26) },
  // Elif: 20g önce → GECİKMİŞ (14g periyot)
  { id: 'r7', studentId: 's7', createdAt: daysAgo(20) },
  // Ali: 5g önce → OK (30g periyot)
  { id: 'r8', studentId: 's8', createdAt: daysAgo(5) },
];

// ════════════════════════════════════════════════════════════════════════════
// TAKVİM — Randevular
// ════════════════════════════════════════════════════════════════════════════
export const DEMO_APPOINTMENTS = [
  { id: 'a1', studentId: 's1', studentName: 'Ayşe Yılmaz', date: daysFromNow(0, 10, 0), note: 'Ölçüm seansı', repeatDays: null },
  { id: 'a2', studentId: 's4', studentName: 'Can Öztürk', date: daysFromNow(0, 14, 30), note: '', repeatDays: null },
  { id: 'a3', studentId: 's2', studentName: 'Mehmet Kaya', date: daysFromNow(1, 9, 0), note: 'Performans testi', repeatDays: null },
  { id: 'a4', studentId: 's3', studentName: 'Zeynep Demir', date: daysFromNow(2, 11, 0), note: '', repeatDays: 7 },
  { id: 'a5', studentId: 's5', studentName: 'Selin Arslan', date: daysFromNow(1, 16, 0), note: '', repeatDays: 2 },
  { id: 'a6', studentId: 's6', studentName: 'Burak Çelik', date: daysFromNow(-1, 15, 0), note: 'Postür analizi', repeatDays: null },
  { id: 'a7', studentId: 's7', studentName: 'Elif Şahin', date: daysFromNow(3, 10, 30), note: '', repeatDays: null },
  { id: 'a8', studentId: 's8', studentName: 'Ali Koç', date: daysFromNow(4, 13, 0), note: 'Kuvvet testleri', repeatDays: 7 },
];

// ════════════════════════════════════════════════════════════════════════════
// ANALİZ — Özet veriler
// ════════════════════════════════════════════════════════════════════════════
function makeDemoBarLabels7(): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    labels.push(d.toLocaleDateString('tr-TR', { weekday: 'short' }));
  }
  return labels;
}

export const DEMO_SUMMARY = {
  loading: false,
  totalStudents: 24,
  activeStudents: 18,
  measurementsInRange: 47,
  measuredStudentsInRange: 12,
  followUpDue: 6,
  followUpOk: 18,
  segTwiceWeek: 9,
  segThreeTimesWeek: 5,
  segOnlineHybrid: 3,
  segBeginner: 7,
  goalCounts: { fatLoss: 14, muscleGain: 10, generalHealth: 17, other: 3 },
  goalPercents: { fatLoss: 58, muscleGain: 42, generalHealth: 71 },
  dailyCounts: [4, 6, 3, 7, 5, 8, 4],
  bars: [0.50, 0.75, 0.38, 0.88, 0.63, 1.00, 0.50],
  barLabels: makeDemoBarLabels7(),
  appointmentDailyCounts: [3, 5, 2, 6, 4, 7, 3],
  appointmentBars: [0.43, 0.71, 0.29, 0.86, 0.57, 1.00, 0.43],
};

// ════════════════════════════════════════════════════════════════════════════
// ÖĞRENCİ DETAY — Profil
// ════════════════════════════════════════════════════════════════════════════
export const DEMO_STUDENT_PROFILE = {
  id: 'demo-student',
  name: 'Ayşe Yılmaz',
  email: 'ayse.yilmaz@email.com',
  number: '0532 123 45 67',
  boy: '165',
  dateOfBirth: '1995-03-15',
  gender: 'Kadın',
  aktif: 'Aktif' as const,
  trainingGoals: ['Yağ kaybı / kilo ver', 'Genel sağlık / fit kal'],
  followUpDays: 30,
  assessmentDate: '2024-09-01',
  jobDescription: 'Grafik Tasarımcı',
  jobRequiresLongSitting: true as boolean | null,
};

export const DEMO_PT_NOTE =
  'Düzenli devam ediyor. Kilo kaybı hedefine uygun ilerleme gösteriyor. Motivasyon yüksek, beslenme düzenini de giderek iyileştiriyor.';

// ════════════════════════════════════════════════════════════════════════════
// ÖĞRENCİ DETAY — Kayıtlar (yeniden eskiye, desc sıralamalı)
// ════════════════════════════════════════════════════════════════════════════
function makeRec(
  id: string,
  daysAgoN: number,
  weight: number,
  bodyFat: number,
  bel: number,
  kalca: number,
  analysis?: any,
) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgoN);
  d.setHours(10, 30, 0, 0);
  return {
    id,
    studentId: 'demo-student',
    createdAt: mockTs(d),
    weight: String(weight),
    bodyFat: String(bodyFat),
    bel: String(bel),
    kalca: String(kalca),
    note: '',
    analysis: analysis ?? null,
  };
}

export const DEMO_STUDENT_RECORDS = [
  makeRec('rec1', 7, 68.2, 22.1, 77, 96, {
    bmi: 25.1, bmiStatus: 'Normal',
    bruceVO2Max: 38.5, vo2Status: 'İyi',
    ymcaStatus: 'İyi',
    sitAndReachBest: 14, sitAndReachStatus: 'İyi',
    pushupStatus: 'İyi',
    plankStatus: 'Orta',
  }),
  makeRec('rec2', 37, 69.8, 23.4, 79, 97),
  makeRec('rec3', 67, 71.2, 24.6, 81, 99),
  makeRec('rec4', 97, 72.4, 25.8, 83, 101),
  makeRec('rec5', 127, 73.1, 26.5, 84, 102),
  makeRec('rec6', 157, 74.5, 27.9, 85, 103),
];

// ════════════════════════════════════════════════════════════════════════════
// ÖĞRENCİ DETAY — Notlar
// ════════════════════════════════════════════════════════════════════════════
function makeNote(id: string, title: string, text: string, daysAgoN: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgoN);
  return { id, title, text, createdAt: mockTs(d) };
}

export const DEMO_STUDENT_NOTES = [
  makeNote('n1', 'Genel Değerlendirme',
    'Düzenli devam ediyor. Motivasyon yüksek, hedefine uygun ilerleme kaydediyor. Sonraki ölçüm 30 gün içinde planlandı.', 7),
  makeNote('n2', 'Beslenme Notu',
    'Protein alımını artırması önerildi (1.8g/kg). Şeker tüketimini belirgin şekilde azaltmış, bu olumlu.', 40),
  makeNote('n3', 'Postür Gözlemi',
    'Sağ omuz hafif düşük, omurga düzeltme egzersizleri programa eklendi. Ayak bileği stabilitesi gelişmekte.', 75),
];
