import React from 'react';

interface UserProfileHeaderProps {
  avatarUrl?: string;
  email?: string;
  name?: string;
  username?: string;
  bio?: string;
  userType?: string;
  createdAt?: any;
}

const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({
  avatarUrl,
  email,
  name,
  username,
  bio,
  userType,
  createdAt,
}) => {
  const fallbackAvatar = email
    ? `https://www.gravatar.com/avatar/${btoa(email.trim().toLowerCase())}?d=mp&s=150`
    : 'https://www.gravatar.com/avatar/?d=mp&s=150';

  return (
    <div className="row align-items-center">
      <div className="col-md-3 text-center mb-3 mb-md-0">
        <img
          src={avatarUrl || fallbackAvatar}
          alt={`${username || 'User'}'s avatar`}
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
        <h3 className="mb-2">{name}</h3>
        <h4 className="text-primary mb-3">@{username}</h4>
        {bio && <p className="text-muted mb-3">{bio}</p>}
        <p className="mb-2">
          <strong>Role:</strong> {userType ? userType.charAt(0).toUpperCase() + userType.slice(1) : 'Not specified'}
        </p>
        {createdAt && typeof createdAt !== 'string' && (
          <p className="text-muted small mt-3 mb-0">Joined: {new Date(createdAt.toDate()).toLocaleDateString()}</p>
        )}
      </div>
    </div>
  );
};

export default UserProfileHeader;
