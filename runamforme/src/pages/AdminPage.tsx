// src/pages/AdminPage.tsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import {  Button, Table, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const ADMIN_UID = 'o7gt0mO0ihXiBAJKwyoCB2HYe8v2';

const AdminPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      const feedbackSnap = await getDocs(collection(db, 'feedback'));
      const withdrawalSnap = await getDocs(collection(db, 'withdrawalRequests'));

      setFeedbacks(feedbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setWithdrawals(withdrawalSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };

    fetchData();
  }, [currentUser]);

  const handleDeleteFeedback = async (id: string) => {
    await deleteDoc(doc(db, 'feedback', id));
    setFeedbacks(prev => prev.filter(f => f.id !== id));
  };

  const handleApproveWithdrawal = async (id: string) => {
    await updateDoc(doc(db, 'withdrawalRequests', id), { status: 'approved' });
    alert('Withdrawal approved.');
  };

  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="container my-4">
      <h2 className="mb-4">Admin Dashboard</h2>

      <h4>Feedbacks</h4>
      <Table striped bordered hover>
        <thead>
          <tr><th>From</th><th>Message</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {feedbacks.map(f => (
            <tr key={f.id}>
              <td>{f.username || f.email}</td>
              <td>{f.message}</td>
              <td><Button variant="danger" size="sm" onClick={() => handleDeleteFeedback(f.id)}>Delete</Button></td>
            </tr>
          ))}
        </tbody>
      </Table>

      <h4 className="mt-5">Withdrawal Requests</h4>
      <Table striped bordered hover>
        <thead>
          <tr><th>User</th><th>Amount</th><th>Status</th><th>Action</th></tr>
        </thead>
        <tbody>
          {withdrawals.map(w => (
            <tr key={w.id}>
              <td>{w.username}</td>
              <td>₦{w.amount}</td>
              <td>{w.status}</td>
              <td>
                {w.status === 'pending' && (
                  <Button size="sm" onClick={() => handleApproveWithdrawal(w.id)}>Approve</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default AdminPage;
