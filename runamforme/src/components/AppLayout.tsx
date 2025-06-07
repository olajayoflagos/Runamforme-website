import React, { type ReactNode } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from './NavBar'; // Fixed typo from NavBar to Navbar
import Footer from './Footer';
import { Container, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

interface AppLayoutProps {
  children?: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const {
    loading,
    error,
    isAuthenticated,
    isEmailVerified
  } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div
        className="d-flex flex-column min-vh-100 bg-light"
        role="status"
        aria-live="polite"
        aria-label="Application loading"
      >
        <div className="m-auto text-center">
          <Spinner
            animation="border"
            role="status"
            variant="primary"
            style={{ width: '3rem', height: '3rem' }}
          >
            <span className="visually-hidden">Loading application...</span>
          </Spinner>
          <h2 className="h5 mt-3 text-primary">Loading RunAmForMe</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex flex-column min-vh-100 bg-light">
        <Navbar />
        <main className="flex-grow-1">
          <Container className="my-auto py-5">
            <Alert
              variant="danger"
              className="text-center shadow-sm mx-auto"
              style={{ maxWidth: '600px' }}
              aria-live="assertive"
              aria-atomic="true"
            >
              <Alert.Heading className="h4">Authentication Error</Alert.Heading>
              <p className="mb-3">{error}</p>
              <div className="d-flex gap-3 justify-content-center">
                <button
                  className="btn btn-primary px-4"
                  onClick={() => window.location.reload()}
                  aria-label="Retry authentication"
                >
                  Try Again
                </button>
                <button
                  className="btn btn-outline-primary px-4"
                  onClick={() => navigate('/')}
                  aria-label="Return to home page"
                >
                  Go Home
                </button>
              </div>
            </Alert>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <Navbar />
      <main
        id="main-content"
        className="flex-grow-1 py-3 py-md-4 bg-white"
        tabIndex={-1}
      >
        <Container fluid="md" className="mt-2 mt-md-3 px-3 px-md-4">
          {!isEmailVerified && isAuthenticated && (
            <Alert
              variant="warning"
              className="mb-4 shadow-sm d-flex align-items-center"
              dismissible
              onClose={() => navigate('/verify-email')}
              aria-live="polite"
            >
              <div className="d-flex flex-wrap align-items-center w-100">
                <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>
                <span className="me-2 flex-grow-1">
                  Please verify your email address to access all features.
                </span>
                <button
                  className="btn btn-link p-0 text-primary text-decoration-underline ms-auto"
                  onClick={() => navigate('/verify-email')}
                  aria-label="Resend email verification"
                >
                  Resend verification
                </button>
              </div>
            </Alert>
          )}
          {children || <Outlet />}
        </Container>
      </main>
     
      <Footer />
    </div>
  );
};

export default AppLayout;