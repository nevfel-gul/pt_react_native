// ─────────────────────────────────────────────────────────────
// Push bildirim metinleri (7 dil).
//
// Uygulama kullanıcının dilini users/{uid}.language alanına yazar
// (services/i18n.ts). Dili bilinmeyen eski kayıtlar Türkçe alır —
// 1.3 öncesi davranışla aynı.
//
// Değişkenler: {name} öğrenci kısa adı, {label} süre ("3 gün").
// ─────────────────────────────────────────────────────────────

export const PUSH_LANGS = ["tr", "en", "de", "es", "pt", "fr", "it"] as const;
export type PushLang = (typeof PUSH_LANGS)[number];

export function langOf(userData: any): PushLang {
    const code = String(userData?.language ?? "").slice(0, 2).toLowerCase();
    return (PUSH_LANGS as readonly string[]).includes(code) ? (code as PushLang) : "tr";
}

type Msg = { title: string; body: string };
type Table = Record<PushLang, Msg>;

export const PUSH: Record<string, Table> = {
    // ── Kayıt takibi (followUpReminderJob) ──
    reminder: {
        tr: { title: "Kayıt Zamanı Yaklaşıyor ⏳", body: "Yaklaşan bir değerlendirme kaydı var." },
        en: { title: "Assessment Coming Up ⏳", body: "A client's assessment is due soon." },
        de: { title: "Messung steht bald an ⏳", body: "Bei einem Kunden steht bald eine Messung an." },
        es: { title: "Evaluación próxima ⏳", body: "Pronto toca la evaluación de un cliente." },
        pt: { title: "Avaliação se aproximando ⏳", body: "A avaliação de um aluno está chegando." },
        fr: { title: "Bilan bientôt prévu ⏳", body: "Le bilan d'un client approche." },
        it: { title: "Valutazione in arrivo ⏳", body: "A breve è prevista la valutazione di un cliente." },
    },
    record: {
        tr: { title: "Kayıt Günü Geldi 📅", body: "Öğrencinin değerlendirme günü bugün." },
        en: { title: "Assessment Day 📅", body: "A client's assessment is due today." },
        de: { title: "Messtag 📅", body: "Heute steht die Messung eines Kunden an." },
        es: { title: "Día de evaluación 📅", body: "Hoy toca la evaluación de un cliente." },
        pt: { title: "Dia de avaliação 📅", body: "Hoje é dia de avaliar um aluno." },
        fr: { title: "Jour de bilan 📅", body: "Le bilan d'un client est prévu aujourd'hui." },
        it: { title: "Giorno di valutazione 📅", body: "Oggi è prevista la valutazione di un cliente." },
    },
    overdue1: {
        tr: { title: "Kayıt Gecikti ⚠️", body: "Dün yapılması gereken kayıt girilmedi." },
        en: { title: "Assessment Overdue ⚠️", body: "Yesterday's assessment hasn't been logged." },
        de: { title: "Messung überfällig ⚠️", body: "Die gestrige Messung wurde nicht eingetragen." },
        es: { title: "Evaluación atrasada ⚠️", body: "La evaluación de ayer no se ha registrado." },
        pt: { title: "Avaliação atrasada ⚠️", body: "A avaliação de ontem não foi registrada." },
        fr: { title: "Bilan en retard ⚠️", body: "Le bilan d'hier n'a pas été enregistré." },
        it: { title: "Valutazione in ritardo ⚠️", body: "La valutazione di ieri non è stata registrata." },
    },
    overdue3: {
        tr: { title: "Kayıt Hâlâ Girilmedi 🚨", body: "3 gündür değerlendirme kaydı eksik." },
        en: { title: "Assessment Still Missing 🚨", body: "An assessment has been missing for 3 days." },
        de: { title: "Messung fehlt weiterhin 🚨", body: "Seit 3 Tagen fehlt eine Messung." },
        es: { title: "Evaluación aún pendiente 🚨", body: "Falta una evaluación desde hace 3 días." },
        pt: { title: "Avaliação ainda pendente 🚨", body: "Há 3 dias falta uma avaliação." },
        fr: { title: "Bilan toujours manquant 🚨", body: "Un bilan manque depuis 3 jours." },
        it: { title: "Valutazione ancora mancante 🚨", body: "Manca una valutazione da 3 giorni." },
    },
    overdue7: {
        tr: { title: "Kayıt 1 Haftadır Eksik ❗", body: "7 gündür kayıt girilmedi." },
        en: { title: "Assessment Missing for a Week ❗", body: "No assessment logged for 7 days." },
        de: { title: "Messung seit einer Woche offen ❗", body: "Seit 7 Tagen wurde keine Messung eingetragen." },
        es: { title: "Una semana sin evaluación ❗", body: "No se ha registrado ninguna evaluación en 7 días." },
        pt: { title: "Uma semana sem avaliação ❗", body: "Nenhuma avaliação registrada há 7 dias." },
        fr: { title: "Bilan manquant depuis une semaine ❗", body: "Aucun bilan enregistré depuis 7 jours." },
        it: { title: "Valutazione mancante da una settimana ❗", body: "Nessuna valutazione registrata da 7 giorni." },
    },

    // ── İlk kayıt hatırlatması (noRecordReminderJob) ──
    noRecord: {
        tr: { title: "Kayıt Oluşturulmadı ⚠️", body: "Öğrenci eklendi ancak {label} içinde değerlendirme girilmedi." },
        en: { title: "No Assessment Yet ⚠️", body: "A client was added but no assessment was logged within {label}." },
        de: { title: "Noch keine Messung ⚠️", body: "Ein Kunde wurde hinzugefügt, aber innerhalb von {label} keine Messung eingetragen." },
        es: { title: "Aún sin evaluación ⚠️", body: "Se añadió un cliente pero no se registró ninguna evaluación en {label}." },
        pt: { title: "Ainda sem avaliação ⚠️", body: "Um aluno foi adicionado, mas nenhuma avaliação foi registrada em {label}." },
        fr: { title: "Pas encore de bilan ⚠️", body: "Un client a été ajouté, mais aucun bilan n'a été saisi en {label}." },
        it: { title: "Ancora nessuna valutazione ⚠️", body: "È stato aggiunto un cliente ma nessuna valutazione è stata registrata in {label}." },
    },

    // ── Öğrencisi olmayan hoca (noStudentReminderJob) ──
    noStudent: {
        tr: { title: "Öğrenci Eklemeyi Unuttun 👀", body: "Henüz hiç öğrenci eklemedin. Hemen ekleyip takibe başla." },
        en: { title: "Add Your First Client 👀", body: "You haven't added any clients yet. Add one and start tracking." },
        de: { title: "Füge deinen ersten Kunden hinzu 👀", body: "Du hast noch keine Kunden. Leg los und starte das Tracking." },
        es: { title: "Añade tu primer cliente 👀", body: "Aún no has añadido clientes. Añade uno y empieza a hacer seguimiento." },
        pt: { title: "Adicione seu primeiro aluno 👀", body: "Você ainda não adicionou alunos. Adicione um e comece o acompanhamento." },
        fr: { title: "Ajoutez votre premier client 👀", body: "Vous n'avez encore aucun client. Ajoutez-en un et commencez le suivi." },
        it: { title: "Aggiungi il tuo primo cliente 👀", body: "Non hai ancora aggiunto clienti. Aggiungine uno e inizia a monitorare." },
    },

    // ── Haftalık analiz (weeklyAnalyticsReminderJob) ──
    weeklyAnalytics: {
        tr: { title: "Haftalık Analiz Zamanı 📊", body: "Öğrencilerinin gelişim analizlerine baktın mı? Kontrol etmeyi unutma." },
        en: { title: "Weekly Review Time 📊", body: "Have you checked your clients' progress this week?" },
        de: { title: "Zeit für den Wochenrückblick 📊", body: "Hast du die Fortschritte deiner Kunden diese Woche angesehen?" },
        es: { title: "Hora del repaso semanal 📊", body: "¿Has revisado el progreso de tus clientes esta semana?" },
        pt: { title: "Hora da revisão semanal 📊", body: "Você já conferiu a evolução dos seus alunos esta semana?" },
        fr: { title: "C'est l'heure du bilan hebdo 📊", body: "Avez-vous consulté les progrès de vos clients cette semaine ?" },
        it: { title: "È ora del riepilogo settimanale 📊", body: "Hai controllato i progressi dei tuoi clienti questa settimana?" },
    },

    // ── Paket hatırlatması (packageReminderJob) ──
    lowSessions: {
        tr: { title: "Pakette 1 ders kaldı 📦", body: "{name} için son ders. Yeni paketi konuşmanın tam zamanı." },
        en: { title: "1 session left 📦", body: "Last session for {name}. A good time to talk about the next package." },
        de: { title: "Noch 1 Einheit übrig 📦", body: "Letzte Einheit für {name}. Ein guter Moment, über das nächste Paket zu sprechen." },
        es: { title: "Queda 1 sesión 📦", body: "Última sesión de {name}. Buen momento para hablar del próximo paquete." },
        pt: { title: "Resta 1 aula 📦", body: "Última aula de {name}. Boa hora para conversar sobre o próximo pacote." },
        fr: { title: "Plus qu'une séance 📦", body: "Dernière séance pour {name}. C'est le moment de parler du prochain forfait." },
        it: { title: "Resta 1 sessione 📦", body: "Ultima sessione per {name}. È il momento di parlare del prossimo pacchetto." },
    },
    packageFinished: {
        tr: { title: "Paket bitti ✅", body: "{name} paketindeki tüm dersleri tamamladı. Devam için yeni paket ekleyebilirsin." },
        en: { title: "Package complete ✅", body: "{name} has used all sessions in the package. Add a new one to continue." },
        de: { title: "Paket abgeschlossen ✅", body: "{name} hat alle Einheiten des Pakets genutzt. Füge ein neues Paket hinzu, um weiterzumachen." },
        es: { title: "Paquete completado ✅", body: "{name} ha usado todas las sesiones del paquete. Añade uno nuevo para continuar." },
        pt: { title: "Pacote concluído ✅", body: "{name} usou todas as aulas do pacote. Adicione um novo para continuar." },
        fr: { title: "Forfait terminé ✅", body: "{name} a utilisé toutes les séances du forfait. Ajoutez-en un nouveau pour continuer." },
        it: { title: "Pacchetto completato ✅", body: "{name} ha usato tutte le sessioni del pacchetto. Aggiungine uno nuovo per continuare." },
    },
    packageExpiring: {
        tr: { title: "Paket süresi doluyor ⏳", body: "{name} paketinin süresi 3 gün içinde doluyor, hâlâ dersi var." },
        en: { title: "Package expiring ⏳", body: "{name}'s package expires in 3 days and still has sessions left." },
        de: { title: "Paket läuft ab ⏳", body: "Das Paket von {name} läuft in 3 Tagen ab und hat noch offene Einheiten." },
        es: { title: "El paquete vence pronto ⏳", body: "El paquete de {name} vence en 3 días y aún tiene sesiones." },
        pt: { title: "Pacote vencendo ⏳", body: "O pacote de {name} vence em 3 dias e ainda tem aulas." },
        fr: { title: "Forfait bientôt expiré ⏳", body: "Le forfait de {name} expire dans 3 jours et il reste des séances." },
        it: { title: "Pacchetto in scadenza ⏳", body: "Il pacchetto di {name} scade tra 3 giorni e ha ancora sessioni." },
    },
};

