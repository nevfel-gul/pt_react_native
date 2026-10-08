// ─────────────────────────────────────────────────────────────
// Ölçü birimleri: metrik (kg, cm) / imperial (lb, in).
//
// KURAL: Veritabanında HER ŞEY metriktir. Dönüşüm yalnızca ekranda
// (gösterirken) ve formda (kaydederken) yapılır. Norm tabloları, VKİ,
// bel/kalça oranı, AI yorumu hep metrik veriyle çalışır; eski kayıtlara
// dokunulmaz.
//
// Gidip-gelme kayması olmasın diye metrik değer 2 ondalıkla saklanır,
// ekranda 1 ondalık gösterilir: 165 lb → 74.84 kg → 165.0 lb.
// ─────────────────────────────────────────────────────────────

export type UnitSystem = "metric" | "imperial";
export type Quantity = "mass" | "length";

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

/** Ölçüm formunda birimi olan alanlar (Firestore alan adları). */
export const MASS_FIELDS = ["weight", "totalMuscleMass", "leanBodyMass"] as const;
export const LENGTH_FIELDS = [
    "boyun", "omuz", "gogus", "sagKol", "solKol", "bel", "kalca",
    "sagBacak", "solBacak", "sagKalf", "solKalf",
    "sitandreach1", "sitandreach2", "sitandreach3",
] as const;

export function quantityOf(field: string): Quantity | null {
    if ((MASS_FIELDS as readonly string[]).includes(field)) return "mass";
    if ((LENGTH_FIELDS as readonly string[]).includes(field)) return "length";
    return null;
}

/** "72,5" / "72.5" / 72.5 → 72.5; boş/geçersiz → null. Negatife izin var (sit & reach). */
export function parseNum(v: unknown): number | null {
    if (v == null || v === "") return null;
    const n = Number(String(v).trim().replace(",", "."));
    return Number.isFinite(n) ? n : null;
}

export function toDisplay(q: Quantity, metric: number, sys: UnitSystem): number {
    if (sys === "metric") return metric;
    return q === "mass" ? metric / KG_PER_LB : metric / CM_PER_IN;
}

export function toMetric(q: Quantity, value: number, sys: UnitSystem): number {
    if (sys === "metric") return value;
    return q === "mass" ? value * KG_PER_LB : value * CM_PER_IN;
}

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

/** i18n anahtarı: common.unit.kg | lb | cm | in */
export function unitKey(q: Quantity, sys: UnitSystem) {
    if (q === "mass") return sys === "metric" ? "common.unit.kg" : "common.unit.lb";
    return sys === "metric" ? "common.unit.cm" : "common.unit.in";
}

/**
 * Formdaki metni kaydedilecek metrik metne çevirir.
 * Metrikte değer olduğu gibi kalır (kullanıcı ne yazdıysa).
 */
export function inputToMetricString(q: Quantity, input: string, sys: UnitSystem): string {
    if (sys === "metric") return input;
    const n = parseNum(input);
    if (n == null) return input;
    return String(round(toMetric(q, n, sys), 2));
}

/** Metrik değeri formda gösterilecek metne çevirir (düzenleme için). */
export function metricToInputString(q: Quantity, metric: unknown, sys: UnitSystem): string {
    const n = parseNum(metric);
    if (n == null) return metric == null ? "" : String(metric);
    if (sys === "metric") return String(metric);
    return String(round(toDisplay(q, n, sys), 1));
}

/** Ekranda gösterim: "158,7 lb" / "72 kg". Değer yoksa "-". */
export function formatQuantity(
    q: Quantity,
    metric: unknown,
    sys: UnitSystem,
    locale: string,
    unitLabel: string,
): string {
    const n = parseNum(metric);
    if (n == null) return "-";
    const v = toDisplay(q, n, sys);
    const decimals = sys === "metric" ? (Number.isInteger(n) ? 0 : 1) : 1;
    return `${v.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${unitLabel}`;
}

// ── Boy (ft / in) ──────────────────────────────────────────

export function cmToFtIn(cm: number): { ft: number; inch: number } {
    const totalIn = cm / CM_PER_IN;
    let ft = Math.floor(totalIn / 12);
    let inch = Math.round(totalIn - ft * 12);
    if (inch === 12) {
        ft += 1;
        inch = 0;
    }
    return { ft, inch };
}

export function ftInToCm(ft: number, inch: number): number {
    return round((ft * 12 + inch) * CM_PER_IN, 1);
}

/** Boy gösterimi: metrikte "168 cm", imperialde 5′ 6″. */
export function formatHeight(cmValue: unknown, sys: UnitSystem, cmLabel: string): string {
    const cm = parseNum(cmValue);
    if (cm == null) return "-";
    if (sys === "metric") return `${cm} ${cmLabel}`;
    const { ft, inch } = cmToFtIn(cm);
    return `${ft}′ ${inch}″`;
}
