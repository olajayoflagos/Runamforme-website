import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import ErrandCard from './ErrandCard';
import { useParams } from 'react-router-dom';
import {type Errand } from '../types';

const UsersErrandFeed: React.FC = () => {
  const { id: userId } = useParams<{ id: string }>();
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserErrands = async () => {
      if (!userId) return;

      setLoading(true);
      try {
        const q = query(
          collection(db, 'errands'),
          where('postedBy', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const errandsData: Errand[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Errand[];

        setErrands(errandsData);
      } catch (err) {
        console.error('Failed to fetch errands:', err);
        setError('Could not load errands.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserErrands();
  }, [userId]);

  if (loading) {
    return (
      <div className="my-4 text-center">
        <span className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger text-center mt-3">
        {error}
      </div>
    );
  }

  if (errands.length === 0) {
    return (
      <div className="alert alert-secondary text-center mt-3">
        This user has not posted any errands yet.
      </div>
    );
  }

  return (
    <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 mt-4">
      {errands.map((errand) => (
        <div key={errand.id} className="col">
          <ErrandCard errand={errand} />
        </div>
      ))}
    </div>
  );
};

export default UsersErrandFeed;
