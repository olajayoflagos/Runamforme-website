import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Card, ListGroup, Spinner, Alert } from 'react-bootstrap';
import type { Review, UserProfile } from '../types';

interface ReviewListProps {
  userId: string;
}

const ReviewList: React.FC<ReviewListProps> = ({ userId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewerProfiles, setReviewerProfiles] = useState<{ [key: string]: UserProfile }>({});

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('reviewedId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(reviewsQuery);
        const fetchedReviews = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }) as Review);

        // Fetch reviewer profiles
        const reviewerIds = [...new Set(fetchedReviews.map((review) => review.reviewerId))];
        const profiles: { [key: string]: UserProfile } = {};
        for (const id of reviewerIds) {
          const userDoc = await getDoc(doc(db, 'users', id));
          if (userDoc.exists()) {
            profiles[id] = { id: userDoc.id, ...userDoc.data() } as UserProfile;
          }
        }

        setReviews(fetchedReviews);
        setReviewerProfiles(profiles);
        setLoading(false);
      } catch (err) {
        setError('Failed to load reviews');
        setLoading(false);
      }
    };

    fetchReviews();
  }, [userId]);

  if (loading) {
    return (
      <div className="text-center py-3">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-primary text-white">
        <h3 className="h5 mb-0">Reviews</h3>
      </Card.Header>
      <Card.Body className="p-0">
        {reviews.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-muted">No reviews yet</p>
          </div>
        ) : (
          <ListGroup variant="flush">
            {reviews.map((review) => (
              <ListGroup.Item key={review.id}>
                <div className="d-flex align-items-center">
                  <img
                    src={reviewerProfiles[review.reviewerId]?.avatarUrl || '/default-avatar.png'}
                    alt={reviewerProfiles[review.reviewerId]?.username || 'Reviewer'}
                    className="rounded-circle me-2"
                    style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                  />
                  <div>
                    <strong>@{reviewerProfiles[review.reviewerId]?.username || 'Unknown'}</strong>
                    <div className="d-flex gap-1 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <i
                          key={i}
                          className={`bi bi-star${i < review.rating ? '-fill' : ''} text-warning`}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <p className="mb-0">{review.comment}</p>
                    <small className="text-muted">
                      {'seconds' in (review.createdAt ?? {})
                        ? new Date((review.createdAt as any).seconds * 1000).toLocaleDateString()
                        : 'Unknown date'}
                    </small>
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
  );
};

export default ReviewList;