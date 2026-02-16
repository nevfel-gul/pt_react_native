import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import OpenAI from "openai";
import { sendPush } from "./push";

setGlobalOptions({ region: "europe-west1" });
admin.initializeApp();

// -------------------------
// Types
// -------------------------
type Locale = "tr" | "en";

type FitnessCommentRequest = {
    studentId: string;
    locale?: Locale;
    question?: string;
    extra?: Record<string, any>;
    limitRecords?: number;
};

type AiFitnessResponse = {
    answer: string;
    data?: {
        summary?: string;
        warnings?: string[];
        nextSteps?: string[];
        tags?: string[];
    };
};

type AiStudentSearchRequest = {
    queryText: string;
    locale?: Locale;
    onlyActive?: boolean;
    limit?: number;
};

type AiStudentSearchResponse = {
    ids: string[];
    reason?: string;
    details?: Array<{ id: string; name: string; note?: string; aktif?: string }>;
};

// -------------------------
// Helpers
// -------------------------
function safeJsonParse(raw: string): any {
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match?.[0]) {
            try {
                return JSON.parse(match[0]);
            } catch {
                return {};
            }
        }
        return {};
    }
}

function pickStringArray(v: any, max = 20): string[] {
    if (!Array.isArray(v)) return [];
    return v.filter((x) => typeof x === "string").slice(0, max);
}

function makeTraceId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeReason(input: any, locale: Locale): string {
    let r = typeof input === "string" ? input : "";
    r = r.replace(/\s+/g, " ").trim();
    const junkPatterns: RegExp[] = [
        /(^|\s)(dolu|dolu olanlar|olanlar|vs\.?|vesaire|gibi)\b/gi,
        /\b(seçilen(ler)?|liste|sonuç(lar)?|eşleşen(ler)?|matched|results?)\b\s*[:：-]\s*/gi,
        /\b(json|ids?)\b\s*[:：-]\s*/gi,
    ];
    for (const p of junkPatterns) r = r.replace(p, " ");
    if (r.length > 220) r = r.slice(0, 217).trimEnd() + "...";
    if (!r) {
        return locale === "tr"
            ? "Sorguna en yakın öğrenciler seçildi."
            : "Selected the closest matching students for your query.";
    }
    const parts = r.split(/[.!?]\s+/).filter(Boolean);
    if (parts.length > 2) r = parts.slice(0, 2).join(". ") + ".";
    return r;
}

// -------------------------
// PII Sanitizers
// -------------------------
const PII_KEY_SET = new Set([
    "email",
    "e_mail",
    "mail",
    "phone",
    "telefon",
    "tel",
    "gsm",
    "mobile",
    "contact",
]);

function redactEmailPhoneInText(input: string): string {
    if (!input) return input;
    let out = input.replace(
        /([a-zA-Z0-9._%+-]{1,})@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        "[REDACTED_EMAIL]"
    );
    out = out.replace(
        /(\+?90[\s-]?)?0?\s*(5\d{2})[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g,
        "[REDACTED_PHONE]"
    );
    return out;
}

function stripPiiDeep(value: any, depth = 0): any {
    if (depth > 12) return null;
    if (value == null) return value;
    if (typeof value === "string") return redactEmailPhoneInText(value);
    if (typeof value === "number" || typeof value === "boolean") return value;
    if (Array.isArray(value)) return value.map((v) => stripPiiDeep(v, depth + 1));
    if (typeof value === "object") {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) {
            const keyLower = String(k).toLowerCase();
            if (PII_KEY_SET.has(keyLower)) continue;
            out[k] = stripPiiDeep(v, depth + 1);
        }
        return out;
    }
    return null;
}

// -------------------------
// Firestore fetch helpers
// -------------------------
function getOwnerFieldCandidates(uid: string) {
    return [
        { field: "uid", value: uid },
        { field: "ownerId", value: uid },
        { field: "userId", value: uid },
        { field: "trainerId", value: uid },
    ] as const;
}

