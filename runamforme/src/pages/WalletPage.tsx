// src/pages/WalletPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import WithdrawFunds from '../components/WithdrawFunds';
import DepositFunds from '../components/DepositFunds';
import TransactionHistory from '../components/TransactionHistory';
import type { UserProfile } from '../types';

const WalletPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load wallet data.');
      }
    };

    fetchUserProfile();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="container my-5 alert alert-warning text-center" aria-live="assertive">
        Please log in to access your wallet.
      </div>
    );
  }

  return (
    <div className="container my-5">
      <h2 className="mb-4 text-center">My Wallet</h2>

      {error && (
        <div className="alert alert-danger text-center" aria-live="assertive">
          {error}
        </div>
      )}

      <div className="text-center mb-4">
        <h5>
          Available Balance:{' '}
          <span className="badge bg-success fs-5">
            ₦{userProfile?.walletBalance?.toFixed(2) || '0.00'}
          </span>
        </h5>
      </div>

      <div className="row">
        <div className="col-md-6 mb-4">
          <DepositFunds />
        </div>
        <div className="col-md-6 mb-4">
          <WithdrawFunds />
        </div>
      </div>

      <div className="mt-4">
        <TransactionHistory />
      </div>
    </div>
  );
};

export default WalletPage;
