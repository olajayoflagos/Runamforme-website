import React, { useEffect, useState, useMemo } from 'react';
import { onSnapshot, collection, query, where, orderBy, doc, runTransaction } from 'firebase/firestore';
import { db } from "../firebase/config";
import { useAuth } from '../contexts/AuthContext';
import ErrandCard from '../components/ErrandCard';

const ErrandsFeedPage: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const [errands, setErrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterDuration, setFilterDuration] = useState('');
  const [filterMinFee, setFilterMinFee] = useState('');
  const [filterMaxFee, setFilterMaxFee] = useState('');
  const [userLikedErrandIds, setUserLikedErrandIds] = useState<Set<string>>(new Set());
  const [checkingLikes, setCheckingLikes] = useState(true);
  const [likingErrandId, setLikingErrandId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const errandsRef = collection(db, 'errands');
    const q = query(errandsRef, where('status', '==', 'open'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedErrands = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setErrands(fetchedErrands);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching errands:', err);
      setError('Failed to load errands. Please try again later.');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUserLikedErrandIds(new Set());
      setCheckingLikes(false);
      return;
    }
    setCheckingLikes(true);
    const userLikesRef = collection(db, 'users', currentUser.uid, 'likedErrands');
    const unsubscribe = onSnapshot(userLikesRef, (snapshot) => {
      const likedIds = new Set(snapshot.docs.map(doc => doc.id));
      setUserLikedErrandIds(likedIds);
      setCheckingLikes(false);
    }, (err) => {
      console.error('Error checking liked errands:', err);
      setCheckingLikes(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const allOpenErrands = useMemo(() => {
    return errands.filter((errand) => {
      const locationMatch = filterLocation ? errand.location === filterLocation : true;
      const durationMatch = filterDuration ? errand.duration === filterDuration : true;
      const fee = parseFloat(errand.fee);
      const minMatch = filterMinFee ? fee >= parseFloat(filterMinFee) : true;
      const maxMatch = filterMaxFee ? fee <= parseFloat(filterMaxFee) : true;
      return locationMatch && durationMatch && minMatch && maxMatch;
    });
  }, [errands, filterLocation, filterDuration, filterMinFee, filterMaxFee]);

  const handleLikeToggle = async (errandId: string) => {
    if (!currentUser || likingErrandId) return;
    setLikingErrandId(errandId);
    try {
      const errandRef = doc(db, 'errands', errandId);
      const userLikeRef = doc(db, 'users', currentUser.uid, 'likedErrands', errandId);
      await runTransaction(db, async (transaction) => {
        const errandDoc = await transaction.get(errandRef);
        if (!errandDoc.exists()) throw new Error('Errand does not exist');
        const liked = userLikedErrandIds.has(errandId);
        const newLikeCount = (errandDoc.data().likes || 0) + (liked ? -1 : 1);
        transaction.update(errandRef, { likes: newLikeCount });
        liked ? transaction.delete(userLikeRef) : transaction.set(userLikeRef, { likedAt: new Date() });
      });
    } catch (err) {
      console.error('Error toggling like:', err);
    } finally {
      setLikingErrandId(null);
    }
  };

  if (authLoading || loading || checkingLikes) {
    return (
      <div className="container my-5 errands-feed-container">
        <div className="alert alert-info text-center d-flex align-items-center justify-content-center">
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          {authLoading ? 'Loading user session...' : (checkingLikes ? 'Checking your likes...' : 'Loading available errands...')}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container my-5 errands-feed-container">
        <div className="alert alert-danger text-center" role="alert">{error}</div>
      </div>
    );
  }

  return (
    <div className="container my-5 errands-feed-container">
      <h3 className="mb-4 text-center">Available Errands</h3>

      <div className="card shadow-sm p-3 mb-4">
        <h5 className="mb-3">Filter Errands</h5>
        <div className="row g-3">
          <div className="col-md-6 col-lg-3">
            <label htmlFor="filterLocation" className="form-label visually-hidden">Filter by Location</label>
            <input
              type="text"
              className="form-control"
              id="filterLocation"
              placeholder="Filter by Location (Exact)"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="col-md-6 col-lg-3">
            <label htmlFor="filterDuration" className="form-label visually-hidden">Filter by Duration</label>
            <input
              type="text"
              className="form-control"
              id="filterDuration"
              placeholder="Filter by Duration (Exact)"
              value={filterDuration}
              onChange={(e) => setFilterDuration(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="col-md-6 col-lg-3">
            <label htmlFor="filterMinFee" className="form-label visually-hidden">Minimum Fee</label>
            <input
              type="number"
              className="form-control"
              id="filterMinFee"
              placeholder="Min Fee (₦)"
              value={filterMinFee}
              onChange={(e) => setFilterMinFee(e.target.value)}
              min="0"
              step="any"
              disabled={loading}
            />
          </div>
          <div className="col-md-6 col-lg-3">
            <label htmlFor="filterMaxFee" className="form-label visually-hidden">Maximum Fee</label>
            <input
              type="number"
              className="form-control"
              id="filterMaxFee"
              placeholder="Max Fee (₦)"
              value={filterMaxFee}
              onChange={(e) => setFilterMaxFee(e.target.value)}
              min="0"
              step="any"
              disabled={loading}
            />
          </div>
        </div>
        {(filterLocation || filterMinFee || filterMaxFee || filterDuration) && (
          <button className="btn btn-outline-secondary btn-sm mt-3" onClick={() => {
            setFilterLocation('');
            setFilterMinFee('');
            setFilterMaxFee('');
            setFilterDuration('');
          }}>Clear Filters</button>
        )}
      </div>

      {allOpenErrands.length === 0 ? (
        <div className="alert alert-info mt-3 text-center">
          {filterLocation || filterMinFee || filterMaxFee || filterDuration ?
            "No errands found matching your filter criteria." :
            "No open errands found at the moment. Check back later!"
          }
        </div>
      ) : (
        <div className="row">
          {allOpenErrands.map(errand => (
            <div key={errand.id} className="col-sm-6 col-md-4 col-lg-3 mb-4">
              <ErrandCard
                errand={errand}
                onLikeToggle={handleLikeToggle}
                isLiked={userLikedErrandIds.has(errand.id)}
                isLiking={likingErrandId === errand.id}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ErrandsFeedPage;
