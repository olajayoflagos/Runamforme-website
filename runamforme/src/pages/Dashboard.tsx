// src/pages/Dashboard.tsx - Part 1 of 2
import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import type { Errand } from "../types";
import { Link } from "react-router-dom";

const Dashboard: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();

  const [userErrands, setUserErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingErrandId, setCompletingErrandId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || authLoading) {
      if (!authLoading && !currentUser) {
        setLoading(false);
      }
      return;
    }

    const q = query(
      collection(db, "errands"),
      where("uid", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const errandsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Errand[];
        setUserErrands(errandsList);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching user errands:", err);
        setError("Failed to load your errands. Please try again.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, authLoading]);

  const getStatusBadgeColor = (status: Errand["status"]) => {
    switch (status) {
      case "open":
        return "bg-info";
      case "accepted":
        return "bg-primary";
      case "completed":
        return "bg-success";
      case "cancelled":
        return "bg-danger";
      default:
        return "bg-secondary";
    }
  };

  const handleMarkCompleted = async (errandId: string) => {
    if (!currentUser || !errandId || completingErrandId) {
      console.warn("Mark completed action prevented.");
      return;
    }

    setCompletingErrandId(errandId);

    try {
      const errandRef = doc(db, "errands", errandId);
      await updateDoc(errandRef, {
        status: "completed",
        completedAt: serverTimestamp(),
      });
      console.log(`Errand ${errandId} marked as completed.`);
    } catch (err) {
      console.error(`Error marking errand ${errandId} as completed:`, err);
      alert("Failed to mark errand as completed. Please try again.");
    } finally {
      setCompletingErrandId(null);
    }
  };
  return (
    <div className="container py-4">
      <h2 className="mb-4">My Errands</h2>

      {loading && <div>Loading your errands...</div>}
      {error && <div className="text-danger">{error}</div>}

      {!loading && userErrands.length === 0 && (
        <div>No errands found. <Link to="/create">Post one?</Link></div>
      )}

      <div className="list-group">
        {userErrands.map((errand) => (
          <div key={errand.id} className="list-group-item d-flex justify-content-between align-items-start">
            <div>
              <h5 className="mb-1">{errand.description}</h5>
              <p className="mb-1 text-muted">
                Location: {errand.location} | Duration: {errand.duration} | Fee: ${errand.fee}
              </p>
              <span className={`badge ${getStatusBadgeColor(errand.status)} me-2`}>
                {errand.status}
              </span>
              {errand.status === 'accepted' && (
                <button
                  className="btn btn-sm btn-success ms-2"
                  onClick={() => handleMarkCompleted(errand.id)}
                  disabled={completingErrandId === errand.id}
                >
                  {completingErrandId === errand.id ? 'Completing...' : 'Mark Completed'}
                </button>
              )}
            </div>
            <div>
              <Link to={`/errands/${errand.id}`} className="btn btn-sm btn-outline-secondary">
                View
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
