import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Card, ListGroup, Spinner, Alert } from 'react-bootstrap';
import type { UserProfile, Errand } from '../types';
import UsersErrandFeed from './UsersErrandFeed';

interface FollowersFollowingListProps {
  userId: string;
  type: 'followers' | 'following';
}

const FollowersFollowingList: React.FC<FollowersFollowingListProps> = ({ userId, type }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userErrands, setUserErrands] = useState<Record<string, Errand[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsersAndErrands = async () => {
      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }
        const userData = userDoc.data() as UserProfile;
        const userIds = type === 'followers' ? userData.followers : userData.following;

        if (!userIds?.length) {
          setUsers([]);
          setLoading(false);
          return;
        }

        const batchSize = 10;
        const userBatches = [];
        for (let i = 0; i < userIds.length; i += batchSize) {
          userBatches.push(userIds.slice(i, i + batchSize));
        }

        const fetchedUsers: UserProfile[] = [];
        for (const batch of userBatches) {
          const q = query(collection(db, 'users'), where('uid', 'in', batch));
          const snapshot = await getDocs(q);
          snapshot.forEach(doc => {
            fetchedUsers.push({
              id: doc.id,
              ...doc.data(),
            } as UserProfile);
          });
        }
        setUsers(fetchedUsers);

        const errandsByUser: Record<string, Errand[]> = {};
        for (const user of fetchedUsers) {
          const q = query(
            collection(db, 'errands'),
            where('userId', '==', user.id),
            where('isArchived', '==', false),
            limit(3)
          );
          const snapshot = await getDocs(q);
          errandsByUser[user.id] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          } as Errand));
        }
        setUserErrands(errandsByUser);

        setLoading(false);
      } catch (err) {
        setError('Failed to load users or errands');
        setLoading(false);
      }
    };

    fetchUsersAndErrands();
  }, [userId, type]);

  if (loading) {
    return (
      <div className="text-center py-3">
        <Spinner animation="border" variant="primary" aria-label="Loading users" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-primary text-white">
        <h3 className="h5 mb-0">{type === 'followers' ? 'Followers' : 'Following'}</h3>
      </Card.Header>
      <Card.Body className="p-0">
        {users.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-muted">No {type} yet</p>
          </div>
        ) : (
          <ListGroup variant="flush">
            {users.map((user) => (
              <ListGroup.Item key={user.id} className="p-3">
                <div className="d-flex align-items-center mb-2">
                  <img
                    src={user.avatarUrl || '/default-avatar.png'}
                    alt={`${user.username}'s avatar`}
                    className="rounded-circle me-2"
                    style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.src = '/default-avatar.png';
                    }}
                  />
                  <Link to={`/profile/${user.username}`} className="text-primary fw-bold">
                    @{user.username}
                  </Link>
                </div>
                {userErrands[user.id]?.length > 0 && (
                  <UsersErrandFeed errands={userErrands[user.id]} />
                )}
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
  );
};

export default FollowersFollowingList;

function limit(_arg0: number): import("@firebase/firestore").QueryConstraint {
  throw new Error('Function not implemented.');
}
