import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Button, Spinner, Alert } from 'react-bootstrap';
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import type { Prompt } from '../types';

interface PromptConsentModalProps {
  errandId: string;
  action: 'cancel' | 'complete' | 'payment';
  requesterId: string;
  runnerUid: string;
  onClose: () => void;
  onSuccess: () => void;
  setError: (error: string | null) => void;
}

const PromptConsentModal: React.FC<PromptConsentModalProps> = ({
  errandId,
  action,
  requesterId,
  runnerUid,
  onClose,
  onSuccess,
  setError,
}) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [promptId, setPromptId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleConsent = useCallback(async () => {
    if (!currentUser || !errandId) {
      setLocalError('You must be logged in to confirm this action');
      return;
    }
    if (currentUser.uid !== requesterId && currentUser.uid !== runnerUid) {
      setLocalError('You are not authorized to confirm this action');
      return;
    }
    setLoading(true);
    try {
      let existingPromptId = promptId;
      if (!existingPromptId) {
        const promptRef = await addDoc(collection(db, 'prompts'), {
          errandId,
          action,
          requesterId,
          runnerUid,
          requesterConsent: currentUser.uid === requesterId,
          runnerConsent: currentUser.uid === runnerUid,
          createdAt: serverTimestamp(),
        });
        existingPromptId = promptRef.id;
        setPromptId(promptRef.id);
      } else {
        await updateDoc(doc(db, 'prompts', existingPromptId), {
          [currentUser.uid === requesterId ? 'requesterConsent' : 'runnerConsent']: true,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error(`Error creating/updating prompt for ${action}:`, err);
      setLocalError(`Failed to process ${action}`);
      setError(`Failed to process ${action}`);
      setLoading(false);
    }
  }, [currentUser, errandId, action, requesterId, runnerUid, promptId, setError]);

  useEffect(() => {
    if (!promptId) return;
    const unsubscribe = onSnapshot(doc(db, 'prompts', promptId), async (snap) => {
      if (!snap.exists()) {
        setLocalError('Prompt not found');
        setError('Prompt not found');
        return;
      }
      const promptData = snap.data() as Prompt;
      if (promptData.requesterConsent && promptData.runnerConsent) {
        try {
          const errandRef = doc(db, 'errands', errandId);
          const updates: Record<string, any> = { updatedAt: serverTimestamp() };
          let notificationMessage = '';
          if (action === 'cancel') {
            updates.status = 'cancelled';
            updates.cancelledAt = serverTimestamp();
            notificationMessage = `Errand "${promptData.errandId}" was cancelled.`;
          } else if (action === 'complete') {
            updates.status = 'completed';
            updates.completedAt = serverTimestamp();
            notificationMessage = `Errand "${promptData.errandId}" was marked as completed.`;
          } else if (action === 'payment') {
            updates.paymentStatus = 'escrow';
            notificationMessage = `Payment consent confirmed for errand "${promptData.errandId}".`;
          }
          await updateDoc(errandRef, updates);
          await addDoc(collection(db, 'notifications'), {
            userId: currentUser?.uid === requesterId ? runnerUid : requesterId,
            type: action,
            relatedId: errandId,
            message: notificationMessage,
            read: false,
            createdAt: serverTimestamp(),
          });
          onSuccess();
          onClose();
        } catch (err) {
          console.error(`Error updating errand for ${action}:`, err);
          setLocalError(`Failed to update errand status`);
          setError(`Failed to update errand status`);
        }
        setLoading(false);
      }
    }, (err) => {
      console.error('Snapshot error:', err);
      setLocalError('Failed to monitor consent status');
      setError('Failed to monitor consent status');
    });
    return () => unsubscribe();
  }, [promptId, action, errandId, requesterId, runnerUid, currentUser, onSuccess, onClose, setError]);

  return (
    <Modal show={true} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Confirm {action.charAt(0).toUpperCase() + action.slice(1)}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          Are you sure you want to {action} this errand?
          {action !== 'payment' && ' This action requires confirmation from the other party.'}
        </p>
        <p className="small text-muted">
          {action === 'payment'
            ? 'Confirming will proceed to payment processing.'
            : 'Both parties must consent to complete this action.'}
        </p>
        {localError && (
          <Alert variant="danger" aria-live="assertive">
            {localError}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="outline-secondary"
          onClick={onClose}
          disabled={loading}
          aria-label="Cancel"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleConsent}
          disabled={loading}
          aria-label="Confirm action"
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Processing...
            </>
          ) : 'Confirm'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PromptConsentModal;