import { collection, query, where, getDocs, limit, startAfter, type DocumentData } from 'firebase/firestore';
import { db } from './config';
import { formatErrand } from './firestore';
import type { Errand } from '../types';

export async function getUserErrands(
  userId: string,
  filter: 'posted' | 'completed',
  options: { limit?: number; startAfter?: DocumentData } = { limit: 10 }
): Promise<Errand[]> {
  try {
    const { limit: limitCount = 10, startAfter: startAfterDoc } = options;
    const field = filter === 'completed' ? 'runnerUid' : 'userId';
    let q = query(
      collection(db, 'errands'),
      where(field, '==', userId),
      where('isArchived', '==', false),
      limit(limitCount)
    );

    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }

    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];

    return snapshot.docs.map(formatErrand);
  } catch (error) {
    console.error('Error fetching user errands:', error);
    return [];
  }
}