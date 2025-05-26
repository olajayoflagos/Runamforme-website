import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';

type UserProfile = {
  username: string;
  name?: string;
  avatarUrl?: string;
};

const NavBar: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      alert('Logout failed. Please try again.');
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchUserProfile();
  }, [currentUser]);

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

  const avatarUrl = profile?.avatarUrl || currentUser?.photoURL || '';
  const displayName = profile?.name || currentUser?.displayName || 'User';
  const username = profile?.username;

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
              <Link className="nav-link" to="/">Home</Link>
            </li>
            {currentUser && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/post">Post Errand</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/dashboard">Dashboard</Link>
                </li>
              </>
            )}
            <li className="nav-item">
              <Link className="nav-link" to="/errands">Browse Errands</Link>
            </li>
          </ul>

          <div className="d-flex align-items-center">
            {currentUser ? (
              <div className="dropdown">
                <button
                  className="btn dropdown-toggle d-flex align-items-center"
                  type="button"
                  id="userMenuButton"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="rounded-circle me-2"
                      style={{ width: '52px', height: '52px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      className="bg-secondary text-white rounded-circle d-flex justify-content-center align-items-center me-2"
                      style={{ width: '32px', height: '32px', fontSize: '14px' }}
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="d-none d-md-inline">{displayName}</span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userMenuButton">
                  {username && (
                    <li>
                      <Link className="dropdown-item d-flex" to={`/profile/${username}`}>
                       ------------ View Profile
                      </Link>
                    </li>
                  )}
                  <li>
                    <Link className="dropdown-item" to="/edit-profile">------------ Edit Profile</Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/dashboard">------------ Dashboard</Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item" onClick={handleLogout}> ------------ Logout</button>
                  </li>
                </ul>
              </div>
            ) : (
              <>
                <Link className="btn btn-outline-primary me-2" to="/login">Login</Link>
                <Link className="btn btn-primary" to="/register">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
