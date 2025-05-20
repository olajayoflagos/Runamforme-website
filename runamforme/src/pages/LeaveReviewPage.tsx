// src/pages/LeaveReviewPage.tsx
import React, { useState, useEffect, type FormEvent } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import type { ReviewWriteData, Errand, UserProfile } from "../types";

const LeaveReviewPage: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { errandId = "", reviewedUserUid = "" } = useParams();

  const [errand, setErrand] = useState<Errand | null>(null);
  const [reviewedUserProfile, setReviewedUserProfile] = useState<UserProfile | null>(null);
  const [errandLoading, setErrandLoading] = useState(true);
  const [reviewedUserLoading, setReviewedUserLoading] = useState(true);
  const [errandError, setErrandError] = useState<string | null>(null);
  const [reviewedUserError, setReviewedUserError] = useState<string | null>(null);

  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchErrand = async () => {
      setErrandLoading(true);
      try {
        const errandRef = doc(db, "errands", errandId);
        const errandSnap = await getDoc(errandRef);
        if (errandSnap.exists()) {
          setErrand({ ...(errandSnap.data() as Errand), id: errandSnap.id });
        } else {
          setErrandError("Errand not found.");
        }
      } catch (error) {
        console.error("Error fetching errand:", error);
        setErrandError("Failed to load errand details.");
      } finally {
        setErrandLoading(false);
      }
    };

    if (errandId) fetchErrand();
  }, [errandId]);

  useEffect(() => {
    const fetchReviewedUserProfile = async () => {
      setReviewedUserLoading(true);
      try {
        const userRef = doc(db, "users", reviewedUserUid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setReviewedUserProfile(userSnap.data() as UserProfile);
        } else {
          setReviewedUserError("Reviewed user not found.");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setReviewedUserError("Failed to load reviewed user profile.");
      } finally {
        setReviewedUserLoading(false);
      }
    };

    if (reviewedUserUid) fetchReviewedUserProfile();
  }, [reviewedUserUid]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    if (!currentUser || !errand || !reviewedUserUid) {
      setSubmitError("Missing review context.");
      setSubmitting(false);
      return;
    }

    try {
      const reviewData: ReviewWriteData = {
        errandId: errand.id,
        reviewerUid: currentUser.uid,
        reviewedUserUid: reviewedUserUid,
        rating,
        text: reviewText.trim(),
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "reviews"), reviewData);
      setSubmitSuccess(true);

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Error submitting review:", error);
      setSubmitError("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render logic ---

  if (authLoading) {
    return (
      <div className="container my-5 review-container">
        <div className="alert alert-info text-center d-flex align-items-center justify-content-center">
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
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
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          {errandLoading ? "Loading errand details..." : "Loading reviewed user profile..."}
        </div>
      </div>
    );
  }

  if (errandError || reviewedUserError) {
    return (
      <div className="container my-5 review-container">
        <div className="alert alert-danger text-center" role="alert">
          {errandError || reviewedUserError}
        </div>
      </div>
    );
  }

  if (
    !errand ||
    !reviewedUserUid ||
    errand.uid !== currentUser.uid ||
    errand.runnerUid !== reviewedUserUid ||
    errand.status !== "completed"
  ) {
    console.warn("Invalid review attempt", {
      currentUserUid: currentUser.uid,
      errandId,
      reviewedUserUid,
      errand,
    });

    return (
      <div className="container my-5 review-container">
        <div className="alert alert-warning text-center">
          Cannot leave a review for this errand/user combination. Please ensure the errand is completed and you are the requester.
        </div>
      </div>
    );
  }

  return (
    <div className="container my-5 review-container">
      <h3 className="mb-4 text-center">
        Leave Feedback for @{reviewedUserProfile?.username || "Runner"}
      </h3>

      <div className="card shadow-sm p-3 mb-4 bg-light">
        <h5 className="card-title text-primary mb-2">
          About the Errand: {errand.description}
        </h5>
        <p className="card-text text-muted mb-0">📍 Location: {errand.location}</p>
      </div>

      {submitSuccess && (
        <div className="alert alert-success text-center" role="alert">
          Review submitted successfully! Redirecting you now...
        </div>
      )}
      {submitError && (
        <div className="alert alert-danger text-center" role="alert">
          {submitError}
        </div>
      )}

      <div className="card shadow-sm p-4 p-md-5">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="rating" className="form-label">Rating (1-5)</label>
            <input
              type="number"
              className="form-control"
              id="rating"
              value={rating === 0 ? "" : rating}
              onChange={(e) => setRating(parseInt(e.target.value) || 0)}
              required
              min="1"
              max="5"
              step="1"
              disabled={submitting}
              aria-describedby="ratingHelp"
            />
            <div id="ratingHelp" className="form-text">
              Please provide a rating for the runner (1 being poor, 5 being excellent).
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="reviewText" className="form-label">Review Comments</label>
            <textarea
              className="form-control"
              id="reviewText"
              rows={4}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              required
              disabled={submitting}
              aria-describedby="reviewTextHelp"
            />
            <div id="reviewTextHelp" className="form-text">
              Share your experience (e.g., punctuality, communication, task completion).
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 mt-3 d-flex align-items-center justify-content-center"
            disabled={submitting}
          >
            {submitting && (
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            )}
            {submitting ? "Submitting Review..." : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LeaveReviewPage;