/** Süre etiketi (noRecordReminderJob): 1 saat / 1 gün / 3 gün / 7 gün. */
const DURATION: Record<PushLang, { hour: (n: number) => string; day: (n: number) => string }> = {
    tr: { hour: (n) => `${n} saat`, day: (n) => `${n} gün` },
    en: { hour: (n) => `${n} hour${n === 1 ? "" : "s"}`, day: (n) => `${n} day${n === 1 ? "" : "s"}` },
    de: { hour: (n) => `${n} Stunde${n === 1 ? "" : "n"}`, day: (n) => `${n} Tag${n === 1 ? "" : "en"}` },
    es: { hour: (n) => `${n} hora${n === 1 ? "" : "s"}`, day: (n) => `${n} día${n === 1 ? "" : "s"}` },
    pt: { hour: (n) => `${n} hora${n === 1 ? "" : "s"}`, day: (n) => `${n} dia${n === 1 ? "" : "s"}` },
    fr: { hour: (n) => `${n} heure${n === 1 ? "" : "s"}`, day: (n) => `${n} jour${n === 1 ? "" : "s"}` },
    it: { hour: (n) => `${n} or${n === 1 ? "a" : "e"}`, day: (n) => `${n} giorn${n === 1 ? "o" : "i"}` },
};

