import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { UserProfile } from '../types';
import 'react-loading-skeleton/dist/skeleton.css';
import Skeleton from 'react-loading-skeleton';

interface UserEngagementStatsProps
  extends Pick<UserProfile, 'uid' | 'followersCount' | 'followingCount' | 'likes' | 'ratings' | 'reviewCount' | 'walletBalance'> {}

const UserEngagementStats: React.FC<UserEngagementStatsProps> = ({
  uid,
  followersCount = 0,
  followingCount = 0,
  likes = 0,
  ratings,
  reviewCount,
  walletBalance,
}) => {
  const [errandCount, setErrandCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchErrandCount = async () => {
      try {
        const q = query(
          collection(db, 'errands'),
          where('userId', '==', uid),
          where('status', 'in', ['completed', 'cancelled'])
        );
        const snapshot = await getDocs(q);
        setErrandCount(snapshot.docs.length);
      } catch (err) {
        setError('Failed to load errand count.');
      } finally {
        setLoading(false);
      }
    };

    if (uid) {
      fetchErrandCount();
    } else {
      setError('Invalid user ID.');
      setLoading(false);
    }
  }, [uid]);

  return (
    <div className="d-flex flex-wrap gap-3 mb-3">
      {loading ? (
        <>
          <Skeleton width={100} height={20} />
          <Skeleton width={100} height={20} />
          <Skeleton width={100} height={20} />
          <Skeleton width={100} height={20} />
          <Skeleton width={100} height={20} />
        </>
      ) : (
        <>
          <Link
            to={`/profile/${uid}?tab=followers`}
            className="badge bg-secondary text-decoration-none"
            aria-label={`View ${followersCount} followers`}
          >
            Followers: {followersCount}
          </Link>
          <Link
            to={`/profile/${uid}?tab=following`}
            className="badge bg-secondary text-decoration-none"
            aria-label={`View ${followingCount} following`}
          >
            Following: {followingCount}
          </Link>
          <span className="badge bg-success" aria-label={`Total likes: ${likes}`}>
            Likes: {likes}
          </span>
          <span className="badge bg-info" aria-label={`Total errands: ${error ? 'N/A' : errandCount}`}>
            Errands: {error ? 'N/A' : errandCount}
          </span>
          <span
            className="badge bg-primary"
            aria-label={`Average rating: ${ratings.toFixed(1)} from ${reviewCount} reviews`}
          >
            Rating: {ratings.toFixed(1)} ({reviewCount} reviews)
          </span>
          <span
            className="badge bg-warning text-dark"
            aria-label={`Virtual balance: ${walletBalance} NGN`}
          >
            Balance: {walletBalance} NGN
          </span>
        </>
      )}
    </div>
  );
};

export default UserEngagementStats;