import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Form, InputGroup, Button, Spinner, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import type { Errand } from '../types';
import ShareModal from '../components/ShareModal'; // adjust path


const ErrandsFeedPage: React.FC = () => {
  const { theme } = useTheme();
  const [errands, setErrands] = useState<Errand[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState<{ url: string; title: string }>({ url: '', title: '' });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [minFee, setMinFee] = useState('');
  const [maxFee, setMaxFee] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchErrands = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'errands'), where('status', '==', 'open'));
      const snapshot = await getDocs(q);

      let allErrands: Errand[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Errand[];

      // Optional filters
      if (search.trim()) {
        const s = search.toLowerCase();
        allErrands = allErrands.filter(e =>
          e.username?.toLowerCase().includes(s) ||
          e.title?.toLowerCase().includes(s) ||
          e.description?.toLowerCase().includes(s)
        );
      }
      if (category) {
        allErrands = allErrands.filter(e => e.category?.toLowerCase() === category.toLowerCase());
      }
      if (minFee) {
        allErrands = allErrands.filter(e => e.fee >= parseFloat(minFee));
      }
      if (maxFee) {
        allErrands = allErrands.filter(e => e.fee <= parseFloat(maxFee));
      }
      if (locationFilter) {
        allErrands = allErrands.filter(e =>
          e.location?.toLowerCase().includes(locationFilter.toLowerCase())
        );
      }

      setErrands(allErrands);
    } catch (error) {
      console.error('Error fetching errands:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrands();
  }, []);

  const [likeLoadingId, setLikeLoadingId] = useState<string | null>(null);
const [bookmarkLoadingId, setBookmarkLoadingId] = useState<string | null>(null);


const handleLike = async (errandId: string) => {
  try {
    setLikeLoadingId(errandId);
    const errandRef = collection(db, 'errands');
    const docRef = query(errandRef, where('id', '==', errandId));
    const snapshot = await getDocs(docRef);
    const docSnap = snapshot.docs[0];

    if (!docSnap) return;

    const currentLikes: string[] = docSnap.data().likes || [];
    const updatedLikes = currentLikes.includes('currentUser?.uid') // Replace with real userId
      ? currentLikes.filter(uid => uid !== 'user')
      : [...currentLikes, 'user'];

    await updateDoc(docSnap.ref, { likes: updatedLikes });
    fetchErrands();
  } catch (error) {
    console.error('Error liking errand:', error);
  } finally {
    setLikeLoadingId(null);
  }
};

const handleBookmark = async (errandId: string) => {
  try {
    setBookmarkLoadingId(errandId);
    const errandRef = collection(db, 'errands');
    const docRef = query(errandRef, where('id', '==', errandId));
    const snapshot = await getDocs(docRef);
    const docSnap = snapshot.docs[0];

    if (!docSnap) return;

    const currentBookmarks: string[] = docSnap.data().bookmarks || [];
    const updatedBookmarks = currentBookmarks.includes('currentUser?.uid') // Replace with real userId
      ? currentBookmarks.filter(uid => uid !== 'user')
      : [...currentBookmarks, 'user'];

    await updateDoc(docSnap.ref, { bookmarks: updatedBookmarks });
    fetchErrands();
  } catch (error) {
    console.error('Error bookmarking errand:', error);
  } finally {
    setBookmarkLoadingId(null);
  }
};



  return (
    <div className={`container py-3 ${theme === 'dark' ? 'text-light' : ''}`}>
      <h4 className="mb-3">Browse Errands</h4>

      <InputGroup className="mb-3">
        <Form.Control
          placeholder="Search by username, title or description"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Button variant="primary" onClick={fetchErrands}>Search</Button>
      </InputGroup>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Form.Control
          placeholder="Category"
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{ maxWidth: '180px' }}
        />
        <Form.Control
          type="number"
          placeholder="Min Fee"
          value={minFee}
          onChange={e => setMinFee(e.target.value)}
          style={{ maxWidth: '120px' }}
        />
        <Form.Control
          type="number"
          placeholder="Max Fee"
          value={maxFee}
          onChange={e => setMaxFee(e.target.value)}
          style={{ maxWidth: '120px' }}
        />
        <Form.Control
          placeholder="Location"
          value={locationFilter}
          onChange={e => setLocationFilter(e.target.value)}
          style={{ maxWidth: '200px' }}
        />
      </div>

      {loading ? (
        <div className="text-center">
          <Spinner animation="border" role="status" />
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 g-4">
          {errands.length === 0 && (
            <div className="col">
              <div className="alert alert-info text-center">No errands found.</div>
            </div>
          )}
          {errands.map(errand => (
            <div className="col" key={errand.id}>
              <Card className={`h-100 ${theme === 'dark' ? 'bg-dark text-light' : ''}`}>
                <Card.Body>
                  <Card.Title>
                    <Link to={`/errands/${errand.id}`} className="text-decoration-none">
                      {errand.title}
                    </Link>
                  </Card.Title>
                  <Card.Text>{errand.description?.slice(0, 100)}...</Card.Text>
                  <Card.Text>
                    <strong>Location:</strong>{' '}
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(errand.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {errand.location}
                    </a>
                  </Card.Text>
                  <Card.Text>
                    <strong>Fee:</strong> {errand.currency} {errand.fee.toLocaleString()} <br />
                    <strong>Duration:</strong> {errand.duration}
                  </Card.Text>
                  <Card.Text>
                    <strong>By:</strong>{' '}
                    <Link to={`/user/${errand.username}`} className="text-decoration-none">
                      {errand.username}
                    </Link>
                  </Card.Text>
                  <Card.Text className="small text-muted">
                    ❤️ {errand.likes?.length || 0}   🔖 {errand.bookmarks?.length || 0}   👁️ {errand.clickCount || 0}
                  </Card.Text>
                  <Link to={`/errands/${errand.id}`} className="btn btn-sm btn-outline-primary mt-2">
                    View Details
                  </Link>
                  <div className="d-flex gap-2 mt-2">
  <Button
    variant="light"
    size="sm"
    onClick={() => handleLike(errand.id)}
    disabled={likeLoadingId === errand.id}
  >
    ❤️ {likeLoadingId === errand.id ? '...' : errand.likes?.length || 0}
  </Button>

  <Button
    variant="light"
    size="sm"
    onClick={() => handleBookmark(errand.id)}
    disabled={bookmarkLoadingId === errand.id}
  >
    🔖 {bookmarkLoadingId === errand.id ? '...' : errand.bookmarks?.length || 0}
  </Button>

  <Button
  variant="info"
  size="sm"
  onClick={() => {
    const shareUrl = `${window.location.origin}/errands/${errand.id}`;
    if (navigator.share) {
      navigator.share({ title: errand.title, text: errand.description, url: shareUrl });
    } else {
      setShareData({ title: errand.title, url: shareUrl });
      setShowShareModal(true);
    }
  }}
>
  📤 Share
</Button>
<ShareModal
  show={showShareModal}
  onHide={() => setShowShareModal(false)}
  errandUrl={shareData.url}
  title={shareData.title}
/>

</div>

                </Card.Body>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ErrandsFeedPage;