async function fetchStudentDoc(uid: string, studentId: string) {
    const db = admin.firestore();

    const aRef = db.collection("users").doc(uid).collection("students").doc(studentId);
    const aSnap = await aRef.get();
    if (aSnap.exists) return { id: aSnap.id, data: aSnap.data() ?? {}, path: aRef.path };

    const bRef = db.collection("students").doc(studentId);
    const bSnap = await bRef.get();
    if (bSnap.exists) {
        const data = bSnap.data() ?? {};
        const ok =
            data.uid === uid || data.ownerId === uid || data.userId === uid || data.trainerId === uid;
        if (ok) return { id: bSnap.id, data, path: bRef.path };
    }

    for (const cand of getOwnerFieldCandidates(uid)) {
        const q = await db
            .collection("students")
            .where(cand.field, "==", cand.value)
            .where("id", "==", studentId)
            .limit(1)
            .get();
        if (!q.empty) {
            const d = q.docs[0];
            return { id: d.id, data: d.data() ?? {}, path: d.ref.path };
        }
    }

    return null;
}

async function fetchLatestRecords(uid: string, studentId: string, limit = 30) {
    const db = admin.firestore();
    const out: Array<{ id: string; data: any; path: string }> = [];

    {
        const q = await db
            .collection("users")
            .doc(uid)
            .collection("records")
            .where("studentId", "==", studentId)
            .orderBy("createdAt", "desc")
            .limit(limit)
            .get();
        if (!q.empty) {
            q.docs.forEach((d) => out.push({ id: d.id, data: d.data() ?? {}, path: d.ref.path }));
            return out;
        }
    }

    for (const cand of getOwnerFieldCandidates(uid)) {
        const q = await db
            .collection("records")
            .where(cand.field, "==", cand.value)
            .where("studentId", "==", studentId)
            .orderBy("createdAt", "desc")
            .limit(limit)
            .get();
        if (!q.empty) {
            q.docs.forEach((d) => out.push({ id: d.id, data: d.data() ?? {}, path: d.ref.path }));
            return out;
        }
    }

    return out;
}

async function fetchLatestStudentNotes(uid: string, studentId: string, limit = 20) {
    const db = admin.firestore();

    // 1) users/{uid}/students/{studentId}/notes
    const aSnap = await db
        .collection("users")
        .doc(uid)
        .collection("students")
        .doc(studentId)
        .collection("notes")
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

    if (!aSnap.empty) {
        return aSnap.docs.map((d) => ({ id: d.id, data: d.data(), path: d.ref.path }));
    }

    // 2) fallback: students/{studentId}/notes
    const bSnap = await db
        .collection("students")
        .doc(studentId)
        .collection("notes")
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

    return bSnap.docs.map((d) => ({ id: d.id, data: d.data(), path: d.ref.path }));
}

async function fetchStudentsForUser(uid: string, limit = 300, onlyActive?: boolean) {
    const db = admin.firestore();

    {
        let q = db.collection("users").doc(uid).collection("students") as admin.firestore.Query;
        if (onlyActive) q = q.where("aktif", "==", "Aktif");
        q = q.limit(limit);
        const snap = await q.get();
        if (!snap.empty) {
            return snap.docs.map((d) => ({ id: d.id, data: d.data() ?? {}, path: d.ref.path }));
        }
    }

    for (const cand of getOwnerFieldCandidates(uid)) {
        let q = db.collection("students").where(cand.field, "==", cand.value) as admin.firestore.Query;
        if (onlyActive) q = q.where("aktif", "==", "Aktif");
        q = q.limit(limit);
        const snap = await q.get();
        if (!snap.empty) {
            return snap.docs.map((d) => ({ id: d.id, data: d.data() ?? {}, path: d.ref.path }));
        }
    }

    return [];
}

// -------------------------
// ✅ FIXED: Smart Search Query Router
// -------------------------

