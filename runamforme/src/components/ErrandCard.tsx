// src/components/ErrandCard.tsx
import  { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { Errand } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

interface ErrandCardProps {
    errand: Errand;
    onLikeToggle?: (errandId: string, isLiked: boolean) => void;
    onViewDetails?: (errandId: string) => void;
    isLiked?: boolean;
    isLiking?: boolean;
}

const ErrandCard: FC<ErrandCardProps> = ({
    errand,
    onLikeToggle,
    onViewDetails,
    isLiked = false,
    isLiking = false
}) => {
    const { currentUser } = useAuth();
    const [username, setUsername] = useState<string>('Unknown');

    useEffect(() => {
        const fetchUsername = async () => {
            if (errand.uid) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', errand.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUsername(data.username || 'Unknown');
                    }
                } catch (error) {
                    console.error('Failed to fetch username:', error);
                }
            }
        };

        fetchUsername();
    }, [errand.uid]);

    return (
        <div className="card h-100 shadow-sm d-flex flex-column">
            <div className="card-body d-flex flex-column">
                <h5 className="card-title text-primary mb-2">{errand.description}</h5>
                <p className="card-text text-muted mb-1">📍 {errand.location}</p>
                <p className="card-text text-muted mb-1">⏱️ Duration: {errand.duration}</p>
                <p className="card-text fw-bold mt-2">💰 Fee: ₦{errand.fee?.toLocaleString() ?? 0}</p>

                {/* Username Display */}
                <p className="card-text text-muted mb-1">🧑 Posted by: <strong>{username}</strong></p>

                {(errand.viewCount !== undefined || errand.clickCount !== undefined || errand.likesCount !== undefined) && (
                    <div className="mt-2 text-muted small">
                        {errand.viewCount !== undefined && (
                            <span>👀 {errand.viewCount ?? 0} Views</span>
                        )}
                        {errand.clickCount !== undefined && (
                            <span className="ms-3">🖱️ {errand.clickCount ?? 0} Clicks</span>
                        )}
                        {errand.likesCount !== undefined && (
                            <span className="ms-3">❤️ {errand.likesCount ?? 0} Likes</span>
                        )}
                    </div>
                )}

                <div className="mt-auto pt-3 d-flex justify-content-between align-items-center">
                    <button
                        className="btn btn-success btn-sm me-2 flex-grow-1"
                        onClick={() => onViewDetails ? onViewDetails(errand.id) : console.log('View Details clicked for', errand.id)}
                    >
                        View & Accept
                    </button>

                    {currentUser ? (
                        <button
                            className={`btn btn-outline-${isLiked ? 'danger' : 'primary'} btn-sm`}
                            onClick={() => onLikeToggle && onLikeToggle(errand.id, isLiked)}
                            disabled={isLiking}
                            aria-label={isLiked ? 'Unlike this errand' : 'Like this errand'}
                        >
                            {isLiking && <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>}
                            {!isLiking ? (isLiked ? 'Liked' : 'Like') : ''}
                        </button>
                    ) : (
                        <button
                            className="btn btn-outline-primary btn-sm"
                            disabled
                            title="Log in to like this errand"
                        >
                            Like
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ErrandCard;
