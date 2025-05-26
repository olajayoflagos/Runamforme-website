import React from 'react';

interface UserEngagementStatsProps {
  followersCount?: number;
  followingCount?: number;
  likes?: number;
}

const UserEngagementStats: React.FC<UserEngagementStatsProps> = ({
  followersCount = 0,
  followingCount = 0,
  likes = 0,
}) => (
  <div className="d-flex flex-wrap gap-3 mb-3">
    <span className="badge bg-secondary fs-6">Followers: {followersCount}</span>
    <span className="badge bg-secondary fs-6">Following: {followingCount}</span>
    <span className="badge bg-success fs-6">Likes: {likes}</span>
  </div>
);

export default UserEngagementStats;
