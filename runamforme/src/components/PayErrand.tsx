import React, { useState } from 'react';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { usePaystackPayment } from 'react-paystack';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Modal, Button, Alert, Spinner } from 'react-bootstrap';
import type { Errand } from '../types';

interface PayErrandProps {
  errand: Errand;
  onSuccess: () => void;
  onClose: () => void;
  onError?: (error: string) => void;
}

const PayErrand: React.FC<PayErrandProps> = ({ errand, onSuccess, onClose, onError }) => {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const config = {
    reference: `errand_${errand.id}_${Date.now()}`,
    email: currentUser?.email || `user_${currentUser?.uid}@runamfor.me`,
    amount: (errand.fee || 0) * 100, // Changed cost to fee
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
    currency: errand.currency || 'NGN',
  };

  const initializePayment = usePaystackPayment(config);

  const handlePayment = async () => {
    if (!currentUser) {
      const errorMsg = 'You must be logged in to make a payment.';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }
    if (currentUser.isAnonymous) {
      const errorMsg = 'Anonymous users cannot make payments. Please link your account.';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }
    if (currentUser.uid !== errand.userId) {
      const errorMsg = 'Only the errand requester can make this payment.';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const userBalance = userDoc.exists() ? userDoc.data().walletBalance || 0 : 0;
    if (userBalance < (errand.fee || 0)) {
      const errorMsg = 'Insufficient balance for payment.';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setLoading(true);
    try {
      initializePayment({
        onSuccess: async (response: { reference: string }) => {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            walletBalance: userBalance - (errand.fee || 0),
          });
          if (!errand.id) {
            throw new Error('Errand ID is missing.');
          }
          await updateDoc(doc(db, 'errands', errand.id as string), {
            paymentStatus: 'escrow',
            paymentReference: response.reference,
            updatedAt: serverTimestamp(),
          });
          await addDoc(collection(db, 'transactions'), {
            userId: currentUser.uid,
            type: 'payment',
            amount: errand.fee || 0,
            currency: errand.currency || 'NGN',
            status: 'completed',
            errandId: errand.id,
            createdAt: serverTimestamp(),
          });
          await addDoc(collection(db, 'notifications'), {
            userId: errand.userId,
            type: 'payment',
            relatedId: errand.id,
            message: `Payment of ${errand.currency} ${errand.fee} for "${errand.title}" completed.`,
            read: false,
            createdAt: serverTimestamp(),
          });
          if (errand.runnerUid) {
            await addDoc(collection(db, 'notifications'), {
              userId: errand.runnerUid,
              type: 'payment',
              relatedId: errand.id,
              message: `Payment received for "${errand.title}".`,
              read: false,
              createdAt: serverTimestamp(),
            });
          }
          setLoading(false);
          onSuccess();
        },
        onClose: () => {
          const errorMsg = 'Payment was not completed.';
          setError(errorMsg);
          onError?.(errorMsg);
          setLoading(false);
        },
      });
    } catch (err) {
      const errorMsg = 'Failed to process payment.';
      setError(errorMsg);
      onError?.(errorMsg);
      setLoading(false);
    }
  };

  return (
    <Modal show={true} onHide={onClose} centered aria-labelledby="payErrandModalLabel">
      <Modal.Header closeButton closeVariant={theme === 'dark' ? 'white' : undefined}>
        <Modal.Title id="payErrandModalLabel">Pay for Errand: {errand.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Amount: {errand.currency} {(errand.fee || 0).toLocaleString()}</p>
        {error && (
          <Alert variant="danger" aria-live="assertive">
            {error}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="outline-secondary"
          onClick={onClose}
          disabled={loading}
          aria-label="Cancel payment"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handlePayment}
          disabled={loading}
          aria-label="Confirm payment"
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" role="status" aria-hidden="true" />
              Processing...
            </>
          ) : (
            'Pay Now'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PayErrand;