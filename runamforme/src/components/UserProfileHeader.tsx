import React from 'react';
import type { Timestamp } from 'firebase/firestore';
import type { UserProfile } from '../types';
import { Badge } from 'react-bootstrap';

interface UserProfileHeaderProps extends Pick<
  UserProfile,
  'avatarUrl' | 'email' | 'name' | 'username' | 'bio' | 'userType' | 'createdAt' | 'hasBluetick' | 'isVerified' | 'walletBalance'
> {}

const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({
  avatarUrl,
  email,
  name,
  username,
  bio,
  userType,
  createdAt,
  hasBluetick,
  isVerified,
  walletBalance,
}) => {
  const fallbackAvatar = email
    ? `https://www.gravatar.com/avatar/${encodeURIComponent(email.trim().toLowerCase())}?d=mp&s=150`
    : 'https://www.gravatar.com/avatar/?d=mp&s=150';

  const formatDate = (timestamp: Timestamp | string | null): string => {
    try {
      const date = typeof timestamp === 'string'
        ? new Date(timestamp)
        : timestamp?.toDate?.() || new Date();
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <div className="row align-items-center">
      <div className="col-md-3 text-center mb-3 mb-md-0">
        <img
          src={avatarUrl || fallbackAvatar}
          alt={`${username || 'User'}'s avatar`}
          className="rounded-circle img-fluid shadow-sm"
          style={{ width: '150px', height: '150px', objectFit: 'cover' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = 'https://www.gravatar.com/avatar/?d=mp&s=150';
          }}
          aria-label={`Avatar of ${username || 'unknown user'}`}
        />
      </div>
      <div className="col-md-9">
        <h3 className="mb-2 d-flex align-items-center">
          {name || 'Unnamed User'}
          {(hasBluetick || isVerified) && (
            <Badge bg="primary" className="ms-2" aria-label="Verified user">
              <i className="bi bi-check-circle-fill"></i>
            </Badge>
          )}
        </h3>
        <h4 className="text-primary mb-3">@{username || 'unknown'}</h4>
        {bio && <p className="text-muted mb-3">{bio}</p>}
        <p className="mb-2">
          <strong>Role:</strong> {' '}
          {userType ? userType.charAt(0).toUpperCase() + userType.slice(1) : 'Not specified'}
        </p>
        <p className="mb-2">
          <strong>Balance:</strong> {walletBalance} NGN
        </p>
        <p className="text-muted small mt-3 mb-0">
          Joined: {formatDate(createdAt)}
        </p>
      </div>
    </div>
  );
};

export default UserProfileHeader;