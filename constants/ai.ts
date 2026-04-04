export type AiFitnessRequest = {
    studentId: string;
    locale?: "tr" | "en";
    goal?: string;
    measurements: Record<string, any>;
    question?: string;
};

export type AiFitnessResponse = {
    summary: string;
    warnings?: string[];
    nextSteps?: string[];
    tags?: string[];
};
