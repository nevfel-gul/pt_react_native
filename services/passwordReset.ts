import { functions } from "@/services/firebase";
import { httpsCallable } from "firebase/functions";

type RequestPasswordResetInput = {
    email: string;
    locale: "tr" | "en";
};

type RequestPasswordResetResult = {
    ok: boolean;
};

/**
 * Şifre sıfırlama mailini kendi Cloud Function'ımız üzerinden gönderir.
 *
 * Firebase'in sendPasswordResetEmail() fonksiyonunu kullanmıyoruz: Console'da
 * e-posta şablonu düzenleme bu projede kilitli olduğu için mailin metnine ve
 * markasına müdahale edemiyoruz. Fonksiyon oobCode'u Admin SDK ile üretip
 * maili Resend üzerinden bizim şablonumuzla yolluyor; kullanıcı da
 * athletrackai.com üzerindeki kendi sayfamıza iniyor.
 */
export async function requestPasswordReset(input: RequestPasswordResetInput) {
    const fn = httpsCallable<RequestPasswordResetInput, RequestPasswordResetResult>(
        functions,
        "requestPasswordReset"
    );
    const res = await fn(input);
    return res.data;
}
