import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MessageModal from './MessageModal';
import { Button, Alert } from 'react-bootstrap';

interface UserProfileActionsProps {
  isOwnProfile: boolean;
  isFollowing: boolean;
  followActionLoading: boolean;
  handleFollowToggle: () => void;
  userId: string;
  username?: string;
}

const UserProfileActions: React.FC<UserProfileActionsProps> = ({
  isOwnProfile,
  isFollowing,
  followActionLoading,
  handleFollowToggle,
  userId,
  username,
}) => {
  const { isAuthenticated } = useAuth();
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMessageClick = useCallback(() => {
    if (!isAuthenticated) {
      setError('You must be logged in to send a message.');
      return;
    }
    setShowMessageModal(true);
  }, [isAuthenticated]);

  const debouncedFollowToggle = useCallback(() => {
    if (!isAuthenticated) {
      setError('You must be logged in to follow/unfollow.');
      return;
    }
    if (!followActionLoading) {
      handleFollowToggle();
    }
  }, [isAuthenticated, followActionLoading, handleFollowToggle]);

  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <div className="mt-3 d-flex flex-wrap gap-2">
      {error && (
        <Alert
          variant="danger"
          className="w-100 d-flex justify-content-between align-items-center"
          aria-live="assertive"
          dismissible
          onClose={handleDismissError}
        >
          <div>{error}</div>
          <Link
            to="/login"
            className="btn btn-sm btn-outline-light ms-2"
            aria-label="Log in"
          >
            Log in
          </Link>
        </Alert>
      )}
      {!isOwnProfile ? (
        <>
          <Button
            variant={isFollowing ? 'outline-danger' : 'primary'}
            onClick={debouncedFollowToggle}
            disabled={followActionLoading}
            aria-label={followActionLoading ? 'Processing follow action' : isFollowing ? `Unfollow ${username || 'user'}` : `Follow ${username || 'user'}`}
            className="transition-all duration-200 hover-scale"
          >
            {followActionLoading && (
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
            )}
            {followActionLoading ? 'Processing...' : isFollowing ? 'Unfollow' : 'Follow'}
          </Button>
          <Button
            variant="success"
            onClick={handleMessageClick}
            disabled={followActionLoading}
            aria-label={`Send message to ${username || 'user'}`}
            className="transition-all duration-200 hover-scale"
          >
            Message
          </Button>
        </>
      ) : (
        <Link
          to="/edit-profile"
          className="btn btn-outline-primary transition-all duration-200 hover-scale"
          aria-label="Edit profile"
        >
          Edit Profile
        </Link>
      )}
      {showMessageModal && (
        <MessageModal
          recipientId={userId}
          recipientUsername={username || 'user'}
          show={true}
          onClose={() => setShowMessageModal(false)}
          textOnly={true}
        />
      )}
    </div>
  );
};

export default UserProfileActions;