import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config'; // ✅ Correct path based on your structure

export async function getUserErrands(userId: string, filter: 'posted' | 'completed') {
  const field = filter === 'completed' ? 'runnerId' : 'posterId';
  const q = query(collection(db, 'errands'), where(field, '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
