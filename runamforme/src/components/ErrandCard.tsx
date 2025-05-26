import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { Errand } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Link } from 'react-router-dom';

interface ErrandCardProps {
  errand: Errand;
  onLikeToggle?: (errandId: string, isLiked: boolean) => void;
  isLiked?: boolean;
  isLiking?: boolean;
  onViewAndAccept: () => void;
}

const ErrandCard: FC<ErrandCardProps> = ({
  errand,
  onLikeToggle,
  onViewAndAccept,
  isLiked = false,
  isLiking = false
}) => {
  const { currentUser } = useAuth();
  const [username, setUsername] = useState<string>('Unknown');
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    const fetchUsername = async () => {
      if (errand.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', errand.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUsername(data.username || 'Unknown');
          }
        } catch (error) {
          console.error('Failed to fetch username:', error);
        }
      }
    };

    fetchUsername();
  }, [errand.uid]);

  return (
    <div className="card h-100 shadow-sm d-flex flex-column">
      <div className="card-body d-flex flex-column">
        {/* Clickable Description */}
        <h5
          className="card-title text-primary mb-2 cursor-pointer"
          onClick={() => setShowFullDescription(!showFullDescription)}
          style={{ cursor: 'pointer' }}
        >
          {showFullDescription
            ? errand.description
            : `${errand.description.substring(0, 80)}...`}
        </h5>

        {/* Media/Attachments */}
        {showFullDescription && Array.isArray(errand.mediaUrls) && errand.mediaUrls.length > 0 && (
          <div className="mb-2">
            {errand.mediaUrls.map((url, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="d-block text-decoration-underline small text-muted"
              >
                Attached File {idx + 4}
              </a>
            ))}
          </div>
        )}

        {/* Clickable Location */}
        <p className="card-text text-muted mb-1">
          📍{' '}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              errand.location
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {errand.location}
          </a>
        </p>

        <p className="card-text text-muted mb-1">⏱️ Duration: {errand.duration}</p>
        <p className="card-text fw-bold mt-2">💰 Fee: ₦{errand.fee?.toLocaleString() ?? 0}</p>

        {/* Clickable Username */}
        <p className="card-text text-muted mb-1">
          🧑 Posted by:{' '}
          <Link to={`/profile/${errand.uid}`}>
            <strong>@{username}</strong>
          </Link>
        </p>

        {/* Clickable Likes Count */}
        {(errand.viewCount !== undefined ||
          errand.clickCount !== undefined ||
          errand.likes !== undefined) && (
          <div className="mt-2 text-muted small">
            {errand.viewCount !== undefined && <span>👀 {errand.viewCount}</span>}
            {errand.clickCount !== undefined && (
              <span className="ms-3">🖱️ {errand.clickCount}</span>
            )}
            {errand.likes !== undefined && (
              <span
                className="ms-3 text-decoration-underline"
                role="button"
                onClick={() => alert('Feature coming soon: Show who liked this errand.')}
              >
                ❤️ {errand.likes}
              </span>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="mt-auto pt-3 d-flex justify-content-between align-items-center">
          <button
            className="btn btn-success btn-sm me-2 flex-grow-1"
            onClick={onViewAndAccept}
          >
            View & Accept
          </button>

          {currentUser ? (
            <button
              className={`btn btn-outline-${isLiked ? 'danger' : 'primary'} btn-sm`}
              onClick={() => onLikeToggle && onLikeToggle(errand.id, isLiked)}
              disabled={isLiking}
              aria-label={isLiked ? 'Unlike this errand' : 'Like this errand'}
            >
              {isLiking && (
                <span
                  className="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
              )}
              {!isLiking ? (isLiked ? 'Liked' : 'Like') : ''}
            </button>
          ) : (
            <button
              className="btn btn-outline-primary btn-sm"
              disabled
              title="Log in to like this errand"
            >
              Like
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrandCard;
