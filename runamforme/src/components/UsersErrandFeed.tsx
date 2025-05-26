import React from 'react';
import type { Errand } from '../types';


interface UsersErrandFeedProps {
  errands: Errand[];
}

const UsersErrandFeed: React.FC<UsersErrandFeedProps> = ({ errands }) => {
  if (!errands || errands.length === 0) {
    return <p className="text-muted">No errands found.</p>;
  }

  return (
    <div className="row row-cols-1 row-cols-md-2 g-4">
      {errands.map((errand) => (
        <div key={errand.id} className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">{errand.description}</h5>
              <p className="card-text">
                <strong>Location:</strong> {errand.location}<br />
                <strong>Duration:</strong> {errand.duration}<br />
                <strong>Fee:</strong> ₦{errand.fee ?? 0}
              </p>
              <p className="card-text">
                <small className="text-muted">
                  Status: {errand.status}
                </small>
              </p>
              <p className="card-text text-muted small mt-2">
                {errand.clickCount !== undefined && <>🖱️ {errand.clickCount} Clicks&nbsp;&nbsp;</>}
                {errand.likes !== undefined && <>❤️ {errand.likes} Likes</>}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UsersErrandFeed;
