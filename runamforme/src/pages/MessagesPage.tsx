// src/pages/MessagesPage.tsx

import React, { useEffect, useState, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react'; // Corrected: Import FormEvent and ChangeEvent as types
import { useParams } from 'react-router-dom';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  // Removed 'where' import as it's not used in this file's main queries
  type Timestamp, // Kept as it's used in the types import below
  type FieldValue, // Kept as it's used in the types import below
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import type { Message, MessageWriteData, Conversation, ConversationWriteData, UserProfile } from '../types'; // Keep importing types from your file

import MessageItem from '../components/MessageItem';

const MessagesPage: React.FC = () => {
  const { userId: recipientUserId } = useParams<{ userId: string }>();

  const { currentUser, loading: authLoading } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [newMessageText, setNewMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingError, setSendingError] = useState<string | null>(null);
  const [sendingSuccess, setSendingSuccess] = useState(false);


  const [conversationId, setConversationId] = useState<string | null>(null);
  const [recipientProfile, setRecipientProfile] = useState<UserProfile | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser?.uid || !recipientUserId) {
      if (!authLoading) {
         setMessagesLoading(false);
         setMessagesError("Invalid recipient or user not logged in.");
      }
      return;
    }

    const uids = [currentUser.uid, recipientUserId].sort();
    const generatedConversationId = `${uids[0]}_${uids[1]}`;
    setConversationId(generatedConversationId);

    const fetchRecipientProfile = async () => {
        try {
            const userDoc = await getDoc(doc(db, 'users', recipientUserId));
            // Corrected type assertion to Omit<UserProfile, 'id'>
            if (userDoc.exists()) {
                const data = userDoc.data() as Omit<UserProfile, 'id'>;
                const completeProfile: UserProfile = {
                   id: userDoc.id, uid: userDoc.id, name: data.name ?? 'Unnamed User',
                   username: data.username ?? 'unknown_user', email: data.email ?? '',
                   userType: data.userType ?? 'both', createdAt: data.createdAt,
                   followersCount: data.followersCount ?? 0, followingCount: data.followingCount ?? 0,
                   likes: data.likes ?? 0, bio: data.bio ?? '', avatarUrl: data.avatarUrl ?? '',
                   isVerified: data.isVerified ?? false,
                };
                setRecipientProfile(completeProfile);
            } else {
                setRecipientProfile(null);
                setMessagesError("Recipient user profile not found.");
            }
        } catch (error) {
            console.error("Failed to fetch recipient profile:", error);
            setRecipientProfile(null);
            setMessagesError("Failed to load recipient profile details.");
        }
    };

    fetchRecipientProfile();



  }, [currentUser, recipientUserId, authLoading, db]);


  useEffect(() => {
    if (!conversationId || !currentUser?.uid) {
       if (!conversationId && !authLoading) {
           setMessagesLoading(false);
       }
       return;
    }

    console.log(`MessagesPage: Setting up message listener for conversation: ${conversationId}`);
    setMessagesLoading(true);

    const messagesCollectionRef = collection(db, 'conversations', conversationId, 'messages');

    const messagesQuery = query(messagesCollectionRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      console.log(`MessagesPage: Received new message snapshot (${snapshot.docs.length} documents).`);
      const fetchedMessages: Message[] = snapshot.docs.map(doc => {
        
        const data = doc.data() as Omit<Message, 'id'>;
        return {
          id: doc.id, // Explicitly use the document ID
          ...data, // Spread the rest of the data fields
          senderUid: data.senderUid ?? '', recipientUid: data.recipientUid ?? '',
          text: data.text ?? '', createdAt: data.createdAt,
          conversationId: data.conversationId ?? conversationId,
          isRead: data.isRead ?? false, mediaUrl: data.mediaUrl ?? '',
        };
      });

      setMessages(fetchedMessages);
      setMessagesLoading(false);
      if (messagesError) setMessagesError(null);

      setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);

    }, (error) => {
      console.error('MessagesPage: Real-time message listener error:', error);
      setMessagesLoading(false);
      setMessagesError('Failed to load messages. Please try again.');
    });

    return () => {
        console.log("MessagesPage: Cleaning up Firestore message listener.");
        unsubscribe();
        setMessages([]);
        setMessagesError(null);
        setMessagesLoading(true);
    };

  }, [conversationId, currentUser?.uid, db]);


  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();

    const textToSend = newMessageText.trim();
    if (!textToSend) {
      setSendingError("Message cannot be empty.");
      return;
    }
    if (!currentUser?.uid || !recipientUserId || !conversationId) {
      console.error("MessagesPage: Cannot send message. Missing user info or conversation ID.");
      setSendingError("Cannot send message. Please try reloading.");
      return;
    }

    setSending(true);
    setSendingError(null);
    setSendingSuccess(false);

    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);

      const conversationWriteData: ConversationWriteData = {
        participantUids: [currentUser.uid, recipientUserId].sort(),
        createdAt: conversationSnap.exists() ? (conversationSnap.data() as Conversation).createdAt : serverTimestamp(),
        lastMessageText: textToSend,
        lastMessageTimestamp: serverTimestamp(),
        readStatus: { [currentUser.uid]: true, [recipientUserId]: false },
      };

      await setDoc(conversationRef, conversationWriteData, { merge: true });

      const messagesCollectionRef = collection(db, 'conversations', conversationId, 'messages');
      const newMessage: MessageWriteData = {
        conversationId: conversationId,
        senderUid: currentUser.uid,
        recipientUid: recipientUserId,
        text: textToSend,
        createdAt: serverTimestamp(),
        isRead: false,
      };

      await addDoc(messagesCollectionRef, newMessage);
      console.log("MessagesPage: Message sent successfully.");

      setNewMessageText('');
      setSendingSuccess(true);

    } catch (error) {
      console.error('MessagesPage: Error sending message:', error);
      setSendingError('Failed to send message. Please try again.');
      setSendingSuccess(false);
    } finally {
      setSending(false);
      if (sendingSuccess) {
         setTimeout(() => setSendingSuccess(false), 2000);
      }
    }
  };



  if (authLoading) {
    return (
      <div className="container my-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Loading user session...</p>
      </div>
    );
  }

  if (!currentUser || !recipientUserId || !conversationId) {
       return (
           <div className="container my-5">
               <div className="alert alert-danger text-center">
                   {messagesError || "Cannot display message page. Ensure you are logged in and have a valid recipient."}
               </div>
           </div>
       );
  }

  return (
    <div className="container my-3 d-flex flex-column vh-100">
      <div className="card shadow-sm p-3 mb-3">
          {recipientProfile ? (
              <div className="d-flex align-items-center">
                  {recipientProfile.avatarUrl && (
                      <img src={recipientProfile.avatarUrl} alt={`${recipientProfile.username}'s avatar`}
                           className="rounded-circle me-3" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
                  )}
                  <h5>Chat with @{recipientProfile.username || recipientProfile.name || 'Unnamed User'}</h5>
              </div>
          ) : (
              <h5>Loading chat...</h5>
          )}
      </div>

      <div className="flex-grow-1 overflow-auto mb-3 border rounded p-3">
        {messagesLoading ? (
          <p className="text-center">Loading messages...</p>
        ) : messagesError ? (
          <div className="alert alert-danger text-center">{messagesError}</div>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted">Start a conversation!</p>
        ) : (
          <div>
            {/* Inside MessagesPage.tsx, within the messages list div */}
{messages.map((message) => (
  <MessageItem
    key={message.id} // Crucially use the message document ID as the key
    message={message} // Pass the message data object
    isSentByCurrentUser={message.senderUid === currentUser?.uid} // Calculate if the current user sent it
    // Pass currentUser if needed inside MessageItem for other logic
    // currentUser={currentUser}
  />
))}
<div ref={messagesEndRef} /> {/* The auto-scroll ref */}

          </div>
        )}
      </div>

      <div className="card p-3">
          <form onSubmit={handleSendMessage} className="d-flex">
              <textarea
                className="form-control me-2 flex-grow-1"
                rows={1}
                placeholder="Type a message..."
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                disabled={!conversationId || sending}
                onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault(); // Prevent default line break
                        handleSendMessage(e as any); // Call the send function
                    }
                }}
              />
              {/* --- Continued in Part 4 --- */}
// src/pages/MessagesPage.tsx
// --- Continued from Part 3 ---

              <button
                type="submit"
                className="btn btn-primary"
                disabled={!newMessageText.trim() || sending || !conversationId} // Disable if empty, sending, or no conv ID
              >
                {sending ? (
                   <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  'Send'
                )}
              </button>
          </form>
          {sendingError && <small className="text-danger mt-2 d-block">{sendingError}</small>}
           {sendingSuccess && <small className="text-success mt-2 d-block">Message sent!</small>}
      </div>
    </div>
  );
};

// Export the component
export default MessagesPage;