type QueryRoute =
    | {
        kind: "firestoreBoolean";
        field: string;
        noteField?: string;
        labelTr: string;
        labelEn: string;
    }
    | { kind: "llmMinimal" };

function detectRoute(queryText: string): QueryRoute {
    const q = (queryText || "").toLowerCase().trim();

    // Kalp / tansiyon
    if (
        q.includes("kalp") ||
        q.includes("tansiyon") ||
        q.includes("hipertans") ||
        q.includes("heart") ||
        q.includes("hypertension") ||
        q.includes("blood pressure")
    ) {
        return {
            kind: "firestoreBoolean",
            field: "doctorSaidHeartOrHypertension",
            noteField: "doctorSaidHeartOrHypertensionNote",
            labelTr: "Kalp/Tansiyon",
            labelEn: "Heart/BP",
        };
    }

    // Topuklu ayakkabı
    if (q.includes("topuk") || q.includes("high heel") || q.includes("heels")) {
        return {
            kind: "firestoreBoolean",
            field: "jobRequiresHighHeels",
            noteField: undefined,
            labelTr: "Topuklu ayakkabı",
            labelEn: "High heels",
        };
    }

    // Ameliyat
    if (q.includes("ameliyat") || q.includes("surgery") || q.includes("operation")) {
        return {
            kind: "firestoreBoolean",
            field: "hadSurgery",
            noteField: "hadSurgeryNote",
            labelTr: "Ameliyat geçmişi",
            labelEn: "Surgery history",
        };
    }

    // İlaç kullanımı
    if (q.includes("ilaç") || q.includes("medication") || q.includes("medicine")) {
        return {
            kind: "firestoreBoolean",
            field: "currentlyUsesMedications",
            noteField: "currentlyUsesMedicationsNote",
            labelTr: "İlaç kullanımı",
            labelEn: "Medication",
        };
    }

    // Kronik hastalık
    if (q.includes("kronik") || q.includes("chronic")) {
        return {
            kind: "firestoreBoolean",
            field: "diagnosedChronicDiseaseByDoctor",
            noteField: "diagnosedChronicDiseaseByDoctorNote",
            labelTr: "Kronik hastalık",
            labelEn: "Chronic disease",
        };
    }

    return { kind: "llmMinimal" };
}

function readDotPath(obj: any, path: string) {
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) {
        if (cur && typeof cur === "object" && p in cur) cur = cur[p];
        else return undefined;
    }
    return cur;
}

// ✅ FIXED: Simplified Firestore boolean query
async function queryStudentsByBooleanField(params: {
    uid: string;
    field: string;
    noteField?: string;
    onlyActive?: boolean;
    limit: number;
}) {
    const { uid, field, noteField, onlyActive, limit } = params;
    const db = admin.firestore();

    type Hit = { id: string; name: string; note: string; path: string };
    const hits: Hit[] = [];

    // 1) Try users/{uid}/students first
    try {
        let q1 = db
            .collection("users")
            .doc(uid)
            .collection("students")
            .where(field, "==", true) as admin.firestore.Query;

        if (onlyActive) {
            q1 = q1.where("aktif", "==", "Aktif");
        }

        const snap1 = await q1.limit(limit).get();

        snap1.docs.forEach((d) => {
            const data = d.data();
            hits.push({
                id: d.id,
                name: data.name || data.fullName || "",
                note: noteField ? (data[noteField] || "") : "",
                path: d.ref.path,
            });
        });

        if (hits.length > 0) {
            logger.info("queryStudentsByBooleanField found in users subcollection", {
                uid,
                field,
                count: hits.length,
            });
            return hits;
        }
    } catch (err: any) {
        logger.warn("Query failed on users subcollection", {
            field,
            error: err?.message,
        });
    }

    // 2) Fallback to root students collection
    for (const cand of getOwnerFieldCandidates(uid)) {
        try {
            let q2 = db
                .collection("students")
                .where(cand.field, "==", cand.value)
                .where(field, "==", true) as admin.firestore.Query;

            if (onlyActive) {
                q2 = q2.where("aktif", "==", "Aktif");
            }

            const snap2 = await q2.limit(limit).get();

            snap2.docs.forEach((d) => {
                const data = d.data();
                if (!hits.find((h) => h.id === d.id)) {
                    hits.push({
                        id: d.id,
                        name: data.name || data.fullName || "",
                        note: noteField ? (data[noteField] || "") : "",
                        path: d.ref.path,
                    });
                }
            });

            if (hits.length > 0) {
                logger.info("queryStudentsByBooleanField found in root students", {
                    uid,
                    field,
                    candidate: cand.field,
                    count: hits.length,
                });
                break;
            }
        } catch (err: any) {
            logger.warn("Query failed on root students", {
                field,
                candidate: cand.field,
                error: err?.message,
            });
        }
    }

    return hits.slice(0, limit);
}

