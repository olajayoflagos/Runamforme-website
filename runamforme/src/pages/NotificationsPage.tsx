import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { ListGroup, Alert, Spinner, Button, Badge } from 'react-bootstrap';
import type { Notification } from '../types';
import { useTheme } from '../contexts/ThemeContext';

const NotificationsPage: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const { theme } = useTheme();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limitCount, setLimitCount] = useState(50);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (err) {
      console.error('Error marking as read:', err);
      setError('Failed to mark notification as read.');
      setTimeout(() => setError(null), 2000);
    }
  };

  useEffect(() => {
    if (authLoading || !currentUser) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs: Notification[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // Ensure createdAt is present and valid
          if (!data || !data.createdAt || !(data.createdAt instanceof Timestamp)) return;
          notifs.push({ id: docSnap.id, ...data } as Notification);
        });
        setNotifications(notifs);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore listener error:', err);
        setError('Failed to load notifications.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, authLoading, limitCount]);

  const loadMore = () => setLimitCount((prev) => prev + 50);

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'message': return '💬';
      case 'follow': return '👤';
      case 'payment': return '💰';
      case 'review': return '⭐';
      default: return '🔔';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container my-5 text-center">
        <Spinner animation="border" variant={theme === 'dark' ? 'light' : 'primary'} />
        <p>Loading notifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container my-5">
        <Alert variant="danger">{error}</Alert>
      </div>
    );
  }

  return (
    <div className="container my-5">
      <h2 className="mb-4">Notifications</h2>
      {notifications.length === 0 ? (
        <Alert variant="info">No notifications yet.</Alert>
      ) : (
        <>
          <ListGroup>
            {notifications.map((notif) => (
              <ListGroup.Item
                key={notif.id}
                className={`d-flex justify-content-between align-items-start ${
                  notif.read ? 'text-muted' : ''
                } ${theme === 'dark' ? 'bg-dark text-light' : ''}`}
                onClick={() => !notif.read && markAsRead(notif.id)}
                role="button"
              >
                <div>
                  <div className="fw-bold">
                    {getNotificationIcon(notif.type)} {notif.message}
                  </div>
                  <div className="small text-muted">
                    {notif.createdAt?.toDate?.().toLocaleString?.() || 'Unknown time'}
                  </div>
                </div>
                {!notif.read && (
                  <Badge bg="danger" pill className="ms-2 mt-1" aria-label="Unread notification">
                    New
                  </Badge>
                )}
              </ListGroup.Item>
            ))}
          </ListGroup>

          {notifications.length >= limitCount && (
            <div className="text-center mt-3">
              <Button variant="outline-primary" onClick={loadMore}>
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotificationsPage;
