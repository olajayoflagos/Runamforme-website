// MessagesPage.tsx - Complete Corrected Version
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  where,
  getDocs,
  documentId,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import MessageItem from '../components/MessageItem';
import { Button, Form, InputGroup, Alert, Spinner, Badge, ListGroup, Image, Container } from 'react-bootstrap';
import type { Message, Conversation, UserProfile, Errand } from '../types';

interface ConversationListItem extends Conversation {
  recipientProfile?: UserProfile | null;
  isUnread?: boolean;
}

const MessagesPage: React.FC = () => {
  const { conversationId: paramConversationId } = useParams<{ conversationId?: string }>();
  const { currentUser, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State declarations
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationsListLoading, setConversationsListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [recipient, setRecipient] = useState<UserProfile | null>(null);
  const [errand, setErrand] = useState<Errand | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversationsList, setConversationsList] = useState<ConversationListItem[]>([]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      if (Notification.permission === 'denied') {
        console.warn('Notification permission denied by the user.');
      } else {
        try {
          await Notification.requestPermission();
        } catch (err) {
          console.error('Error requesting notification permission:', err);
        }
      }
    }
  }, []);

  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  // Load conversation data when paramConversationId changes
  useEffect(() => {
    if (!paramConversationId) {
      setConversation(null);
      setMessages([]);
      setRecipient(null);
      setErrand(null);
      setUnreadCount(0);
      setConversationLoading(false);
      return;
    }

    if (!isAuthenticated || !currentUser?.uid) {
      setError('You must be logged in to view messages.');
      setLoading(false);
      setConversationLoading(false);
      return;
    }

    setConversationLoading(true);
    setLoading(true);
    setError(null);

    const loadConversationData = async () => {
      try {
        const convRef = doc(db, 'conversations', paramConversationId);
        const convSnap = await getDoc(convRef);

        if (!convSnap.exists()) {
          throw new Error('Conversation not found.');
        }

        const convData = { id: convSnap.id, ...convSnap.data() } as Conversation;

        if (!convData.participants.includes(currentUser.uid)) {
          throw new Error('You are not a participant in this conversation.');
        }

        setConversation(convData);

        const recipientId = convData.participants.find((id) => id !== currentUser.uid);
        if (recipientId) {
          const recipientRef = doc(db, 'users', recipientId);
          const recipientSnap = await getDoc(recipientRef);
          setRecipient(recipientSnap.exists() ? 
            { id: recipientSnap.id, ...recipientSnap.data() } as UserProfile : 
            null
          );
        } else {
          setRecipient(null);
        }

        if (convData.errandId) {
          const errandRef = doc(db, 'errands', convData.errandId);
          const errandSnap = await getDoc(errandRef);
          setErrand(errandSnap.exists() ? 
            { id: errandSnap.id, ...errandSnap.data() } as Errand : 
            null
          );
        } else {
          setErrand(null);
        }

      } catch (err) {
        console.error('Error loading conversation data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load conversation.');
        setConversation(null);
        setRecipient(null);
        setErrand(null);
        setMessages([]);
      } finally {
        setConversationLoading(false);
        setLoading(false);
      }
    };

    loadConversationData();
  }, [paramConversationId, currentUser, isAuthenticated]);

  // Listen for messages in the current conversation
  useEffect(() => {
    if (!conversation?.id || !isAuthenticated || !currentUser?.uid) {
      setMessages([]);
      setUnreadCount(0);
      return;
    }

    const messagesQuery = query(
      collection(db, 'conversations', conversation.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }) as Message);

      setMessages(msgs);

      if (isAuthenticated && currentUser?.uid) {
        const newUnread = msgs.filter(
          (msg) => msg.senderId !== currentUser.uid && !msg.isRead
        ).length;

        const initialLoad = messages.length === 0 && msgs.length > 0;

        if (newUnread > unreadCount && !initialLoad && Notification.permission === 'granted') {
          const latestUnreadMsg = msgs
            .filter(msg => msg.senderId !== currentUser.uid && !msg.isRead)
            .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))[0];

          if (latestUnreadMsg) {
            new Notification(
              `New Message from @${recipient?.username || 'Someone'}`,
              {
                body: latestUnreadMsg.content.length > 100 ? 
                  latestUnreadMsg.content.substring(0, 97) + '...' : 
                  latestUnreadMsg.content,
                icon: recipient?.avatarUrl || '/favicon.ico',
              }
            );
          }
        }

        setUnreadCount(newUnread);
      }

      scrollToBottom();
    }, (err) => {
      console.error('Error listening to messages:', err);
      setError('Failed to load messages.');
    });

    return () => unsubscribe();
  }, [conversation, currentUser, recipient, isAuthenticated, messages.length, unreadCount, scrollToBottom]);

  // Load conversations list when no specific conversation is selected
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.uid || paramConversationId) {
      setConversationsList([]);
      setConversationsListLoading(false);
      return;
    }

    setConversationsListLoading(true);

    const fetchConversationsList = async () => {
      try {
        const q = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', currentUser.uid),
          orderBy('lastMessageTimestamp', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const conversations: Conversation[] = [];
        const participantIdsToFetch: string[] = [];

        querySnapshot.forEach((doc) => {
          const convData = { id: doc.id, ...doc.data() } as Conversation;
          conversations.push(convData);

          const otherParticipantId = convData.participants.find(uid => uid !== currentUser.uid);
          if (otherParticipantId && !participantIdsToFetch.includes(otherParticipantId)) {
            participantIdsToFetch.push(otherParticipantId);
          }
        });

        const participantProfiles: Record<string, UserProfile> = {};
        if (participantIdsToFetch.length > 0) {
          const batches = [];
          for (let i = 0; i < participantIdsToFetch.length; i += 10) {
            batches.push(participantIdsToFetch.slice(i, i + 10));
          }

          for (const batch of batches) {
            if (batch.length > 0) {
              const usersQuery = query(
                collection(db, 'users'),
                where(documentId(), 'in', batch)
              );
              const usersSnapshot = await getDocs(usersQuery);
              usersSnapshot.forEach(doc => {
                participantProfiles[doc.id] = { id: doc.id, ...doc.data() } as UserProfile;
              });
            }
          }
        }

        const conversationsWithRecipients = conversations.map(conv => {
          const otherParticipantId = conv.participants.find(uid => uid !== currentUser.uid);
          return {
            ...conv,
            recipientProfile: otherParticipantId ? participantProfiles[otherParticipantId] : null,
            isUnread: conv.readStatus?.[currentUser.uid] === false,
          } as ConversationListItem;
        });

        setConversationsList(conversationsWithRecipients);
        setError(null);
      } catch (err) {
        console.error('Error fetching conversations list:', err);
        setError('Failed to load conversations.');
        setConversationsList([]);
      } finally {
        setConversationsListLoading(false);
        setLoading(false);
      }
    };

    fetchConversationsList();
  }, [isAuthenticated, currentUser?.uid, paramConversationId]);

  const markMessagesAsRead = useCallback(async () => {
    if (!isAuthenticated || !conversation?.id || !currentUser?.uid || messages.length === 0) {
      return;
    }

    try {
      const messagesQuery = query(
        collection(db, 'conversations', conversation.id, 'messages'),
        where('senderId', '!=', currentUser.uid),
        where('isRead', '==', false)
      );
      const snapshot = await getDocs(messagesQuery);

      if (!snapshot.empty) {
        const updates = snapshot.docs.map((msgDoc) => {
          const msgRef = doc(db, 'conversations', conversation.id, 'messages', msgDoc.id);
          return updateDoc(msgRef, { isRead: true });
        });

        await Promise.all(updates);

        const convRef = doc(db, 'conversations', conversation.id);
        const convSnap = await getDoc(convRef);
        if (convSnap.exists() && convSnap.data()?.readStatus?.[currentUser.uid] === false) {
          await updateDoc(convRef, {
            [`readStatus.${currentUser.uid}`]: true,
          });
        }
      }
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [conversation, currentUser, isAuthenticated, messages]);

  useEffect(() => {
    if (messages.length > 0 && isAuthenticated && currentUser?.uid) {
      markMessagesAsRead();
    }
  }, [messages, markMessagesAsRead, isAuthenticated, currentUser?.uid]);

  useEffect(() => {
  if (!recipient?.uid || !currentUser?.uid) {
    setError("Missing recipient or sender information.");
    return;
  }
  if (recipient?.uid === currentUser.uid) {
    setError("You cannot send a message to yourself.");
  }
}, [recipient, currentUser]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !currentUser || !newMessage.trim()) {
      setError('You must be logged in and type a message to send.');
      return;
    }
    if (!conversation?.id) {
      setError('Cannot send message: No conversation selected.');
      return;
    }

    try {
      await addDoc(collection(db, 'conversations', conversation.id, 'messages'), {
        senderId: currentUser.uid,
        content: newMessage.trim(),
        createdAt: serverTimestamp(),
        isRead: false,
        type: 'standard',
      });

      await updateDoc(doc(db, 'conversations', conversation.id), {
        lastMessage: { content: newMessage.trim(), type: 'standard' },
        lastMessageTimestamp: serverTimestamp(),
        [`readStatus.${currentUser.uid}`]: true,
        ...(recipient?.id ? { [`readStatus.${recipient.id}`]: false } : {}),
      });

      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    }
  };

  const showConversationList = !paramConversationId;

  if (loading) {
    const loadingMessage = conversationsListLoading || (paramConversationId && conversationLoading)
      ? (conversationsListLoading ? 'Loading conversations list...' : 'Loading conversation...')
      : 'Loading...';

    return (
      <div className="container py-5 text-center">
        <Spinner animation="border" variant={theme === 'dark' ? 'light' : 'primary'} />
        <p className="mt-2 text-muted">{loadingMessage}</p>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger">
          {error}
          <div className="mt-3">
            {paramConversationId && (
              <Button variant="primary" className="me-2" onClick={() => navigate('/messages')}>
                Back to Conversations
              </Button>
            )}
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  if (showConversationList) {
    return (
      <Container className="py-3">
        <h3 className={`mb-4 ${theme === 'dark' ? 'text-light' : ''}`}>Your Conversations</h3>
        {conversationsList.length === 0 ? (
          <Alert variant="info" className="text-center">
            You don't have any conversations yet. Find an errand or user to start one!
            <div className="mt-2">
              <Link to="/errands" className="alert-link">Browse Errands</Link>
            </div>
          </Alert>
        ) : (
          <ListGroup>
            {conversationsList.map((conv) => (
              <ListGroup.Item
                key={conv.id}
                action
                onClick={() => navigate(`/messages/${conv.id}`)}
                className={`d-flex justify-content-between align-items-center ${theme === 'dark' ? 'bg-secondary text-light' : ''} ${conv.isUnread ? 'list-group-item-primary' : ''}`}
              >
                <div className="d-flex align-items-center">
                  <Image
                    src={conv.recipientProfile?.avatarUrl || '/default-avatar.png'}
                    alt={conv.recipientProfile?.username || 'Unknown User'}
                    roundedCircle
                    style={{ width: '40px', height: '40px', objectFit: 'cover', marginRight: '15px' }}
                  />
                  <div>
                    <h5 className={`mb-1 h6 ${theme === 'dark' ? 'text-light' : ''}`}>
                      @{conv.recipientProfile?.username || 'Unknown User'}
                      {conv.isUnread && <Badge bg="danger" pill className="ms-2"> </Badge>}
                    </h5>
                    <p className={`mb-1 text-muted ${conv.isUnread ? 'fw-bold' : ''}`}>
                      {typeof conv.lastMessage === 'object' && conv.lastMessage !== null && 
                        typeof (conv.lastMessage as { content?: string }).content === 'string' ?
                        ((conv.lastMessage as { content: string }).content.length > 50 ? 
                          (conv.lastMessage as { content: string }).content.substring(0, 47) + '...' : 
                          (conv.lastMessage as { content: string }).content)
                        : typeof conv.lastMessage === 'string' && conv.lastMessage.length > 0 ?
                          (conv.lastMessage.length > 50 ? 
                            conv.lastMessage.substring(0, 47) + '...' : 
                            conv.lastMessage)
                        : 'Start of conversation'}
                    </p>
                  </div>
                </div>
                <div>
                  <small className="text-muted me-2">
                    {conv.lastMessageTimestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </small>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Container>
    );
  }

  return (
    <div className="container-fluid py-3 d-flex flex-column" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <div className="d-flex align-items-center mb-3">
        <Button
          variant="outline-secondary"
          size="sm"
          className="me-2"
          onClick={() => navigate('/messages')}
        >
          ←
        </Button>
        {recipient && (
          <div className="d-flex align-items-center">
            <Image
              src={recipient.avatarUrl || '/default-avatar.png'}
              alt={recipient.username}
              roundedCircle
              className="me-2"
              style={{ width: '32px', height: '32px', objectFit: 'cover' }}
            />
            <Link to={`/profile/${recipient.username}`} className={`h4 mb-0 text-decoration-none ${theme === 'dark' ? 'text-light' : 'text-dark'}`}>
              @{recipient.username}
            </Link>
            {unreadCount > 0 && (
              <Badge bg="danger" className="ms-2">
                {unreadCount}
              </Badge>
            )}
          </div>
        )}
      </div>

      {errand && (
        <Alert variant="info" className="mb-3">
          Related Errand: <strong>{errand.title}</strong> (Status: {errand.status})
          {errand.id && (
            <Link to={`/errands/${errand.id}`} className="alert-link ms-2">View Details</Link>
          )}
        </Alert>
      )}

      <div
        className="flex-grow-1 overflow-auto mb-3 p-3 rounded"
        style={{ backgroundColor: theme === 'dark' ? '#2c2c2c' : '#f8f9fa' }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-muted py-5">
            No messages yet. {isAuthenticated ? 'Start the conversation!' : 'Log in to send messages.'}
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                currentUserId={currentUser?.uid || ''}
                recipientProfile={recipient ?? undefined}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {isAuthenticated ? (
        <Form onSubmit={handleSendMessage}>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <Button
              variant="primary"
              type="submit"
              disabled={!newMessage.trim()}
            >
              Send
            </Button>
          </InputGroup>
        </Form>
      ) : (
        <Alert variant="warning" className="mb-0">
          Please <Link to="/login">log in</Link> to send messages.
        </Alert>
      )}
    </div>
  );
};

export default MessagesPage;