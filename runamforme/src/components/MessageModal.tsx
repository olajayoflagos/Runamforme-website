// src/components/MessageModal.tsx
import { useState } from 'react';
import { addDoc, collection, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

export interface MessageModalProps {
  recipientId: string;
  show: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
}

const MessageModal: React.FC<MessageModalProps> = ({ recipientId, onClose }) => {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState('');

  const sendMessage = async () => {
    if (!currentUser || !message.trim()) return;

    // Create a consistent conversation ID
    const conversationId =
      currentUser.uid < recipientId
        ? `${currentUser.uid}_${recipientId}`
        : `${recipientId}_${currentUser.uid}`;

    try {
      // Create or update the conversation
      await setDoc(doc(db, 'conversations', conversationId), {
        participants: [currentUser.uid, recipientId],
        lastMessage: message,
        updatedAt: serverTimestamp()
      });

      // Add the message to the subcollection
      await addDoc(collection(db, 'messages', conversationId, 'messages'), {
        senderId: currentUser.uid,
        text: message,
        timestamp: serverTimestamp()
      });

      setMessage('');
      onClose();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      role="dialog"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Send Message</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <textarea
              className="form-control"
              rows={4}
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={sendMessage}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
