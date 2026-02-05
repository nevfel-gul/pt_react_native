import { collection, doc } from "firebase/firestore";
import { db } from "./firebase";

export function userDocRef(uid: string) {
    return doc(db, "users", uid);
}

export function studentsColRef(uid: string) {
    return collection(userDocRef(uid), "students");
}

export function studentDocRef(uid: string, studentId: string) {
    return doc(studentsColRef(uid), studentId);
}

export function recordsColRef(uid: string) {
    return collection(userDocRef(uid), "records");
}

export function recordDocRef(uid: string, recordId: string) {
    return doc(recordsColRef(uid), recordId);
}
export function studentNotesColRef(uid: string, studentId: string) {
    return collection(studentDocRef(uid, studentId), "notes");
}

export function studentNoteDocRef(uid: string, studentId: string, noteId: string) {
    return doc(studentNotesColRef(uid, studentId), noteId);
}

