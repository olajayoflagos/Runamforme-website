// src/pages/ErrandsFeedPage.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  type Query
} from 'firebase/firestore';
import { db } from '../firebase/config';
import ErrandCard from '../components/ErrandCard';
import type { Errand, UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';

const ErrandsFeedPage = () => {
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // State for Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minFee, setMinFee] = useState('');
  const [maxFee, setMaxFee] = useState('');

  // Effect for real-time listener with filtering
  useEffect(() => {
    setLoading(true);
    setError(null);

    let currentQuery: Query<Errand> = collection(db, 'errands') as Query<Errand>;

    // Base Filter: status == 'open'
    currentQuery = query(currentQuery, where('status', '==', 'open'));

    // Optional Filter: Category
    if (selectedCategory) {
        currentQuery = query(currentQuery, where('category', '==', selectedCategory));
    }

    // Optional Filters: Fee Range (Min and Max)
    const minFeeValue = parseFloat(minFee);
    const maxFeeValue = parseFloat(maxFee);

    if (!isNaN(minFeeValue) && minFeeValue >= 0) {
        currentQuery = query(currentQuery, where('fee', '>=', minFeeValue));
    }
    // --- Continued in Part 2 ---
// src/pages/ErrandsFeedPage.tsx
// --- Continued from Part 1 ---

    if (!isNaN(maxFeeValue) && maxFeeValue >= 0) {
        currentQuery = query(currentQuery, where('fee', '<=', maxFeeValue));
    }

    // Search Term (by Username/Keyword?) - Not direct Firestore filter here due to limitations
    // Implement client-side filtering after fetching or use a dedicated search service if needed.
    // For exact username match, fetch user UID first, then query by UID.

    const unsubscribe = onSnapshot(currentQuery, (snapshot) => {
      const updatedErrands: Errand[] = snapshot.docs.map((doc) => {
        // Corrected type assertion to Omit<Errand, 'id'> to avoid TypeScript warning 2783
        const data = doc.data() as Omit<Errand, 'id'>;
        return {
          id: doc.id, // Explicitly use the document ID
          ...data, // Spread the rest of the data fields
          title: data.title ?? 'Untitled Errand',
          description: data.description ?? '',
          location: data.location ?? '',
          duration: data.duration ?? '',
          fee: data.fee ?? null,
          status: data.status ?? 'open',
          uid: data.uid,
          category: data.category ?? 'uncategorized',
          currency: data.currency ?? 'NGN',
          likedByUids: data.likedByUids ?? [],
          viewedByUids: data.viewedByUids ?? [],
          mediaUrls: data.mediaUrls ?? [],
        };
      });

      setErrands(updatedErrands);
      setLoading(false);
      if (error) setError(null);

    }, (error) => {
      console.error('ErrandsFeedPage: Real-time update error:', error);
      setLoading(false);
      setError('Failed to load errands.');
    });

    // Cleanup listener on unmount or dependency change
    return () => unsubscribe();

  }, [db, selectedCategory, minFee, maxFee, searchTerm /* Add other filter states */]); // Dependencies

  // Helper function to handle like/unlike toggle
  const handleLikeToggle = async (errandId: string, isCurrentlyLiked: boolean) => {
    if (!currentUser) {
      alert("Please log in to like errands.");
      return;
    }

    const errandRef = doc(db, 'errands', errandId);
    const userId = currentUser.uid;

    try {
      await updateDoc(errandRef, {
        likedByUids: isCurrentlyLiked ? arrayRemove(userId) : arrayUnion(userId)
      });
    } catch (error) {
      console.error('Failed to update likes:', errandId, error);
      alert("Failed to update like status. Please try again.");
    }
  };

  // Helper function to handle View & Accept (navigate to messaging)
  const handleViewAndAccept = async (errand: Errand) => {
     // Optional: Increment click count or track unique views
    try {
      const errandRef = doc(db, 'errands', errand.id);
      await updateDoc(errandRef, {
        clickCount: increment(1)
        // viewedByUids: currentUser?.uid ? arrayUnion(currentUser.uid) : FieldValue.arrayUnion(null)
      });
    } catch (error) {
      console.error('Failed to update clickCount:', errand.id, error);
    }

    // Determine recipient and navigate to messages page
    if (!currentUser?.uid) {
       alert("Please log in to view and accept errands or message the poster.");
       navigate('/login');
       return;
    }

    const currentUserId = currentUser.uid;
    const errandPosterUid = errand.uid;
    const errandRunnerUid = errand.runnerUid;

    let recipientUserId = null;

    if (currentUserId === errandPosterUid) {
        if (errandRunnerUid) {
            recipientUserId = errandRunnerUid;
        } else {
            alert("No runner assigned yet to message.");
            return;
        }
    } else {
         recipientUserId = errandPosterUid;
    }

    if (recipientUserId) {
      navigate(`/messages/${recipientUserId}`);
    } else {
      console.error('Cannot navigate to messages: Recipient user ID could not be determined.');
      alert("Could not start messaging.");
    }
  };
  // --- Continued in Part 3 ---
// src/pages/ErrandsFeedPage.tsx
// --- Continued from Part 2 ---

  // JSX Render Logic
  return (
    <div className="container mt-4">
      <h2 className="mb-4">Open Errands</h2>

      {/* Filtering UI Section (NEW) */}
      <div className="card shadow-sm p-3 mb-4">
          <h5 className="card-title mb-3">Filter Errands</h5>
          <div className="row g-3">
              {/* Search Input */}
              <div className="col-sm-6 col-lg-3">
                  <label htmlFor="searchTerm" className="form-label visually-hidden">Search Username/Keyword</label>
                  <input
                      type="text"
                      className="form-control"
                      id="searchTerm"
                      placeholder="Search username or keyword"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                       disabled={loading}
                  />
              </div>
              {/* Category Dropdown */}
               <div className="col-sm-6 col-lg-3">
                  <label htmlFor="categoryFilter" className="form-label visually-hidden">Category</label>
                   <select
                      className="form-select"
                      id="categoryFilter"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                       disabled={loading}
                   >
                       <option value="">All Categories</option>
                       {/* Add category options */}
                       <option value="deliveries">Deliveries</option>
                       <option value="groceries">Groceries</option>
                       <option value="cleaning">Cleaning</option>
                       <option value="pets">Pet Care</option>
                       <option value="tech">Tech Help</option>
                       <option value="errands">General Errands</option>
                       <option value="other">Others</option>
                       {/* ... more options ... */}
                   </select>
               </div>
              {/* Min Fee Input */}
              <div className="col-sm-6 col-lg-3">
                  <label htmlFor="minFee" className="form-label visually-hidden">Min Fee</label>
                   <input
                       type="number"
                       className="form-control"
                       id="minFee"
                       placeholder="Min Fee"
                       value={minFee}
                       onChange={(e) => setMinFee(e.target.value)}
                       disabled={loading}
                        min="0"
                   />
               </div>
              {/* Max Fee Input */}
              <div className="col-sm-6 col-lg-3">
                  <label htmlFor="maxFee" className="form-label visually-hidden">Max Fee</label>
                   <input
                       type="number"
                       className="form-control"
                       id="maxFee"
                       placeholder="Max Fee"
                       value={maxFee}
                       onChange={(e) => setMaxFee(e.target.value)}
                       disabled={loading}
                       min="0"
                   />
               </div>
          </div>
      </div>

      {/* Display loading, error, or errands list */}
      {loading ? (
        <p>Loading errands...</p>
      ) : error ? (
         <div className="alert alert-danger text-center">{error}</div>
      ) : (
        // --- Continued in Part 4 ---
// src/pages/ErrandsFeedPage.tsx
// --- Continued from Part 3 ---

        <div className="row row-cols-1 row-cols-md-2 g-4">
          {errands.map((errand) => (
            <div className="col" key={errand.id}>
              <ErrandCard
                errand={errand}
                onLikeToggle={handleLikeToggle}
                // Calculate isLiked based on currentUser and errand.likedByUids
                isLiked={currentUser ? (errand.likedByUids?.includes(currentUser.uid) ?? false) : false}
                isLiking={false} // Placeholder, manage state per card if needed
                onViewAndAccept={() => handleViewAndAccept(errand)}
                currentUser={currentUser} // Pass currentUser for like button logic in card
              />
            </div>
          ))}
          {!loading && errands.length === 0 && (
              <div className="col-12">
                  <p className="text-center">No errands found matching your criteria.</p>
              </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrandsFeedPage;
