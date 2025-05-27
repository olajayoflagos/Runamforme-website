// src/components/ErrandCard.tsx

import { useEffect, useState } from 'react';
import type { FC } from 'react';
// Corrected import: Import Timestamp and FieldValue directly from firebase/firestore
import type { Timestamp, FieldValue } from 'firebase/firestore';
import type { Errand, UserProfile } from '../types'; // Import other types from your types file


import { doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';

import { useAuth } from '../contexts/AuthContext';

import { Link } from 'react-router-dom';

import MessageModal from './MessageModal'; // Assuming this is a generic modal component

interface ErrandCardProps {
  errand: Errand;
  onLikeToggle?: (errandId: string, isCurrentlyLiked: boolean) => void;
  isLiked: boolean; // Calculated and passed by parent (ErrandsFeedPage)
  isLiking?: boolean; // Optional loading state for like button
  onViewAndAccept: () => void;
  currentUser: any; // Passed from parent
}

const ErrandCard: FC<ErrandCardProps> = ({
  errand,
  onLikeToggle,
  onViewAndAccept,
  isLiked,
  isLiking = false,
  currentUser
}) => {
  // State for poster's username
  const [username, setUsername] = useState<string>('Unknown');
  // State to toggle description length
  const [showFullDescription, setShowFullDescription] = useState(false);

  // State for "Who Liked" Modal
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [likers, setLikers] = useState<UserProfile[]>([]);
  const [likersLoading, setLikersLoading] = useState(false);
  const [likersError, setLikersError] = useState<string | null>(null); // Likers fetch error state

    // Helper to format the timestamp
    const formatTimestamp = (timestamp: Timestamp | FieldValue | undefined): string => {
        // Check if timestamp is a valid Timestamp object before trying to call toDate()
        if (!timestamp || typeof timestamp !== 'object' || !('toDate' in timestamp && typeof (timestamp as Timestamp).toDate === 'function')) {
            // Handle cases where timestamp is missing, not an object, or not a Firestore Timestamp
            // serverTimestamp() will initially be a FieldValue object, which doesn't have toDate()
            return 'Sending...'; // Or handle differently, maybe check for FieldValue type
        }
        try {
             // Ensure it's treated as a Timestamp and convert to Date
             const date = (timestamp as Timestamp).toDate();
             // Format to local time string (e.g., "10:30 AM")
             return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            console.error("Failed to format timestamp:", e);
            return 'Invalid time';
        }
    };


  // Effect to fetch poster's username
  useEffect(() => {
    const fetchUsername = async () => {
      if (errand.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', errand.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUsername(data.username || 'Unknown');
          } else {
             setUsername('User Not Found');
          }
        } catch (error) {
          console.error('Failed to fetch username:', error);
          setUsername('Error fetching user');
        }
      } else {
          setUsername('No User ID');
      }
    };
    fetchUsername();
  }, [errand.uid, db]);

  // Effect to fetch likers' user profiles
  useEffect(() => {
    const fetchLikers = async () => {
      if (showLikersModal && Array.isArray(errand.likedByUids) && errand.likedByUids.length > 0) {
        setLikersLoading(true);
        setLikersError(null); // Clear previous error
        try {
          const likerPromises = errand.likedByUids.map(uid => getDoc(doc(db, 'users', uid)));
          const likerSnapshots = await Promise.all(likerPromises);

          const fetchedLikers: UserProfile[] = likerSnapshots
            .filter(snap => snap.exists())
            .map(snap => {
              const data = snap.data() as UserProfile;
              return {
                id: snap.id, uid: snap.id, name: data.name ?? 'Unnamed User',
                username: data.username ?? 'unknown_user', email: data.email ?? '',
                userType: data.userType ?? 'both', createdAt: data.createdAt,
                followersCount: data.followersCount ?? 0, followingCount: data.followingCount ?? 0,
                likes: data.likes ?? 0, bio: data.bio ?? '', avatarUrl: data.avatarUrl ?? '',
                isVerified: data.isVerified ?? false,
              };
            });
          setLikers(fetchedLikers);
        } catch (error) {
          console.error('Failed to fetch likers:', error);
          setLikers([]);
          setLikersError('Failed to load likers.');
        } finally {
          setLikersLoading(false);
        }
      } else if (showLikersModal && Array.isArray(errand.likedByUids) && errand.likedByUids.length === 0) {
         setLikers([]);
         setLikersLoading(false);
         setLikersError(null);
      } else if (!showLikersModal) {
          setLikers([]); // Clear state when modal closes
          setLikersError(null);
      }
    };
    fetchLikers();


  }, [showLikersModal, errand.likedByUids, db]); // Dependencies for fetching likers

  // Helper function to close the likers modal
  const handleCloseLikersModal = () => {
      setShowLikersModal(false);
      // Likers state cleared in useEffect when showLikersModal becomes false
  };

  // JSX Render Logic
  return (
    <div className="card h-100 shadow-sm d-flex flex-column">
      <div className="card-body d-flex flex-column">
        {/* Errand Title or Description Preview */}
        {typeof errand.title === 'string' && errand.title.trim().length > 0 ? (
            <h5 className="card-title text-primary mb-2">{errand.title}</h5>
        ) : (
            <h5
              className="card-title text-primary mb-2 cursor-pointer"
              onClick={() => setShowFullDescription(!showFullDescription)}
              style={{ cursor: 'pointer' }}
            >
              {showFullDescription
                ? errand.description
                : `${errand.description.substring(0, 80)}${errand.description.length > 80 ? '...' : ''}`}
            </h5>
        )}

        {/* Media Attachments Display */}
        {Array.isArray(errand.mediaUrls) && errand.mediaUrls.length > 0 && (
          <div className="mb-2">
             <p className="mb-1 small text-muted">Attachments:</p>
            {errand.mediaUrls.map((url, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="d-block text-decoration-underline small text-muted"
              >
                Attached File {idx + 1}
              </a>
            ))}
          </div>
        )}

        {/* Location Display with Google Maps Link (using geo if available) */}
        <p className="card-text text-muted mb-1">
          📍{' '}
          {errand.geo && typeof errand.geo.lat === 'number' && typeof errand.geo.lng === 'number' ? (
               <a
                href={`https://www.google.com/maps/search/?api=1&query=${errand.geo.lat},${errand.geo.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {errand.location || 'View on Map'}
              </a>
          ) : (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  errand.location
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {errand.location}
              </a>
          )}
        </p>

        {/* Duration Display */}
        <p className="card-text text-muted mb-1">⏱️ Duration: {errand.duration}</p>

        {/* Fee Display with Currency */}
        <p className="card-text fw-bold mt-2">💰 Fee: {errand.currency ?? '₦'} {errand.fee?.toLocaleString() ?? 0}</p>

        {/* Posted by Username Display with Link to Profile */}
        <p className="card-text text-muted mb-1">
          🧑 Posted by:{' '}
          <Link to={`/profile/${errand.uid}`}>
            <strong>@{username}</strong>
          </Link>
        </p>

        {/* NEW: Category Display */}
         {errand.category && (
             <p className="card-text text-muted mb-1">
                 🏷️ Category: {errand.category}
             </p>
         )}

        
        {(errand.viewCount !== undefined ||
          errand.clickCount !== undefined ||
          (Array.isArray(errand.likedByUids) && errand.likedByUids.length >= 0)) // Check if array exists for count display
           && (
          <div className="mt-2 text-muted small">
            
            {errand.viewCount !== undefined && <span>👀 {errand.viewCount}</span>}
            
            {errand.clickCount !== undefined && (
              <span className="ms-3">🖱️ {errand.clickCount}</span>
            )}
            
             {Array.isArray(errand.likedByUids) && (
               <span
                 className={`ms-3 ${errand.likedByUids.length > 0 ? 'text-decoration-underline cursor-pointer' : ''}`}
                 role="button"
                 onClick={() => {
                     if (errand.likedByUids && errand.likedByUids.length > 0) {
                         setShowLikersModal(true);
                     } else {
                          alert('No one has liked this errand yet.');
                     }
                 }}
               >
                 ❤️ {errand.likedByUids.length}
                  {errand.likedByUids.length === 1 ? ' Like' : ' Likes'}
               </span>
            )}
          </div>
        )}
      


      
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
        {showLikersModal && 
       ( 
         <MessageModal 
           show={showLikersModal}
           onClose={handleCloseLikersModal}
           title={`Users who liked this errand (${errand.likedByUids?.length ?? 0})`} recipientId={''}         >
             
             {likersLoading ? (
                 <p className="text-center">Loading likers...</p>
             ) : likersError ? (
                 <div className="alert alert-danger">{likersError}</div>
             ) : likers.length > 0 ? (
                 <ul className="list-unstyled">
                     {likers.map(liker => (
                         <li key={liker.uid} className="mb-1">
                             <Link to={`/profile/${liker.uid}`} onClick={handleCloseLikersModal}>
                                 @{liker.username}
                             </Link>
                         </li>
                     ))}
                 </ul>
             ) : (
                 <p className="text-center text-muted">No users found who liked this errand.</p>
             )}
         </MessageModal>
        )
      }

  


}; 

export default ErrandCard; // Export the component
