import { createHash } from "crypto";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";

// -------------------------
// Sabitler
// -------------------------
const SITE_ORIGIN = "https://www.athletrackai.com";
const RESET_PATH = "reset-password";
const FROM_ADDRESS = "AthleTrack AI <noreply@athletrackai.com>";
const SUPPORT_ADDRESS = "support@athletrackai.com";
const BRAND_COLOR = "#005FCC";

// Aynı e-posta için saatte en fazla 3 sıfırlama maili.
const THROTTLE_MAX = 3;
const THROTTLE_WINDOW_MS = 60 * 60 * 1000;

// Firebase'in ürettiği oobCode'un geçerlilik süresi (bilgi amaçlı, metinde geçiyor).
const LINK_TTL_LABEL = { tr: "1 saat", en: "1 hour" };

type Locale = "tr" | "en";

type RequestPasswordResetInput = {
    email?: string;
    locale?: Locale;
};

// -------------------------
// Yardımcılar
// -------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(raw: string) {
    return raw.trim().toLowerCase();
}

/** E-postayı düz metin saklamamak için throttle doküman kimliği olarak hash kullanıyoruz. */
function throttleKey(email: string) {
    return createHash("sha256").update(email).digest("hex");
}

/**
 * generatePasswordResetLink() bize Firebase'in kendi action handler URL'sini döner
 * (https://<proje>.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=...).
 * Biz sadece oobCode'u alıp kendi sayfamıza yönlendiriyoruz; kod hangi sayfadan
 * tüketildiğinden bağımsız olarak geçerli.
 */
function extractOobCode(firebaseLink: string) {
    const code = new URL(firebaseLink).searchParams.get("oobCode");
    if (!code) {
        throw new Error("oobCode not present in generated link");
    }
    return code;
}

function buildResetUrl(oobCode: string, locale: Locale) {
    return `${SITE_ORIGIN}/${locale}/${RESET_PATH}?oobCode=${encodeURIComponent(oobCode)}`;
}

/**
 * Saatlik gönderim limiti. Kullanıcının var olup olmamasından bağımsız çalışır,
 * dolayısıyla hesap sayımı (enumeration) için sinyal vermez.
 */
async function assertNotThrottled(email: string) {
    const ref = admin.firestore().collection("passwordResetThrottle").doc(throttleKey(email));
    const now = Date.now();

    await admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.data();
        const windowStartMs: number = data?.windowStartMs ?? 0;
        const count: number = data?.count ?? 0;

        const windowExpired = now - windowStartMs > THROTTLE_WINDOW_MS;

        if (!windowExpired && count >= THROTTLE_MAX) {
            throw new HttpsError(
                "resource-exhausted",
                "Too many password reset requests. Try again later."
            );
        }

        tx.set(
            ref,
            windowExpired
                ? { windowStartMs: now, count: 1, updatedAtMs: now }
                : { windowStartMs, count: count + 1, updatedAtMs: now },
            { merge: true }
        );
    });
}

// -------------------------
// E-posta şablonu
// -------------------------
export function subjectFor(locale: Locale) {
    return locale === "tr"
        ? "AthleTrack AI — Şifre sıfırlama"
        : "AthleTrack AI — Reset your password";
}

export function textBody(locale: Locale, resetUrl: string) {
    if (locale === "tr") {
        return [
            "AthleTrack AI hesabınız için şifre sıfırlama talebi aldık.",
            "",
            "Yeni şifrenizi belirlemek için:",
            resetUrl,
            "",
            `Bu bağlantı ${LINK_TTL_LABEL.tr} boyunca geçerlidir ve yalnızca bir kez kullanılabilir.`,
            "",
            "Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmez.",
            "",
            `Sorunuz olursa: ${SUPPORT_ADDRESS}`,
            "AthleTrack AI",
        ].join("\n");
    }
    return [
        "We received a request to reset the password for your AthleTrack AI account.",
        "",
        "Choose a new password here:",
        resetUrl,
        "",
        `This link is valid for ${LINK_TTL_LABEL.en} and can only be used once.`,
        "",
        "If you didn't request this, you can safely ignore this email — your password won't change.",
        "",
        `Questions? ${SUPPORT_ADDRESS}`,
        "AthleTrack AI",
    ].join("\n");
}

