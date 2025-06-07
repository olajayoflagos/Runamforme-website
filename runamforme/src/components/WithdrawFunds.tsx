// src/components/WithdrawFunds.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  collection, // ✅ Fixed
} from 'firebase/firestore';
import type { UserProfile } from '../types';

const WithdrawFunds: React.FC = () => {
  const { currentUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [accountDetails, setAccountDetails] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser) return;
      const docRef = doc(db, 'users', currentUser.uid);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile;
        setUserProfile(data);
        if ((data as any).accountDetails) {
          setAccountDetails((data as any).accountDetails);
        }
      }
    };

    fetchUserProfile();
  }, [currentUser]);

  const handleWithdraw = async () => {
    const parsedAmount = parseFloat(amount);
    const fee = parsedAmount * 0.05;
    const totalDeduct = parsedAmount + fee;

    if (!userProfile || isNaN(parsedAmount) || parsedAmount < 100) {
      setMessage('Enter a valid amount (minimum ₦100)');
      return;
    }

    if (totalDeduct > userProfile.walletBalance) {
      setMessage('Insufficient funds for this withdrawal.');
      return;
    }

    if (!accountDetails.bankName || !accountDetails.accountNumber || !accountDetails.accountName) {
      setMessage('Please provide complete account details.');
      return;
    }

    setProcessing(true);

    try {
      const userRef = doc(db, 'users', currentUser!.uid);
      const newBalance = userProfile.walletBalance - totalDeduct;

      await updateDoc(userRef, {
        walletBalance: newBalance,
        accountDetails,
      });

      await addDoc(collection(db, 'withdrawals'), {
        userId: currentUser!.uid,
        amount: parsedAmount,
        deduction: fee,
        currency: 'NGN',
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'transactions'), {
        userId: currentUser!.uid,
        type: 'withdrawal',
        amount: parsedAmount,
        deduction: fee,
        currency: 'NGN',
        status: 'pending',
        createdAt: serverTimestamp(),
        description: 'Withdrawal request submitted',
      });

      setMessage('Withdrawal request submitted.');
      setAmount('');
    } catch (error) {
      console.error('Withdrawal failed:', error);
      setMessage('Failed to submit withdrawal. Try again later.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="card shadow-sm p-3">
      <h4 className="mb-3">Withdraw Funds</h4>

      <label className="form-label">Account Name</label>
      <input
        type="text"
        className="form-control mb-2"
        value={accountDetails.accountName}
        onChange={(e) => setAccountDetails({ ...accountDetails, accountName: e.target.value })}
        placeholder="Account Name"
      />

      <label className="form-label">Account Number</label>
      <input
        type="text"
        className="form-control mb-2"
        value={accountDetails.accountNumber}
        onChange={(e) => setAccountDetails({ ...accountDetails, accountNumber: e.target.value })}
        placeholder="Account Number"
      />

      <label className="form-label">Bank Name</label>
      <input
        type="text"
        className="form-control mb-3"
        value={accountDetails.bankName}
        onChange={(e) => setAccountDetails({ ...accountDetails, bankName: e.target.value })}
        placeholder="Bank Name"
      />

      <label className="form-label">Amount to Withdraw (₦)</label>
      <input
        type="number"
        className="form-control mb-3"
        value={amount}
        min={100}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Enter amount"
        disabled={processing}
      />

      <button className="btn btn-primary w-100" onClick={handleWithdraw} disabled={processing}>
        {processing ? 'Processing...' : 'Submit Withdrawal'}
      </button>

      {message && (
        <div className="alert alert-info mt-3" aria-live="assertive">
          {message}
        </div>
      )}
    </div>
  );
};

export default WithdrawFunds;
