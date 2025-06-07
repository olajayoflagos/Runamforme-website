import React, { useState, useEffect, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { db } from '../firebase/config';
import { updateErrand, deleteErrand, createNotification } from '../firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import type { Errand } from '../types';
import axios from 'axios';
import { 
  doc, 
  getDoc, 
  query, 
  collection, 
  where, 
  getDocs, 
  serverTimestamp, 
  addDoc 
} from 'firebase/firestore';

type GeoLocation = { lat: number; lng: number } | null;


type GeoStatus = 'idle' | 'loading' | 'success' | 'error' | 'denied';

const PostErrand: React.FC = () => {
  // Authentication and Routing
  const { currentUser, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { errandId } = useParams<{ errandId?: string }>();
  const navigate = useNavigate();

  // Form State
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [fee, setFee] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [currency, setCurrency] = useState<string>('NGN');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [isNegotiable, setIsNegotiable] = useState<boolean>(false);

  // Media Handling
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Geolocation
  const [geo, setGeo] = useState<GeoLocation>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const geoAutoFilledRef = useRef<boolean>(false);
  const geoAttemptInProgress = useRef<boolean>(false);

  // Submission State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Fetch errand data if in edit mode
  useEffect(() => {
    if (!errandId) return;

    const fetchErrand = async () => {
      try {
        const docRef = doc(db, 'errands', errandId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          setSubmitError('Errand not found.');
          return;
        }

        const data = docSnap.data() as Errand;
        if (data.userId !== currentUser?.uid) {
          setSubmitError('You do not have permission to edit this errand.');
          return;
        }

        setIsEditing(true);
        setTitle(data.title);
        setDescription(data.description);
        setLocation(data.location);
        setDuration(data.duration);
        setFee(data.fee.toString());
        setCategory(data.category);
        setCurrency(data.currency);
        setIsPrivate(data.isPrivate);
        setIsNegotiable(data.isNegotiable || false);
        setGeo(data.geo);
        setMediaPreviews(data.images || []);
      } catch (error) {
        setSubmitError('Failed to load errand data.');
        console.error('Error fetching errand:', error);
      }
    };

    if (currentUser && !currentUser.isAnonymous) {
      fetchErrand();
    }
  }, [errandId, currentUser]);

  const getGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoMessage('Geolocation is not supported by your browser.');
      return;
    }

    if (geoAttemptInProgress.current) return;

    geoAttemptInProgress.current = true;
    setGeoStatus('loading');
    setGeoMessage('Attempting to get your current location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeo({ 
          lat: position.coords.latitude, 
          lng: position.coords.longitude 
        });
        setGeoStatus('success');
        setGeoMessage('Location automatically detected.');
        setLocation('Your current location (auto-detected)');
        geoAutoFilledRef.current = true;
        geoAttemptInProgress.current = false;
      },
      (error) => {
        setGeo(null);
        geoAutoFilledRef.current = false;
        geoAttemptInProgress.current = false;
        
        if (error.code === error.PERMISSION_DENIED) {
          setGeoStatus('denied');
          setGeoMessage('Geolocation permission denied. Enter location manually.');
        } else {
          setGeoStatus('error');
          setGeoMessage('Could not get location.');
        }
      },
      { timeout: 10000 }
    );
  };

  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous || errandId) return;
    getGeolocation();
  }, [currentUser, errandId]);

  const checkErrandLimit = async (userId: string): Promise<boolean> => {
    try {
      const q = query(
        collection(db, 'errands'),
        where('userId', '==', userId),
        where('status', 'in', ['open', 'pending'])
      );
      const snapshot = await getDocs(q);
      return snapshot.size < 5;
    } catch (error) {
      console.error('Error checking errand limit:', error);
      return true;
    }
  };

  const removeImage = (index: number) => {
    const newFiles = [...mediaFiles];
    const newPreviews = [...mediaPreviews];
    if (index < mediaPreviews.length - mediaFiles.length) {
      // Removing an existing image (from Firestore)
      newPreviews.splice(index, 1);
    } else {
      // Removing a newly uploaded file
      const fileIndex = index - (mediaPreviews.length - mediaFiles.length);
      newFiles.splice(fileIndex, 1);
      newPreviews.splice(index, 1);
    }
    setMediaFiles(newFiles);
    setMediaPreviews(newPreviews);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    if (files.length + mediaFiles.length + mediaPreviews.length > 4) {
      setSubmitError('You can upload up to 4 images.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const newFiles = [...mediaFiles, ...files];
    setMediaFiles(newFiles);

    const newPreviews = [...mediaPreviews];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews.push(e.target.result as string);
          setMediaPreviews([...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setSubmitError(null);
  };

  const validateForm = (): string | null => {
    if (!title.trim()) return 'Title is required.';
    if (title.trim().length > 100) return 'Title must be less than 100 characters.';
    if (!description.trim()) return 'Description is required.';
    if (!location.trim()) return 'Location is required.';
    if (!duration.trim()) return 'Duration is required.';
    
    const parsedFee = parseFloat(fee);
    if (isNaN(parsedFee)) return 'Fee must be a number.';
    if (parsedFee < 0) return 'Fee cannot be negative.';
    if (parsedFee === 0 && !isNegotiable) return 'If fee is 0, you must enable negotiation.';
    
    if (!category.trim()) return 'Category is required.';
    if (category === 'other' && !customCategory.trim()) return 'Custom category is required when "Other" is selected.';
    if (!currency.trim()) return 'Currency is required.';
    
    for (const file of mediaFiles) {
      if (file.size > 5 * 1024 * 1024) return `Image ${file.name} exceeds 5MB limit.`;
      if (!file.type.startsWith('image/')) return `File ${file.name} is not an image.`;
    }
    
    return null;
  };

  const uploadFilesToImgbb = async (files: File[]): Promise<string[]> => {
    const imgbbUrls: string[] = [];
    const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

    if (!IMGBB_API_KEY) {
      throw new Error('ImgBB API key is not configured.');
    }

    for (const file of files) {
      const formData = new FormData();
      formData.append('image', file);
      try {
        const response = await axios.post<{
          url: any; data: { url: string } 
}>(
  `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
  formData,
  { headers: { 'Content-Type': 'multipart/form-data' } }
);
        // Handle ImgBB response robustly
        const imageUrl = response.data.data.url;
        if (!response.data?.data?.url) {
          throw new Error(`Invalid ImgBB response for file "${file.name}".`);
        }
        imgbbUrls.push(imageUrl);
      } catch (error) {
        console.error('ImgBB upload error:', error);
        throw new Error(`Failed to upload image "${file.name}".`);
      }
    }
    return imgbbUrls;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!currentUser?.uid) {
      setSubmitError('You must be logged in to post or edit an errand.');
      return;
    }

    const error = validateForm();
    if (error) {
      setSubmitError(error);
      return;
    }

    if (!isEditing) {
      const canPostMore = await checkErrandLimit(currentUser.uid);
      if (!canPostMore) {
        setSubmitError('You have reached the limit of 5 active errands.');
        return;
      }
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Upload new images only
      const newImageUrls = mediaFiles.length > 0 ? await uploadFilesToImgbb(mediaFiles) : [];
      // Keep existing images from Firestore, add new uploads
      const allImages = isEditing ? [...mediaPreviews] : [...newImageUrls];

     const errandData: Omit<Errand, 'id' | 'createdAt' | 'updatedAt'> = {
       userId: currentUser.uid,
       username: currentUser.displayName || `user_${currentUser.uid.substring(0, 6)}`,
       searchableUsername: currentUser.displayName?.toLowerCase() || '',
       title: title.trim(),
       description: description.trim(),
       location: location.trim(),
       duration: duration.trim(),
       fee: parseFloat(fee) || 0,
       category: category === 'other' ? customCategory.trim() : category.trim(),
       currency: currency.trim(),
       status: 'open',
       runnerUid: '',
       geo: geo || null,
       images: allImages,
       likes: [],
       bookmarks: [],
       clickCount: 0,
       paymentStatus: 'pending',
       paymentReference: '',
       completedAt: null,
       cancelledAt: null,
       isPrivate,
       isNegotiable: parseFloat(fee) === 0 ? true : isNegotiable,
       isArchived: false,
       requesterName: '',
       requesterAvatarUrl: '',
       categoryName: '',
       categoryId: '',
       runnerName: '',
       runnerAvatarUrl: '',
       runnerRating: 0,
       runnerReviewCount: 0
     };


      let newErrandId: string;

      if (isEditing && errandId) {
        const existingErrandSnap = await getDoc(doc(db, 'errands', errandId));
        if (!existingErrandSnap.exists()) {
          throw new Error('Existing errand not found during update.');
        }
        
        const existingErrandData = existingErrandSnap.data() as Errand;
        const finalUpdateData: Partial<Errand> = {
          ...errandData,
          likes: existingErrandData.likes,
          bookmarks: existingErrandData.bookmarks,
          status: existingErrandData.status,
          runnerUid: existingErrandData.runnerUid,
          paymentStatus: existingErrandData.paymentStatus,
          paymentReference: existingErrandData.paymentReference,
          completedAt: existingErrandData.completedAt,
          cancelledAt: existingErrandData.cancelledAt,
          clickCount: existingErrandData.clickCount,
          username: existingErrandData.username,
          searchableUsername: existingErrandData.searchableUsername,
          userId: existingErrandData.userId,
          updatedAt: serverTimestamp(),
          categoryName: existingErrandData.categoryName,
          
          categoryId: existingErrandData.categoryId,
          runnerName: existingErrandData.runnerName,
          runnerAvatarUrl: existingErrandData.runnerAvatarUrl,
          runnerRating: existingErrandData.runnerRating,
          runnerReviewCount: existingErrandData.runnerReviewCount,
         
        };

        await updateErrand(errandId, finalUpdateData);
        newErrandId = errandId;

        await createNotification(
          currentUser.uid,
          'errand',
          errandId,
          `You updated your errand: "${finalUpdateData.title}".`
        );
      } else {
        const newErrandRef = await addDoc(collection(db, 'errands'), {
          ...errandData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        newErrandId = newErrandRef.id;

        await createNotification(
          currentUser.uid,
          'errand',
          newErrandId,
          `You posted a new errand: "${errandData.title}".`
        );
      }

      setSubmitSuccess(true);
      setTimeout(() => navigate(`/errands/${newErrandId}`), 2000);

      if (!isEditing) {
        setTitle('');
        setDescription('');
        setLocation('');
        setDuration('');
        setFee('');
        setCategory('');
        setCustomCategory('');
        setCurrency('NGN');
        setIsNegotiable(false);
        setMediaFiles([]);
        setMediaPreviews([]);
        setGeo(null);
        geoAutoFilledRef.current = false;
        setGeoStatus('idle');
        setGeoMessage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err) {
      const error = err as Error;
      console.error('Errand submission error:', error);
      setSubmitError(error.message || `Failed to ${isEditing ? 'update' : 'post'} errand.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!errandId || !isEditing) return;
    if (!window.confirm('Are you sure you want to delete this errand? This action cannot be undone.')) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await deleteErrand(errandId);

      if (currentUser) {
        await createNotification(
          currentUser.uid,
          'errand',
          errandId,
          'You deleted your errand.'
        );
      }

      setSubmitSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) {
      console.error('Error deleting errand:', error);
      setSubmitError('Failed to delete errand. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container my-5 text-center" aria-live="polite">
        <div className="spinner-border text-primary" role="status" aria-label="Loading user session">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Loading user session...</p>
      </div>
    );
  }

  if (!currentUser || currentUser.isAnonymous) {
    return (
      <div className="container my-5 alert alert-warning text-center" aria-live="assertive">
        Please <Link to="/login" aria-label="Go to login page" className="alert-link">log in</Link> or <Link to="/register" aria-label="Go to registration page" className="alert-link">sign up</Link> with a permanent account to {isEditing ? 'edit' : 'post'} an errand.
      </div>
    );
  }

  return (
    <div className={`container my-4 my-md-5 ${theme === 'dark' ? 'bg-dark text-light' : ''}`}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className={`text-center ${theme === 'dark' ? 'text-light' : 'text-primary'}`}>
          {isEditing ? 'Edit Errand' : 'Post a New Errand'}
        </h3>
        <button
          className="btn btn-outline-secondary"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>

      {submitSuccess && (
        <div className="alert alert-success text-center" aria-live="polite">
          Errand {isEditing ? 'updated' : 'posted'} successfully! Redirecting...
        </div>
      )}
      
      {submitError && (
        <div className="alert alert-danger text-center" aria-live="assertive">
          {submitError}
        </div>
      )}

      <div className={`card shadow-sm p-4 ${theme === 'dark' ? 'bg-secondary text-light' : 'bg-white'}`}>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="title" className="form-label">Title*</label>
            <input
              type="text"
              className="form-control"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
              disabled={submitting}
              aria-describedby="titleHelp"
            />
            <div id="titleHelp" className="form-text">Brief title for your errand (max 100 chars)</div>
          </div>

          <div className="mb-3">
            <label htmlFor="description" className="form-label">Description*</label>
            <textarea
              className="form-control"
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              required
              aria-describedby="descriptionHelp"
            />
            <div id="descriptionHelp" className="form-text">Enter a detailed description of the errand.</div>
          </div>

          <div className="mb-3">
            <label htmlFor="location" className="form-label">Location*</label>
            <input
              type="text"
              className="form-control"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={submitting}
              required
              aria-describedby="locationHelp"
            />
            <div id="locationHelp" className="form-text">
              {geoStatus === 'loading' ? (
                <span className="text-primary">Detecting your location...</span>
              ) : geoStatus === 'success' ? (
                <span className="text-success">Location detected automatically</span>
              ) : geoStatus === 'denied' ? (
                <span className="text-warning">Location access denied. Please enter manually.</span>
              ) : geoMessage ? (
                <span className="text-info">{geoMessage}</span>
              ) : (
                'Enter the location where the errand should be performed'
              )}
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label htmlFor="duration" className="form-label">Duration*</label>
              <input
                type="text"
                className="form-control"
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                disabled={submitting}
                required
                aria-describedby="durationHelp"
              />
              <div id="durationHelp" className="form-text">Enter the expected duration (e.g., 1 hour)</div>
            </div>
            <div className="col-md-6">
              <label htmlFor="fee" className="form-label">Fee*</label>
              <div className="input-group">
                <select
                  className="form-select"
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={submitting}
                  aria-describedby="currencyHelp"
                >
                  <option value="NGN">₦ NGN</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                  <option value="GBP">£ GBP</option>
                </select>
                <input
                  type="number"
                  className="form-control"
                  id="fee"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  disabled={submitting}
                  required
                  min="0"
                  step="0.01"
                  aria-describedby="feeHelp"
                />
              </div>
              <div id="feeHelp" className="form-text">Enter the fee amount (enter 0 to allow negotiation)</div>
            </div>
          </div>

          {parseFloat(fee) === 0 && (
            <div className="mb-3 form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="isNegotiable"
                checked={isNegotiable}
                onChange={(e) => setIsNegotiable(e.target.checked)}
                disabled={submitting}
              />
              <label className="form-check-label" htmlFor="isNegotiable">
                Allow negotiation via messages
              </label>
            </div>
          )}

          <div className="mb-3">
            <label htmlFor="category" className="form-label">Category*</label>
            <select
              className="form-select"
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={submitting}
              required
              aria-describedby="categoryHelp"
            >
              <option value="">Select a category</option>
              <option value="delivery">Delivery</option>
              <option value="shopping">Shopping</option>
              <option value="cleaning">Cleaning</option>
              <option value="moving">Moving Help</option>
              <option value="other">Other</option>
            </select>
            {category === 'other' && (
              <input
                type="text"
                className="form-control mt-2"
                placeholder="Enter custom category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                disabled={submitting}
                required
              />
            )}
            <div id="categoryHelp" className="form-text">Select the most relevant category</div>
          </div>

          <div className="mb-3">
            <label htmlFor="mediaFiles" className="form-label">Upload Images (up to 4)</label>
            <input
              type="file"
              className="form-control"
              id="mediaFiles"
              multiple
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={submitting || mediaFiles.length + mediaPreviews.length >= 4}
              aria-describedby="mediaFilesHelp"
            />
            <div id="mediaFilesHelp" className="form-text">Upload up to 4 images (max 3MB each)</div>
            
            {mediaPreviews.length > 0 && (
              <div className="mt-3">
                <div className="d-flex flex-wrap gap-2">
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className="position-relative" style={{ width: '100px' }}>
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="img-thumbnail"
                        style={{ height: '100px', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        className="position-absolute top-0 end-0 btn btn-danger btn-sm p-0"
                        style={{ width: '24px', height: '24px' }}
                        onClick={() => removeImage(index)}
                        disabled={submitting}
                        aria-label={`Remove image ${index + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-1 small text-muted">
                  {mediaFiles.length + mediaPreviews.length} of 4 images selected
                </div>
              </div>
            )}
          </div>

          <div className="mb-3 form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              disabled={submitting}
            />
            <label className="form-check-label" htmlFor="isPrivate">
              Private Errand (only visible to you until you make it public)
            </label>
          </div>

          <div className="d-flex flex-column flex-sm-row gap-2">
            <button
              type="submit"
              className="btn btn-primary w-100 mt-3"
              disabled={submitting}
              aria-label={isEditing ? 'Update errand' : 'Post errand'}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  {isEditing ? 'Updating...' : 'Posting...'}
                </>
              ) : (
                isEditing ? 'Update Errand' : 'Post Errand'
              )}
            </button>
            
            {isEditing && (
              <button
                type="button"
                className="btn btn-danger w-100 mt-3"
                onClick={handleDelete}
                disabled={submitting}
                aria-label="Delete errand"
              >
                Delete Errand
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostErrand;