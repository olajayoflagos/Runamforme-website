import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home: React.FC = () => {
  const { currentUser, loading } = useAuth();

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
          
          <div className="hero-section py-4 px-3 px-md-5 bg-light rounded-3 shadow-sm text-center">
            <h1 className="h2 h-md-1 fw-bold mb-3">RunAmForMe: Get Things Done. Fast.</h1>
            <p className="fs-6 fs-md-5 text-muted mb-4">
              Connect with trusted local runners for your errands, deliveries, and tasks.
              Post a request or earn money helping others!
            </p>

            <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
              {currentUser ? (
                <>
                  <Link to="/dashboard" className="btn btn-primary btn-lg w-100 w-sm-auto mb-2 mb-sm-0 me-sm-3">
                    Go to Dashboard
                  </Link>
                  <Link to="/errands" className="btn btn-outline-primary btn-lg w-100 w-sm-auto">
                    Browse Errands
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary btn-lg w-100 w-sm-auto mb-2 mb-sm-0 me-sm-3">
                    Get Started (No-Cost!)
                  </Link>
                  <Link to="/login" className="btn btn-outline-primary btn-lg w-100 w-sm-auto">
                    I Already Have an Account
                  </Link>
                </>
              )}
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
