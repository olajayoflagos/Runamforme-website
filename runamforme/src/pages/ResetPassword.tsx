import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Helmet } from 'react-helmet-async';

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent. Check your inbox.');
    } catch (err: any) {
      switch (err.code) {
        case 'auth/invalid-email':
          setError('Invalid email address.');
          break;
        case 'auth/user-not-found':
          setError('No user found with this email.');
          break;
        default:
          setError('Something went wrong. Try again.');
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <Helmet>
        <title>Reset Password - RunAmForMe</title>
        <meta name="description" content="Reset your password to access your RunAmForMe account." />
      </Helmet>
      <Row className="justify-content-center">
        <Col md={8} lg={6} xl={5}>
          <Card className="shadow-sm">
            <Card.Body className="p-4 p-md-5">
              <Card.Title className="text-center mb-4">
                <h2>Reset Password</h2>
              </Card.Title>

              {message && <Alert variant="success">{message}</Alert>}
              {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

              <Form onSubmit={handleReset}>
                <Form.Group className="mb-3">
                  <Form.Label>Email address</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? (
                    <Spinner size="sm" animation="border" role="status" aria-hidden="true" />
                  ) : (
                    'Send Reset Email'
                  )}
                </Button>
              </Form>

              <div className="text-center mt-3">
                <Link to="/login" className="text-primary">Back to Login</Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ResetPassword;