export function durationLabel(lang: PushLang, unit: "hour" | "day", n: number) {
    return DURATION[lang][unit](n);
}

export function pushText(key: keyof typeof PUSH, lang: PushLang, vars: Record<string, string> = {}): Msg {
    const msg = PUSH[key]?.[lang] ?? PUSH[key].tr;
    const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
    return { title: fill(msg.title), body: fill(msg.body) };
}

// ── Sabah motivasyonu (morningMotivation) ──
export const MORNING: Record<PushLang, { title: string; bodies: string[] }> = {
    tr: { title: "Günaydın ☀️", bodies: ["Bugün antrenman günü 🔥", "Hedefine 1 gün daha yaklaştın 🏋️", "Öğrencilerin seni bekliyor 👀", "Güne bir ölçümle başla 💪"] },
    en: { title: "Good morning ☀️", bodies: ["It's training day 🔥", "One day closer to your goals 🏋️", "Your clients are waiting 👀", "Start the day with an assessment 💪"] },
    de: { title: "Guten Morgen ☀️", bodies: ["Heute ist Trainingstag 🔥", "Deinem Ziel einen Tag näher 🏋️", "Deine Kunden warten auf dich 👀", "Starte den Tag mit einer Messung 💪"] },
    es: { title: "Buenos días ☀️", bodies: ["Hoy toca entrenar 🔥", "Un día más cerca de tus objetivos 🏋️", "Tus clientes te esperan 👀", "Empieza el día con una evaluación 💪"] },
    pt: { title: "Bom dia ☀️", bodies: ["Hoje é dia de treino 🔥", "Um dia mais perto dos seus objetivos 🏋️", "Seus alunos estão esperando 👀", "Comece o dia com uma avaliação 💪"] },
    fr: { title: "Bonjour ☀️", bodies: ["C'est jour d'entraînement 🔥", "Un jour de plus vers vos objectifs 🏋️", "Vos clients vous attendent 👀", "Commencez la journée par un bilan 💪"] },
    it: { title: "Buongiorno ☀️", bodies: ["Oggi si allena 🔥", "Un giorno più vicino ai tuoi obiettivi 🏋️", "I tuoi clienti ti aspettano 👀", "Inizia la giornata con una valutazione 💪"] },
};
