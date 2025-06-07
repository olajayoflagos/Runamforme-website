import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import type { Errand, UserProfile } from '../types';
import MessageModal from '../components/MessageModal';
import PayErrandModal from '../components/PayErrand';
import PromptConsentModal from '../components/PromptConsentModal';
import EditErrandModal from '../components/EditErrandModal';

const ErrandDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [errand, setErrand] = useState<Errand | null>(null);
  const [poster, setPoster] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showAcceptPrompt, setShowAcceptPrompt] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCompletePrompt, setShowCompletePrompt] = useState(false);
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const fetchErrandAndUser = useCallback(async () => {
    if (!id) {
      setError('No errand ID specified.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [errandSnap, userSnap] = await Promise.all([
        getDoc(doc(db, 'errands', id)),
        currentUser ? getDocs(query(
          collection(db, 'reviews'),
          where('errandId', '==', id),
          where('reviewerId', '==', currentUser.uid)
        )) : Promise.resolve(null)
      ]);
      if (!errandSnap.exists()) {
        setError('Errand not found.');
        setLoading(false);
        return;
      }
      const errandData = {
        id: errandSnap.id,
        ...errandSnap.data(),
        likes: errandSnap.data().likes ?? [],
        bookmarks: errandSnap.data().bookmarks ?? [],
        images: errandSnap.data().images ?? [],
        clickCount: errandSnap.data().clickCount ?? 0,
        isArchived: errandSnap.data().isArchived ?? false,
      } as Errand;
      setErrand(errandData);
      setIsLiked(currentUser ? errandData.likes.includes(currentUser.uid) : false);
      setIsBookmarked(currentUser ? errandData.bookmarks.includes(currentUser.uid) : false);
      setHasReviewed(userSnap ? !userSnap.empty : false);
      const clickUpdate = setTimeout(async () => {
        if (errandData.id) {
          await updateDoc(doc(db, 'errands', errandData.id), { 
            clickCount: increment(1),
            updatedAt: serverTimestamp() 
          });
        }
      }, 2000);
      const posterRef = doc(db, 'users', errandData.userId);
      const posterSnap = await getDoc(posterRef);
      if (posterSnap.exists()) {
        const posterData = {
          id: posterSnap.id,
          ...posterSnap.data(),
          followers: posterSnap.data().followers ?? [],
          following: posterSnap.data().following ?? [],
          hasBluetick: posterSnap.data().hasBluetick ?? false,
        } as UserProfile;
        setPoster(posterData);
        setIsFollowing(currentUser ? posterData.followers.includes(currentUser.uid) : false);
      }
      return () => clearTimeout(clickUpdate);
    } catch (err) {
      console.error('Error fetching errand:', err);
      setError('Unable to load errand details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id, currentUser]);

  const validateErrandLimit = useCallback(async () => {
    if (!currentUser?.uid) return 'You must be signed in.';
    try {
      const [runnerSnapshot, requesterSnapshot] = await Promise.all([
        getDocs(query(
          collection(db, 'errands'), 
          where('runnerUid', '==', currentUser.uid), 
          where('status', 'in', ['open', 'pending'])
        )),
        getDocs(query(
          collection(db, 'errands'), 
          where('userId', '==', currentUser.uid), 
          where('status', 'in', ['open', 'pending'])
        )),
      ]);
      if (runnerSnapshot.size >= 2) return 'You can only have 2 active errands as a runner.';
      if (requesterSnapshot.size >= 2) return 'You can only have 2 active errands as a requester.';
      return null;
    } catch (err) {
      console.error('Validation error:', err);
      return 'Unable to validate errand limits.';
    }
  }, [currentUser]);

  const getConversationId = useCallback(async (userId: string, recipientId: string) => {
    try {
      const convQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId)
      );
      const snapshot = await getDocs(convQuery);
      const existingConv = snapshot.docs.find(doc => 
        doc.data().participants.includes(recipientId)
      );
      if (existingConv) return existingConv.id;
      const newConvRef = await addDoc(collection(db, 'conversations'), {
        participants: [userId, recipientId].sort(),
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageTimestamp: null,
        readStatus: { [userId]: true, [recipientId]: false },
        errandId: id,
      });
      return newConvRef.id;
    } catch (err) {
      console.error('Conversation error:', err);
      throw new Error('Failed to start conversation');
    }
  }, [id]);

  const handleAcceptErrand = useCallback(async () => {
    if (!currentUser || !errand || !errand.id || accepting) return;
    setAccepting(true);
    try {
      const limitError = await validateErrandLimit();
      if (limitError) {
        setError(limitError);
        setShowAcceptPrompt(false);
        return;
      }
      const batchUpdates = [
        updateDoc(doc(db, 'errands', errand.id), {
          status: 'pending',
          runnerUid: currentUser.uid,
          updatedAt: serverTimestamp(),
        }),
        addDoc(collection(db, 'notifications'), {
          userId: errand.userId,
          type: 'errand',
          relatedId: errand.id,
          message: `@${currentUser.displayName || 'A runner'} accepted your errand.`,
          read: false,
          createdAt: serverTimestamp(),
        })
      ];
      await Promise.all(batchUpdates);
      const conversationId = await getConversationId(currentUser.uid, errand.userId);
      setShowAcceptPrompt(false);
      navigate(`/messages/${conversationId}`, { state: { fromErrand: true } });
    } catch (err) {
      console.error('Accept error:', err);
      setError('Failed to accept errand. Please try again.');
    } finally {
      setAccepting(false);
    }
  }, [currentUser, errand, accepting, navigate, getConversationId, validateErrandLimit]);

  const handleDeleteErrand = useCallback(async () => {
    if (!currentUser || !errand || currentUser.uid !== errand.userId || errand.status !== 'open' || !errand.id) return;
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, 'errands', errand.id));
      navigate('/errands');
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete errand.');
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
    }
  }, [currentUser, errand, navigate]);

  const handleLikeToggle = useCallback(async () => {
    if (!currentUser || !errand || !errand.id || actionLoading) return;
    setActionLoading(true);
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    try {
      const errandRef = doc(db, 'errands', errand.id);
      await updateDoc(errandRef, { 
        likes: newLikedState ? arrayUnion(currentUser.uid) : arrayRemove(currentUser.uid),
        updatedAt: serverTimestamp() 
      });
      if (newLikedState && poster) {
        await addDoc(collection(db, 'notifications'), {
          userId: poster.uid,
          type: 'like',
          relatedId: errand.id,
          message: `@${currentUser.displayName || 'Someone'} liked your errand.`,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('Like error:', err);
      setIsLiked(!newLikedState);
      setError('Failed to update like status.');
    } finally {
      setActionLoading(false);
    }
  }, [currentUser, errand, isLiked, actionLoading, poster]);

  const handleBookmarkToggle = useCallback(async () => {
    if (!currentUser || !errand || !errand.id || actionLoading) return;
    setActionLoading(true);
    const newBookmarkedState = !isBookmarked;
    setIsBookmarked(newBookmarkedState);
    try {
      await updateDoc(doc(db, 'errands', errand.id), {
        bookmarks: newBookmarkedState ? arrayUnion(currentUser.uid) : arrayRemove(currentUser.uid),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Bookmark error:', err);
      setIsBookmarked(!newBookmarkedState);
      setError('Failed to update bookmark.');
    } finally {
      setActionLoading(false);
    }
  }, [currentUser, errand, isBookmarked, actionLoading]);

  const handleFollowToggle = useCallback(async () => {
    if (!currentUser || !poster || currentUser.uid === poster.uid || actionLoading) return;
    setActionLoading(true);
    const newFollowState = !isFollowing;
    setIsFollowing(newFollowState);
    try {
      const batchUpdates = [
        updateDoc(doc(db, 'users', currentUser.uid), {
          following: newFollowState ? arrayUnion(poster.uid) : arrayRemove(poster.uid),
          followingCount: increment(newFollowState ? 1 : -1),
        }),
        updateDoc(doc(db, 'users', poster.uid), {
          followers: newFollowState ? arrayUnion(currentUser.uid) : arrayRemove(poster.uid),
          followersCount: increment(newFollowState ? 1 : -1),
        })
      ];
      await Promise.all(batchUpdates);
      if (newFollowState) {
        await addDoc(collection(db, 'notifications'), {
          userId: poster.uid,
          type: 'follow',
          relatedId: currentUser.uid,
          message: `@${currentUser.displayName || 'Someone'} followed you.`,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('Follow error:', err);
      setIsFollowing(!newFollowState);
      setError('Failed to update follow status.');
    } finally {
      setActionLoading(false);
    }
  }, [currentUser, poster, isFollowing, actionLoading]);

  const canReview = useMemo(() => (
    currentUser &&
    errand &&
    errand.status === 'completed' &&
    currentUser.uid === errand.userId &&
    errand.runnerUid &&
    !hasReviewed
  ), [currentUser, errand, hasReviewed]);

  const canAccept = useMemo(() => (
    currentUser &&
    errand &&
    errand.status === 'open' &&
    currentUser.uid !== errand.userId
  ), [currentUser, errand]);

  const canCancel = useMemo(() => (
    currentUser &&
    errand &&
    ((errand.status === 'open' && errand.userId === currentUser.uid) ||
     (errand.status === 'pending' && 
      (errand.userId === currentUser.uid || errand.runnerUid === currentUser.uid)))
  ), [currentUser, errand]);

  const canComplete = useMemo(() => (
    currentUser &&
    errand &&
    errand.status === 'pending' &&
    (errand.userId === currentUser.uid || errand.runnerUid === currentUser.uid)
  ), [currentUser, errand]);

  const canPay = useMemo(() => (
    currentUser &&
    errand &&
    errand.status === 'pending' &&
    errand.paymentStatus !== 'escrow' &&
    (errand.userId === currentUser.uid || errand.runnerUid === currentUser.uid)
  ), [currentUser, errand]);

  const canEdit = useMemo(() => (
    currentUser &&
    errand &&
    errand.status === 'open' &&
    errand.userId === currentUser.uid
  ), [currentUser, errand]);

  useEffect(() => {
    fetchErrandAndUser();
  }, [fetchErrandAndUser]);

  if (loading) {
    return (
      <div className="container my-5 text-center" aria-live="polite">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading errand details...</span>
        </div>
        <p className="mt-2">Loading errand details...</p>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="container my-5 text-center" aria-live="polite">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading page...</span>
        </div>
      </div>
    }>
      <main className="container my-4 my-md-5">
        {error && (
          <div 
            className="alert alert-danger mb-4" 
            role="alert"
            aria-live="assertive"
          >
            {error}
            <button 
              type="button" 
              className="btn-close float-end" 
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            />
          </div>
        )}

        {errand && (
          <article className="card shadow-sm">
            <div className="card-body">
              <header className="mb-4">
                <h1 className="h2 card-title mb-3">{errand.title}</h1>
                <span className={`badge ${
                  errand.status === 'open' ? 'bg-primary' :
                  errand.status === 'pending' ? 'bg-warning text-dark' :
                  errand.status === 'completed' ? 'bg-success' : 'bg-danger'
                } mb-3`}>
                  {errand.status.toUpperCase()}
                </span>
                <span className={`badge ${errand.isPrivate ? 'bg-secondary' : 'bg-info'} ms-2`}>
                  {errand.isPrivate ? 'Private' : 'Public'}
                </span>
                {errand.paymentStatus !== 'pending' && (
                  <span className={`badge ${
                    errand.paymentStatus === 'escrow' ? 'bg-info' : 'bg-success'
                  } ms-2`}>
                    Payment: {errand.paymentStatus}
                  </span>
                )}
              </header>

              {errand.images?.length > 0 && (
                <section className="mb-4" aria-label="Errand images">
                  <div className="row g-2">
                    {errand.images.slice(0, 4).map((url, idx) => (
                      <div key={idx} className="col-6 col-md-3">
                        <img
                          src={url}
                          alt={`Errand image ${idx + 1}`}
                          className="img-fluid rounded object-fit-cover"
                          style={{ height: '150px', width: '100%' }}
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/300x150?text=Image+Not+Available';
                            e.currentTarget.alt = 'Image not available';
                          }}
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="mb-4">
                <h2 className="h5 visually-hidden">Errand details</h2>
                <dl className="row">
                  <div className="col-md-6">
                    <dt className="text-muted">Description</dt>
                    <dd className="mb-3">{errand.description || 'Not specified'}</dd>

                    <dt className="text-muted">Location</dt>
                    <dd className="mb-3">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(errand.location || 'Not specified')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-decoration-none"
                        aria-label={`View ${errand.location || 'location'} on Google Maps`}
                      >
                        {errand.location || 'Not specified'}
                      </a>
                    </dd>
                  </div>

                  <div className="col-md-6">
                    <dt className="text-muted">Duration</dt>
                    <dd className="mb-3">{errand.duration || 'Not specified'}</dd>

                    <dt className="text-muted">Fee</dt>
                    <dd className="mb-3">
                      {errand.currency} {errand.fee.toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </section>

              {poster && (
                <section className="mb-4">
                  <h2 className="h5 visually-hidden">Poster information</h2>
                  <div className="d-flex align-items-center mb-3">
                    <img
                      src={poster.avatarUrl || 'https://via.placeholder.com/50'}
                      alt={`${poster.name}'s avatar`}
                      className="rounded-circle me-3"
                      width="50"
                      height="50"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/50';
                      }}
                    />
                    <div>
                      <Link 
                        to={`/profile/${poster.uid}`} 
                        className="text-decoration-none fw-bold"
                      >
                        @{poster.username}
                      </Link>
                      {poster.ratings !== undefined && (
                        <div className="small text-muted">
                          Rating: {poster.ratings?.toFixed(1) || 'No'} ({poster.reviewCount || 0} reviews)
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              <section className="border-top pt-3">
                <h2 className="h5 visually-hidden">Actions</h2>
                <div className="d-flex flex-wrap gap-2">
                  {currentUser && (
                    <>
                      <button
                        className={`btn btn-sm ${isLiked ? 'btn-success' : 'btn-outline-primary'}`}
                        onClick={handleLikeToggle}
                        disabled={actionLoading}
                        aria-label={isLiked ? 'Unlike this errand' : 'Like this errand'}
                      >
                        {isLiked ? 'Liked' : 'Like'} ({errand.likes.length})
                      </button>

                      <button
                        className={`btn btn-sm ${isBookmarked ? 'btn-warning' : 'btn-outline-primary'}`}
                        onClick={handleBookmarkToggle}
                        disabled={actionLoading}
                        aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this errand'}
                      >
                        {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                      </button>

                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setShowMessageModal(true)}
                        disabled={actionLoading || !poster || currentUser.uid === poster.uid}
                        aria-label="Contact poster"
                      >
                        Contact
                      </button>

                      {canAccept && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => setShowAcceptPrompt(true)}
                          disabled={accepting || actionLoading}
                          aria-label="Accept this errand"
                        >
                          {accepting ? 'Accepting...' : 'Accept'}
                        </button>
                      )}

                      {canCancel && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => setShowCancelConfirm(true)}
                          disabled={actionLoading}
                          aria-label="Cancel this errand"
                        >
                          Cancel
                        </button>
                      )}

                      {canComplete && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => setShowCompletePrompt(true)}
                          disabled={actionLoading}
                          aria-label="Complete this errand"
                        >
                          Complete
                        </button>
                      )}

                      {canPay && (
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => setShowPaymentPrompt(true)}
                          disabled={actionLoading}
                          aria-label="Proceed to payment"
                        >
                          Payment
                        </button>
                      )}

                      {canEdit && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => setShowEditModal(true)}
                          disabled={actionLoading}
                          aria-label="Edit this errand"
                        >
                          Edit
                        </button>
                      )}

                      {currentUser.uid === errand.userId && errand.status === 'open' && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => setShowDeleteConfirm(true)}
                          disabled={actionLoading}
                          aria-label="Delete this errand"
                        >
                          Delete
                        </button>
                      )}

                      {poster && currentUser.uid !== poster.uid && (
                        <button
                          className={`btn btn-sm ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={handleFollowToggle}
                          disabled={actionLoading}
                          aria-label={isFollowing ? `Unfollow ${poster.username}` : `Follow ${poster.username}`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      )}

                      {canReview && (
                        <Link
                          to={`/leave-review/${errand.id}/${errand.runnerUid}`}
                          className="btn btn-sm btn-success"
                          aria-label="Leave a review"
                        >
                          Leave Review
                        </Link>
                      )}
                    </>
                  )}

                  <Link 
                    to="/errands" 
                    className="btn btn-sm btn-outline-secondary"
                    aria-label="Back to errands list"
                  >
                    Back to List
                  </Link>
                </div>
              </section>
            </div>
          </article>
        )}

        {showMessageModal && poster && (
          <MessageModal
            recipientId={poster.uid}
            recipientUsername={poster.username}
            show={showMessageModal}
            onClose={() => setShowMessageModal(false)}
          />
        )}

        {showAcceptPrompt && (
          <div 
            className="modal show d-block" 
            tabIndex={-1} 
            role="dialog" 
            aria-modal="true"
            aria-labelledby="acceptErrandModalLabel"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="acceptErrandModalLabel">
                    Confirm Acceptance
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowAcceptPrompt(false)}
                    aria-label="Close"
                  />
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to accept this errand?</p>
                  <p className="small text-muted">
                    By accepting, you agree to complete this errand as described.
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowAcceptPrompt(false)}
                    disabled={accepting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAcceptErrand}
                    disabled={accepting}
                  >
                    {accepting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                        Accepting...
                      </>
                    ) : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showCancelConfirm && errand && (
          <PromptConsentModal
            errandId={errand.id}
            action="cancel"
            requesterId={errand.userId}
            runnerUid={errand.runnerUid || ''}
            onClose={() => setShowCancelConfirm(false)}
            onSuccess={fetchErrandAndUser}
            setError={setError}
          />
        )}

        {showCompletePrompt && errand && (
          <PromptConsentModal
            errandId={errand.id}
            action="complete"
            requesterId={errand.userId}
            runnerUid={errand.runnerUid || ''}
            onClose={() => setShowCompletePrompt(false)}
            onSuccess={fetchErrandAndUser}
            setError={setError}
          />
        )}

        {showPaymentPrompt && errand && (
          <PromptConsentModal
            errandId={errand.id}
            action="payment"
            requesterId={errand.userId}
            runnerUid={errand.runnerUid || ''}
            onClose={() => setShowPaymentPrompt(false)}
            onSuccess={() => {
              setShowPaymentPrompt(false);
              setShowPaymentModal(true);
            }}
            setError={setError}
          />
        )}

        {showEditModal && errand && (
          <EditErrandModal
            errand={errand}
            show={showEditModal}
            onClose={() => setShowEditModal(false)}
            onSuccess={fetchErrandAndUser}
          />
        )}

        {showDeleteConfirm && (
          <div 
            className="modal show d-block" 
            tabIndex={-1} 
            role="dialog"
            aria-modal="true"
            aria-labelledby="deleteErrandModalLabel"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="deleteErrandModalLabel">
                    Confirm Deletion
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowDeleteConfirm(false)}
                    aria-label="Close"
                  />
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete this errand?</p>
                  <p className="small text-muted">This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDeleteErrand}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                        Deleting...
                      </>
                    ) : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showPaymentModal && errand && (
          <PayErrandModal
            errand={errand}
            onSuccess={() => {
              setShowPaymentModal(false);
              fetchErrandAndUser();
            }}
            onClose={() => setShowPaymentModal(false)}
            onError={(errorMsg) => setError(errorMsg)}
          />
        )}
      </main>
    </Suspense>
  );
};

export default ErrandDetailsPage;