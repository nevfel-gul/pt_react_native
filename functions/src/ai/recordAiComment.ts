import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import OpenAI from "openai";

// ─────────────────────────────────────────────────────────────
// Ölçüm sonrası AI yorumu (premium).
//
// Uygulama bir ölçüm kaydettikten sonra bu fonksiyonu kayıt kimliğiyle
// çağırır. Fonksiyon kaydı, bir önceki ölçümü ve öğrencinin profilini
// Firestore'dan KENDİSİ okur (istemciden gelen veriye güvenmez), modele
// sadece sayısal ölçümleri ve sınıflandırmaları gönderir — ad, telefon,
// e-posta, not gibi kişisel/serbest metin GÖNDERİLMEZ.
//
// Sonuç kaydın içine (`aiComment`) yazılır; aynı kayıt için tekrar
// çağrıldığında kayıtlı yorum döner, model yeniden çağrılmaz.
// "Yeniden oluştur" kayıt başına MAX_REGENERATIONS kez yapılabilir.
// ─────────────────────────────────────────────────────────────

const MODEL = "gpt-4.1-mini";
const MAX_REGENERATIONS = 2;

const LANGS = { tr: "Turkish", en: "English", de: "German", es: "Spanish", pt: "Brazilian Portuguese", fr: "French", it: "Italian" } as const;
type Lang = keyof typeof LANGS;

type Req = { recordId?: string; force?: boolean; locale?: string };

export type RecordAiComment = {
    summary: string;
    highlights: string[];
    warnings: string[];
    nextSteps: string[];
    locale: Lang;
    model: string;
    comparedToPrevious: boolean;
    createdAt: string;
};

const num = (v: unknown): number | null => {
    if (v == null || v === "") return null;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
};

const yesNo = (v: unknown): boolean | null => {
    const s = String(v ?? "").trim().toLowerCase();
    if (v === true || s === "yes" || s === "evet") return true;
    if (v === false || s === "no" || s === "hayır" || s === "hayir") return false;
    return null;
};

/** Kayıttan modele gidecek sayısal / sınıflandırılmış alanlar (serbest metin yok). */
function measurementsOf(r: any) {
    const a = r?.analysis ?? {};
    const pick: Record<string, unknown> = {
        weightKg: num(r.weight),
        bodyFatPct: num(r.bodyFat),
        muscleMassKg: num(r.totalMuscleMass),
        leanMassKg: num(r.leanBodyMass),
        bodyWaterPct: num(r.bodyWaterMass),
        bmi: num(r.bodyMassIndex),
        visceralFat: num(r.visceralFat),
        metabolicAge: num(r.metabolicAge),
        bmr: num(r.basalMetabolism),
        waistCm: num(r.bel),
        hipCm: num(r.kalca),
        restingHr: num(r.dinlenikNabiz ?? r.restingHeartRate),
        bloodPressure: num(r.systolicBP) && num(r.diastolicBP) ? `${r.systolicBP}/${r.diastolicBP}` : null,
        ymcaRecoveryHr: num(r.toparlanmaNabzi),
        vo2max: num(a.bruceVO2Max),
        pushups: num(r.pushup),
        pushupsOnKnees: yesNo(r.modifiedpushup),
        plankSec: num(r.plank),
        wallSitSec: num(r.wallsit),
        situps: num(r.mekik),
        sitAndReachCm: num(a.sitAndReachBest),
        status: {
            bmi: a.bmiStatus || null,
            bodyFat: a.bodyFatStatus || null,
            waistHip: a.bellyHipRatioStatus || null,
            ymca: a.ymcaStatus || null,
            vo2: a.vo2Status || null,
            pushup: a.pushupStatus || null,
            plank: a.plankStatus || null,
            wallSit: a.wallSitStatus || null,
            sitAndReach: a.sitAndReachStatus || null,
            visceralFat: a.visceralFatStatus || null,
            bloodPressure: a.bloodPressureCategory || null,
        },
        overheadSquat: {
            feetTurnOut: yesNo(r.ohsFeetTurnOut),
            kneesIn: yesNo(r.ohsKneesIn),
            forwardLean: yesNo(r.ohsForwardLean),
            lowBackArch: yesNo(r.ohsLowBackArch),
            armsFallForward: yesNo(r.ohsArmsFallForward),
            heelsRise: yesNo(r.ohsHeelsRise),
            asymmetricShift: yesNo(r.ohsAsymmetricShift),
        },
        posture: {
            pronationDistortion: yesNo(r.pronation),
            lowerCrossed: yesNo(r.lower),
            upperCrossed: yesNo(r.upper),
        },
    };
    // Boş alanları at: model boşlukları "kötü" diye yorumlamasın.
    const clean = (o: Record<string, unknown>): Record<string, unknown> =>
        Object.fromEntries(
            Object.entries(o)
                .map(([k, v]) => [k, v && typeof v === "object" && !Array.isArray(v) ? clean(v as any) : v])
                .filter(([, v]) => v !== null && v !== "" && !(typeof v === "object" && v && Object.keys(v).length === 0)),
        );
    return clean(pick);
}

