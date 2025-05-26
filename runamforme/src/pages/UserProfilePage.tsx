// UserProfilePage.tsx
// ===========================
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { type UserProfile, type Errand } from '../types';
import UsersErrandFeed from '../components/UsersErrandFeed';

const UserProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { currentUser, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [errands, setErrands] = useState<Errand[]>([]);
  const [likedErrands, setLikedErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'posted' | 'liked'>('posted');
  

  
  useEffect(() => {
    const fetchProfileAndErrands = async () => {
      if (!username) return;

      try {
        setLoading(true);
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError('User not found.');
          return;
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data() as UserProfile;
        const userId = userDoc.id;

        const completeProfile: UserProfile = {
          id: userId,
          uid: userId,
          name: userData.name,
          username: userData.username,
          email: userData.email,
          userType: userData.userType,
          createdAt: userData.createdAt,
          followersCount: userData.followersCount ?? 0,
          followingCount: userData.followingCount ?? 0,
          likes: userData.likes ?? 0,
          bio: userData.bio ?? '',
          avatarUrl: userData.avatarUrl ?? '',
          isVerified: userData.isVerified ?? false,
        };

        setProfile(completeProfile);

        const errandsQuery = query(collection(db, 'errands'), where('uid', '==', userId));
        const errandsSnapshot = await getDocs(errandsQuery);
        const userErrands: Errand[] = errandsSnapshot.docs.map((doc) => {
          const { id, ...data } = doc.data() as Errand & { id?: string };
          return {
            id: doc.id,
            ...data,
            postedByUsername: doc.data().postedByUsername ?? username,
          };
        });

        setErrands(userErrands);

        if (currentUser?.uid === userId) {
          const likedQuery = query(collection(db, 'errands'), where('likedBy', 'array-contains', userId));
          const likedSnapshot = await getDocs(likedQuery);
          const liked: Errand[] = likedSnapshot.docs.map((doc) => {
            const { id, ...data } = doc.data() as Errand & { id?: string };
            return {
              id: doc.id,
              ...data,
            };
          });
          setLikedErrands(liked);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchProfileAndErrands();
    }
  }, [username, authLoading, currentUser]);

  if (authLoading || loading) {
    return (
      <div className="container my-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="container my-5 alert alert-danger text-center">{error}</div>;
  }

  if (!profile) return null;

  const isOwnProfile = currentUser?.uid === profile.uid;

  return (
    <div className="container my-5">
      <div className="card shadow-sm p-4 p-md-5 mb-4">
        <div className="row align-items-center">
          <div className="col-md-3 text-center mb-3 mb-md-0">
            <img
              src={
                profile.avatarUrl ||
                `https://www.gravatar.com/avatar/${btoa(profile.email.trim().toLowerCase())}?d=mp&s=150`
              }
              alt={`${profile.username}'s avatar`}
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
            <h3 className="mb-2">{profile.name}</h3>
            <h4 className="text-primary mb-3">@{profile.username}</h4>
            {profile.bio && <p className="text-muted mb-3">{profile.bio}</p>}
            <p><strong>Role:</strong> {profile.userType}</p>
            <div className="d-flex flex-wrap gap-3 mb-3">
              <span className="badge bg-secondary fs-6">Followers: {profile.followersCount}</span>
              <span className="badge bg-secondary fs-6">Following: {profile.followingCount}</span>
              <span className="badge bg-success fs-6">Likes: {profile.likes}</span>
            </div>
            {profile.createdAt && (
              <p className="text-muted small">Joined: {new Date(profile.createdAt.toDate()).toLocaleDateString()}</p>
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