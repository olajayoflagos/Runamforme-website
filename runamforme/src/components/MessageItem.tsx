// src/components/MessageItem.tsx

import type { FC } from 'react';
// Corrected import: Import Timestamp and FieldValue directly from firebase/firestore
import type { Timestamp, FieldValue } from 'firebase/firestore';
import type { Message } from '../types'; // Import Message type from your types file

// Define the props expected by the MessageItem component
interface MessageItemProps {
  // The message data object to display
  message: Message;
  // Boolean indicating if this message was sent by the currently logged-in user
  isSentByCurrentUser: boolean;
  // Optional: Pass the current user's UID if needed for more complex logic inside
  // currentUserId?: string;
}

// Define the MessageItem functional component
const MessageItem: FC<MessageItemProps> = ({
  message,
  isSentByCurrentUser
}) => {
  // Determine alignment and styling based on who sent the message
  const messageAlignmentClass = isSentByCurrentUser ? 'justify-content-end' : 'justify-content-start';
  const messageBubbleClasses = isSentByCurrentUser ? 'bg-primary text-white' : 'bg-light text-dark border'; // Added border to light bubble for clarity

  // Helper to format the timestamp
  const formatTimestamp = (timestamp: Timestamp | FieldValue | undefined): string => {
      // Check if timestamp is a valid Timestamp object before trying to call toDate()
      if (!timestamp || typeof timestamp !== 'object' || !('toDate' in timestamp && typeof (timestamp as Timestamp).toDate === 'function')) {
          // Handle cases where timestamp is missing, not an object, or not a Firestore Timestamp
          // serverTimestamp() will initially be a FieldValue object, which doesn't have toDate()
          return 'Sending...'; // Or handle differently, maybe check for FieldValue type
      }
      try {
           // Ensure it's treated as a Timestamp and convert to Date
           const date = (timestamp as Timestamp).toDate();
           // Format to local time string (e.g., "10:30 AM")
           return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
          console.error("Failed to format timestamp:", e);
          return 'Invalid time';
      }
  };

  // JSX Render Logic for a single message item
  return (
    // Container div for the message bubble, uses flexbox for alignment
    <div className={`d-flex mb-2 ${messageAlignmentClass}`}>
      {/* Message bubble content */}
      <div className={`card p-2 ${messageBubbleClasses}`} style={{ maxWidth: '75%' }}> {/* Card styling, limited width */}
        {/* Message text content */}
        <p className="mb-1">{message.text}</p>

        {/* Optional: Display timestamp */}
        {/* Check if timestamp exists before formatting and displaying */}
        {message.createdAt && (
             <small className="text-muted text-end" style={{ fontSize: '0.7rem' }}> {/* Small text, muted color, right align */}
                 {formatTimestamp(message.createdAt)}
             </small>
        )}

        {/* TODO: Add display for mediaUrl if messages can contain images/videos */}
        {/* {message.mediaUrl && <img src={message.mediaUrl} alt="Attached media" style={{ maxWidth: '100%' }} />} */}

        {/* TODO: Add read status indicator if implemented (e.g., double check icon) */}
        {/* {isSentByCurrentUser && message.isRead && <span className="ms-1">✓✓</span>} */}
      </div>
    </div>
    // --- Continued in Part 2 ---
// src/components/MessageItem.tsx
// --- Continued from Part 1 ---

  );
};

export default MessageItem;
