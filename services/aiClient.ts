import type { AiFitnessRequest, AiFitnessResponse } from "@/constants/ai";
import { functions } from "@/services/firebase";
import { httpsCallable } from "firebase/functions";

export async function getFitnessAiComment(input: AiFitnessRequest) {
    // getFunctions() bölge almadan us-central1'e gider; fonksiyonlar
    // europe-west1'de deploy edilmiş durumda (services/firebase.js).
    const fn = httpsCallable<AiFitnessRequest, AiFitnessResponse>(functions, "fitnessComment");
    const res = await fn(input);
    return res.data;
}