function buildReasonList(params: {
    locale: Locale;
    labelTr: string;
    labelEn: string;
    items: Array<{ name: string; note?: string }>;
}) {
    const { locale, labelTr, labelEn, items } = params;
    if (!items.length)
        return locale === "tr" ? "Eşleşen öğrenci bulunamadı." : "No matching students found.";

    const parts: string[] = [];
    for (const it of items.slice(0, 8)) {
        const n = (it.name || "").toString().trim() || (locale === "tr" ? "İsimsiz" : "Unnamed");
        const note = (it.note || "").toString().trim();
        parts.push(note ? `${n}: ${note}` : `${n}`);
    }

    const head = locale === "tr" ? `${labelTr} eşleşmeleri:` : `${labelEn} matches:`;
    let out = `${head} ${parts.join(", ")}.`;
    if (items.length > 8)
        out += locale === "tr" ? ` (+${items.length - 8} kişi daha)` : ` (+${items.length - 8} more)`;
    return out;
}

// -------------------------
// Function: fitnessComment
// -------------------------
export const fitnessComment = onCall(
    { cors: true, secrets: ["OPENAI_API_KEY"] },
    async (request) => {
        const traceId = makeTraceId();
        try {
            if (!request.auth) throw new HttpsError("unauthenticated", "Login required.", { traceId });

            const uid = request.auth.uid;
            const data = request.data as FitnessCommentRequest;
            const studentId = String(data?.studentId ?? "").trim();
            if (!studentId)
                throw new HttpsError("invalid-argument", "studentId is required.", { traceId });

            const locale: Locale = data.locale ?? "tr";
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey)
                throw new HttpsError(
                    "failed-precondition",
                    "Missing OPENAI_API_KEY on server.",
                    { traceId }
                );

            const student = await fetchStudentDoc(uid, studentId);
            if (!student) {
                throw new HttpsError(
                    "not-found",
                    locale === "tr" ? "Öğrenci bulunamadı." : "Student not found.",
                    { traceId }
                );
            }

            const limitRecords = Math.max(1, Math.min(50, Number(data.limitRecords ?? 30)));
            const records = await fetchLatestRecords(uid, studentId, limitRecords);
            const notes = await fetchLatestStudentNotes(uid, studentId, 20);

            const cleanedStudentData = stripPiiDeep(student.data);

            const payload = {
                student: { id: student.id, ...cleanedStudentData },
                measurementRecords: stripPiiDeep(records.map((r) => ({ id: r.id, ...r.data }))),
                coachNotes: stripPiiDeep(notes.map((n) => ({ id: n.id, ...n.data }))),
                question: stripPiiDeep(data.question ?? ""),
                extra: stripPiiDeep(data.extra ?? null),
                locale,
            };

            const systemPrompt =
                locale === "tr"
                    ? `Sen profesyonel bir fitness ve antrenman asistanısın.
- SADECE fitness/antrenman/ölçüm/performance konularında cevap ver.
- Medikal teşhis/ilaç yok.
ÇIKTI JSON: {"answer":"...","data":{"summary":"...","warnings":[],"nextSteps":[],"tags":[]}}`
                    : `You are a professional fitness & training assistant.
- Only fitness/training/performance.
- No medical diagnosis/medications.
OUTPUT JSON: {"answer":"...","data":{"summary":"...","warnings":[],"nextSteps":[],"tags":[]}}`;

            const client = new OpenAI({ apiKey });
            const completion = await client.chat.completions.create({
                model: "gpt-4o-mini",
                temperature: 0.3,
                max_tokens: 2000,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: JSON.stringify(payload) },
                ],
            });

            const raw = completion.choices?.[0]?.message?.content?.trim() || "{}";
            const parsed = safeJsonParse(raw);

            const res: AiFitnessResponse = {
                answer:
                    typeof parsed?.answer === "string"
                        ? parsed.answer
                        : locale === "tr"
                            ? "Üzgünüm, şu an cevap oluşturamadım. Lütfen tekrar deneyin."
                            : "Sorry, I couldn't generate an answer right now. Please try again.",
                data: parsed?.data
                    ? {
                        summary: typeof parsed.data.summary === "string" ? parsed.data.summary : "",
                        warnings: pickStringArray(parsed.data.warnings),
                        nextSteps: pickStringArray(parsed.data.nextSteps),
                        tags: pickStringArray(parsed.data.tags),
                    }
                    : undefined,
            };

            logger.info("fitnessComment success", {
                traceId,
                uid,
                studentId,
                hasQuestion: !!data.question,
                answerLength: res.answer.length,
                recordsCount: records.length,
                notesCount: notes.length,
            });

            return res;
        } catch (err: any) {
            if (err instanceof HttpsError) throw err;
            logger.error("fitnessComment error", {
                traceId,
                error: err?.message,
                stack: err?.stack,
            });
            throw new HttpsError("internal", "Internal error.", { traceId });
        }
    }
);

