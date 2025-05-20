import React from 'react';

interface UserEngagementStatsProps {
  followersCount?: number;
  followingCount?: number;
  likesCount?: number;
}

const UserEngagementStats: React.FC<UserEngagementStatsProps> = ({
  followersCount = 0,
  followingCount = 0,
  likesCount = 0,
}) => (
  <div className="d-flex flex-wrap gap-3 mb-3">
    <span className="badge bg-secondary fs-6">Followers: {followersCount}</span>
    <span className="badge bg-secondary fs-6">Following: {followingCount}</span>
    <span className="badge bg-success fs-6">Likes: {likesCount}</span>
  </div>
);

export default UserEngagementStats;