function ageOf(dob?: string): number | null {
    if (!dob) return null;
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
    return age;
}

function createdMs(r: any): number {
    return r?.createdAt?.toMillis?.() ?? 0;
}

function strArr(v: unknown, max: number): string[] {
    return Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()).slice(0, max) : [];
}

function systemPrompt(locale: Lang, imperial: boolean) {
    const unitsLine = imperial
        ? "The input data is metric (kg, cm), but the coach uses IMPERIAL units: convert and write all weights in lb and lengths in inches (1 decimal)."
        : "Use metric units (kg, cm).";
    if (locale !== "tr") {
        return [
            `Write ALL text values in ${LANGS[locale]}.`,
            unitsLine,
            "You are an assistant for personal trainers. You interpret ONE client's fitness assessment for the COACH (not the client).",
            "Focus on change versus the previous assessment when it is provided; otherwise describe the starting point.",
            "Use the given status labels (they come from age/sex norm tables); do not invent norms.",
            "Never diagnose or suggest medication/treatment. If blood pressure is high (>=160/100) or PAR-Q flags exist, add a warning recommending medical clearance.",
            "Be concise, concrete, encouraging but honest. Use numbers.",
            'Output JSON only: {"summary":"2-3 sentences","highlights":["max 3 short positive changes"],"warnings":["max 3"],"nextSteps":["2-3 concrete training focuses for the next period"]}',
        ].join("\n");
    }
    return [
        "Personal trainer'lara yardımcı bir asistansın. TEK bir öğrencinin ölçümünü HOCA için yorumluyorsun (öğrenciye değil).",
        "Önceki ölçüm verildiyse değişime odaklan; verilmediyse başlangıç durumunu özetle.",
        "Verilen sınıflandırmaları kullan (yaş/cinsiyet norm tablolarından geliyor); kendi normunu uydurma.",
        "Tıbbi teşhis koyma, ilaç/tedavi önerme. Tansiyon yüksekse (>=160/100) ya da PAR-Q uyarısı varsa doktor onayı öneren bir uyarı ekle.",
        "Kısa, somut, cesaretlendirici ama dürüst ol. Sayı kullan. Türkçe yaz, 'sen' değil 'öğrenci' diye bahset.",
        imperial ? "Veri metrik (kg, cm) ama hoca İMPERİAL kullanıyor: ağırlıkları lb, uzunlukları inç olarak (1 ondalık) yaz." : "Metrik birim kullan (kg, cm).",
        'SADECE JSON döndür: {"summary":"2-3 cümle","highlights":["en fazla 3 kısa olumlu değişim"],"warnings":["en fazla 3"],"nextSteps":["sonraki dönem için 2-3 somut antrenman odağı"]}',
    ].join("\n");
}

