// src/pages/PostErrand.tsx
import React, { useState, useEffect, type FormEvent, useRef } from "react";
import { collection, addDoc, serverTimestamp, type FieldValue } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import type { Errand } from "../types";

// Fix: explicitly type createdAt as FieldValue
type ErrandWriteData = Omit<Errand, 'id' | 'createdAt'> & { createdAt: FieldValue };

const PostErrand: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState("");
  const [fee, setFee] = useState("");

  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'denied'>('idle');
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const geoAutoFilledRef = useRef(false);
  const geoAttemptInProgress = useRef(false);

  const getGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoMessage("Geolocation is not supported by your browser.");
      geoAttemptInProgress.current = false;
      return;
    }

    if (geoAttemptInProgress.current) return;

    geoAttemptInProgress.current = true;
    setGeoStatus('loading');
    setGeoMessage("Attempting to get your current location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeo({ lat: position.coords.latitude, lng: position.coords.longitude });
        setGeoStatus('success');
        setGeoMessage("Location automatically detected.");
        setLocation("Your current location (auto-detected)");
        geoAutoFilledRef.current = true;
        geoAttemptInProgress.current = false;
      },
      (error) => {
        console.error("Error getting geolocation:", error);
        setGeo(null);
        geoAutoFilledRef.current = false;
        geoAttemptInProgress.current = false;

        if (error.code === error.PERMISSION_DENIED) {
          setGeoStatus('denied');
          setGeoMessage("Geolocation permission denied. Please enter location manually.");
        } else {
          setGeoStatus('error');
          setGeoMessage("Could not retrieve your location automatically.");
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  useEffect(() => {
    getGeolocation();
  }, []);

  const validateForm = () => {
    if (!description.trim()) return "Description is required.";
    if (!location.trim()) return "Location is required.";
    if (!duration.trim()) return "Duration is required.";
    const feeNumber = parseFloat(fee);
    if (isNaN(feeNumber) || feeNumber <= 0) return "Fee must be a positive number.";
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setSubmitError(validationError);
      setSubmitSuccess(false);
      return;
    }

    if (!currentUser) {
      setSubmitError("You must be logged in to post an errand.");
      setSubmitSuccess(false);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const errandData: ErrandWriteData = {
        uid: currentUser.uid,
        description: description.trim(),
        location: location.trim(),
        duration: duration.trim(),
        fee: parseFloat(fee),
        status: "open",
        geo: geo,
        createdAt: serverTimestamp(),
        viewCount: 0,
        clickCount: 0,
        likesCount: 0,
      };

      await addDoc(collection(db, "errands"), errandData);
      setSubmitSuccess(true);

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);

      setDescription("");
      setLocation("");
      setDuration("");
      setFee("");
      setGeo(null);
      geoAutoFilledRef.current = false;
      setGeoStatus('idle');
      setGeoMessage(null);
    } catch (err: any) {
      console.error("Error posting errand:", err);
      setSubmitError("Failed to post errand: " + (err.message || "An unexpected error occurred."));
      setSubmitSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container my-5 post-errand-container">
        <div className="alert alert-info text-center d-flex align-items-center justify-content-center">
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          Loading user session...
        </div>
      </div>
    );
  }

  return (
    <div className="container my-5 post-errand-container">
      <h3 className="mb-4 text-center">Post a New Errand</h3>

      {submitSuccess && (
        <div className="alert alert-success text-center" role="alert">
          Errand posted successfully! Redirecting you now...
        </div>
      )}
      {submitError && <div className="alert alert-danger text-center" role="alert">{submitError}</div>}

      <div className="card shadow-sm p-4 p-md-5">
        <form onSubmit={handleSubmit}>
          {/* Description */}
          <div className="mb-3">
            <label htmlFor="description" className="form-label">Description of Errand</label>
            <textarea
              className="form-control"
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              disabled={submitting}
              aria-describedby="descriptionHelp"
            ></textarea>
            <div id="descriptionHelp" className="form-text">
              Be clear and concise about the task needed.
            </div>
          </div>

          {/* Location */}
          <div className="mb-3">
            <label htmlFor="location" className="form-label">Location for Errand</label>
            <input
              type="text"
              className="form-control"
              id="location"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                geoAutoFilledRef.current = false;
              }}
              required
              disabled={submitting}
              aria-describedby="locationHelp"
            />
            <div id="locationHelp" className="form-text">Physical location relevant to the errand.</div>
            <div className="mt-2">
              {geoStatus === 'loading' && (
                <small className="text-muted d-flex align-items-center">
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {geoMessage}
                </small>
              )}
              {geoStatus === 'success' && <small className="text-success">{geoMessage}</small>}
              {geoStatus === 'error' && <small className="text-danger">{geoMessage}</small>}
              {geoStatus === 'denied' && <small className="text-warning">{geoMessage}</small>}
              {['error', 'denied', 'idle'].includes(geoStatus) && !geoAutoFilledRef.current && location.trim() === '' && !geoAttemptInProgress.current && (
                <small className="text-info d-block mt-1">Please manually enter the location details above.</small>
              )}
              {['error', 'denied', 'idle'].includes(geoStatus) && !geoAttemptInProgress.current && navigator.geolocation && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm mt-2"
                  onClick={getGeolocation}
                  disabled={geoAttemptInProgress.current || submitting}
                >
                  {geoStatus === 'loading' && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>}
                  Retry Geolocation
                </button>
              )}
            </div>
          </div>

          {/* Duration and Fee */}
          <div className="row mb-3 g-3">
            <div className="col-md-6">
              <label htmlFor="duration" className="form-label">Estimated Duration</label>
              <input
                type="text"
                className="form-control"
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
                disabled={submitting}
                aria-describedby="durationHelp"
              />
              <div id="durationHelp" className="form-text">How quickly does this need to be done?</div>
            </div>
            <div className="col-md-6">
              <label htmlFor="fee" className="form-label">Offered Fee (₦)</label>
              <input
                type="number"
                className="form-control"
                id="fee"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                required
                min="1"
                step="any"
                disabled={submitting}
                aria-describedby="feeHelp"
              />
              <div id="feeHelp" className="form-text">The amount you are willing to pay the runner.</div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary w-100 mt-3 d-flex align-items-center justify-content-center"
            disabled={submitting}
          >
            {submitting && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>}
            {submitting ? 'Posting Errand...' : 'Post Errand'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PostErrand;
