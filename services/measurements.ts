import { deleteField, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { recordsColRef, studentDocRef } from './firestorePaths';

export const measurementVersion = (data: Record<string, any>) => String(data.contentVersion ?? data.updatedAt?.toMillis?.() ?? data.createdAt?.toMillis?.() ?? 0);

export async function saveMeasurement(uid: string, studentId: string, recordId: string, values: Record<string, unknown>, expectedVersion?: string) {
  const ref = doc(recordsColRef(uid), recordId);
  await runTransaction(db, async tx => {
    const [record, student] = await Promise.all([tx.get(ref), tx.get(studentDocRef(uid, studentId))]);
    if (!student.exists()) throw new Error('student_missing');
    if (expectedVersion !== undefined) {
      if (!record.exists() || record.data().studentId !== studentId || measurementVersion(record.data()) !== expectedVersion) throw new Error('record_conflict');
      tx.update(ref, { ...values, updatedAt: serverTimestamp(), contentVersion: doc(recordsColRef(uid)).id, aiComment: deleteField() });
    } else {
      if (record.exists()) { if (record.data().studentId !== studentId) throw new Error('record_conflict'); return; } // Retrying the same submission must not create a duplicate.
      tx.set(ref, { ...values, studentId, createdAt: serverTimestamp(), contentVersion: recordId });
      tx.update(studentDocRef(uid, studentId), { lastRecordedAt: serverTimestamp() });
    }
  });
  return recordId;
}
