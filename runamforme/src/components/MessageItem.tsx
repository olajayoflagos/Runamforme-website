import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useTheme } from '../contexts/ThemeContext';
import { Alert } from 'react-bootstrap';
import type { Message, UserProfile } from '../types';

interface MessageItemProps {
  message: Message;
  currentUserId: string;
  recipientProfile?: UserProfile;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  recipientProfile,
}) => {
  const { theme } = useTheme();
  const [senderProfile, setSenderProfile] = useState<UserProfile | null>(null);
  const isCurrentUser = message.senderId === currentUserId;
  const isConsentMessage = message.type === 'consent';

  useEffect(() => {
    const loadSender = async () => {
      if (isCurrentUser || senderProfile) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', message.senderId));
        if (userDoc.exists()) {
          setSenderProfile({
            id: userDoc.id,
            ...userDoc.data(),
          } as UserProfile);
        }
      } catch (error) {
        console.error('Error loading sender profile:', error);
      }
    };

    loadSender();
  }, [message.senderId, isCurrentUser, senderProfile]);

  const displayProfile = isCurrentUser ? null : (recipientProfile || senderProfile);

  return (
    <div className={`d-flex mb-2 ${isCurrentUser ? 'justify-content-end' : 'justify-content-start'}`}>
      <div
        className={`rounded p-2 ${isCurrentUser ? 'bg-primary text-white' : theme === 'dark' ? 'bg-dark text-light' : 'bg-light'} ${isConsentMessage ? 'border border-info' : ''}`}
        style={{ maxWidth: '80%', width: 'fit-content' }}
      >
        {isConsentMessage ? (
          <Alert variant="info" className="mb-0 p-2">
            <strong>Consent Action:</strong> {message.content}
          </Alert>
        ) : (
          <>
            {displayProfile && !isCurrentUser && (
              <div className="d-flex align-items-center mb-1">
                <img
                  src={displayProfile.avatarUrl || '/default-avatar.png'}
                  alt={displayProfile.username}
                  className="rounded-circle me-2"
                  style={{ width: '24px', height: '24px', objectFit: 'cover' }}
                />
                <strong>@{displayProfile.username}</strong>
              </div>
            )}
            <div className="mb-1">{message.content}</div>
            <div className={`small ${isCurrentUser ? 'text-white-50' : 'text-muted'}`}>
              {message.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageItem;