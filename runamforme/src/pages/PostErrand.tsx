// src/pages/PostErrand.tsx
import React, { useState, useEffect, type FormEvent, useRef, type ChangeEvent } from "react";
import { collection, addDoc, serverTimestamp, type FieldValue } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import type { Errand } from "../types";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/config";

type ErrandWriteData = Omit<Errand, 'id' | 'createdAt'> & { createdAt: FieldValue };

const PostErrand: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState("");
  const [fee, setFee] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
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
        console.error("Geolocation error:", error);
        setGeo(null);
        geoAutoFilledRef.current = false;
        geoAttemptInProgress.current = false;
        if (error.code === error.PERMISSION_DENIED) {
          setGeoStatus('denied');
          setGeoMessage("Geolocation permission denied. Enter location manually.");
        } else {
          setGeoStatus('error');
          setGeoMessage("Could not get location.");
        }
      },
      { timeout: 10000 }
    );
  };

  useEffect(() => {
    getGeolocation();
  }, []);

  const validateForm = () => {
    if (!description.trim()) return "Description is required.";
    if (!location.trim()) return "Location is required.";
    if (!duration.trim()) return "Duration is required.";
    if (isNaN(parseFloat(fee)) || parseFloat(fee) <= 0) return "Fee must be a positive number.";
    if (mediaFiles.length > 4) return "You can upload up to 4 files only.";
    return null;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (files.length > 4) {
      setSubmitError("You can upload up to 4 files.");
      return;
    }
    setMediaFiles(files);
    setSubmitError(null);
  };

  const uploadFiles = async () => {
    const urls: string[] = [];
    for (const file of mediaFiles) {
      const fileRef = ref(storage, `errands/${Date.now()}-${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      urls.push(url);
    }
    return urls;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const error = validateForm();
    if (error) {
      setSubmitError(error);
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
      const mediaUrls = await uploadFiles();

      const errandData: ErrandWriteData = {
        uid: currentUser.uid,
        title: 'Post Errand',
        description: description.trim(),
        location: location.trim(),
        duration: duration.trim(),
        fee: parseFloat(fee),
        status: "open",
        geo,
        createdAt: serverTimestamp(),
        viewCount: 0,
        clickCount: 0,
        likes: 0,
        mediaUrls,
      };

      await addDoc(collection(db, "errands"), errandData);
      setSubmitSuccess(true);

      setTimeout(() => navigate("/dashboard"), 2000);

      // reset form
      setDescription("");
      setLocation("");
      setDuration("");
      setFee("");
      setMediaFiles([]);
      setGeo(null);
      geoAutoFilledRef.current = false;
      setGeoStatus('idle');
      setGeoMessage(null);
    } catch (err: any) {
      console.error("Error posting errand:", err);
      setSubmitError("Failed to post errand: " + (err.message || "Unexpected error."));
      setSubmitSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container my-5">
        <div className="alert alert-info text-center">
          <span className="spinner-border spinner-border-sm me-2"></span>
          Loading user session...
        </div>
      </div>
    );
  }

  return (
    <div className="container my-5">
      <h3 className="text-center mb-4">Post a New Errand</h3>

      {submitSuccess && (
        <div className="alert alert-success text-center">Errand posted! Redirecting...</div>
      )}
      {submitError && <div className="alert alert-danger text-center">{submitError}</div>}

      <div className="card shadow-sm p-4 p-md-5">
        <form onSubmit={handleSubmit}>
          {/* Description */}
          <div className="mb-3">
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              className="form-control"
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          {/* Location */}
          <div className="mb-3">
            <label htmlFor="location" className="form-label">Location</label>
            <input
              type="text"
              className="form-control"
              id="location"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                geoAutoFilledRef.current = false;
              }}
              disabled={submitting}
              required
            />
            {geoMessage && <small className="d-block mt-1 text-muted">{geoMessage}</small>}
            {geoStatus !== "loading" && navigator.geolocation && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm mt-2"
                onClick={getGeolocation}
                disabled={submitting}
              >
                Retry Geolocation
              </button>
            )}
          </div>

          {/* Duration and Fee */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label htmlFor="duration" className="form-label">Duration</label>
              <input
                type="text"
                className="form-control"
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="fee" className="form-label">Fee (₦)</label>
              <input
                type="number"
                className="form-control"
                id="fee"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                disabled={submitting}
                required
                min="1"
              />
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-3">
            <label htmlFor="mediaFiles" className="form-label">Upload up to 4 Images or Videos</label>
            <input
              type="file"
              className="form-control"
              id="mediaFiles"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
              disabled={submitting}
            />
            <small className="form-text text-muted">Max 4 files, images or videos.</small>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary w-100 mt-3"
            disabled={submitting}
          >
            {submitting && <span className="spinner-border spinner-border-sm me-2"></span>}
            {submitting ? "Posting..." : "Post Errand"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PostErrand;