// -------------------------
// Function: progressAssistant
// -------------------------
export const progressAssistant = onCall(
    { cors: true, secrets: ["OPENAI_API_KEY"] },
    async (request) => {
        const traceId = makeTraceId();
        try {
            if (!request.auth) throw new HttpsError("unauthenticated", "Login required.", { traceId });

            const uid = request.auth.uid;
            const data = request.data as FitnessCommentRequest;
            const studentId = String(data?.studentId ?? "").trim();
            if (!studentId)
                throw new HttpsError("invalid-argument", "studentId is required.", { traceId });

            const locale: Locale = data.locale ?? "tr";
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey)
                throw new HttpsError(
                    "failed-precondition",
                    "Missing OPENAI_API_KEY on server.",
                    { traceId }
                );

            const student = await fetchStudentDoc(uid, studentId);
            if (!student) {
                throw new HttpsError(
                    "not-found",
                    locale === "tr" ? "Öğrenci bulunamadı." : "Student not found.",
                    { traceId }
                );
            }

            const limitRecords = Math.max(1, Math.min(50, Number(data.limitRecords ?? 30)));
            const records = await fetchLatestRecords(uid, studentId, limitRecords);
            const notes = await fetchLatestStudentNotes(uid, studentId, 20);

            const cleanedStudentData = stripPiiDeep(student.data);
            const payload = {
                student: { id: student.id, ...cleanedStudentData },
                measurementRecords: stripPiiDeep(records.map((r) => ({ id: r.id, ...r.data }))),
                coachNotes: stripPiiDeep(notes.map((n) => ({ id: n.id, ...n.data }))),
                question: stripPiiDeep(data.question ?? ""),
                extra: stripPiiDeep(data.extra ?? null),
                locale,
            };

            const systemPrompt =
                locale === "tr"
                    ? `Sen profesyonel bir fitness ve antrenman asistanısın.
- Sadece fitness/antrenman/performans.
- Beslenme planı yazma, medikal teşhis/ilaç yok.
ÇIKTI JSON: {"answer":"...","data":{"summary":"...","warnings":[],"nextSteps":[],"tags":[]}}`
                    : `You are a professional fitness/training assistant.
- Only fitness/training/performance.
- No nutrition plan, no medical diagnosis/medications.
OUTPUT JSON: {"answer":"...","data":{"summary":"...","warnings":[],"nextSteps":[],"tags":[]}}`;

            const client = new OpenAI({ apiKey });
            const completion = await client.chat.completions.create({
                model: "gpt-4o-mini",
                temperature: 0.3,
                max_tokens: 2000,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: JSON.stringify(payload) },
                ],
            });

            const raw = completion.choices?.[0]?.message?.content?.trim() || "{}";
            const parsed = safeJsonParse(raw);

            const res: AiFitnessResponse = {
                answer:
                    typeof parsed?.answer === "string"
                        ? parsed.answer
                        : locale === "tr"
                            ? "Üzgünüm, şu an cevap oluşturamadım. Lütfen tekrar deneyin."
                            : "Sorry, I couldn't generate an answer right now. Please try again.",
                data: parsed?.data
                    ? {
                        summary: typeof parsed.data.summary === "string" ? parsed.data.summary : "",
                        warnings: pickStringArray(parsed.data.warnings),
                        nextSteps: pickStringArray(parsed.data.nextSteps),
                        tags: pickStringArray(parsed.data.tags),
                    }
                    : undefined,
            };

            logger.info("progressAssistant success", {
                traceId,
                uid,
                studentId,
                hasQuestion: !!data.question,
                answerLength: res.answer.length,
                recordsCount: records.length,
                notesCount: notes.length,
            });

            return res;
        } catch (err: any) {
            if (err instanceof HttpsError) throw err;
            logger.error("progressAssistant error", {
                traceId,
                error: err?.message,
                stack: err?.stack,
            });
            throw new HttpsError("internal", "Internal error.", { traceId });
        }
    }
);

