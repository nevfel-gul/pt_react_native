import { httpsCallable } from "firebase/functions";
import { currentLanguage } from "@/constants/languages";
import { functions } from "./firebase";

// Ölçüm sonrası AI yorumu (functions/src/ai/recordAiComment.ts).
// Yorum kaydın içine (`aiComment`) yazılır; ekranlar oradan okur.

export type RecordAiComment = {
    summary: string;
    highlights: string[];
    warnings: string[];
    nextSteps: string[];
    locale: string;
    model: string;
    comparedToPrevious: boolean;
    createdAt: string;
};

const fn = httpsCallable<{ recordId: string; force?: boolean; locale?: string }, RecordAiComment>(
    functions,
    "recordAiComment",
);

export async function generateRecordAiComment(recordId: string, force = false): Promise<RecordAiComment> {
    const res = await fn({ recordId, force, locale: currentLanguage() });
    return res.data;
}

/** Sunucu hata kodunu ekranda gösterilecek anahtara çevirir. */
export function aiCommentErrorKey(e: any): string {
    if (e?.code === "functions/permission-denied") return "aiComment.error.premium";
    if (e?.code === "functions/resource-exhausted") return "aiComment.error.regenLimit";
    return "aiComment.error.generic";
}
