// src/pages/UserProfilePage.tsx

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  // Corrected import: Import Timestamp directly from firebase/firestore
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
// Import UserProfile and Errand types from your types file
import type { UserProfile, Errand } from '../types';
import UsersErrandFeed from '../components/UsersErrandFeed';

const UserProfilePage: React.FC = () => {
  // Get user ID (UID) from the URL parameter named 'id'
  const { id: userIdFromUrl } = useParams<{ id: string }>();

  // Get current user and auth loading state
  const { currentUser, loading: authLoading } = useAuth();

  // State for profile data, posted errands, and liked errands
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [errands, setErrands] = useState<Errand[]>([]);
  const [likedErrands, setLikedErrands] = useState<Errand[]>([]);

  // State for UI loading and errors
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for managing tabs (Posted/Liked)
  const [tab, setTab] = useState<'posted' | 'liked'>('posted');

  // Effect to fetch profile and errands
  useEffect(() => {
    const fetchProfileAndErrands = async (userId: string) => {
      if (!userId) {
         setLoading(false);
         setError('User ID not provided in URL.');
         return;
      }

      try {
        setLoading(true);
        setError(null);
        setProfile(null); // Clear states on new fetch
        setErrands([]);
        setLikedErrands([]);

        // Fetch User Profile by UID (efficient)
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          setError('User not found.');
          setLoading(false);
          return;
        }

        // Corrected type assertion to Omit<UserProfile, 'id'>
        const userData = userDocSnap.data() as Omit<UserProfile, 'id'>;
        const profileId = userDocSnap.id;

        // Construct complete profile object with defaults
        const completeProfile: UserProfile = {
          id: profileId, // Explicitly use the document ID
          uid: profileId, // UID should also be the document ID in your schema
          name: userData.name,
          username: userData.username,
          email: userData.email, // Check security rules if public
          userType: userData.userType,
          createdAt: userData.createdAt,
          followersCount: userData.followersCount ?? 0,
          followingCount: userData.followingCount ?? 0,
          likes: userData.likes ?? 0, // Profile likes?
          bio: userData.bio ?? '',
          avatarUrl: userData.avatarUrl ?? '',
          isVerified: userData.isVerified ?? false,
        };

        setProfile(completeProfile);

        // Fetch Errands Posted by this User
        const errandsQuery = query(collection(db, 'errands'), where('uid', '==', userId));
        const errandsSnapshot = await getDocs(errandsQuery);
      // --- Continued in Part 2 ---
// src/pages/UserProfilePage.tsx
// --- Continued from Part 1 ---

        const userErrands: Errand[] = errandsSnapshot.docs.map((doc) => {
          // Corrected type assertion to Omit<Errand, 'id'> to avoid TypeScript warning 2783
          const data = doc.data() as Omit<Errand, 'id'>; // Cast document data to Errand type excluding 'id'
          return {
            id: doc.id, // Include the document ID
            ...data, // Spread existing data
            // Provide defaults for potentially missing fields and new fields
            title: data.title ?? 'Untitled Errand',
            description: data.description ?? '',
            location: data.location ?? '',
            duration: data.duration ?? '',
            fee: data.fee ?? null,
            status: data.status ?? 'open',
            uid: data.uid,
            category: data.category ?? 'uncategorized', // New field
            currency: data.currency ?? 'NGN', // New field
            likedByUids: data.likedByUids ?? [], // New array field, default to empty array
            viewedByUids: data.viewedByUids ?? [], // New array field, default to empty array
            mediaUrls: data.mediaUrls ?? [], // Existing array field, default to empty array
          };
        });

        setErrands(userErrands); // Update state with posted errands

        // --- Fetch Errands Liked by this User (Only if viewing their own profile) ---
        // Check if the currently logged-in user's UID matches the profile's UID from the URL.
        const isOwnProfile = currentUser?.uid === userId;

        if (isOwnProfile) {
          // Query errands where the 'likedByUids' array field contains the current user's UID.
          // This requires a 'likedByUids' field with an index.
          const likedQuery = query(collection(db, 'errands'), where('likedByUids', 'array-contains', userId));
          // Execute the query to get the liked errands.
          const likedSnapshot = await getDocs(likedQuery);
          // Map the liked errand documents to an array of Errand objects.
          const liked: Errand[] = likedSnapshot.docs.map((doc) => {
             // Corrected type assertion to Omit<Errand, 'id'> to avoid TypeScript warning 2783
            const data = doc.data() as Omit<Errand, 'id'>; // Cast document data to Errand type excluding 'id'
            return {
              id: doc.id, // Include the document ID
              ...data, // Spread existing data
              // Provide defaults for potentially missing fields and new fields
              title: data.title ?? 'Untitled Errand',
              description: data.description ?? '',
              location: data.location ?? '',
              duration: data.duration ?? '',
              fee: data.fee ?? null,
              status: data.status ?? 'open',
              uid: data.uid,
            // --- Continued in Part 3 ---
// src/pages/UserProfilePage.tsx
// --- Continued from Part 2 ---

              category: data.category ?? 'uncategorized', // New field
              currency: data.currency ?? 'NGN', // New field
              likedByUids: data.likedByUids ?? [], // New array field, default to empty array
              viewedByUids: data.viewedByUids ?? [], // New array field, default to empty array
              mediaUrls: data.mediaUrls ?? [], // Existing array field, default to empty array
            };
          });
          setLikedErrands(liked); // Update state with liked errands
        } else {
          // If viewing someone else's profile, ensure liked errands state is empty.
          setLikedErrands([]);
        }

      } catch (err) {
        // Error handling: Log the error and set error state for UI
        console.error("Error fetching profile or errands:", err);
        setError('Failed to load profile. Please check your connection or try again.');
        // Clear states on error
        setProfile(null);
        setErrands([]);
        setLikedErrands([]);
      } finally {
        // Always set loading to false when fetch is complete (success or error)
        setLoading(false);
      }
    };

    // Trigger the fetch logic when auth is loaded and user ID is available
    if (!authLoading && userIdFromUrl) {
      fetchProfileAndErrands(userIdFromUrl);
    } else if (!authLoading && !userIdFromUrl) {
       // Handle case with no user ID in URL
       setLoading(false);
       setError("No user specified.");
    }
  // --- Continued in Part 4 ---
// src/pages/UserProfilePage.tsx
// --- Continued from Part 3 ---

  // Dependencies: Re-run effect if user ID from URL, auth loading, or current user changes
  }, [userIdFromUrl, authLoading, currentUser, db]); // Added db as dependency

  // JSX Render Logic
  if (authLoading || loading) {
    return (
      <div className="container my-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">{authLoading ? 'Loading authentication...' : 'Loading profile data...'}</p>
      </div>
    );
  }

  if (error) {
    return <div className="container my-5 alert alert-danger text-center">{error}</div>;
  }

  if (!profile) {
      return null; // Should be covered by error state now
  }

  const isOwnProfile = currentUser?.uid === profile.uid;

  return (
    <div className="container my-5">
      <div className="card shadow-sm p-4 p-md-5 mb-4">
        <div className="row align-items-center">
          <div className="col-md-3 text-center mb-3 mb-md-0">
            <img
              src={ (profile && profile.avatarUrl) ? profile.avatarUrl : (profile?.email ? `https://www.gravatar.com/avatar/${btoa(profile.email.trim().toLowerCase())}?d=mp&s=150` : 'https://www.gravatar.com/avatar/?d=mp&s=150') }
              alt={`${profile.username}'s avatar`}
              className="rounded-circle img-fluid"
              style={{ width: '150px', height: '150px', objectFit: 'cover' }}
              onError={(e) => { const target = e.target as HTMLImageElement; target.onerror = null; target.src = 'https://www.gravatar.com/avatar/?d=mp&s=150'; }}
            />
          </div>
          <div className="col-md-9">
            <h3 className="mb-2">{profile.name}</h3>
            <h4 className="text-primary mb-3">@{profile.username}</h4>
            {profile.bio && <p className="text-muted mb-3">{profile.bio}</p>}
            <p><strong>Role:</strong> {profile.userType}</p>
            <div className="d-flex flex-wrap gap-3 mb-3">
              <span className="badge bg-secondary fs-6">Followers: {profile.followersCount}</span>
              <span className="badge bg-secondary fs-6">Following: {profile.followingCount}</span>
              <span className="badge bg-success fs-6">Likes: {profile.likes}</span>
            </div>
            {profile.createdAt && 'toDate' in profile.createdAt && (
              <p className="text-muted small">Joined: {new Date((profile.createdAt as Timestamp).toDate()).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      </div>

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${tab === 'posted' ? 'active' : ''}`} onClick={() => setTab('posted')}>
            Posted Errands
          </button>
        </li>
        {isOwnProfile && (
          <li className="nav-item">
            <button className={`nav-link ${tab === 'liked' ? 'active' : ''}`} onClick={() => setTab('liked')}>
              Liked Errands
            </button>
          </li>
        )}
      </ul>

      {tab === 'posted' ? (
          <UsersErrandFeed errands={errands} />
      ) : (
          <UsersErrandFeed errands={likedErrands} />
      )}
    </div>
  );
};

export default UserProfilePage;
