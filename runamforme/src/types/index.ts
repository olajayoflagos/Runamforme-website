// src/types/index.ts

import type {  Timestamp, FieldValue } from "firebase/firestore";

export type { Timestamp } from 'firebase/firestore';

/**
 * Interface for an Errand document in Firestore.
 */
export interface Errand {
  id: string;
  uid: string; // User ID of the poster
  postedByUsername?: string; // Poster’s username (optional denormalization)
  title: string; // Updated to string
  description: string;
  location: string;
  duration: string;
  fee: number | null;
  currency: string; // NEW: Field for currency
  category: string; // NEW: Field for category
  status: 'open' | 'accepted' | 'completed' | 'cancelled';
  geo?: { lat: number; lng: number } | null;
  createdAt: Timestamp; // When reading
  runnerUid?: string | null;
  acceptedAt?: Timestamp | null;
  completedAt?: Timestamp | null;
  viewCount?: number; // Simple counter (optional)
  clickCount?: number; // Simple counter (optional)
  // Removed simple 'likes' counter.
  likedByUids?: string[]; // NEW: Array of user UIDs who liked this errand
  viewedByUids?: string[]; // NEW: Array of user UIDs who viewed this errand (logged in)
  mediaUrls?: string[]; // Array of uploaded image/video URLs
}

/**
 * Type for the data payload when creating or updating an Errand document.
 * Allows use of FieldValue types.
 */
export type ErrandWriteData = Omit<Errand, 'id'> & {
  createdAt: Timestamp | FieldValue;


  acceptedAt?: Timestamp | FieldValue | null;
  completedAt?: Timestamp | FieldValue | null;
  runnerUid?: string | null | FieldValue;

  // Allow FieldValue for array updates
  likedByUids?: string[] | FieldValue;
  viewedByUids?: string[] | FieldValue;
  mediaUrls?: string[] | FieldValue;

  // Allow FieldValue for counter increments (if keeping simple counters)
  viewCount?: number | FieldValue;
  clickCount?: number | FieldValue;
};

// ---------------------------------------------
// UserProfile Interfaces
// ---------------------------------------------

/**
 * Interface for a User profile document in Firestore. Stored in /users/{uid}.
 */
export interface UserProfile {
  id: string; // Document ID (should be UID)
  uid: string; // Firebase Auth UID
  name: string;
  email: string;
  username: string;

  userType: 'requester' | 'runner' | 'both';
  createdAt: Timestamp;

  followersCount: number;
  followingCount: number;
  likes: number; // Profile likes?

  bio?: string;


  avatarUrl?: string;
  isVerified?: boolean;
}

/**
 * Type for the data payload when creating or updating a UserProfile document.
 * Allows use of FieldValue types.
 */
export type UserProfileWriteData = Omit<
  UserProfile,
  'id' | 'createdAt' | 'followersCount' | 'followingCount' | 'likes' | 'userType' | 'bio' | 'avatarUrl'
> & {
  uid: string;
  createdAt: Timestamp | FieldValue;
  followersCount: number | FieldValue;
  followingCount: number | FieldValue;
  likes: number | FieldValue;

  // Optional fields allowing FieldValue for atomic updates/deletion
  avatarUrl?: string | FieldValue;
  bio?: string | FieldValue;
  userType: 'requester' | 'runner' | 'both' | FieldValue;
  isVerified?: boolean | FieldValue;
};

// ---------------------------------------------
// Review Interface
// ---------------------------------------------

/**
 * Interface for a Feedback/Review document in Firestore. Stored in /reviews/{reviewId}.
 */
export interface Review {
  id: string;
  errandId: string;
  reviewerUid: string;
  reviewedUserUid: string;
  rating: number;


  text: string;
  includesLike?: boolean; // Clarify purpose
  createdAt: Timestamp;
}

/**
 * Type for the data payload when creating or updating a Review document.
 * Allows use of FieldValue types.
 */
export type ReviewWriteData = Omit<Review, 'id' | 'createdAt'> & {
  createdAt: Timestamp | FieldValue;
};

// Note: Add types for Messages, Conversations etc. here later.

// Add types for Messages and Conversations as discussed or as needed

/**
 * Interface for a Message document in Firestore. Stored in /conversations/{conversationId}/messages/{messageId}.
 */
export interface Message {
  id: string;
  conversationId: string;
  senderUid: string;
  recipientUid: string;
  text: string;
  createdAt: Timestamp; // When reading
  isRead: boolean;
  mediaUrl?: string; // Optional media attachment URL
}

/**
 * Type for the data payload when creating or updating a Message document.
 * Allows use of FieldValue types.
 */
export type MessageWriteData = Omit<Message, 'id' | 'createdAt'> & {
  createdAt: Timestamp | FieldValue;
};

/**
 * Interface for a Conversation document in Firestore. Stored in /conversations/{conversationId}.
 */
export interface Conversation {
    id: string; // Document ID (should be generated from sorted participant UIDs)
    participantUids: string[]; // Array of participant UIDs (sorted)
    createdAt: Timestamp; // When conversation was created (first message sent)
    lastMessageText: string; // Text of the last message
    lastMessageTimestamp: Timestamp; // Timestamp of the last message
    readStatus: { [uid: string]: boolean }; // Map of participant UIDs to read status (true if read)
}

/**
 * Type for the data payload when creating or updating a Conversation document.
 * Allows use of FieldValue types.
 */
export type ConversationWriteData = Omit<Conversation, 'id' | 'createdAt' | 'lastMessageTimestamp' | 'readStatus'> & {
    createdAt: Timestamp | FieldValue;
    lastMessageText: string | FieldValue; // Allow FieldValue for atomic updates
    lastMessageTimestamp: Timestamp | FieldValue; // Allow FieldValue for atomic updates
    readStatus: { [uid: string]: boolean } | FieldValue; // Allow FieldValue for atomic updates
};


