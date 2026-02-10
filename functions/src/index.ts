import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import OpenAI from "openai";

setGlobalOptions({ region: "europe-west1" });

// -------------------------
// Types
// -------------------------
type AiFitnessRequest = {
    studentId: string;
    locale?: "tr" | "en";
    goal?: string;
    measurements: Record<string, any>;
    question?: string;
};

type AiFitnessResponse = {
    summary: string;
    warnings?: string[];
    nextSteps?: string[];
    tags?: string[];
};

type AiStudentSearchRequest = {
    queryText: string;
    locale?: "tr" | "en";
    students: Array<{
        id: string;
        name: string;
        email?: string;
        aktif?: "Aktif" | "Pasif";
        lastRecordAtMs?: number | null;
    }>;
};

type AiStudentSearchResponse = {
    ids: string[];
    reason?: string;
};

// -------------------------
// Helpers
// -------------------------
function looksFitnessRelated(text: string) {
    const t = (text || "").toLowerCase();
    const keywords = [
        "tanita",
        "yağ",
        "kas",
        "kilo",
        "bmi",
        "vücut",
        "body",
        "fat",
        "muscle",
        "weight",
        "hydration",
        "su",
        "metabol",
        "bmr",
        "bel",
        "kalça",
        "waist",
        "hip",
        "ölçüm",
        "measurement",
        "fitness",
        "antrenman",
        "training",
        "performans",
        "cardio",
    ];
    return keywords.some((k) => t.includes(k));
}

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

// -------------------------
// PII Sanitizers (email/phone drop) ✅ NEW
// -------------------------
const PII_KEY_SET = new Set([
    "email",
    "e_mail",
    "mail",
    "phone",
    "telefon",
    "tel",
    "number",
    "gsm",
    "mobile",
    "contact",
]);

function redactEmailPhoneInText(input: string): string {
    if (!input) return input;

    // email
    let out = input.replace(
        /([a-zA-Z0-9._%+-]{1,})@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        "[REDACTED_EMAIL]"
    );

    // TR phone-ish (permissive): +90 / 0xxx... allow spaces/dashes
    out = out.replace(
        /(\+?90[\s-]?)?0?\s*(5\d{2})[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g,
        "[REDACTED_PHONE]"
    );

    return out;
}

function stripPiiDeep(value: any, depth = 0): any {
    if (depth > 12) return null;

    if (value == null) return value;

    if (typeof value === "string") {
        return redactEmailPhoneInText(value);
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map((v) => stripPiiDeep(v, depth + 1));
    }

    if (typeof value === "object") {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) {
            const keyLower = String(k).toLowerCase();
            if (PII_KEY_SET.has(keyLower)) continue; // ✅ drop pii fields
            out[k] = stripPiiDeep(v, depth + 1);
        }
        return out;
    }

    return null;
}

function sanitizeStudentsForAi(
    students: AiStudentSearchRequest["students"]
): Array<{
    id: string;
    name: string;
    aktif?: "Aktif" | "Pasif";
    lastRecordAtMs?: number | null;
}> {
    // ✅ allowlist: email yok
    return (students || []).map((s) => ({
        id: s.id,
        name: s.name,
        aktif: s.aktif,
        lastRecordAtMs: s.lastRecordAtMs ?? null,
    }));
}

