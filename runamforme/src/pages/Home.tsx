// src/pages/Home.tsx
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect logged-in users away from the homepage to the dashboard
  useEffect(() => {
    if (!loading && currentUser) {
      navigate('/dashboard');
    }
  }, [loading, currentUser, navigate]);

  if (loading) {
    return (
      <div className="container my-5 text-center">
        <div>Loading user information...</div>
      </div>
    );
  }

  return (
    <div className="container my-5">
      <div className="row justify-content-center">
        <div className="col-lg-9 col-xl-8">
          {/* Hero Section */}
          <div className="hero-section p-5 bg-light rounded-3 shadow-sm text-center">
            <h1 className="display-4 fw-bold mb-3">RunAmForMe: Get Things Done. Fast.</h1>
            <p className="fs-5 text-muted mb-4">
              Connect with trusted local runners for your errands, deliveries, and tasks. Post a request or earn money helping others!
            </p>

            <div className="d-grid gap-3 d-sm-flex justify-content-sm-center">
              <Link to="/register" className="btn btn-primary btn-lg px-4 me-sm-3">
                Get Started (No-Cost!)
              </Link>
              <Link to="/login" className="btn btn-outline-primary btn-lg px-4">
                I Already Have an Account
              </Link>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="mt-5">
            <h2 className="text-center mb-4">How It Works</h2>
            <div className="row text-center">
              <div className="col-md-4 mb-4">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h5 className="card-title">1. Post an Errand</h5>
                    <p className="card-text">Describe your task, set a fee, and post it in seconds.</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-4">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h5 className="card-title">2. Get Offers Fast</h5>
                    <p className="card-text">Local runners see your request and offer to help immediately.</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-4">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h5 className="card-title">3. Pay & Review</h5>
                    <p className="card-text">Securely complete the task, pay the runner, and leave a review.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Optional: Add Testimonials, FAQ, or Features section here */}
        </div>
      </div>
    </div>
  );
};

export default Home;
