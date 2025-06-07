import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import type { Errand } from '../types';
import { Badge, Card, Row, Col } from 'react-bootstrap';

interface UsersErrandFeedProps {
  errands: Errand[];
}

const UsersErrandFeed: React.FC<UsersErrandFeedProps> = ({ errands }) => {
  if (!errands?.length) {
    return <p className="text-muted text-center py-3">No errands found.</p>;
  }

  return (
    <Row xs={1} md={2} className="g-4" role="list" aria-label="Errands feed">
      {errands.map((errand) => (
        <Col key={errand.id} role="listitem">
          <Card className="h-100 shadow-sm transition-all duration-200 hover-scale">
            <Card.Body>
              <Card.Title className="text-primary" id={`errand-title-${errand.id}`}>
                {errand.title || errand.description || 'Untitled Errand'}
              </Card.Title>
              <div className="mb-2">
                <Badge bg={errand.isPrivate ? 'secondary' : 'info'} className="me-2">
                  {errand.isPrivate ? 'Private' : 'Public'}
                </Badge>
                {errand.isNegotiable && (
                  <Badge bg="warning" className="me-2 text-dark">
                    Negotiable
                  </Badge>
                )}
                {errand.category && (
                  <Badge bg="primary">{errand.category}</Badge>
                )}
              </div>
              {errand.images?.length > 0 && (
                <div className="d-flex flex-wrap mb-2">
                  {errand.images.slice(0, 4).map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Attachment ${idx + 1} for errand ${errand.title || 'errand'}`}
                      style={{ maxWidth: '100px', margin: '5px', objectFit: 'cover', height: '100px' }}
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/100?text=Error';
                        e.currentTarget.alt = 'Failed to load attachment';
                      }}
                      aria-describedby={`errand-title-${errand.id}`}
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
              <Card.Text>
                <strong>Location:</strong> {errand.location || 'Not specified'}<br />
                {errand.geo && (
                  <>
                    <strong>Coordinates:</strong> Lat: {errand.geo.lat}, Lng: {errand.geo.lng}<br />
                  </>
                )}
                <strong>Duration:</strong> {errand.duration || 'Flexible'}<br />
                <strong>Fee:</strong> {errand.currency} {errand.fee.toLocaleString()}
                {errand.isNegotiable && ' (Negotiable)'}<br />
                <strong>Payment Status:</strong> {errand.paymentStatus || 'Pending'}
              </Card.Text>
              <Card.Text>
                <small className="text-muted">Status: {errand.status}</small>
              </Card.Text>
              {errand.status === 'pending' && (
                <Card.Text>
                  <strong>Tracking Status:</strong> In Progress
                  <Link to={`/track-errands/${errand.id}`} className="ms-2 text-primary">
                    View Progress
                  </Link>
                </Card.Text>
              )}
              <Card.Text className="text-muted small mt-2">
                {errand.clickCount !== undefined && <>✨ {errand.clickCount} Clicks  </>}
                {Array.isArray(errand.likes) && <>❤️ {errand.likes.length} Likes</>}
                {errand.requesterName && (
                  <> • Posted by: <Link to={`/profile/${errand.userId}`}>@{errand.requesterName}</Link></>
                )}
              </Card.Text>
              <Link
                to={`/errands/${errand.id}`}
                className="btn btn-sm btn-outline-primary transition-all duration-200 hover-scale"
                aria-label={`View details of ${errand.title || 'errand'}`}
              >
                View Details
              </Link>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default memo(UsersErrandFeed);