import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { query, collection, onSnapshot, orderBy, doc, updateDoc, increment, arrayUnion, arrayRemove, serverTimestamp, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { formatErrand, checkErrandLimit } from '../firebase/firestore';
import type { Errand } from '../types';
import MessageModal from './MessageModal';
import { Helmet } from 'react-helmet-async';
import { Alert, Button, Card, Container, Row, Col, Badge } from 'react-bootstrap';
import Skeleton from 'react-loading-skeleton';

interface OpenErrandsListProps {
  userId?: string;
}

const OpenErrandsList: React.FC<OpenErrandsListProps> = ({ userId }) => {
  const { currentUser } = useAuth();
  const [openErrands, setOpenErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ recipientId: string; errandId: string; username: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const constraints = [
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc'),
    ];
    if (userId) {
      constraints.unshift(where('userId', '==', userId));
    }

    const q = query(collection(db, 'errands'), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const errandsList = snapshot.docs.map(formatErrand);
          setOpenErrands(errandsList);
          setError(null);
        } catch (err: unknown) {
          setError('Failed to process errands data.');
          console.error('Error processing errands:', err);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError('Failed to load errands: ' + err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const handleViewDetails = async (errandId: string) => {
    if (!errandId) return;
    try {
      const errandRef = doc(db, 'errands', errandId);
      await updateDoc(errandRef, { clickCount: increment(1) });
      navigate(`/errands/${errandId}`);
    } catch (err: unknown) {
      setError('Error updating click count: ' + (err as Error).message);
    }
  };

  const handleDelete = async (errandId: string, userId: string) => {
    if (!currentUser?.uid || currentUser.uid !== userId) {
      setError('Only the errand owner can delete this errand.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'errands', errandId));
    } catch (err: unknown) {
      setError('Failed to delete errand: ' + (err as Error).message);
    }
  };

  const handleLike = async (errandId: string, isLiked: boolean) => {
    if (!currentUser?.uid) {
      setError('Please log in to like errands.');
      return;
    }
    if (!errandId) return;
    try {
      const errandRef = doc(db, 'errands', errandId);
      await updateDoc(errandRef, {
        likes: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
      });
    } catch (err: unknown) {
      setError(`Failed to ${isLiked ? 'unlike' : 'like'} errand: ` + (err as Error).message);
    }
  };

  const handleViewAndAccept = async (recipientId: string, errandId: string, username: string) => {
    if (!currentUser?.uid) {
      setError('Please log in to contact the requester.');
      return;
    }
    if (!errandId) return;
    const canAccept = await checkErrandLimit(currentUser.uid);
    if (!canAccept) {
      setError('You have reached the limit of 3 active errands.');
      return;
    }
    try {
      const errandRef = doc(db, 'errands', errandId);
      await updateDoc(errandRef, {
        runnerUid: currentUser.uid,
        status: 'pending',
        updatedAt: serverTimestamp(),
      });
      setModalState({ recipientId, errandId, username });
    } catch (err: unknown) {
      setError('Error accepting errand: ' + (err as Error).message);
    }
  };

  const closeModal = () => {
    setModalState(null);
  };

  const handleDismissError = () => {
    setError(null);
  };

  if (loading) {
    return (
      <Container className="mt-4">
        <Row xs={1} sm={2} md={3} lg={4} className="g-3 g-md-4">
          {[...Array(4)].map((_, idx) => (
            <Col key={idx}>
              <Skeleton height={300} />
            </Col>
          ))}
        </Row>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger" dismissible onClose={handleDismissError}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (openErrands.length === 0) {
    return (
      <Container className="mt-4">
        <Alert variant="info">No open errands found.</Alert>
      </Container>
    );
  }

  return (
    <Container className="my-4 my-md-5 open-errands-section" role="region" aria-label="Available errands">
      <Helmet>
        <title>Open Errands - RunAmForMe</title>
        <meta name="description" content="Browse and accept open errands on RunAmForMe." />
      </Helmet>
      <h3 className="mb-4 text-center text-primary">Available Errands</h3>
      <Row xs={1} sm={2} md={3} lg={4} className="g-3 g-md-4" role="list">
        {openErrands.map((errand) => (
          <Col key={errand.id} role="listitem">
            <Card className="h-100 shadow-sm transition-all duration-200 hover-scale">
              {errand.images?.length > 0 && (
                <div className="card-img-top d-flex flex-wrap p-2">
                  {errand.images.slice(0, 4).map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Errand attachment ${idx + 1} for ${errand.title || 'errand'}`}
                      className="img-fluid"
                      style={{ maxWidth: '100px', margin: '5px', objectFit: 'cover', height: '100px' }}
                      loading="lazy"
                      aria-describedby={`errand-title-${errand.id}`}
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/100?text=Error';
                        e.currentTarget.alt = 'Failed to load attachment';
                      }}
                    />
                  ))}
                </div>
              )}
              <Card.Body className="d-flex flex-column">
                <Card.Title
                  className="text-primary mb-2"
                  id={`errand-title-${errand.id}`}
                  onClick={() => handleViewDetails(errand.id)}
                  style={{ cursor: 'pointer' }}
                  aria-label={`View details of ${errand.title || 'errand'}`}
                >
                  {errand.title || errand.description || 'Untitled Errand'}
                </Card.Title>
                <div className="mb-2">
                  <Badge bg={errand.isPrivate ? 'secondary' : 'info'} className="me-2">
                    {errand.isPrivate ? 'Private' : 'Public'}
                  </Badge>
                  {errand.isNegotiable && (
                    <Badge bg="warning" className="me-2 text-dark">
                      Negotiable
                    </Badge>
                  )}
                  {errand.category && (
                    <Badge bg="primary">{errand.category}</Badge>
                  )}
                </div>
                <Card.Text className="text-muted mb-1">📍 {errand.location || 'Not specified'}</Card.Text>
                {errand.geo && (
                  <Card.Text className="text-muted mb-1">
                    Lat: {errand.geo.lat}, Lng: {errand.geo.lng}
                  </Card.Text>
                )}
                <Card.Text className="text-muted mb-1">⏱️ Duration: {errand.duration || 'Flexible'}</Card.Text>
                <Card.Text className="fw-bold mt-2">
                  💰 Fee: {errand.currency} {errand.fee.toLocaleString()}
                </Card.Text>
                <Card.Text className="text-muted small mt-2">
                  Status: {errand.paymentStatus || 'Pending'} • Posted by: <Link to={`/profile/${errand.userId}`}>@{errand.requesterName}</Link>
                </Card.Text>
                <Card.Text className="text-muted small mt-2">
                  🖱️ {errand.clickCount} Clicks  ❤️{' '}
                  <Button
                    variant="link"
                    className="p-0 text-muted"
                    onClick={() => handleLike(errand.id, currentUser?.uid ? errand.likes.includes(currentUser.uid) : false)}
                    disabled={!currentUser?.uid}
                    aria-label={currentUser?.uid && errand.likes.includes(currentUser.uid) ? `Unlike ${errand.title || 'errand'}` : `Like ${errand.title || 'errand'}`}
                  >
                    {errand.likes.length} {currentUser?.uid && errand.likes.includes(currentUser.uid) ? 'Unlike' : 'Like'}
                  </Button>
                </Card.Text>
                <div className="mt-auto d-flex flex-column flex-sm-row gap-2">
                  <Link
                    to={`/errands/${errand.id}`}
                    className="btn btn-outline-primary w-100 transition-all duration-200 hover-scale"
                    onClick={() => handleViewDetails(errand.id)}
                    aria-label={`View details of ${errand.title || 'errand'}`}
                  >
                    View Details
                  </Link>
                  <Button
                    variant="success"
                    className="w-100 d-block d-sm-inline-block transition-all duration-200 hover-scale"
                    onClick={() => handleViewAndAccept(errand.userId, errand.id, errand.username)}
                    disabled={!currentUser?.uid || currentUser.uid === errand.userId}
                    aria-label={`Contact requester for ${errand.title || 'errand'}`}
                  >
                    Contact
                  </Button>
                  {currentUser?.uid === errand.userId && errand.status === 'open' && (
                    <Button
                      variant="danger"
                      className="w-100 d-block d-sm-inline-block transition-all duration-200 hover-scale"
                      onClick={() => handleDelete(errand.id, errand.userId)}
                      aria-label={`Delete ${errand.title || 'errand'}`}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      {modalState && (
        <MessageModal
          recipientId={modalState.recipientId}
          recipientUsername={modalState.username}
          errandId={modalState.errandId}
          show={true}
          onClose={closeModal}
        />
      )}
    </Container>
  );
};

export default OpenErrandsList;