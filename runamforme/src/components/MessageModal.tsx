import React, { useState, useRef, useEffect } from 'react';
import { addDoc, collection, serverTimestamp, doc, setDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface MessageModalProps {
  recipientId: string;
  recipientUsername?: string;
  show: boolean;
  onClose: () => void;
  errandId?: string;
  textOnly?: boolean; // ✅ ADD THIS LINE
}


const MessageModal: React.FC<MessageModalProps> = ({ 
  recipientId, 
  recipientUsername, 
  show, 
  onClose, 
  errandId,
  textOnly = false
}) => {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actualRecipientUsername, setActualRecipientUsername] = useState<string | undefined>(recipientUsername);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!recipientUsername) {
      const fetchUsername = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', recipientId));
          setActualRecipientUsername(userDoc.exists() ? userDoc.data().username || 'User' : 'User');
        } catch (err) {
          console.error("Failed to fetch username:", err);
          setActualRecipientUsername('User');
        }
      };
      fetchUsername();
    }
  }, [recipientId, recipientUsername]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [show, onClose]);

  const checkErrandLimit = async (userId: string): Promise<boolean> => {
    try {
      const q = query(
        collection(db, 'errands'),
        where('runnerUid', '==', userId),
        where('status', 'in', ['open', 'pending'])
      );
      const snapshot = await getDocs(q);
      return snapshot.size < 2;
    } catch (err) {
      console.error("Error checking errand limit:", err);
      return false;
    }
  };
if (!recipientId || !currentUser?.uid) {
  setError("Missing recipient or sender information.");
  return;
}
  if (recipientId === currentUser.uid) {
    setError("You cannot send a message to yourself.");
    return;
  }
  const handleSendMessage = async () => {
    if (!currentUser?.uid) {
      setError('You must be logged in to send a message.');
      return;
    }
    if (!message.trim() && imageFiles.length === 0) {
      setError('Please enter a message or select an image.');
      return;
    }

    try {
      if (!(await checkErrandLimit(currentUser.uid))) {
        setError('You have reached the limit of 2 active errands as a runner.');
        return;
      }

      setSending(true);
      setError(null);
      setSuccess(null);

      const conversationId = 
        currentUser.uid < recipientId 
          ? `${currentUser.uid}_${recipientId}` 
          : `${recipientId}_${currentUser.uid}`;

      const maxFileSize = 5 * 1024 * 1024;
      for (const file of imageFiles) {
        if (file.size > maxFileSize) throw new Error(`Image ${file.name} exceeds 5MB limit.`);
        if (!file.type.startsWith('image/')) throw new Error(`File ${file.name} is not an image.`);
      }

      const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || process.env.REACT_APP_IMGBB_API_KEY;
if (!IMGBB_API_KEY) throw new Error('Image upload service not configured.');


      const imageUrls: string[] = [];
      for (const file of imageFiles.slice(0, 4)) {
        const formData = new FormData();
        formData.append('image', file);
        const response = await axios.post(
          `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, 
          formData
        );
        const { data } = response.data as { data: { url: string } };
if (!data?.url) throw new Error('Failed to upload image.');
imageUrls.push(data.url);


      }

      await setDoc(
        doc(db, 'conversations', conversationId),
        {
          participants: [currentUser.uid, recipientId].sort(),
          lastMessage: message || (imageUrls.length ? 'Image sent' : ''),
          lastMessageTimestamp: serverTimestamp(),
          readStatus: { [currentUser.uid]: true, [recipientId]: false },
          errandId: errandId || null,
        },
        { merge: true }
      );

      await addDoc(
        collection(db, 'conversations', conversationId, 'messages'),
        {
          conversationId,
          senderId: currentUser.uid,
          content: message,
          images: imageUrls,
          createdAt: serverTimestamp(),
          isRead: false,
        }
      );

      const senderDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const senderUsername = senderDoc.exists() 
        ? senderDoc.data().username ?? 'A user' 
        : 'A user';

      await addDoc(collection(db, 'notifications'), {
        userId: recipientId,
        type: 'message',
        relatedId: conversationId,
        message: `@${senderUsername} sent you a message${errandId ? ' about an errand' : ''}.`,
        read: false,
        createdAt: serverTimestamp(),
      });

      setSuccess('Message sent successfully!');
      setMessage('');
      setImageFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error("Message sending error:", error);
      setError(error instanceof Error ? error.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
  return () => {
    imageFiles.forEach((file) => URL.revokeObjectURL(URL.createObjectURL(file)));
  };
}, [imageFiles]);

if (!show) return null;


  const suggestedMessages = [
    'I’m interested in this errand.',
    'Can we discuss this errand?',
    'Hello! I’d like to help with your errand.'
  ];

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog" aria-modal="true" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered" ref={modalRef}>
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h2 className="modal-title fs-5" id="messageModalTitle">
              Message {actualRecipientUsername ? `@${actualRecipientUsername}` : 'User'}
            </h2>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} disabled={sending} aria-label="Close" data-bs-dismiss="modal" />
          </div>

          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="mb-2">
              {suggestedMessages.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn btn-sm btn-outline-secondary me-2 mb-2"
                  onClick={() => setMessage(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <textarea
              id="messageTextarea"
              className="form-control mb-3"
              rows={4}
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
            />

            {!textOnly && imageFiles.length > 0 && (
              <div className="mb-3 d-flex gap-2 flex-wrap">
                {imageFiles.map((file, idx) => (
                  <img
                    key={idx}
                    src={URL.createObjectURL(file)}
                    alt={`preview-${idx}`}
                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '5px' }}
                  />
                ))}
              </div>
            )}
            

    </div>

  <>
    <input
      id="fileInput"
      type="file"
      accept="image/*"
      multiple
      ref={fileInputRef}
      onChange={(e) => setImageFiles(Array.from(e.target.files || []).slice(0, 4))}
      disabled={sending}
      className="form-control"
    />
    <div className="form-text">Maximum 3MB per image. Attach up to 4 images.</div>
  </>
){'}'}


          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={sending}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleSendMessage} disabled={(!message.trim() && imageFiles.length === 0) || sending}>
              {sending ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" /> Sending...</> : 'Send Message'}
              <span className="visually-hidden">{sending ? 'Sending message' : 'Send message'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
