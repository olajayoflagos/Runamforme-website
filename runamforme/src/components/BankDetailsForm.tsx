import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const BankDetailsForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!currentUser) return;
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const snapshot = await getDoc(docRef);
        const data = snapshot.data();
        if (data?.bankDetails) {
          setBankName(data.bankDetails.bankName || '');
          setAccountName(data.bankDetails.accountName || '');
          setAccountNumber(data.bankDetails.accountNumber || '');
        }
      } catch (err) {
        setError('Failed to load bank details.');
      }
    };
    fetchDetails();
  }, [currentUser]);

  const handleSave = async () => {
    if (!bankName || !accountName || !accountNumber) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const docRef = doc(db, 'users', currentUser!.uid);
      await setDoc(docRef, {
        bankDetails: {
          bankName,
          accountName,
          accountNumber,
        },
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Failed to save bank details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card shadow-sm p-3">
      <h5 className="mb-3">Withdrawal Account Details</h5>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="mb-3">
        <label className="form-label">Bank Name</label>
        <input
          className="form-control"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Account Name</label>
        <input
          className="form-control"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Account Number</label>
        <input
          className="form-control"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
        />
      </div>
      <button
        className="btn btn-primary"
        onClick={handleSave}
        disabled={loading}
      >
        {loading ? 'Saving...' : 'Save Bank Details'}
      </button>
      {saved && (
        <div className="alert alert-success mt-3">Details saved successfully.</div>
      )}
    </div>
  );
};

export default BankDetailsForm;
