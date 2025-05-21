// src/components/NavBar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const NavBar: React.FC = () => {
  const { currentUser, loading } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      alert("Logout failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <nav className="navbar navbar-expand-lg navbar-light bg-light shadow-sm">
        <div className="container">
          <span className="navbar-brand text-primary fw-bold">RunAmForMe</span>
          <span className="navbar-text ms-auto">Loading...</span>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
      <div className="container">
        <Link className="navbar-brand text-primary fw-bold" to="/">
          RunAmForMe
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link" aria-current="page" to="/">Home</Link>
            </li>
            {currentUser && (
              <li className="nav-item">
                <Link className="nav-link" to="/post">Post Errand</Link>
              </li>
            )}
            {currentUser && (
              <li className="nav-item">
                <Link className="nav-link" to="/dashboard">Dashboard</Link>
              </li>
            )}
            <li className="nav-item">
              <Link className="nav-link" to="/errands">Browse Errands</Link>
            </li>
          </ul>

          {/* Auth Buttons inside collapse */}
          <div className="d-flex">
            {currentUser ? (
              <button className="btn btn-outline-danger" onClick={handleLogout}>
                Logout
              </button>
            ) : (
              <>
                <Link className="btn btn-outline-primary me-2" to="/login">
                  Login
                </Link>
                <Link className="btn btn-primary" to="/register">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;