// -------------------------
// ✅ FIXED: aiStudentSearch
// -------------------------
export const aiStudentSearch = onCall(
    { cors: true, secrets: ["OPENAI_API_KEY"] },
    async (request) => {
        const traceId = makeTraceId();
        try {
            if (!request.auth) throw new HttpsError("unauthenticated", "Login required.", { traceId });

            const uid = request.auth.uid;
            const data = request.data as AiStudentSearchRequest;

            const qRaw = (data?.queryText ?? "").trim();
            if (!qRaw) throw new HttpsError("invalid-argument", "queryText required.", { traceId });

            const locale: Locale = data.locale ?? "tr";
            const onlyActive = !!data.onlyActive;
            const limit = Math.max(30, Math.min(600, Number(data.limit ?? 300)));

            const route = detectRoute(qRaw);

            // ✅ 1) Firestore Direct Boolean Queries
            if (route.kind === "firestoreBoolean") {
                const items = await queryStudentsByBooleanField({
                    uid,
                    field: route.field,
                    noteField: route.noteField,
                    onlyActive,
                    limit: Math.min(250, limit),
                });

                const ids = items.map((x) => x.id).slice(0, 30);

                const reason = buildReasonList({
                    locale,
                    labelTr: route.labelTr,
                    labelEn: route.labelEn,
                    items: items.map((x) => ({ name: x.name, note: x.note })),
                });

                logger.info("aiStudentSearch firestoreBoolean ok", {
                    traceId,
                    uid,
                    q: qRaw,
                    field: route.field,
                    outCount: ids.length,
                    samplePaths: items.slice(0, 3).map((x) => x.path),
                });

                const res: AiStudentSearchResponse = {
                    ids,
                    reason: normalizeReason(reason, locale),
                    details: items.slice(0, 30).map((x) => ({
                        id: x.id,
                        name: x.name,
                        note: x.note,
                    })),
                };
                return res;
            }

            // ✅ 2) Fallback: LLM with enhanced nested field support
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey)
                throw new HttpsError(
                    "failed-precondition",
                    "Missing OPENAI_API_KEY on server.",
                    { traceId }
                );

            const students = await fetchStudentsForUser(uid, limit, onlyActive);
            if (!students.length) {
                return {
                    ids: [],
                    reason: locale === "tr" ? "Öğrenci bulunamadı." : "No students found.",
                };
            }

            // Helper to check boolean across nested paths
            const getBool = (obj: any, ...paths: string[]) => {
                for (const p of paths) {
                    const val = readDotPath(obj, p);
                    if (val === true || val === "true" || val === "Evet" || val === 1) return true;
                }
                return false;
            };

            // Helper to get first non-empty note
            const getNote = (obj: any, ...paths: string[]) => {
                for (const p of paths) {
                    const val = readDotPath(obj, p);
                    if (val && String(val).trim()) return String(val);
                }
                return "";
            };

            const minimalStudents = stripPiiDeep(
                students.map((s) => {
                    const d: any = s.data ?? {};
                    return {
                        id: s.id,
                        name: d.name ?? d.fullName ?? "",
                        aktif: d.aktif ?? "",
                        followUpDays: d.followUpDays ?? null,

                        hasHeartIssue: getBool(
                            d,
                            "doctorSaidHeartOrHypertension",
                            "parq.doctorSaidHeartOrHypertension",
                            "parqAnswers.doctorSaidHeartOrHypertension"
                        ),
                        heartNote: getNote(
                            d,
                            "doctorSaidHeartOrHypertensionNote",
                            "parq.doctorSaidHeartOrHypertensionNote",
                            "parqAnswers.doctorSaidHeartOrHypertensionNote"
                        ),

                        hadSurgery: getBool(d, "hadSurgery", "health.hadSurgery", "personalHealth.hadSurgery"),
                        surgeryNote: getNote(
                            d,
                            "hadSurgeryNote",
                            "health.hadSurgeryNote",
                            "personalHealth.hadSurgeryNote"
                        ),

                        usesMeds: getBool(
                            d,
                            "currentlyUsesMedications",
                            "health.currentlyUsesMedications"
                        ),
                        medsNote: getNote(
                            d,
                            "currentlyUsesMedicationsNote",
                            "health.currentlyUsesMedicationsNote"
                        ),

                        hasChronicDisease: getBool(
                            d,
                            "diagnosedChronicDiseaseByDoctor",
                            "health.diagnosedChronicDiseaseByDoctor"
                        ),
                        chronicNote: getNote(
                            d,
                            "diagnosedChronicDiseaseByDoctorNote",
                            "health.diagnosedChronicDiseaseByDoctorNote"
                        ),

                        wearsHeels: getBool(d, "jobRequiresHighHeels", "job.jobRequiresHighHeels"),

                        note: (d.note ?? "").toString().slice(0, 160),
                    };
                })
            );

            const sys =
                locale === "tr"
                    ? `Sen bir öğrenci arama/filtreleme asistanısın.
Kullanıcının sorgusuna göre SADECE verilen listeden eşleşen öğrencilerin "id" alanlarını seç.

KURAL:
- id sadece listeden.
- Maksimum 30 id.
- reason: 1-2 cümle; öğrenci isimlerini kısaca yaz (gerekiyorsa note/flag ile).
ÇIKTI JSON: {"ids":["..."],"reason":"..."}`
                    : `You are a student search/filter assistant.
Pick matching student "id" ONLY from provided list.
- Max 30 ids
- reason: 1-2 sentences, short.
OUTPUT JSON: {"ids":["..."],"reason":"..."}`;

            const client = new OpenAI({ apiKey });

            const completion = await client.chat.completions.create({
                model: "gpt-4o-mini",
                temperature: 0.2,
                max_tokens: 450,
                messages: [
                    { role: "system", content: sys },
                    {
                        role: "user",
                        content: JSON.stringify({
                            queryText: redactEmailPhoneInText(qRaw),
                            students: minimalStudents,
                        }),
                    },
                ],
            });

            const raw = completion.choices?.[0]?.message?.content?.trim() || "{}";
            const parsed = safeJsonParse(raw);

            const ids: string[] = Array.isArray(parsed?.ids)
                ? (parsed.ids as unknown[]).filter((x): x is string => typeof x === "string")
                : [];

            const allowed = new Set(students.map((s) => s.id));
            const safeIds = ids.filter((id) => allowed.has(id)).slice(0, 30);
            const reason = normalizeReason(parsed?.reason, locale);

            logger.info("aiStudentSearch llmMinimal ok", {
                traceId,
                uid,
                qLen: qRaw.length,
                inCount: students.length,
                outCount: safeIds.length,
            });

            // ✅ Build details array with note info
            const detailsMap = new Map(
                students.map((s) => {
                    const d = s.data ?? {};
                    return [
                        s.id,
                        {
                            id: s.id,
                            name: d.name ?? d.fullName ?? "",
                            aktif: d.aktif ?? "",
                            // Collect all relevant notes
                            note:
                                getNote(
                                    d,
                                    "doctorSaidHeartOrHypertensionNote",
                                    "parq.doctorSaidHeartOrHypertensionNote",
                                    "hadSurgeryNote",
                                    "health.hadSurgeryNote",
                                    "currentlyUsesMedicationsNote",
                                    "health.currentlyUsesMedicationsNote",
                                    "diagnosedChronicDiseaseByDoctorNote",
                                    "health.diagnosedChronicDiseaseByDoctorNote",
                                    "note"
                                ) || undefined,
                        },
                    ];
                })
            );

            const res: AiStudentSearchResponse = {
                ids: safeIds,
                reason,
                details: safeIds.map((id) => detailsMap.get(id)!).filter(Boolean),
            };
            return res;
        } catch (err: any) {
            if (err instanceof HttpsError) throw err;
            logger.error("aiStudentSearch error", {
                traceId,
                uid: request.auth?.uid,
                message: err?.message,
                stack: err?.stack,
            });
            throw new HttpsError("internal", "Internal error.", { traceId });
        }
    }
);