// -------------------------
// Function: fitnessComment
// -------------------------
export const fitnessComment = onCall(
    { cors: true, secrets: ["OPENAI_API_KEY"] },
    async (request) => {
        const traceId = makeTraceId();

        try {
            if (!request.auth) {
                throw new HttpsError("unauthenticated", "Login required.", { traceId });
            }

            const data = request.data as AiFitnessRequest;

            if (!data?.studentId || !data?.measurements) {
                throw new HttpsError("invalid-argument", "studentId and measurements are required.", {
                    traceId,
                });
            }

            const locale: "tr" | "en" = data.locale ?? "tr";

            const combined = `${data.question ?? ""} ${JSON.stringify(data.measurements ?? {})}`;
            if (!looksFitnessRelated(combined)) {
                throw new HttpsError(
                    "failed-precondition",
                    locale === "tr"
                        ? "Sadece fitness/vücut ölçümü yorumlama izinli."
                        : "Only fitness/body measurement interpretation is allowed.",
                    { traceId }
                );
            }

            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                throw new HttpsError("failed-precondition", "Missing OPENAI_API_KEY on server.", { traceId });
            }

            const client = new OpenAI({ apiKey });

            const sys =
                locale === "tr"
                    ? [
                        "Sen bir spor/fitness ölçüm asistanısın.",
                        "Sadece vücut ölçümü (Tanita, kilo, yağ, kas, çevre ölçüleri) ve antrenman yönlendirmesi hakkında konuş.",
                        "Tıbbi teşhis koyma. İlaç/tedavi önerme.",
                        "Konu dışı istekleri reddet.",
                        "Verilen içerikte e-posta/telefon gibi kişisel bilgi varsa yok say; asla isteme/üretme.",
                        'ÇIKTI SADECE JSON OLACAK: {"summary":"...","warnings":["..."],"nextSteps":["..."],"tags":["..."]}.',
                        "warnings/nextSteps/tags alanları yoksa boş dizi döndür.",
                        "summary kısa, net, uygulanabilir olsun.",
                    ].join("\n")
                    : [
                        "You are a fitness measurement assistant.",
                        "Only discuss body measurements (Tanita, weight, fat, muscle, circumferences) and training guidance.",
                        "No medical diagnosis. No medication/treatment advice.",
                        "Refuse off-topic requests.",
                        "If there is any personal info like email/phone in the input, ignore it; never ask for or output it.",
                        'OUTPUT JSON ONLY: {"summary":"...","warnings":["..."],"nextSteps":["..."],"tags":["..."]}.',
                        "If warnings/nextSteps/tags are unavailable return empty arrays.",
                        "Keep summary short and actionable.",
                    ].join("\n");

            // ✅ payload PII-free (email/phone drop + text redaction)
            const payload = {
                studentId: data.studentId,
                goal: stripPiiDeep(data.goal ?? null),
                question: stripPiiDeep(data.question ?? null),
                measurements: stripPiiDeep(data.measurements ?? {}),
                locale,
            };

            logger.info("fitnessComment called", {
                traceId,
                uid: request.auth.uid,
                studentId: data.studentId,
            });

            let raw = "";
            try {
                const completion = await client.chat.completions.create({
                    model: "gpt-4.1-mini",
                    temperature: 0.2,
                    max_tokens: 500,
                    messages: [
                        { role: "system", content: sys },
                        { role: "user", content: JSON.stringify(payload) },
                    ],
                });

                raw = completion.choices?.[0]?.message?.content?.trim() || "";
            } catch (err: any) {
                logger.error("fitnessComment: OpenAI call failed", {
                    traceId,
                    uid: request.auth.uid,
                    message: err?.message,
                    status: err?.status,
                    code: err?.code,
                    type: err?.type,
                    stack: err?.stack,
                });

                throw new HttpsError(
                    "internal",
                    locale === "tr" ? "AI servisi hata verdi." : "AI service failed.",
                    { traceId }
                );
            }

            const parsed = safeJsonParse(raw);

            const summary =
                typeof parsed?.summary === "string" && parsed.summary.trim()
                    ? parsed.summary.trim()
                    : locale === "tr"
                        ? "Yorum üretilemedi."
                        : "Could not generate a comment.";

            const res: AiFitnessResponse = {
                summary,
                warnings: pickStringArray(parsed?.warnings),
                nextSteps: pickStringArray(parsed?.nextSteps),
                tags: pickStringArray(parsed?.tags),
            };

            return res;
        } catch (err: any) {
            if (err instanceof HttpsError) throw err;

            logger.error("fitnessComment: unexpected error", {
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
// Function: aiStudentSearch
// ✅ INTERNAL’ı “anlamlı” yapan debug sistemi burada
// -------------------------
export const aiStudentSearch = onCall(
    { cors: true, secrets: ["OPENAI_API_KEY"] },
    async (request) => {
        const traceId = makeTraceId();

        try {
            if (!request.auth) {
                throw new HttpsError("unauthenticated", "Login required.", { traceId });
            }

            const data = request.data as AiStudentSearchRequest;

            const q = (data?.queryText ?? "").trim();
            if (!q) throw new HttpsError("invalid-argument", "queryText required.", { traceId });

            if (!Array.isArray(data?.students) || data.students.length === 0) {
                throw new HttpsError("invalid-argument", "students required.", { traceId });
            }

            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                throw new HttpsError("failed-precondition", "Missing OPENAI_API_KEY on server.", { traceId });
            }

            const client = new OpenAI({ apiKey });
            const locale: "tr" | "en" = data.locale ?? "tr";

            const sys =
                locale === "tr"
                    ? `Sen bir öğrenci arama/filtreleme asistanısın.
Kullanıcının yazdığı sorguya göre SADECE verilen öğrenci listesinden uygun olanları seç.
ÇIKTI SADECE JSON OLACAK: {"ids":["..."],"reason":"..."}.
ids alanı sadece listede bulunan id'lerden oluşmalı. Maksimum 30 id döndür.`
                    : `You are a student search/filter assistant.
Select matching students ONLY from the provided list.
OUTPUT JSON ONLY: {"ids":["..."],"reason":"..."}.
ids must come from the list. Return up to 30 ids.`;

            let raw = "";
            try {
                const completion = await client.chat.completions.create({
                    model: "gpt-4.1-mini",
                    temperature: 0.2,
                    max_tokens: 500,
                    messages: [
                        { role: "system", content: sys },
                        {
                            role: "user",
                            content: JSON.stringify({
                                queryText: redactEmailPhoneInText(q),
                                students: sanitizeStudentsForAi(data.students), // ✅ email gönderme
                            }),
                        },
                    ],
                });

                raw = completion.choices?.[0]?.message?.content?.trim() || "{}";
            } catch (err: any) {
                // ✅ INTERNAL’ın “sebebi” burada loglanıyor
                logger.error("aiStudentSearch: OpenAI call failed", {
                    traceId,
                    uid: request.auth.uid,
                    message: err?.message,
                    status: err?.status,
                    code: err?.code,
                    type: err?.type,
                    stack: err?.stack,
                });

                throw new HttpsError(
                    "internal",
                    locale === "tr" ? "AI servisi hata verdi." : "AI service failed.",
                    { traceId }
                );
            }

            const parsed = safeJsonParse(raw);

            const ids: string[] = Array.isArray(parsed?.ids)
                ? parsed.ids.filter((x: unknown): x is string => typeof x === "string")
                : [];

            // ✅ güvenlik: sadece gönderdiğin listede olan id’leri kabul et
            const allowed = new Set(data.students.map((s) => s.id));
            const safeIds = ids.filter((id: string) => allowed.has(id)).slice(0, 30);

            const reason = typeof parsed?.reason === "string" ? parsed.reason : "";

            logger.info("aiStudentSearch ok", {
                traceId,
                uid: request.auth.uid,
                qLen: q.length,
                inCount: data.students.length,
                outCount: safeIds.length,
            });

            const res: AiStudentSearchResponse = {
                ids: safeIds,
                reason,
            };

            return res;
        } catch (err: any) {
            // ✅ Eğer zaten HttpsError ise, client’a code+message+details(traceId) gider
            if (err instanceof HttpsError) throw err;

            // ✅ Beklenmeyen patlama → log + internal
            logger.error("aiStudentSearch: unexpected error", {
                traceId,
                uid: request.auth?.uid,
                message: err?.message,
                stack: err?.stack,
            });

            throw new HttpsError("internal", "Internal error.", { traceId });
        }
    }
);
