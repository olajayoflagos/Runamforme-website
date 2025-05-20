// src/types/index.ts

// Import Timestamp and FieldValue types from Firebase Firestore
import type { Timestamp, FieldValue } from "firebase/firestore";

/**
 * Interface for an Errand document in Firestore.
 * Properties that might use server-side values (like serverTimestamp())
 * are unioned with FieldValue for type compatibility during write operations.
 * When reading data back, these fields will be Timestamp.
 */
export interface Errand {
  id: string; // Firestore Document ID (added when reading)
  uid: string; // User ID of the poster
  description: string;
  location: string;
  duration: string;
  fee: number | null; // Updated: allow null for UI safety
  status: 'open' | 'accepted' | 'completed' | 'cancelled';
  geo?: { lat: number; lng: number } | null; // Updated: optional for Firestore compatibility

  createdAt: Timestamp | FieldValue;
  runnerUid?: string | null | FieldValue;
  acceptedAt?: Timestamp | FieldValue | null;
  completedAt?: Timestamp | FieldValue | null;

  viewCount?: number;
  clickCount?: number;
  likesCount?: number;
}

/**
 * Type for the data payload when creating or updating an Errand document.
 * This allows use of FieldValue types like serverTimestamp().
 */
export type ErrandWriteData = Omit<Errand, 'id'> & {
  createdAt: Timestamp | FieldValue;
  acceptedAt?: Timestamp | FieldValue | null;
  completedAt?: Timestamp | FieldValue | null;
  runnerUid?: string | null | FieldValue;
};

// ---------------------------------------------
// UserProfile Interfaces
// ---------------------------------------------

/**
 * Interface for a User profile document in Firestore.
 * Stored in /users/{uid}.
 */
export interface UserProfile {
  id: string; // Firestore Document ID (same as UID)
  uid: string; // Firebase Auth UID - primary key for the document
  name: string;
  email: string;
  username: string;

  userType: 'requester' | 'runner' | 'both';
  createdAt: Timestamp;

  followersCount: number;
  followingCount: number;
  likesCount: number;

  bio?: string;
  avatarUrl?: string;
  isVerified?: boolean;
}

/**
 * Type for the data payload when creating or updating a UserProfile document in Firestore.
 */
export interface UserProfileWriteData extends Omit<
  UserProfile,
  'id' | 'createdAt' | 'followersCount' | 'followingCount' | 'likesCount'
> {
  uid: string;
  createdAt: Timestamp | FieldValue;
  followersCount: number | FieldValue;
  followingCount: number | FieldValue;
  likesCount: number | FieldValue;
}

// ---------------------------------------------
// Review Interface
// ---------------------------------------------

/**
 * Interface for a Feedback/Review document in Firestore.
 * Stored in /reviews/{reviewId}.
 */
export interface Review {
  id: string;
  errandId: string;
  reviewerUid: string;
  reviewedUserUid: string;
  rating: number;
  text: string;
  includesLike?: boolean;
  createdAt: Timestamp;
}

export type ReviewWriteData = Omit<Review, 'id' | 'createdAt'> & {
  createdAt: Timestamp | FieldValue;
};
