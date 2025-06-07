// src/components/TransactionHistory.tsx
import React, { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Spinner, Table, Badge, Form } from 'react-bootstrap';
import type { Transaction } from '../types';

const TransactionHistory: React.FC = () => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'credit' | 'debit' | 'withdrawal' | 'payment'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!currentUser) return;

      try {
        let q = query(
          collection(db, 'transactions'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', sortOrder)
        );

        const snapshot = await getDocs(q);
        let all: Transaction[] = snapshot.docs.map(doc => {
          const { id, ...data } = doc.data() as Transaction;
          return {
            ...data,
            id: doc.id,
          };
        });

        if (filter !== 'all') {
          all = all.filter(tx => tx.type === filter);
        }

        setTransactions(all);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [currentUser, filter, sortOrder]);

  return (
    <div className="card shadow-sm p-3">
      <h4 className="mb-3">Transaction History</h4>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <Form.Select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          style={{ maxWidth: '180px' }}
        >
          <option value="all">All</option>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
          <option value="payment">Payment</option>
          <option value="withdrawal">Withdrawal</option>
        </Form.Select>

        <Form.Select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
          style={{ maxWidth: '150px' }}
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </Form.Select>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : transactions.length === 0 ? (
        <p>No transactions found.</p>
      ) : (
        <Table bordered hover responsive>
          <thead>
            <tr>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Description</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>
                  <Badge bg={
                    tx.type === 'credit' ? 'success' :
                    tx.type === 'debit' ? 'danger' :
                    tx.type === 'withdrawal' ? 'warning' : 'info'
                  }>
                    {tx.type.toUpperCase()}
                  </Badge>
                </td>
                <td>₦{tx.amount.toFixed(2)}</td>
                <td>
                  <Badge bg={
                    tx.status === 'completed' ? 'success' :
                    tx.status === 'pending' ? 'warning' : 'danger'
                  }>
                    {tx.status}
                  </Badge>
                </td>
                <td>{tx.description}</td>
                <td>{tx.createdAt?.toDate().toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default TransactionHistory;
