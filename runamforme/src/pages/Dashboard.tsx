import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { type Errand } from '../types';
import { Card, Spinner, Row, Col, Badge, Button, Alert } from 'react-bootstrap';
import { FaClipboardList, FaCheckCircle, FaEdit, FaShareAlt, FaTrash, FaTasks } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import ShareModal from '../components/ShareModal';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [postedErrands, setPostedErrands] = useState<Errand[]>([]);
  const [completedErrands, setCompletedErrands] = useState<Errand[]>([]);
  const [pendingErrands, setPendingErrands] = useState<Errand[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);
const [shareData, setShareData] = useState<{ id: string; title: string }>({ id: '', title: '' });
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const PAGE_SIZE = 4;

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    const unsubscribePosted = onSnapshot(
      query(collection(db, 'errands'), where('userId', '==', currentUser.uid), where('status', 'in', ['open', 'pending'])),
      (snap) => {
        try {
          const errands = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            isArchived: doc.data().isArchived ?? false,
          } as Errand));
          setPostedErrands(errands.filter(e => e.status === 'open'));
          setPendingErrands(errands.filter(e => e.status === 'pending'));
        } catch (err) {
          console.error('Posted errands snapshot error:', err);
          setError(`Failed to load errands: ${(err as Error).message}`);
        }
      },
      (err) => {
        console.error('Error fetching errands:', err);
        setError(`Failed to load errands: ${err.message}`);
      }
    );

    const unsubscribeCompleted = onSnapshot(
      query(collection(db, 'errands'), where('userId', '==', currentUser.uid), where('status', '==', 'completed')),
      (snap) => {
        try {
          const errands = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            isArchived: doc.data().isArchived ?? false,
          } as Errand));
          setCompletedErrands(errands);
          setTotalEarnings(errands.reduce((sum, e) => sum + (e.fee || 0), 0));
        } catch (err) {
          console.error('Completed errands snapshot error:', err);
          setError(`Failed to load completed errands: ${(err as Error).message}`);
        }
      },
      (err) => {
        console.error('Error fetching completed errands:', err);
        setError(`Failed to load completed errands: ${err.message}`);
      }
    );

    setLoading(false);
    return () => {
      unsubscribePosted();
      unsubscribeCompleted();
    };
  }, [currentUser]);

  const handleShare = (id: string, title: string) => {
  setShareData({ id, title });
  setShareModalVisible(true);
};


  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this errand?')) return;
    try {
      await deleteDoc(doc(db, 'errands', id));
    } catch (err) {
      setError(`Failed to delete errand: ${(err as Error).message}`);
    }
  };

  if (!currentUser) {
    return (
      <div className="container my-5">
        <Alert variant="warning" className="text-center">
          Please <Link to="/login" className="alert-link">log in</Link> to view your dashboard.
        </Alert>
      </div>
    );
  }

  return (
    <div className="container my-4 my-md-5">
      <h2 className="mb-4 text-primary">My Dashboard</h2>

      {error && (
        <Alert variant="danger" className="mb-4" role="alert" dismissible onClose={() => setError(null)}>
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" variant="primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <>
          <Row className="mb-4 g-3 g-md-4">
            <Col xs={12} md={4}>
              <Card className="shadow-sm border-success h-100">
                <Card.Body>
                  <Card.Title className="d-flex align-items-center">
                    <FaClipboardList className="me-2 text-success" aria-hidden="true" />
                    Open Errands
                  </Card.Title>
                  <h4>{postedErrands.length}</h4>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card className="shadow-sm border-warning h-100">
                <Card.Body>
                  <Card.Title className="d-flex align-items-center">
                    <FaTasks className="me-2 text-warning" aria-hidden="true" />
                    Pending Errands
                  </Card.Title>
                  <h4>{pendingErrands.length}</h4>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card className="shadow-sm border-primary h-100">
                <Card.Body>
                  <Card.Title className="d-flex align-items-center">
                    <FaCheckCircle className="me-2 text-primary" aria-hidden="true" />
                    Completed Errands
                  </Card.Title>
                  <h4>{completedErrands.length}</h4>
                  <Card.Text>Total Earnings: ₦{totalEarnings.toLocaleString()}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <h4 className="mt-4 mb-3">Open Errands</h4>
          {postedErrands.length === 0 ? (
            <Alert variant="info" className="text-center">
              No open errands found. <Link to="/post-errand" className="alert-link">Post a new errand</Link>.
            </Alert>
          ) : (
            <Row xs={1} sm={2} lg={3} className="g-3 g-md-4">
              {postedErrands.map((errand) => (
                <Col key={errand.id}>
                  <Card className="h-100 shadow-sm">
                    <Card.Body className="d-flex flex-column">
                      <Card.Title className="text-primary">
  <Link to={`/errands/${errand.id}`} className="text-decoration-none text-primary">
    {errand.title}
  </Link>
</Card.Title>

                      <Card.Text className="flex-grow-1">{errand.description}</Card.Text>
                      <Card.Text>
                        <strong>Fee:</strong> ₦{errand.fee.toLocaleString()} <br />
                        <Badge bg="secondary">{errand.status}</Badge>
                      </Card.Text>
                      <div className="mt-auto d-flex flex-wrap gap-2 justify-content-end">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => navigate(`/edit-errand/${errand.id}`)}
                          aria-label={`Edit errand ${errand.title}`}
                        >
                          <FaEdit aria-hidden="true" /> Edit
                        </Button>
                        <Button
  variant="outline-info"
  size="sm"
  onClick={() => handleShare(errand.id!, errand.title)}
  aria-label={`Share errand ${errand.title}`}
>
  <FaShareAlt aria-hidden="true" /> Share
</Button>

                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(errand.id)}
                          aria-label={`Delete errand ${errand.title}`}
                        >
                          <FaTrash aria-hidden="true" /> Delete
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}

          <h4 className="mt-5 mb-3">Pending Errands</h4>
          {pendingErrands.length === 0 ? (
            <Alert variant="info" className="text-center">
              No pending errands found.
            </Alert>
          ) : (
            <Row xs={1} sm={2} lg={3} className="g-3 g-md-4">
              {pendingErrands.map((errand) => (
                <Col key={errand.id}>
                  <Card className="h-100 shadow-sm">
                    <Card.Body className="d-flex flex-column">
                      <Card.Title className="text-primary">
  <Link to={`/errands/${errand.id}`} className="text-decoration-none text-primary">
    {errand.title}
  </Link>
</Card.Title>

                      <Card.Text className="flex-grow-1">{errand.description}</Card.Text>
                      <Card.Text>
                        <strong>Fee:</strong> ₦{errand.fee.toLocaleString()} <br />
                        <Badge bg="warning">Pending</Badge>
                      </Card.Text>
                      <div className="mt-auto d-flex flex-wrap gap-2 justify-content-end">
                        <Button
  variant="outline-info"
  size="sm"
  onClick={() => handleShare(errand.id!, errand.title)}
  aria-label={`Share errand ${errand.title}`}
>
  <FaShareAlt aria-hidden="true" /> Share
</Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => navigate(`/track-errands/${errand.id}`)}
                          aria-label={`Track errand ${errand.title}`}
                        >
                          Track Progress
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}

          <h4 className="mt-5 mb-3">Recent Completed Errands</h4>
          {completedErrands.length === 0 ? (
            <Alert variant="info" className="text-center">
              No completed errands yet.
            </Alert>
          ) : (
            <>
              <Row xs={1} sm={2} lg={3} className="g-3 g-md-4">
                {completedErrands.slice(0, page * PAGE_SIZE).map((errand) => (
                  <Col key={errand.id}>
                    <Card className="h-100 shadow-sm bg-light">
                      <Card.Body>
                        <Card.Title className="text-primary">{errand.title}</Card.Title>
                        <Card.Text>{errand.description}</Card.Text>
                        <Card.Text>
                          <strong>Fee:</strong> ₦{errand.fee.toLocaleString()} <br />
                          <Badge bg="success">Completed</Badge>
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
              {page * PAGE_SIZE < completedErrands.length && (
                <div className="text-center mt-4">
                  <Button
                    variant="outline-primary"
                    onClick={() => setPage(page + 1)}
                    aria-label="Load more completed errands"
                  >
                    Load More
                  </Button>
                </div>
              )}
              <ShareModal
  show={shareModalVisible}
  onHide={() => setShareModalVisible(false)}
  errandUrl={`${window.location.origin}/errands/${shareData.id}`}
  title={shareData.title}
/>

            </>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;