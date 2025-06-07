// src/pages/EditErrandPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import type { Errand } from '../types';
import { Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';


const EditErrandPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [errand, setErrand] = useState<Partial<Errand>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [geo, setGeo] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  useEffect(() => {
    const fetchErrand = async () => {
      if (!id || !currentUser) return;
      try {
        const docRef = doc(db, 'errands', id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data() as Errand;
          if (data.userId !== currentUser.uid) {
            setMessage('You are not authorized to edit this errand.');
          } else {
            setErrand(data);
            setGeo(data.geo || { lat: null, lng: null });
          }
        } else {
          setMessage('Errand not found.');
        }
      } catch (error) {
        console.error('Error loading errand:', error);
        setMessage('Failed to load errand.');
      } finally {
        setLoading(false);
      }
    };

    fetchErrand();
  }, [id, currentUser]);

  const handleLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setMessage('Unable to get location.')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !currentUser || !errand.title || !errand.fee || !errand.location) {
      setMessage('Please fill in all required fields.');
      return;
    }

    try {
      const docRef = doc(db, 'errands', id);
      await updateDoc(docRef, {
        ...errand,
        geo,
        updatedAt: serverTimestamp(),
      });
      setMessage('Errand updated successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error updating errand:', error);
      setMessage('Failed to update errand.');
    }
  };

  if (loading) {
    return <div className="text-center my-5"><Spinner animation="border" /></div>;
  }

  return (
    <div className="container my-5">
      <h2>Edit Errand</h2>

      {message && <Alert variant="info">{message}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Title *</Form.Label>
          <Form.Control
            type="text"
            value={errand.title || ''}
            onChange={(e) => setErrand({ ...errand, title: e.target.value })}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            value={errand.description || ''}
            onChange={(e) => setErrand({ ...errand, description: e.target.value })}
          />
        </Form.Group>

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Location *</Form.Label>
              <Form.Control
                type="text"
                value={errand.location || ''}
                onChange={(e) => setErrand({ ...errand, location: e.target.value })}
                required
              />
            </Form.Group>
          </Col>
          <Col md={6} className="d-flex align-items-end">
            <Button variant="outline-secondary" onClick={handleLocation}>Use My Location</Button>
          </Col>
        </Row>

        <Form.Group className="mb-3">
          <Form.Label>Fee (₦) *</Form.Label>
          <Form.Control
            type="number"
            min={0}
            value={errand.fee || ''}
            onChange={(e) => setErrand({ ...errand, fee: parseFloat(e.target.value) })}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Duration</Form.Label>
          <Form.Control
            type="text"
            value={errand.duration || ''}
            onChange={(e) => setErrand({ ...errand, duration: e.target.value })}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Category</Form.Label>
          <Form.Control
            type="text"
            value={errand.category || ''}
            onChange={(e) => setErrand({ ...errand, category: e.target.value })}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Check
            type="checkbox"
            label="Private"
            checked={errand.isPrivate || false}
            onChange={(e) => setErrand({ ...errand, isPrivate: e.target.checked })}
          />
        </Form.Group>

        {errand.images && errand.images.length > 0 && (
          <div className="mb-3">
            <strong>Uploaded Images:</strong>
            <div className="d-flex flex-wrap gap-2 mt-2">
              {errand.images.map((url, idx) => (
                <img key={idx} src={url} alt={`Uploaded ${idx}`} style={{ width: 100, height: 100, objectFit: 'cover' }} />
              ))}
            </div>
          </div>
        )}

        <Button type="submit" variant="primary" className="mt-3">
          Update Errand
        </Button>
      </Form>
    </div>
  );
};

export default EditErrandPage;
