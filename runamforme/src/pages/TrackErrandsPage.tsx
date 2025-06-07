import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import type { Errand, ProgressUpdate } from '../types';
import { Container, Card, Row, Col, Form, Button, Alert, Spinner, ListGroup } from 'react-bootstrap';

interface TrackErrandsPageProps {}

const TrackErrandsPage: React.FC<TrackErrandsPageProps> = () => {
  const { id: errandId } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const [errand, setErrand] = useState<Errand | null>(null);
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateForm, setUpdateForm] = useState({
    message: '',
    photo: null as File | null,
    location: { lat: 0, lng: 0 },
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid || !errandId) {
      setError('Invalid access. Please log in or provide a valid errand ID.');
      setLoading(false);
      return;
    }

    const fetchErrand = async () => {
      try {
        const errandRef = doc(db, 'errands', errandId);
        const errandSnap = await getDoc(errandRef);
        if (!errandSnap.exists()) {
          setError('Errand not found.');
          setLoading(false);
          return;
        }
        const errandData = { id: errandSnap.id, ...errandSnap.data() } as Errand;
        if (errandData.userId !== currentUser.uid && errandData.runnerUid !== currentUser.uid) {
          setError('You are not authorized to track this errand.');
          setLoading(false);
          return;
        }
        setErrand(errandData);
      } catch (err) {
        console.error('Error fetching errand:', err);
        setError('Failed to load errand details.');
      }
    };

    const unsubscribeProgress = onSnapshot(
      query(collection(db, `errands/${errandId}/progress`), orderBy('createdAt', 'desc')),
      (snap) => {
        try {
          const updates = snap.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
          } as unknown as ProgressUpdate));
          setProgressUpdates(updates);
        } catch (err) {
          console.error('Progress snapshot error:', err);
          setError('Failed to load progress updates.');
        }
      },
      (err) => {
        console.error('Error fetching progress:', err);
        setError('Failed to load progress updates.');
      }
    );

    fetchErrand();
    setLoading(false);
    return () => unsubscribeProgress();
  }, [currentUser, errandId]);

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !errand || errand.runnerUid !== currentUser.uid) {
      setError('Only the assigned runner can submit updates.');
      return;
    }
    setSubmitting(true);
    try {
      let photoUrl = '';
      if (updateForm.photo) {
        const storageRef = ref(storage, `errands/${errandId}/progress/${Date.now()}_${updateForm.photo.name}`);
        await uploadBytes(storageRef, updateForm.photo);
        photoUrl = await getDownloadURL(storageRef);
      }

      const progressRef = collection(db, `errands/${errandId}/progress`);
      await addDoc(progressRef, {
        message: updateForm.message,
        photoUrl,
        location: updateForm.location,
        createdAt: serverTimestamp(),
        runnerUid: currentUser.uid,
      });

      // Notify requester
      await addDoc(collection(db, 'notifications'), {
        userId: errand.userId,
        type: 'progress_update',
        errandId,
        message: `New progress update for "${errand.title}" by @${currentUser.displayName || 'Runner'}.`,
        createdAt: serverTimestamp(),
        read: false,
      });

      setUpdateForm({ message: '', photo: null, location: { lat: 0, lng: 0 } });
    } catch (err) {
      console.error('Error submitting update:', err);
      setError('Failed to submit update. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLocationUpdate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUpdateForm(prev => ({
            ...prev,
            location: { lat: position.coords.latitude, lng: position.coords.longitude },
          }));
        },
        () => {
          setError('Failed to get location. Please enable location services.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" variant="primary" aria-label="Loading errand" />
      </Container>
    );
  }

  if (error || !errand) {
    return (
      <Container className="my-5">
        <Alert variant="danger">{error || 'Errand not found.'}</Alert>
      </Container>
    );
  }

  const isRunner = currentUser?.uid === errand.runnerUid;

  return (
    <Container className="my-4">
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-primary text-white">
          <h3 className="h5 mb-0">Track Errand: {errand.title}</h3>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <p><strong>Description:</strong> {errand.description}</p>
              <p><strong>Fee:</strong> ₦{errand.fee.toLocaleString()}</p>
              <p><strong>Status:</strong> {errand.status}</p>
            </Col>
            <Col md={6}>
              <p><strong>Location:</strong> {errand.location || 'N/A'}</p>
              <p><strong>Payment Status:</strong> {errand.paymentStatus || 'Pending'}</p>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {isRunner && (
        <Card className="shadow-sm mb-4">
          <Card.Header>Submit Progress Update</Card.Header>
          <Card.Body>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <Form onSubmit={handleUpdateSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Update Message</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={updateForm.message}
                  onChange={(e) => setUpdateForm({ ...updateForm, message: e.target.value })}
                  placeholder="Describe your progress..."
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Upload Photo (Proof)</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const target = e.target as HTMLInputElement;
                    setUpdateForm({ ...updateForm, photo: target.files?.[0] || null });
                  }}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Button
                  variant="outline-primary"
                  onClick={handleLocationUpdate}
                  disabled={submitting}
                  aria-label="Update location"
                >
                  Add Current Location
                </Button>
                {updateForm.location.lat !== 0 && (
                  <p className="mt-2">
                    Location: Lat: {updateForm.location.lat}, Lng: {updateForm.location.lng}
                  </p>
                )}
              </Form.Group>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                aria-label="Submit progress update"
              >
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Submitting...
                  </>
                ) : 'Submit Update'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      )}

      <Card className="shadow-sm">
        <Card.Header>Progress Updates</Card.Header>
        <Card.Body>
          {progressUpdates.length === 0 ? (
            <p className="text-muted">No progress updates yet.</p>
          ) : (
            <ListGroup variant="flush">
              {progressUpdates.map((update) => (
                <ListGroup.Item key={update.id}>
                  <p><strong>Message:</strong> {update.message}</p>
                  {update.photoUrl && (
                    <img
                      src={String(update.photoUrl)}
                      alt="Progress proof"
                      style={{ maxWidth: '200px', marginBottom: '10px' }}
                    />
                  )}
                  {update.location && typeof update.location === 'object' && 'lat' in update.location && 'lng' in update.location && (
  <p>
    <strong>Location:</strong> Lat: {(update.location as { lat: number; lng: number }).lat}, 
    Lng: {(update.location as { lat: number; lng: number }).lng}
  </p>
)}


<p><small>Posted: {update.createdAt && typeof update.createdAt === 'object' && 'toDate' in update.createdAt
  ? (update.createdAt as any).toDate().toLocaleString()
  : ''}
</small></p>


                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default TrackErrandsPage;