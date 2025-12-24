import { collection, doc } from "firebase/firestore";
import { auth, db } from "./firebase";

function requireUid() {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("No authenticated user");
    return uid;
}

export function userDocRef() {
    const uid = requireUid();
    return doc(db, "users", uid);
}

export function studentsColRef() {
    return collection(userDocRef(), "students");
}
export function studentDocRef(studentId: string) {
    return doc(studentsColRef(), studentId);
}

export function recordsColRef() {
    return collection(userDocRef(), "records");
}
export function recordDocRef(recordId: string) {
    return doc(recordsColRef(), recordId);
}
