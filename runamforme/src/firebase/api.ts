import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Errand } from '../types';

export async function getUserErrands(userId: string, filter: 'posted' | 'completed'): Promise<Errand[]> {
  const field = filter === 'completed' ? 'runnerUid' : 'uid';
  const q = query(collection(db, 'errands'), where(field, '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Errand[];
}
