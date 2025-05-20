import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { auth } from '../firebase/config';
import { onAuthStateChanged, type User } from 'firebase/auth';
import UsersErrandFeed from '../components/UsersErrandFeed';

type UserProfile = {
  uid: string;
  name: string;
  username: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  userType?: string;
  followersCount?: number;
  followingCount?: number;
  likesCount?: number;
  createdAt?: any;
  followers?: string[];
};

const UserProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followActionLoading, setFollowActionLoading] = useState(false);

  // Auth state tracking
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const profileRef = doc(db, 'users', id);
        const profileSnap = await getDoc(profileRef);

        if (!profileSnap.exists()) {
          setNotFound(true);
          return;
        }

        const profileData = profileSnap.data() as UserProfile;
        setProfile(profileData);

        // Check if current user is following
        if (currentUser && profileData.followers?.includes(currentUser.uid)) {
          setIsFollowing(true);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchProfile();
    }
  }, [id, authLoading, currentUser]);

  const handleFollowToggle = async () => {
    if (!currentUser || !profile) return;

    try {
      setFollowActionLoading(true);
      // Simulated logic for follow/unfollow
      if (isFollowing) {
        setIsFollowing(false);
      } else {
        setIsFollowing(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFollowActionLoading(false);
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="container my-5">
        <div className="alert alert-info text-center">
          <span className="spinner-border spinner-border-sm me-2" role="status" />
          {authLoading ? 'Loading user session...' : 'Loading profile...'}
        </div>
      </div>
    );
  }

  // Error or not found
  if (error) {
    return (
      <div className="container my-5">
        <div className="alert alert-danger text-center">{error}</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container my-5">
        <div className="alert alert-warning text-center">User profile not found.</div>
      </div>
    );
  }

  const isOwnProfile = currentUser && profile && currentUser.uid === profile.uid;

  return (
    <div className="container my-5 profile-container">
      <div className="card shadow-sm p-4 p-md-5">
        <div className="row align-items-center">
          <div className="col-md-3 text-center mb-3 mb-md-0">
            <img
              src={
                profile?.avatarUrl ||
                (profile?.email
                  ? `https://www.gravatar.com/avatar/${btoa(profile.email.trim().toLowerCase())}?d=mp&s=150`
                  : `https://www.gravatar.com/avatar/?d=mp&s=150`)
              }
              alt={`${profile?.username || 'User'}'s avatar`}
              className="rounded-circle img-fluid"
              style={{ width: '150px', height: '150px', objectFit: 'cover' }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = 'https://www.gravatar.com/avatar/?d=mp&s=150';
              }}
            />
          </div>
          <div className="col-md-9">
            <h3 className="mb-2">{profile?.name}</h3>
            <h4 className="text-primary mb-3">@{profile?.username}</h4>
            {profile?.bio && <p className="text-muted mb-3">{profile.bio}</p>}
            <p className="mb-2">
              <strong>Role:</strong>{' '}
              {profile?.userType
                ? profile.userType.charAt(0).toUpperCase() + profile.userType.slice(1)
                : 'Not specified'}
            </p>
            <div className="d-flex flex-wrap gap-3 mb-3">
              <span className="badge bg-secondary fs-6">
                Followers: {profile?.followersCount ?? 0}
              </span>
              <span className="badge bg-secondary fs-6">
                Following: {profile?.followingCount ?? 0}
              </span>
              <span className="badge bg-success fs-6">
                Likes: {profile?.likesCount ?? 0}
              </span>
            </div>

            {!authLoading && currentUser && profile && !isOwnProfile && (
              <div className="mt-3">
                <button
                  className={`btn ${isFollowing ? 'btn-outline-secondary' : 'btn-primary'}`}
                  onClick={handleFollowToggle}
                  disabled={followActionLoading}
                >
                  {followActionLoading && (
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                  )}
                  {followActionLoading ? '' : isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            )}

            {!authLoading && currentUser && profile && isOwnProfile && (
              <div className="mt-3">
                <button className="btn btn-outline-secondary">Edit Profile</button>
              </div>
            )}

            {profile?.createdAt && typeof profile.createdAt !== 'string' && (
              <p className="text-muted small mt-3 mb-0">
                Joined: {new Date(profile.createdAt.toDate()).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* User's errands list */}
      {profile?.uid && <UsersErrandFeed />}
    </div>
  );
};

export default UserProfilePage;
