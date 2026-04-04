import type { AiFitnessRequest, AiFitnessResponse } from "@/constants/ai";
import { getFunctions, httpsCallable } from "firebase/functions";

export async function getFitnessAiComment(input: AiFitnessRequest) {
    const functions = getFunctions();
    const fn = httpsCallable<AiFitnessRequest, AiFitnessResponse>(functions, "fitnessComment");
    const res = await fn(input);
    return res.data;
}
