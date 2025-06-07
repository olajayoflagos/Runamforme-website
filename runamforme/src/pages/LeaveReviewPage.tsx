import React, { useState, useEffect, type FormEvent } from 'react';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import type { Review, Errand, UserProfile } from '../types';

const LeaveReviewPage: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { errandId = '', reviewedId = '' } = useParams<{ errandId: string; reviewedId: string }>();
  const [errand, setErrand] = useState<Errand | null>(null);
  const [reviewedUserProfile, setReviewedUserProfile] = useState<UserProfile | null>(null);
  const [errandLoading, setErrandLoading] = useState(true);
  const [reviewedUserLoading, setReviewedUserLoading] = useState(true);
  const [errandError, setErrandError] = useState<string | null>(null);
  const [reviewedUserError, setReviewedUserError] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ rating?: string; reviewText?: string }>({});

  useEffect(() => {
    const fetchErrand = async () => {
      if (!errandId) {
        setErrandError('No errand ID provided.');
        setErrandLoading(false);
        return;
      }

      setErrandLoading(true);
      try {
        const errandRef = doc(db, 'errands', errandId);
        const errandSnap = await getDoc(errandRef);
        if (errandSnap.exists()) {
          setErrand({ id: errandSnap.id, ...errandSnap.data() } as Errand);
        } else {
          setErrandError('Errand not found.');
        }
      } catch (error) {
        setErrandError('Failed to load errand details.');
      } finally {
        setErrandLoading(false);
      }
    };

    fetchErrand();
  }, [errandId]);

  useEffect(() => {
    const fetchReviewedUserProfile = async () => {
      if (!reviewedId) {
        setReviewedUserError('No user ID provided.');
        setReviewedUserLoading(false);
        return;
      }

      setReviewedUserLoading(true);
      try {
        const userRef = doc(db, 'users', reviewedId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setReviewedUserProfile({ id: userSnap.id, ...userSnap.data() } as UserProfile);
        } else {
          setReviewedUserError('Reviewed user not found.');
        }
      } catch (error) {
        setReviewedUserError('Failed to load reviewed user profile.');
      } finally {
        setReviewedUserLoading(false);
      }
    };

    fetchReviewedUserProfile();
  }, [reviewedId]);

  const validateForm = async () => {
    const errors: { rating?: string; reviewText?: string } = {};
    if (!rating || rating < 1 || rating > 5) {
      errors.rating = 'Please select a rating between 1 and 5.';
    }
    if (!reviewText.trim()) {
      errors.reviewText = 'Review text is required.';
    } else if (reviewText.length > 500) {
      errors.reviewText = 'Review cannot exceed 500 characters.';
    }

    const profanity = ['badword1', 'badword2']; // Replace with actual list or library
    if (profanity.some(word => reviewText.toLowerCase().includes(word))) {
      errors.reviewText = 'Review contains inappropriate language.';
    }

    if (currentUser && errandId) {
      const reviewQuery = query(
        collection(db, 'reviews'),
        where('errandId', '==', errandId),
        where('reviewerId', '==', currentUser.uid)
      );
      const reviewSnapshot = await getDocs(reviewQuery);
      if (!reviewSnapshot.empty) {
        errors.reviewText = 'You have already reviewed this errand.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    if (!currentUser || !errand || !reviewedId) {
      setSubmitError('Missing review context.');
      setSubmitting(false);
      return;
    }

    if (!(await validateForm())) {
      setSubmitting(false);
      return;
    }

    try {
      const reviewData: Omit<Review, 'id'> = {
        errandId: errand.id,
        reviewerId: currentUser.uid,
        reviewedId,
        rating,
        comment: reviewText.trim(),
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'reviews'), reviewData);

      const userRef = doc(db, 'users', reviewedId);
      const reviewsQuery = query(collection(db, 'reviews'), where('reviewedId', '==', reviewedId));
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const ratings = reviewsSnapshot.docs.map(doc => doc.data().rating).concat(rating);
      const totalRating = ratings.reduce((sum, r) => sum + r, 0);
      const reviewCount = ratings.length;
      const averageRating = totalRating / reviewCount;

      await updateDoc(userRef, {
        ratings: averageRating,
        reviewCount,
      });

      const senderUsername = currentUser.displayName || 'A user';
      await addDoc(collection(db, 'notifications'), {
        userId: reviewedId,
        type: 'review',
        relatedId: errand.id,
        message: `@${senderUsername} left you a ${rating}-star review for "${errand.title}".`,
        read: false,
        createdAt: serverTimestamp(),
      });

      setSubmitSuccess(true);
      setTimeout(() => navigate(`/profile/${reviewedId}`), 2000);
    } catch (error) {
      setSubmitError('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container my-5 review-container">
        <div className="alert alert-info text-center d-flex align-items-center justify-content-center">
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-label="Loading user session" />
          Loading user session...
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container my-5 review-container">
        <div className="alert alert-warning text-center">You must be logged in to leave a review.</div>
      </div>
    );
  }

  if (errandLoading || reviewedUserLoading) {
    return (
      <div className="container my-5 review-container">
        <div className="alert alert-info text-center d-flex align-items-center justify-content-center">
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-label={errandLoading ? 'Loading errand details' : 'Loading user profile'} />
          {errandLoading ? 'Loading errand details...' : 'Loading reviewed user profile...'}
        </div>
      </div>
    );
  }

  if (errandError || reviewedUserError) {
    return (
      <div className="container my-5 review-container">
        <div className="alert alert-danger text-center">{errandError || reviewedUserError}</div>
        <button className="btn btn-outline-primary mt-2" onClick={() => window.location.reload()} aria-label="Retry loading">
          Try Again
        </button>
      </div>
    );
  }

  if (
    !errand ||
    !reviewedId ||
    errand.userId !== currentUser.uid ||
    errand.runnerUid !== reviewedId ||
    errand.status !== 'completed'
  ) {
    return (
      <div className="container my-5 review-container">
        <div className="alert alert-warning text-center">
          Cannot leave a review for this errand/user combination. Ensure the errand is completed and you are the requester.
        </div>
      </div>
    );
  }

  return (
    <div className="container my-5 review-container" role="region" aria-label="Leave review">
      <h3 className="mb-4 text-center">Leave Feedback for @{reviewedUserProfile?.username || 'Runner'}</h3>

      <div className="card shadow-sm p-3 mb-4 bg-light">
        <h5 className="card-title text-primary mb-2">{errand.title || 'Untitled Errand'}</h5>
        <p className="card-text text-muted mb-0">📍 Location: {errand.location || 'Not specified'}</p>
      </div>

      {submitSuccess && (
        <div className="alert alert-success text-center" aria-live="polite">
          Review submitted successfully! Redirecting to user profile...
        </div>
      )}
      {submitError && <div className="alert alert-danger text-center" aria-live="assertive">{submitError}</div>}

      <div className="card shadow-sm p-4">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="rating" className="form-label">Rating (1-5)</label>
            <input
              type="number"
              className={`form-control ${validationErrors.rating ? 'is-invalid' : ''}`}
              id="rating"
              value={rating === 0 ? '' : rating}
              onChange={(e) => setRating(Math.min(5, Math.max(1, parseInt(e.target.value) || 0)))}
              required
              min="1"
              max="5"
              step="1"
              disabled={submitting}
              aria-label="Rating from 1 to 5"
              aria-describedby="ratingHelp"
            />
            {validationErrors.rating && <div className="invalid-feedback">{validationErrors.rating}</div>}
            <div id="ratingHelp" className="form-text">Rate the runner (1 = poor, 5 = excellent).</div>
          </div>

          <div className="mb-3">
            <label htmlFor="reviewText" className="form-label">Review Comments</label>
            <textarea
              className={`form-control ${validationErrors.reviewText ? 'is-invalid' : ''}`}
              id="reviewText"
              rows={4}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value.slice(0, 500))}
              required
              disabled={submitting}
              aria-label="Review comments"
              aria-describedby="reviewTextHelp"
            />
            {validationErrors.reviewText && <div className="invalid-feedback">{validationErrors.reviewText}</div>}
            <div id="reviewTextHelp" className="form-text">
              Share your experience (max 500 characters). <span aria-live="polite">{reviewText.length}/500</span>
            </div>
          </div>

          <div className="d-flex gap-2">
            <button
              type="submit"
              className="btn btn-primary flex-grow-1 d-flex align-items-center justify-content-center"
              disabled={submitting}
              aria-label={submitting ? 'Submitting review' : 'Submit review'}
            >
              {submitting && (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              )}
              {submitting ? 'Submitting Review...' : 'Submit Review'}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate(`/profile/${reviewedId}`)}
              disabled={submitting}
              aria-label="Cancel review"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveReviewPage;