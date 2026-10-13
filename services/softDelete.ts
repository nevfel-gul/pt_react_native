import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    where,
    writeBatch,
    type DocumentData,
    type DocumentReference,
} from "firebase/firestore";
import { db } from "./firebase";
import { recordDocRef, recordsColRef, studentDocRef, userDocRef } from "./firestorePaths";

// ─────────────────────────────────────────────────────────────
// "Silme" = silinenler koleksiyonlarına taşıma.
//
// Uygulamada kayıt silinmiş görünür, ama veri veritabanında kalır:
//   users/{uid}/deleted_records/{id}
//   users/{uid}/deleted_students/{id}  (+ notes / packages / sessions altında)
// Böylece okuyan hiçbir ekranın filtre koyması gerekmez; sayımlar, analiz,
// takvim ve widget silinenleri kendiliğinden görmez. Geri yükleme şimdilik
// elle (Firebase konsolu / yönetici betiği) yapılır; istemci bu koleksiyonları
// okuyamaz (firestore.rules).
// ─────────────────────────────────────────────────────────────

type Move = { from: DocumentReference; to: DocumentReference; data: DocumentData };

const BATCH_LIMIT = 400;

/** Önce tüm kopyalar yazılır, sonra orijinaller silinir: yarıda kesilirse veri kaybolmaz. */
async function runMoves(moves: Move[], extra: DocumentData) {
    for (let i = 0; i < moves.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        moves.slice(i, i + BATCH_LIMIT).forEach((m) =>
            batch.set(m.to, { ...m.data, ...extra, deletedAt: serverTimestamp() }),
        );
        await batch.commit();
    }
    for (let i = 0; i < moves.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        moves.slice(i, i + BATCH_LIMIT).forEach((m) => batch.delete(m.from));
        await batch.commit();
    }
}

export async function softDeleteRecord(uid: string, recordId: string) {
    const from = recordDocRef(uid, recordId);
    const found = await getDoc(from);
    if (!found.exists()) return;
    await runMoves(
        [{ from, to: doc(collection(userDocRef(uid), "deleted_records"), recordId), data: found.data() }],
        { deletedWith: "record" },
    );
}

export async function softDeleteStudent(uid: string, studentId: string) {
    const studentRef = studentDocRef(uid, studentId);
    const deletedStudent = doc(collection(userDocRef(uid), "deleted_students"), studentId);
    const deletedRecords = collection(userDocRef(uid), "deleted_records");

    const [notes, packages, sessions, records, own] = await Promise.all([
        getDocs(collection(studentRef, "notes")),
        getDocs(collection(studentRef, "packages")),
        getDocs(collection(studentRef, "sessions")),
        getDocs(query(recordsColRef(uid), where("studentId", "==", studentId))),
        getDoc(studentRef),
    ]);
    const studentSnap = own;
    if (!studentSnap.exists()) return;

    const moves: Move[] = [];
    const sub = (name: string, docs: typeof notes.docs) =>
        docs.forEach((d) =>
            moves.push({ from: d.ref, to: doc(collection(deletedStudent, name), d.id), data: d.data() }),
        );
    sub("notes", notes.docs);
    sub("packages", packages.docs);
    sub("sessions", sessions.docs);
    records.docs.forEach((d) =>
        moves.push({ from: d.ref, to: doc(deletedRecords, d.id), data: d.data() }),
    );
    // Öğrencinin kendisi en sona: yarıda kalırsa ana belge durur ve işlem tekrarlanabilir.
    moves.push({ from: studentRef, to: deletedStudent, data: studentSnap.data() });

    await runMoves(moves, { deletedWith: "student", deletedStudentId: studentId });
}
