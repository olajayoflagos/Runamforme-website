import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sendEmailVerification, reload } from 'firebase/auth';
import { Container, Alert, Button, Spinner } from 'react-bootstrap';

const VerificationPage: React.FC = () => {
  const { currentUser, authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading || !currentUser) return;

    const checkVerification = async () => {
      try {
        await reload(currentUser);
        setIsVerified(currentUser.emailVerified);
        if (currentUser.emailVerified) {
          setTimeout(() => navigate('/dashboard'), 2000);
        }
      } catch (err) {
        setError('Failed to check verification status');
      }
    };

    checkVerification();
  }, [currentUser, authLoading, navigate]);

  const handleResendEmail = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await sendEmailVerification(currentUser);
      setSuccess('Verification email sent! Please check your inbox.');
    } catch (err) {
      setError('Failed to send verification email. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || isVerified === null) {
    return (
      <Container className="py-4 py-md-5 text-center">
        <Spinner animation="border" variant="primary" role="status" aria-label="Loading" />
        <p className="mt-2 text-muted">Checking verification status...</p>
      </Container>
    );
  }

  if (!currentUser || currentUser.isAnonymous) {
    return (
      <Container className="py-4 py-md-5 text-center">
        <Alert variant="warning" role="alert">
          Please sign in to verify your email.
          <div className="mt-3">
            <Button
              variant="primary"
              onClick={() => navigate('/login')}
              aria-label="Go to login page"
            >
              Sign In
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  if (isVerified) {
    return (
      <Container className="py-4 py-md-5 text-center">
        <Alert variant="success" role="alert">
          Your email is verified! Redirecting to dashboard...
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4 py-md-5">
      <h3 className="text-center text-primary mb-4">Verify Your Email</h3>
      <Alert variant="info" role="alert">
        A verification email has been sent to <strong>{currentUser.email}</strong>. Please check your inbox (and spam/junk folder) to verify your email address.
      </Alert>
      {success && (
        <Alert variant="success" role="alert">
          {success}
        </Alert>
      )}
      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}
      <div className="text-center">
        <Button
          variant="primary"
          onClick={handleResendEmail}
          disabled={loading}
          className="me-2"
          aria-label="Resend verification email"
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" aria-hidden="true" />
              Sending...
            </>
          ) : (
            'Resend Email'
          )}
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate('/dashboard')}
          aria-label="Go to dashboard"
        >
          Go to Dashboard
        </Button>
      </div>
    </Container>
  );
};

export default VerificationPage;