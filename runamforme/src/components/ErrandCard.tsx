import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove, addDoc, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, Badge, Spinner, Modal, ListGroup, Toast, ToastContainer } from 'react-bootstrap';
import type { Errand, UserProfile } from '../types';

interface ErrandCardProps {
  errand: Errand;
  onLikeToggle?: (errandId: string, isCurrentlyLiked: boolean) => void;
  isLiked: boolean;
  isLiking?: boolean;
  onViewAndAccept: () => void;
}

const ErrandCard: React.FC<ErrandCardProps> = ({
  errand,
  onLikeToggle,
  onViewAndAccept,
  isLiked,
  isLiking = false,
}) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('Unknown');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [likers, setLikers] = useState<UserProfile[]>([]);
  const [likersLoading, setLikersLoading] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(
    errand.bookmarks?.includes(currentUser?.uid || '') || false
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; variant: 'success' | 'danger' }>({
    show: false,
    message: '',
    variant: 'success',
  });

  const images = Array.isArray(errand.images) ? errand.images : [];

  const fetchUsername = useCallback(async () => {
    if (!errand.userId) {
      setUsername('No User ID');
      return;
    }
    try {
      const userDoc = await getDoc(doc(db, 'users', errand.userId));
      setUsername(userDoc.exists() ? userDoc.data().username || 'Unknown' : 'User Not Found');
    } catch (error) {
      console.error('Error fetching username:', error);
      setUsername('Error fetching user');
    }
  }, [errand.userId]);

  const fetchLikers = useCallback(async () => {
    if (!showLikersModal || !errand.likes || errand.likes.length === 0) {
      setLikers([]);
      return;
    }
    setLikersLoading(true);
    try {
      const likerPromises = errand.likes.map(uid => getDoc(doc(db, 'users', uid)));
      const likerSnapshots = await Promise.all(likerPromises);
      const fetchedLikers = likerSnapshots
        .filter(snap => snap.exists())
        .map(snap => ({
          id: snap.id,
          uid: snap.id,
          ...(snap.data() as Omit<UserProfile, 'id' | 'uid'>),
        }));
      setLikers(fetchedLikers);
    } catch (error) {
      console.error('Error fetching likers:', error);
    } finally {
      setLikersLoading(false);
    }
  }, [showLikersModal, errand.likes]);

  const handleClick = useCallback(async () => {
    if (!errand.id) {
      setToast({ show: true, message: 'Invalid errand ID.', variant: 'danger' });
      return;
    }
    try {
      await updateDoc(doc(db, 'errands', errand.id), { 
        clickCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating click count:', error);
      setToast({ show: true, message: 'Failed to update view count.', variant: 'danger' });
    }
  }, [errand.id]);

  const handleLikeToggle = useCallback(async () => {
    if (!currentUser || !onLikeToggle || !errand.id) return;
    try {
      await updateDoc(doc(db, 'errands', errand.id), {
        likes: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
        updatedAt: serverTimestamp(),
      });
      onLikeToggle(errand.id, isLiked);
      if (!isLiked) {
        await addDoc(collection(db, 'notifications'), {
          userId: errand.userId,
          type: 'like',
          relatedId: errand.id,
          message: `${currentUser.displayName || 'A user'} liked your errand "${errand.title}".`,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setToast({ show: true, message: 'Failed to toggle like.', variant: 'danger' });
    }
  }, [currentUser, errand.id, errand.title, errand.userId, isLiked, onLikeToggle]);

  const handleBookmark = useCallback(async () => {
    if (!currentUser || !errand.id) return;
    try {
      await updateDoc(doc(db, 'errands', errand.id), {
        bookmarks: isBookmarked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
        updatedAt: serverTimestamp(),
      });
      setIsBookmarked(!isBookmarked);
      setToast({
        show: true,
        message: isBookmarked ? 'Removed bookmark.' : 'Bookmarked errand.',
        variant: 'success',
      });
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      setToast({ show: true, message: 'Failed to toggle bookmark.', variant: 'danger' });
    }
  }, [currentUser, errand.id, isBookmarked]);

  const handleShare = useCallback(async () => {
    if (!errand.id) {
      setToast({ show: true, message: 'Invalid errand ID.', variant: 'danger' });
      return;
    }
    const shareUrl = `${window.location.origin}/errands/${errand.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: errand.title,
          text: errand.description.substring(0, 100),
          url: shareUrl,
        });
        setToast({ show: true, message: 'Errand shared successfully!', variant: 'success' });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setToast({ show: true, message: 'Link copied to clipboard!', variant: 'success' });
      }
    } catch (error) {
      console.error('Error sharing errand:', error);
      setToast({ show: true, message: 'Failed to share errand.', variant: 'danger' });
    }
  }, [errand.id, errand.title, errand.description]);

  const handleDelete = useCallback(async () => {
    if (!currentUser || currentUser.uid !== errand.userId || errand.status !== 'open' || !errand.id) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'errands', errand.id));
      setShowDeleteConfirm(false);
      setToast({ show: true, message: 'Errand deleted successfully.', variant: 'success' });
      navigate('/errands');
    } catch (error) {
      console.error('Error deleting errand:', error);
      setToast({ show: true, message: 'Failed to delete errand.', variant: 'danger' });
    } finally {
      setDeleting(false);
    }
  }, [currentUser, errand.id, errand.userId, errand.status, navigate]);

  useEffect(() => {
    fetchUsername();
  }, [fetchUsername]);

  useEffect(() => {
    fetchLikers();
  }, [fetchLikers]);

  return (
    <>
      <Card className="h-100 shadow-sm" onClick={handleClick}>
        <Card.Body className="d-flex flex-column">
          <Card.Title 
            className="text-primary mb-3 cursor-pointer"
            onClick={() => setShowFullDescription(!showFullDescription)}
            aria-expanded={showFullDescription}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setShowFullDescription(!showFullDescription)}
          >
            {errand.title}
          </Card.Title>

          <div className="mb-3">
            <Badge bg={errand.isPrivate ? 'secondary' : 'info'} className="me-2">
              {errand.isPrivate ? 'Private' : 'Public'}
            </Badge>
            <Badge bg="primary" className="me-2">
              {errand.category || 'Uncategorized'}
            </Badge>
            <Badge bg="secondary">
              {errand.duration || 'Flexible'}
            </Badge>
          </div>

          <Card.Text className="mb-3">
            {showFullDescription ? errand.description : `${errand.description.substring(0, 100)}${errand.description.length > 100 ? '...' : ''}`}
            {errand.description.length > 100 && (
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="p-0 ms-2"
                aria-label={showFullDescription ? 'Show less description' : 'Show more description'}
              >
                {showFullDescription ? 'Show less' : 'Show more'}
              </Button>
            )}
          </Card.Text>

          {images.length > 0 && (
            <div className="mb-3 d-flex flex-wrap gap-2">
              {images.slice(0, 4).map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Errand attachment ${idx + 1}`}
                  className="img-thumbnail"
                  style={{ maxWidth: '100px', height: '100px', objectFit: 'cover' }}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/100?text=Image+Not+Available';
                    e.currentTarget.alt = 'Image not available';
                  }}
                />
              ))}
            </div>
          )}

          <div className="mb-3">
            <p className="mb-1">
              <i className="bi bi-geo-alt me-2" aria-hidden="true"></i>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(errand.location || 'Not specified')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-decoration-none"
                aria-label={`View ${errand.location || 'location'} on Google Maps`}
              >
                {errand.location || 'Location not specified'}
              </a>
            </p>
            <p className="mb-1">
              <i className="bi bi-cash-coin me-2" aria-hidden="true"></i>
              <strong>{errand.currency || ''} {errand.fee?.toLocaleString() || '0'}</strong>
              {errand.isNegotiable && <span className="ms-2 text-muted small">(Negotiable)</span>}
            </p>
            <p className="mb-1">
              <i className="bi bi-person me-2" aria-hidden="true"></i>
              Posted by: <Link to={`/profile/${errand.userId}`}>@{username}</Link>
            </p>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <Button 
                variant="link" 
                size="sm" 
                className="text-muted p-0"
                onClick={() => errand.likes?.length > 0 ? setShowLikersModal(true) : null}
                disabled={!errand.likes || errand.likes.length === 0}
                aria-label={`${errand.likes?.length || 0} likes`}
              >
                <i className="bi bi-heart-fill text-danger me-1" aria-hidden="true"></i>
                {errand.likes?.length || 0} {errand.likes?.length === 1 ? 'Like' : 'Likes'}
              </Button>
              <span className="mx-2 text-muted" aria-hidden="true">•</span>
              <span className="text-muted">
                <i className="bi bi-eye me-1" aria-hidden="true"></i>
                {errand.clickCount || 0}
              </span>
            </div>
          </div>

          <div className="mt-auto d-grid gap-2">
            {errand.status === 'completed' && currentUser?.uid === errand.userId ? (
              <Button 
                as="a"
                href={`/leave-review/${errand.id}/${errand.runnerUid}`}
                variant="primary"
                size="sm"
                aria-label="Leave review for this errand"
              >
                Leave Review
              </Button>
            ) : (
              <Button 
                variant="success" 
                size="sm"
                onClick={onViewAndAccept}
                aria-label="View and accept this errand"
              >
                View & Accept
              </Button>
            )}

            <div className="d-flex flex-wrap gap-2">
              {currentUser ? (
                <>
                  <Button
                    variant={isLiked ? 'danger' : 'outline-primary'}
                    size="sm"
                    onClick={handleLikeToggle}
                    disabled={isLiking}
                    className="flex-grow-1"
                    aria-label={isLiked ? 'Unlike this errand' : 'Like this errand'}
                  >
                    {isLiking ? (
                      <Spinner animation="border" size="sm" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </Spinner>
                    ) : (
                      <>
                        <i className={`bi bi-heart${isLiked ? '-fill' : ''} me-1`} aria-hidden="true"></i>
                        {isLiked ? 'Liked' : 'Like'}
                      </>
                    )}
                  </Button>
                  <Button
                    variant={isBookmarked ? 'warning' : 'outline-secondary'}
                    size="sm"
                    onClick={handleBookmark}
                    className="flex-grow-1"
                    aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this errand'}
                  >
                    <i className={`bi bi-bookmark${isBookmarked ? '-fill' : ''} me-1`} aria-hidden="true"></i>
                    {isBookmarked ? 'Saved' : 'Save'}
                  </Button>
                  <Button
                    variant="outline-info"
                    size="sm"
                    onClick={handleShare}
                    className="flex-grow-1"
                    aria-label="Share this errand"
                  >
                    <i className="bi bi-share me-1" aria-hidden="true"></i>
                    Share
                  </Button>
                  {currentUser.uid === errand.userId && errand.status === 'open' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex-grow-1"
                      aria-label="Delete this errand"
                    >
                      Delete
                    </Button>
                  )}
                </>
              ) : (
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  disabled
                  className="flex-grow-1"
                  aria-label="Login to like this errand"
                >
                  <i className="bi bi-heart me-1" aria-hidden="true"></i>
                  Like
                </Button>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      <Modal show={showLikersModal} onHide={() => setShowLikersModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Users who liked this errand</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {likersLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-2">Loading likers...</p>
            </div>
          ) : likers.length > 0 ? (
            <ListGroup variant="flush">
              {likers.map(liker => (
                <ListGroup.Item key={liker.uid} action as={Link} to={`/profile/${liker.uid}`}>
                  <div className="d-flex align-items-center">
                    <img
                      src={liker.avatarUrl || 'https://via.placeholder.com/40?text=Avatar'}
                      alt={`${liker.username}'s avatar`}
                      className="rounded-circle me-3"
                      width="40"
                      height="40"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/40?text=Avatar';
                      }}
                    />
                    <div>
                      <strong>@{liker.username}</strong>
                      <div className="text-muted small">
                        {liker.ratings?.toFixed(1) || '0'} ⭐ ({liker.reviewCount || 0} reviews)
                      </div>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <p className="text-center text-muted py-4">No users have liked this errand yet</p>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this errand?</p>
          <p className="small text-muted">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowDeleteConfirm(false)}
            disabled={deleting}
            aria-label="Cancel deletion"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Confirm deletion"
          >
            {deleting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" role="status" />
                Deleting...
              </>
            ) : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer position="top-end" className="p-3">
        <Toast
          show={toast.show}
          onClose={() => setToast({ ...toast, show: false })}
          bg={toast.variant}
          delay={3000}
          autohide
        >
          <Toast.Header>
            <strong className="me-auto">Notification</strong>
          </Toast.Header>
          <Toast.Body className={toast.variant === 'danger' ? 'text-white' : ''}>
            {toast.message}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default ErrandCard;
