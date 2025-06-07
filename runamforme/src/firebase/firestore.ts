import { db } from './config';
import {
  type Errand,
  type Notification,
  type UserProfile,
  type ErrandFilter,
  type AccountDetails,
  
} from '../types';
import {
  collection,
  addDoc,
  setDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  startAfter,
  getDoc,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';

export const formatUserProfile = (doc: DocumentData): UserProfile => {
  const data = doc.data();
  const accountDetails: AccountDetails = data.accountDetails || {
    bankName: '',
    accountName: '',
    accountNumber: '',
  };
  return {
    id: doc.id,
    uid: data.uid || doc.id,
    username: data.username || 'unknown_user',
    searchableUsername: data.searchableUsername || data.username?.toLowerCase() || 'unknown_user',
    name: data.name || 'Unnamed User',
    avatarUrl: data.avatarUrl || '/default-avatar.png',
    email: data.email || '',
    userType: data.userType || 'both',
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    followers: data.followers || [],
    followersCount: data.followersCount || 0,
    following: data.following || [],
    followingCount: data.followingCount || 0,
    likes: data.likes || 0,
    bio: data.bio || '',
    isVerified: data.isVerified || false,
    hasBluetick: data.hasBluetick || false,
    virtualBalance: data.virtualBalance || 0,
    ratings: data.ratings || 0,
    reviewCount: data.reviewCount || 0,
    notificationPreferences: data.notificationPreferences || { email: false, push: false },
    blockedUsers: data.blockedUsers || [],
    messageBackgroundUrl: data.messageBackgroundUrl || '',
    accountDetails,
    walletBalance: data.walletBalance || 0,
    isActive: data.isActive || false,
    isOnline: data.isOnline || false,
    lastActiveAt: data.lastActiveAt || null,
    lastSeenAt: data.lastSeenAt || null,
    isBlocked: data.isBlocked || false,
    isSuspended: data.isSuspended || false,
    isBanned: data.isBanned || false,
    isPremium: data.isPremium || false,
    verificationStatus: data.verificationStatus || undefined,
    verificationDocuments: data.verificationDocuments || undefined,
    verificationRequestedAt: data.verificationRequestedAt || null,
    verificationReviewedAt: data.verificationReviewedAt || null,
    verificationRejectedReason: data.verificationRejectedReason || undefined,
    privacySettings: data.privacySettings || {
      profileVisibility: 'public',
      errandHistoryVisibility: 'public',
      showReviews: true,
    },
    messageBackground: data.messageBackground || '',
  };
};


// === Utility Functions ===

export const formatErrand = (doc: DocumentData): Errand => {
  const data = doc.data();
return {
  id: doc.id,
  userId: data.userId || '',
  username: data.username || '',
  requesterName: data.requesterName || '',
  requesterAvatarUrl: data.requesterAvatarUrl || '',
  categoryName: data.categoryName || '',
  categoryId: data.categoryId || '',
  runnerName: data.runnerName || '',
  runnerAvatarUrl: data.runnerAvatarUrl || '',
  runnerRating: data.runnerRating || 0,
  runnerReviewCount: data.runnerReviewCount || 0,
  searchableUsername: data.searchableUsername || 'unknown',
  title: data.title || 'Untitled Errand',
  description: data.description || '',
  location: data.location || '',
  duration: data.duration || '',
  fee: data.fee || 0,
  category: data.category || 'uncategorized',
  currency: data.currency || 'NGN',
  status: data.status || 'open',
  runnerUid: data.runnerUid || '',
  geo: data.geo ?? null,
  images: data.images || [],
  likes: data.likes || [],
  bookmarks: data.bookmarks || [],
  clickCount: data.clickCount || 0,
  paymentStatus: data.paymentStatus || 'pending',
  paymentReference: data.paymentReference || '',
  completedAt: data.completedAt || null,
  cancelledAt: data.cancelledAt || null,
  isPrivate: data.isPrivate || false,
  isNegotiable: data.isNegotiable || false,
  isArchived: data.isArchived || false,
  createdAt: data.createdAt || null,
  updatedAt: data.updatedAt || null
};
};


const getUsernameMeta = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return { username: 'Unknown', searchableUsername: 'unknown' };
    }
    const data = userDoc.data();
    return {
      username: data.username || 'Unknown',
      searchableUsername: data.searchableUsername || data.username?.toLowerCase() || 'unknown',
    };
  } catch (error) {
    console.error('Error fetching username meta:', error);
    return { username: 'Unknown', searchableUsername: 'unknown' };
  }
};

// === Errand Limit Check ===
// Used in UserProfilePage.tsx and OpenErrandsList.tsx
export const checkErrandLimit = async (userId: string): Promise<string | null> => {
  try {
    const q = query(
      collection(db, 'errands'),
      where('runnerUid', '==', userId),
      where('status', 'in', ['open', 'pending'])
    );
    const snapshot = await getDocs(q);
    if (snapshot.size >= 2) {
      return 'You have reached the limit of 2 active errands.';
    }
    return null;
  } catch (error) {
    console.error('Error checking errand limit:', error);
    return 'Failed to check errand limit. Please try again.';
  }
};

