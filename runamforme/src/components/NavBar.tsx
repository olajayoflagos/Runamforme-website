import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { doc, onSnapshot, query, collection, where } from 'firebase/firestore';
import type { UserProfile } from '../types';
import { Dropdown, Navbar, Nav, Container, Badge, Spinner, Button } from 'react-bootstrap';

const NavBar: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (!currentUser?.uid) {
      setProfile(null);
      setUnreadCount(0);
      return;
    }

    const unsubscribeProfile = onSnapshot(
      doc(db, 'users', currentUser.uid),
      (doc) => {
        try {
          if (doc.exists()) {
            setProfile(doc.data() as UserProfile);
          } else {
            setError('Profile not found');
          }
        } catch (err) {
          console.error('Profile snapshot error:', err);
          setError('Failed to load profile');
        }
      },
      (error) => {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile');
      }
    );

    const notifQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      where('read', '==', false)
    );
    const unsubscribeNotif = onSnapshot(
      notifQuery,
      (snapshot) => {
        try {
          setUnreadCount(snapshot.size);
        } catch (err) {
          console.error('Notifications snapshot error:', err);
          setError('Failed to load notifications');
        }
      },
      (error) => {
        console.error('Error fetching notifications:', error);
        setError('Failed to load notifications');
      }
    );

    return () => {
      unsubscribeProfile();
      unsubscribeNotif();
    };
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
      setError('Logout failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <Navbar bg={theme} variant={theme} expand="lg" className="shadow-sm py-2" aria-label="Main navigation">
        <Container>
          <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
  <img src={require('../assets/headerlogo.png')}
    alt='RunAmForMe Home'
    style={{ height: '40px', maxWidth: '100%', objectFit: 'contain' }} 
    className="img-fluid"
  />
</Navbar.Brand>


          <Spinner
            animation="border"
            size="sm"
            className="ms-auto"
            variant={theme === 'dark' ? 'light' : 'primary'}
            role="status"
            aria-label="Loading navigation"
          />
        </Container>
      </Navbar>
    );
  }

  const avatarUrl = profile?.avatarUrl || currentUser?.photoURL || '';
  const displayName = profile?.name || currentUser?.displayName || 'User';

  return (
    <Navbar bg={theme} variant={theme} expand="lg" className="shadow-sm py-2" sticky="top" aria-label="Main navigation">
      <Container>
        <Navbar.Brand as={Link} to="/" className="text-primary fw-bold fs-4">
          RunAmForMe
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-navbar" aria-label="Toggle navigation" />

        <Navbar.Collapse id="main-navbar">
          <Nav className="me-auto align-items-center" as="ul">
            <Nav.Item as="li">
              <Nav.Link
                as={Link}
                to="/"
                active={location.pathname === '/'}
                aria-current={location.pathname === '/' ? 'page' : undefined}
                className="px-3"
              >
                Home
              </Nav.Link>
            </Nav.Item>
            <Nav.Item as="li">
              <Nav.Link
                as={Link}
                to="/errands"
                active={location.pathname === '/errands'}
                aria-current={location.pathname === '/errands' ? 'page' : undefined}
                className="px-3"
              >
                Browse Errands
              </Nav.Link>
            </Nav.Item>

            {currentUser && (
              <>
                <Nav.Item as="li">
                  <Nav.Link
                    as={Link}
                    to="/post-errand"
                    active={location.pathname === '/post-errand'}
                    aria-current={location.pathname === '/post-errand' ? 'page' : undefined}
                    className="px-3"
                  >
                    Post Errand
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item as="li">
                  <Nav.Link
                    as={Link}
                    to="/dashboard"
                    active={location.pathname === '/dashboard'}
                    aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
                    className="px-3"
                  >
                    Dashboard
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item as="li">
                  <Nav.Link
                    as={Link}
                    to="/track-errands"
                    active={location.pathname === '/track-errands'}
                    aria-current={location.pathname === '/track-errands' ? 'page' : undefined}
                    className="px-3"
                  >
                    Track Errands
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item as="li">
                  <Nav.Link
                    as={Link}
                    to="/messages"
                    active={location.pathname.startsWith('/messages')}
                    aria-current={location.pathname.startsWith('/messages') ? 'page' : undefined}
                    className="px-3"
                  >
                    Messages
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item as="li">
                  <Nav.Link
                    as={Link}
                    to="/notifications"
                    active={location.pathname === '/notifications'}
                    aria-current={location.pathname === '/notifications' ? 'page' : undefined}
                    className="px-3"
                  >
                    Notifications
                    {unreadCount > 0 && (
                      <Badge bg="danger" pill className="ms-1" aria-label={`${unreadCount} unread notifications`}>
                        {unreadCount}
                        <span className="visually-hidden">unread notifications</span>
                      </Badge>
                    )}
                  </Nav.Link>
                </Nav.Item>
              </>
            )}
          </Nav>

          <Nav as="ul" className="align-items-center">
            <Nav.Item as="li" className="me-2">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                className="rounded-circle"
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </Button>
            </Nav.Item>
            {currentUser ? (
              <Nav.Item as="li">
                <Dropdown align="end">
                  <Dropdown.Toggle
                    variant="light"
                    id="user-dropdown"
                    className="d-flex align-items-center bg-transparent border-0"
                    aria-label="User menu"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={`${displayName}'s avatar`}
                        className="rounded-circle me-2"
                        width="32"
                        height="32"
                        aria-hidden="true"
                      />
                    ) : (
                      <div
                        className="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center me-2"
                        style={{ width: '32px', height: '32px' }}
                        aria-hidden="true"
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="d-none d-lg-inline">{displayName}</span>
                  </Dropdown.Toggle>

                  <Dropdown.Menu aria-labelledby="user-dropdown">
                    <Dropdown.Item as={Link} to={`/profile/${profile?.username ?? currentUser.uid}`}>
                      View Profile
                    </Dropdown.Item>
                    <Dropdown.Item as={Link} to="/edit-profile">
                      Edit Profile
                    </Dropdown.Item>
                    <Dropdown.Item as={Link} to="/wallet">
                      Wallet
                    </Dropdown.Item>
                    <Dropdown.Item as={Link} to="/settings">
                      Settings
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={handleLogout}>
                      Logout
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Nav.Item>
            ) : (
              <>
                <Nav.Item as="li">
                  <Nav.Link as={Link} to="/login" className="me-2 px-3">
                    Login
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item as="li">
                  <Link to="/register" className="btn btn-primary px-3" role="button">
                    Register
                  </Link>
                </Nav.Item>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavBar;