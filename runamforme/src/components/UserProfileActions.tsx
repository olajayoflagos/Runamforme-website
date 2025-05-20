import React from 'react';

interface UserProfileActionsProps {
  isOwnProfile: boolean;
  isFollowing: boolean;
  followActionLoading: boolean;
  handleFollowToggle: () => void;
}

const UserProfileActions: React.FC<UserProfileActionsProps> = ({
  isOwnProfile,
  isFollowing,
  followActionLoading,
  handleFollowToggle,
}) => {
  return (
    <div className="mt-3">
      {!isOwnProfile ? (
        <button
          className={`btn ${isFollowing ? 'btn-outline-secondary' : 'btn-primary'}`}
          onClick={handleFollowToggle}
          disabled={followActionLoading}
        >
          {followActionLoading && (
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          )}
          {followActionLoading ? '' : isFollowing ? 'Following' : 'Follow'}
        </button>
      ) : (
        <button className="btn btn-outline-secondary">Edit Profile</button>
      )}
    </div>
  );
};

export default UserProfileActions;