// === CRUD Functions ===

export async function createErrand(errandData: Omit<Errand, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const { username, searchableUsername } = await getUsernameMeta(String(errandData.userId || ''));
    const docRef = await addDoc(collection(db, 'errands'), {
      ...errandData,
      username,
      searchableUsername,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isArchived: false,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating errand:', error);
    throw new Error('Unable to create errand. Please try again.');
  }
}

export async function updateErrand(errandId: string, errandData: Partial<Omit<Errand, 'id' | 'createdAt'>>): Promise<void> {
  try {
    const { username, searchableUsername } = await getUsernameMeta(String(errandData.userId || ''));
    const docRef = doc(db, 'errands', errandId);
    await setDoc(
      docRef,
      {
        ...errandData,
        username,
        searchableUsername,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating errand:', error);
    throw new Error('Unable to update errand. Please try again.');
  }
}

export async function deleteErrand(errandId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'errands', errandId));
  } catch (error) {
    console.error('Error deleting errand:', error);
    throw new Error('Unable to delete errand. Please try again.');
  }
}

// === Notification ===

export async function createNotification(
  userId: string,
  type: Notification['type'],
  relatedId: string,
  message: string
): Promise<void> {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      relatedId,
      message,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    throw new Error('Unable to send notification. Please try again.');
  }
}

// === Search Users ===

export async function searchUsersByUsername(searchTerm: string): Promise<UserProfile[]> {
  try {
    if (!searchTerm.trim()) return [];

    const searchLower = searchTerm.toLowerCase().trim();
    const usersRef = collection(db, 'users');

    const usernameQuery = query(
      usersRef,
      where('searchableUsername', '>=', searchLower),
      where('searchableUsername', '<=', searchLower + '\uf8ff'),
      orderBy('searchableUsername'),
      limit(10)
    );

    const nameQuery = query(
      usersRef,
      where('name', '>=', searchLower),
      where('name', '<=', searchLower + '\uf8ff'),
      orderBy('name'),
      limit(10)
    );

    const [usernameSnapshot, nameSnapshot] = await Promise.all([
      getDocs(usernameQuery),
      getDocs(nameQuery),
    ]);

    const resultsMap = new Map<string, UserProfile>();
    const addResults = (snapshot: QuerySnapshot<DocumentData>) => {
      snapshot.forEach((doc) => resultsMap.set(doc.id, formatUserProfile(doc)));
    };

    addResults(usernameSnapshot);
    addResults(nameSnapshot);

    return Array.from(resultsMap.values());
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

// === Public Errands ===

export async function getPublicErrands({
  limit: limitCount = 10,
  startAfter: startAfterDoc,
}: { limit?: number; startAfter?: any } = {}): Promise<Errand[]> {
  try {
    let q = query(
      collection(db, 'errands'),
      where('isPrivate', '==', false),
      where('status', '==', 'open'),
      where('isArchived', '==', false),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    if (startAfterDoc) q = query(q, startAfter(startAfterDoc));

    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];

    return snapshot.docs.map(formatErrand);
  } catch (error) {
    console.error('Error fetching public errands:', error);
    throw new Error('Unable to fetch errands. Please try again.');
  }
}

// === Search Errands ===

export async function searchErrands(filter: ErrandFilter): Promise<Errand[]> {
  try {
    const {
      searchTerm,
      category,
      location,
      feeRange,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isPrivate,
      limit: limitCount = 10,
      startAfter: startAfterDoc,
    } = filter;

    let q = query(collection(db, 'errands'));

    if (isPrivate !== undefined) q = query(q, where('isPrivate', '==', isPrivate));
    if (status) q = query(q, where('status', '==', status));
    if (category) q = query(q, where('category', '==', category));
    if (feeRange) q = query(q, where('fee', '>=', feeRange.min), where('fee', '<=', feeRange.max));
    if (location)
      q = query(
        q,
        where('location', '>=', location.toLowerCase()),
        where('location', '<=', location.toLowerCase() + '\uf8ff')
      );
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase().trim();
      q = query(q, where('title', '>=', searchLower), where('title', '<=', searchLower + '\uf8ff'));
    }

    q = query(q, where('isArchived', '==', false));

// Apply sorting
q = query(q, orderBy(sortBy, sortOrder as 'asc' | 'desc'));

// Apply pagination if provided
if (startAfterDoc) {
  q = query(q, startAfter(startAfterDoc));
}

// Apply result limit
q = query(q, limit(limitCount));


    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];

    return snapshot.docs.map(formatErrand);
  } catch (error) {
    console.error('Error searching errands:', error);
    throw new Error('Unable to search errands. Please try again.');
  }
}

// Note: Types like Transaction, Withdrawal, Feedback, etc., from types.ts are not used here but may be
// relevant for future wallet or feedback features. Consider implementing functions like:
// - createTransaction(transaction: Transaction)
// - processWithdrawal(withdrawal: Withdrawal)
// - submitFeedback(feedback: Feedback)