export function htmlBody(locale: Locale, resetUrl: string) {
    const copy =
        locale === "tr"
            ? {
                preheader: "Şifrenizi sıfırlamak için bağlantı.",
                heading: "Şifreni sıfırla",
                intro: "AthleTrack AI hesabın için bir şifre sıfırlama talebi aldık. Yeni şifreni belirlemek için aşağıdaki butona tıkla.",
                cta: "Yeni şifre belirle",
                expiry: `Bu bağlantı <strong>${LINK_TTL_LABEL.tr}</strong> boyunca geçerli ve yalnızca bir kez kullanılabilir.`,
                fallback: "Buton çalışmıyorsa bu adresi tarayıcına yapıştır:",
                ignore: "Bu talebi sen yapmadıysan bu e-postayı yok sayabilirsin — şifren değişmeden kalır.",
                help: "Sorun mu var?",
                signature: "Sağlıkla kal,<br>AthleTrack AI ekibi",
            }
            : {
                preheader: "A link to reset your password.",
                heading: "Reset your password",
                intro: "We received a request to reset the password for your AthleTrack AI account. Click the button below to choose a new one.",
                cta: "Set a new password",
                expiry: `This link is valid for <strong>${LINK_TTL_LABEL.en}</strong> and can only be used once.`,
                fallback: "If the button doesn't work, paste this address into your browser:",
                ignore: "If you didn't request this, you can safely ignore this email — your password won't change.",
                help: "Need help?",
                signature: "Stay strong,<br>The AthleTrack AI team",
            };

    return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subjectFor(locale)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f5f7;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <tr>
              <td style="padding:32px 32px 0 32px;">
                <div style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#0b0b0c;">AthleTrack&nbsp;AI</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0 32px;">
                <h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:#0b0b0c;">${copy.heading}</h1>
                <p style="margin:16px 0 0 0;font-size:15px;line-height:1.6;color:#4a4d55;">${copy.intro}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color:${BRAND_COLOR};border-radius:10px;">
                      <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${copy.cta}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0 32px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6b6f78;">${copy.expiry}</p>
                <p style="margin:16px 0 0 0;font-size:13px;line-height:1.6;color:#6b6f78;">${copy.fallback}</p>
                <p style="margin:6px 0 0 0;font-size:13px;line-height:1.6;word-break:break-all;">
                  <a href="${resetUrl}" style="color:${BRAND_COLOR};text-decoration:underline;">${resetUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0 32px;">
                <div style="height:1px;background-color:#e6e8ec;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px 32px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6b6f78;">${copy.ignore}</p>
                <p style="margin:16px 0 0 0;font-size:13px;line-height:1.6;color:#6b6f78;">
                  ${copy.help} <a href="mailto:${SUPPORT_ADDRESS}" style="color:${BRAND_COLOR};text-decoration:none;">${SUPPORT_ADDRESS}</a>
                </p>
                <p style="margin:20px 0 0 0;font-size:13px;line-height:1.6;color:#9a9ea7;">${copy.signature}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// -------------------------
// Resend
// -------------------------
async function sendViaResend(params: {
    apiKey: string;
    to: string;
    locale: Locale;
    resetUrl: string;
    traceId: string;
}) {
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${params.apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: FROM_ADDRESS,
            to: [params.to],
            reply_to: SUPPORT_ADDRESS,
            subject: subjectFor(params.locale),
            html: htmlBody(params.locale, params.resetUrl),
            text: textBody(params.locale, params.resetUrl),
        }),
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => "<no body>");
        logger.error("Resend rejected the message", {
            traceId: params.traceId,
            status: res.status,
            detail,
        });
        throw new HttpsError("internal", "Could not send the reset email.", {
            traceId: params.traceId,
        });
    }
}

// -------------------------
// Callable
// -------------------------
export const requestPasswordReset = onCall(
    { cors: true, secrets: ["RESEND_API_KEY"] },
    async (request) => {
        const traceId = Math.random().toString(36).slice(2, 10);
        const data = (request.data ?? {}) as RequestPasswordResetInput;

        const locale: Locale = data.locale === "en" ? "en" : "tr";
        const rawEmail = typeof data.email === "string" ? data.email : "";
        const email = normalizeEmail(rawEmail);

        if (!email || !EMAIL_RE.test(email)) {
            throw new HttpsError("invalid-argument", "A valid email address is required.", {
                traceId,
            });
        }

        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            logger.error("RESEND_API_KEY missing", { traceId });
            throw new HttpsError("failed-precondition", "Mail service is not configured.", {
                traceId,
            });
        }

        await assertNotThrottled(email);

        // Kullanıcı var mı: bunu ayrı ve açıkça soruyoruz. generatePasswordResetLink()
        // kayıtsız adres için "auth/user-not-found" değil, ayırt edilemeyen bir
        // "auth/internal-error" fırlatıyor; o hatayı "kullanıcı yok" saymak gerçek
        // arızaları da sessizce başarı gibi göstermek olurdu.
        try {
            await admin.auth().getUserByEmail(email);
        } catch (err: any) {
            if (err?.code === "auth/user-not-found") {
                // Kayıtsız adres için de "gönderildi" diyoruz: aksi halde bu uç nokta
                // hangi e-postaların sistemde kayıtlı olduğunu sızdıran bir araca dönüşür.
                logger.info("Reset requested for unknown address; responding as success", {
                    traceId,
                });
                return { ok: true };
            }
            logger.error("getUserByEmail failed", {
                traceId,
                code: err?.code,
                detail: String(err?.message ?? err),
            });
            throw new HttpsError("internal", "Could not look up the account.", { traceId });
        }

        let resetUrl: string;
        try {
            const firebaseLink = await admin.auth().generatePasswordResetLink(email);
            resetUrl = buildResetUrl(extractOobCode(firebaseLink), locale);
        } catch (err: any) {
            logger.error("generatePasswordResetLink failed", {
                traceId,
                code: err?.code,
                detail: String(err?.message ?? err),
            });
            throw new HttpsError("internal", "Could not create the reset link.", { traceId });
        }

        await sendViaResend({ apiKey, to: email, locale, resetUrl, traceId });

        logger.info("Password reset email sent", { traceId, locale });
        return { ok: true };
    }
);
