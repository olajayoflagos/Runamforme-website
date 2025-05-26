import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/config';
import ErrandCard from '../components/ErrandCard';
import type { Errand } from '../types';
import { useAuth } from '../contexts/AuthContext';

const ErrandsFeedPage = () => {
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

 useEffect(() => {
  const q = query(collection(db, 'errands'), where('status', '==', 'open'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const updatedErrands: Errand[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as Errand[];
    setErrands(updatedErrands);
    setLoading(false);
  }, (error) => {
    console.error('Real-time update error:', error);
    setLoading(false);
  });

  return () => unsubscribe(); // Cleanup listener on unmount
}, []);

  const handleLikeToggle = async (errandId: string, isCurrentlyLiked: boolean) => {
    try {
      const errandRef = doc(db, 'errands', errandId);
      await updateDoc(errandRef, {
        likes: increment(isCurrentlyLiked ? -1 : 1)
      });
    } catch (error) {
      console.error('Failed to update likes:', error);
    }
  };

  const handleViewAndAccept = async (errand: Errand) => {
    try {
      const errandRef = doc(db, 'errands', errand.id);
      await updateDoc(errandRef, {
        clickCount: increment(1)
      });

      if (currentUser?.uid && errand.uid) {
        const otherUserId = errand.uid === currentUser.uid ? errand.runnerUid : errand.uid;
        if (otherUserId) {
          navigate(`/messages/${otherUserId}`);
        } else {
          console.warn('Cannot navigate to DM: missing other user UID.');
        }
      }
    } catch (error) {
      console.error('Failed to update clickCount:', error);
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Open Errands</h2>
      {loading ? (
        <p>Loading errands...</p>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 g-4">
          {errands.map((errand) => (
            <div className="col" key={errand.id}>
              <ErrandCard
                errand={errand}
                onLikeToggle={handleLikeToggle}
                isLiked={false}
                isLiking={false}
                onViewAndAccept={() => handleViewAndAccept(errand)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ErrandsFeedPage;