// -------------------------
// Push functions
// -------------------------
export const campaignPush = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
    const { title, body } = request.data;
    if (!title || !body) throw new HttpsError("invalid-argument", "title & body required");
    const db = admin.firestore();
    const snap = await db.collection("users").where("pushEnabled", "==", true).get();
    const jobs: any[] = [];
    snap.forEach((doc) => {
        const u = doc.data();
        if (u.pushToken) jobs.push(sendPush(u.pushToken, title, body));
    });
    await Promise.all(jobs);
    return { success: true, count: jobs.length };
});

export const morningMotivation = onSchedule(
    { schedule: "every day 09:00", timeZone: "Europe/Istanbul" },
    async () => {
        const db = admin.firestore();
        const snap = await db.collection("users").where("pushEnabled", "==", true).get();
        const messages = [
            "Kalk kanka 💪 spor vakti!",
            "Bugün antrenman günü 🔥",
            "Hedefine 1 gün daha yaklaştın 🏋️",
            "Erteleme, başla!",
            "Salon seni bekliyor 👀",
        ];
        const random = messages[Math.floor(Math.random() * messages.length)];
        const jobs: any[] = [];
        snap.forEach((doc) => {
            const u = doc.data();
            if (u.pushToken) jobs.push(sendPush(u.pushToken, "Günaydın ☀️", random));
        });
        await Promise.all(jobs);
        logger.info("Morning push sent", { count: jobs.length });
    }
);