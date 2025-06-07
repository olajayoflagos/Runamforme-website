import type { User } from 'firebase/auth';
import type { FieldValue } from 'firebase/firestore';
import type { ReactNode } from 'react';

export type Timestamp = import('firebase/firestore').Timestamp;

// === Core Entities ===

export interface ErrandCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  createdAt: Timestamp | FieldValue | null;
  updatedAt: Timestamp | FieldValue | null;
}

export interface Errand {
  id: string;
  userId: string;
  username: string;
  requesterName: string;
  requesterAvatarUrl: string;
  categoryName: string;
  categoryId: string;
  runnerName: string;
  runnerAvatarUrl: string;
  runnerRating: number;
  runnerReviewCount: number;
  searchableUsername: string;
  title: string;
  description: string;
  location: string;
  duration: string;
  fee: number;
  category: string;
  currency: string;
  status: string;
  runnerUid: string;
  geo: { lat: number; lng: number } | null;
  images: string[];
  likes: string[];
  bookmarks: string[];
  clickCount: number;
  paymentStatus: string;
  paymentReference: string;
  completedAt: Timestamp | null;
  cancelledAt: Timestamp | null;
  isPrivate: boolean;
  isNegotiable: boolean;
  isArchived: boolean;
  createdAt: Timestamp | FieldValue | null;
  updatedAt: Timestamp | FieldValue | null;
}

export interface AccountDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export interface UserProfile {
  id: string;
  uid: string;
  name: string;
  username: string;
  searchableUsername: string;
  email: string;
  userType: 'user' | 'runner' | 'both'; // ✅ include 'user'
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  followers: string[];
  followersCount: number;
  following: string[];
  followingCount: number;
  likes: number;
  bio: string;
  messageBackground: string;
  avatarUrl: string;
  isActive: boolean;
  isOnline: boolean;
  lastActiveAt: Timestamp | null;
  lastSeenAt: Timestamp | null;
  isBlocked: boolean;
  isSuspended: boolean;
  isBanned: boolean;
  isPremium: boolean;
  bookmarks?: string[]; // ✅ Add this
  isVerified: boolean;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  verificationDocuments?: {
    idDocumentUrl: string;
    addressDocumentUrl: string;
  };
  verificationRequestedAt?: Timestamp | null;
  verificationReviewedAt?: Timestamp | null;
  verificationRejectedReason?: string;
  privacySettings?: {
    profileVisibility: 'public' | 'private';
    errandHistoryVisibility: 'public' | 'private';
    showReviews: boolean;
    hideWalletBalance: boolean;
  };
  messageBackgroundUrl?: string;
  walletBalance: number;
  hasBluetick: boolean;
  virtualBalance: number;
  ratings: number;
  reviewCount: number;
  notificationPreferences: {
    email: boolean;
    push: boolean;
  };
  blockedUsers: string[];
  accountDetails?: AccountDetails;
}




export interface UserProfileWriteData {
  name: string;
  username: string;
  searchableUsername: string;
  email: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  likes?: number;
  isVerified?: boolean;
  hasBluetick?: boolean;
  bookmarks?: string[]; // ✅ Add this
  userType: 'user' | 'runner' | 'both'; // ✅ include 'user'
  virtualBalance?: number;
  walletBalance?: number;
  avatarUrl?: string;
  createdAt?: Timestamp | FieldValue | null;
  blockedUsers?: string[];
  messageBackgroundUrl?: string;
  accountDetails?: AccountDetails;
}

// === Filters and Queries ===

export interface ErrandFilter {
  category?: string;
  location?: string;
  duration?: string;
  feeRange?: { min: number; max: number };
  status?: 'open' | 'pending' | 'completed' | 'cancelled';
  sortBy?: 'createdAt' | 'fee' | 'duration';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  startAfter?: any;
  isPrivate?: boolean;
  userId?: string;
  likes?: string[];
  bookmarks?: string[];
  searchTerm?: string;
}

// === Transactions and Financials ===

export interface Transaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit' | 'payment' | 'withdrawal';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  errandId: string | null;
  deduction: number;
  createdAt: Timestamp | null;
  description: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  deduction: number;
  createdAt: Timestamp | null;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  transactions: Transaction[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// === Interactions ===

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'message' | 'errand' | 'review' | 'completed' | 'payment' | 'withdrawal' | 'follow';
  relatedId: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface Message {
  type: string;
  id: string;
  senderId: string;
  content: string;
  images: string[];
  createdAt: Timestamp | null;
  conversationId: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  createdAt: Timestamp | null;
  lastMessage: string;
  lastMessageTimestamp: Timestamp | null;
  readStatus: { [uid: string]: boolean };
  errandId: string | null;
}

export interface Prompt {
  id: string;
  errandId: string;
  action: 'cancel' | 'payment' | 'complete';
  requesterId: string;
  runnerUid: string;
  requesterConsent: boolean;
  runnerConsent: boolean;
  createdAt: Timestamp | null;
}

// === Reviews and History ===

export interface Review {
  id: string;
  errandId: string;
  reviewerId: string;
  reviewedId: string;
  rating: number;
  comment: string;
  createdAt: Timestamp | FieldValue | null;
}

export interface ErrandHistory {
  id: string;
  errandId: string;
  userId: string;
  runnerUid: string;
  title: string;
  completedAt: Timestamp | null;
  cancelledAt: Timestamp | null;
}

// === Settings and Verification ===

export interface Settings {
  id: string;
  userId: string;
  notificationPreferences: {
    email: boolean;
    push: boolean;
  };
  privacySettings: {
    profileVisibility: 'public' | 'private';
    errandHistoryVisibility: 'public' | 'private';
    showReviews: boolean;
  };
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Verification {
  id: string;
  userId: string;
  idDocumentUrl: string;
  addressDocumentUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Timestamp | null;
  reviewedAt: Timestamp | null;
}

// === Auth ===

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  currentUser: User | null;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  authLoading: boolean;
  setAuthLoading: (loading: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithPhone: (phoneNumber: string, recaptchaVerifier: any) => Promise<import('firebase/auth').ConfirmationResult>;
  loginAnonymously: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateAccountDetails: (details: AccountDetails) => Promise<void>;
  updateUserProfileData: (data: UserProfileWriteData) => Promise<void>;
  updateUserProfileAvatar: (avatarUrl: string) => Promise<void>;
}

export interface ProgressUpdate {
  [x: string]: ReactNode;
  id: string;
  errandId: string;
  timestamp: string;
  status: string;
  location?: string;
}

export interface UserProfileHeaderProps {
  avatarUrl: string;
  email: string;
  name: string;
  username: string;
  bio: string;
  userType: 'user' | 'both' | 'runner';
  createdAt: Timestamp | null;
  hasBluetick: boolean;
  isVerified: boolean;
  virtualBalance?: number; // ✅ add this
}

export interface UserEngagementStatsProps {
  uid: string;
  followersCount: number;
  followingCount: number;
  likes: number;
  ratings: number;
  reviewCount: number;
  virtualBalance?: number; // ✅ add this
}

export interface UserProfileActionsProps {
  isOwnProfile: boolean;
  isFollowing: boolean;
  followActionLoading: boolean;
  handleFollowToggle: () => void;
  userId: string;
  username?: string;
}

export interface TrackingProps {
  errandId: string;
  userId: string;
  username: string;
  categoryName: string;
  categoryId: string;
  title: string;
  description: string;
  location: string;
  duration: string;
  fee: number;
  currency: string;
  status: string;
  runnerUid: string;
  geo?: { lat: number; lng: number } | null;
  images?: string[];
  isPrivate?: boolean;
}