// src/pages/ErrandDetailsPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Errand } from '../types';
import { Spinner } from 'react-bootstrap';

const ErrandDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [errand, setErrand] = useState<Errand | null>(null);
  const [posterUsername, setPosterUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchErrandAndUser = async () => {
      try {
        if (!id) throw new Error('No errand ID provided');

        // Fetch the errand
        const docRef = doc(db, 'errands', id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          throw new Error('Errand not found');
        }

        const errandData = { id: docSnap.id, ...docSnap.data() } as Errand;
        setErrand(errandData);

        // Fetch the poster's username using errand.uid
        if (errandData.uid) {
          const userDocRef = doc(db, 'users', errandData.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setPosterUsername(userData.username || 'Unknown');
          } else {
            setPosterUsername('Unknown');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load errand');
      } finally {
        setLoading(false);
      }
    };

    fetchErrandAndUser();
  }, [id]);

  if (loading) return <Spinner animation="border" className="d-block mx-auto mt-5" />;
  if (error) return <div className="alert alert-danger mt-5 text-center">{error}</div>;
  if (!errand) return null;

  return (
    <div className="container mt-4">
      <h2>{errand.description}</h2>
      <p><strong>Location:</strong> {errand.location}</p>
      <p><strong>Duration:</strong> {errand.duration}</p>
      <p><strong>Fee:</strong> ₦{errand.fee?.toLocaleString() ?? 0}</p>
      <p><strong>Status:</strong> {errand.status}</p>
      {posterUsername && (
        <p><strong>Posted by:</strong> {posterUsername}</p>
      )}
      <button className="btn btn-secondary mt-3" onClick={() => navigate(-1)}>Go Back</button>
    </div>
  );
};

export default ErrandDetailsPage;
