// src/components/DepositFunds.tsx
import React, { useState, useEffect } from 'react';
import { PaystackButton } from 'react-paystack';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import type { UserProfile } from '../types';

const DepositFunds: React.FC = () => {
  const { currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  useEffect(() => {
    if (!currentUser) return;
    const fetchUserProfile = async () => {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          setUserProfile(userSnap.data() as UserProfile);
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };
    fetchUserProfile();
  }, [currentUser]);

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount >= 100;

  const paystackConfig = {
    reference: new Date().getTime().toString(),
    email: currentUser?.email || '',
    amount: parsedAmount * 100,
    publicKey,
    metadata: {
      custom_fields: [
        {
          display_name: 'User ID',
          variable_name: 'user_id',
          value: currentUser?.uid || '',
        },
        {
          display_name: 'Username',
          variable_name: 'username',
          value: userProfile?.username || '',
        },
      ],
    },
  };

  const handleSuccess = async () => {
    try {
      setProcessing(true);
      const userRef = doc(db, 'users', currentUser!.uid);
      const newBalance = (userProfile?.walletBalance || 0) + parsedAmount;

      await updateDoc(userRef, { walletBalance: newBalance });

      await addDoc(collection(db, 'transactions'), {
        userId: currentUser!.uid,
        type: 'payment',
        amount: parsedAmount,
        currency: 'NGN',
        status: 'completed',
        createdAt: serverTimestamp(),
        description: 'Wallet deposit via Paystack',
      });

      setMessage('Deposit successful and balance updated.');
      setAmount('');
    } catch (err) {
      setMessage('Deposit succeeded but failed to update records.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setMessage('Payment was cancelled or closed.');
  };

  return (
    <div className="card shadow-sm p-3">
      <h4 className="mb-3">Deposit Funds</h4>
      <label htmlFor="depositAmount" className="form-label">
        Amount (Min ₦100)
      </label>
      <input
        id="depositAmount"
        type="number"
        className="form-control mb-3"
        placeholder="Enter amount to deposit"
        value={amount}
        min="100"
        onChange={(e) => setAmount(e.target.value)}
        disabled={processing}
      />
      {isValidAmount && !processing ? (
        <PaystackButton
          className="btn btn-success w-100"
          {...paystackConfig}
          text="Deposit with Paystack"
          onSuccess={handleSuccess}
          onClose={handleClose}
        />
      ) : (
        <button className="btn btn-secondary w-100" disabled>
          Enter Valid Amount
        </button>
      )}

      {message && (
        <div className="alert alert-info mt-3" role="alert" aria-live="assertive">
          {message}
        </div>
      )}
    </div>
  );
};

export default DepositFunds;