export const recordAiComment = onCall<Req>(
    { secrets: ["OPENAI_API_KEY"], timeoutSeconds: 60 },
    async (request): Promise<RecordAiComment> => {
        const uid = request.auth?.uid;
        if (!uid) throw new HttpsError("unauthenticated", "Login required.");
        const { recordId, force } = request.data ?? {};
        const raw = String(request.data?.locale ?? "tr").slice(0, 2).toLowerCase();
        const locale: Lang = raw in LANGS ? (raw as Lang) : "tr";
        if (!recordId || typeof recordId !== "string") throw new HttpsError("invalid-argument", "recordId required.");

        const db = admin.firestore();
        const userRef = db.collection("users").doc(uid);
        const recRef = userRef.collection("records").doc(recordId);

        const [userSnap, recSnap] = await Promise.all([userRef.get(), recRef.get()]);
        if (!recSnap.exists) throw new HttpsError("not-found", "Record not found.");

        const sub = userSnap.data()?.subscription;
        const premium =
            sub?.isActive === true && (!sub?.expiresAt || Date.parse(sub.expiresAt) > Date.now());
        if (!premium) throw new HttpsError("permission-denied", "premium_required");

        const rec = recSnap.data()!;
        const existing = rec.aiComment as RecordAiComment | undefined;
        const regenCount = Number(rec.aiCommentRegenCount ?? 0);
        if (existing && !force) return existing;
        if (existing && force && regenCount >= MAX_REGENERATIONS) {
            throw new HttpsError("resource-exhausted", "regen_limit");
        }

        // Öğrenci profili ve önceki ölçüm (aynı öğrenci, bu kayıttan önce).
        const studentId = rec.studentId as string | undefined;
        const studentSnap = studentId ? await userRef.collection("students").doc(studentId).get() : null;
        const st = studentSnap?.data() ?? {};
        let previous: any = null;
        if (studentId) {
            const all = await userRef.collection("records").where("studentId", "==", studentId).get();
            const mine = createdMs(rec);
            previous =
                all.docs
                    .filter((d) => d.id !== recordId && createdMs(d.data()) < mine)
                    .sort((a, b) => createdMs(b.data()) - createdMs(a.data()))[0]
                    ?.data() ?? null;
        }

        const parqYes = [
            "doctorSaidHeartOrHypertension",
            "chestPainDuringActivityOrDaily",
            "dizzinessOrLostConsciousnessLast12Months",
            "diagnosedOtherChronicDisease",
            "usesMedicationForChronicDisease",
            "boneJointSoftTissueProblemWorseWithActivity",
            "doctorSaidOnlyUnderMedicalSupervision",
        ].filter((k) => st[k] === true).length;

        const payload = {
            client: {
                age: ageOf(st.dateOfBirth),
                sex: st.gender === "F" ? "female" : st.gender === "M" ? "male" : null,
                heightCm: num(st.boy),
                goals: Array.isArray(st.trainingGoals) ? st.trainingGoals.slice(0, 6) : [],
                experience: st.experienceLevel ?? null,
                parqYesCount: parqYes,
                medicalClearance: st.medicalClearance === true,
            },
            current: measurementsOf(rec),
            previous: previous ? measurementsOf(previous) : null,
            daysSincePrevious: previous ? Math.round((createdMs(rec) - createdMs(previous)) / 86_400_000) : null,
        };

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new HttpsError("failed-precondition", "AI not configured.");

        let parsed: any = null;
        try {
            const completion = await new OpenAI({ apiKey }).chat.completions.create({
                model: MODEL,
                temperature: 0.3,
                max_tokens: 600,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: systemPrompt(locale, userSnap.data()?.units === "imperial") },
                    { role: "user", content: JSON.stringify(payload) },
                ],
            });
            parsed = JSON.parse(completion.choices?.[0]?.message?.content ?? "{}");
        } catch (e: any) {
            logger.error("recordAiComment: model error", { uid, recordId, message: e?.message, status: e?.status });
            throw new HttpsError("internal", "ai_failed");
        }

        const summary = typeof parsed?.summary === "string" ? parsed.summary.trim() : "";
        if (!summary) throw new HttpsError("internal", "ai_empty");

        const comment: RecordAiComment = {
            summary,
            highlights: strArr(parsed?.highlights, 3),
            warnings: strArr(parsed?.warnings, 3),
            nextSteps: strArr(parsed?.nextSteps, 3),
            locale,
            model: MODEL,
            comparedToPrevious: !!previous,
            createdAt: new Date().toISOString(),
        };

        await recRef.update({
            aiComment: comment,
            ...(existing && force ? { aiCommentRegenCount: regenCount + 1 } : {}),
        });

        logger.info("recordAiComment generated", { uid, recordId, compared: !!previous, regenerated: !!(existing && force) });
        return comment;
    },
);
