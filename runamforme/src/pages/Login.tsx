import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { RecaptchaVerifier, type ConfirmationResult, type AuthError } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import type { UserProfileWriteData } from '../types';
import { Button, Card, Form, Alert, Spinner, Container, Row, Col } from 'react-bootstrap';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading, login, loginWithGoogle, loginWithPhone, loginAnonymously } = useAuth();
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);
  const confirmationResult = useRef<ConfirmationResult | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phoneNumber: '',
    otp: '',
    username: '',
  });
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState({
    email: false,
    google: false,
    phone: false,
    anonymous: false,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, currentUser, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'username' ? value.toLowerCase() : value,
    }));
  };

  const validateUsername = (username: string) => {
    if (!username.trim()) return 'Username is required';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (!/^[a-z0-9_]+$/.test(username)) return 'Only lowercase letters, numbers, and underscores';
    return null;
  };

  const checkUsernameUnique = async (username: string) => {
    const q = query(collection(db, 'users'), where('username', '==', username));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : 'Username is already taken';
  };

  const handleError = (err: AuthError, authMethod: string) => {
    let errorMessage = `${authMethod} failed. Please try again.`;
    switch (err.code) {
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address format.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled.';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'Invalid email or password.';
        break;
      case 'auth/invalid-phone-number':
        errorMessage = 'Invalid phone number format.';
        break;
      case 'auth/invalid-verification-code':
        errorMessage = 'Invalid OTP code.';
        break;
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return;
    }
    setError(errorMessage);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(prev => ({ ...prev, email: true }));
  setError(null);

  try {
    let emailToLogin = formData.email;

    if (!emailToLogin.includes('@')) {
      const q = query(collection(db, 'users'), where('username', '==', formData.email.toLowerCase()));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        throw new Error('No user found with that username');
      }
      const userDoc = snapshot.docs[0];
      const data = userDoc.data() as { email?: string };
      if (!data.email) {
        throw new Error('Account with this username has no email');
      }
      emailToLogin = data.email;
    }

    await login(emailToLogin, formData.password);
navigate('/dashboard');
} catch (err) {
  if (err && typeof err === 'object' && 'code' in err) {
    const firebaseErr = err as AuthError;
    handleError(firebaseErr, 'Login');
  } else if (err instanceof Error) {
    setError(err.message);
  } else {
    setError('An unknown error occurred.');
  }
} finally {
  setLoading(prev => ({ ...prev, email: false }));
}

};


  const handleGoogleLogin = async () => {
    setLoading(prev => ({ ...prev, google: true }));
    setError(null);

    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      handleError(err as AuthError, 'Google login');
    } finally {
      setLoading(prev => ({ ...prev, google: false }));
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(prev => ({ ...prev, phone: true }));
    setError(null);

    try {
      if (!otpSent) {
        if (!recaptchaVerifier.current) {
          recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
          });
        }
        const result = await loginWithPhone(formData.phoneNumber, recaptchaVerifier.current);
        confirmationResult.current = result;
        setOtpSent(true);
      } else if (confirmationResult.current) {
        if (!formData.username) {
          setError('Please enter a username.');
          return;
        }
        const usernameError = validateUsername(formData.username);
        if (usernameError) {
          setError(usernameError);
          return;
        }
        const uniqueError = await checkUsernameUnique(formData.username);
        if (uniqueError) {
          setError(uniqueError);
          return;
        }
        const userCredential = await confirmationResult.current.confirm(formData.otp);
       const userRef = doc(db, 'users', userCredential.user.uid);
const userSnap = await getDoc(userRef);

if (!userSnap.exists()) {
  const profileData: UserProfileWriteData = {
    name: 'New User',
    username: formData.username,
    searchableUsername: formData.username.toLowerCase(),
    email: '',
    userType: 'both',
    createdAt: serverTimestamp(),
    followersCount: 0,
    followingCount: 0,
    likes: 0,
    bio: '',
    isVerified: false,
    walletBalance: 0,
    avatarUrl: '',
  };

  // Save profile to users/{uid}
  await setDoc(userRef, profileData);

  // Save mapping to usernames/{username}
  const usernameRef = doc(db, 'usernames', formData.username);
  await setDoc(usernameRef, {
    userId: userCredential.user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

        navigate('/dashboard');
      }
    } catch (err) {
      handleError(err as AuthError, 'Phone login');
      recaptchaVerifier.current?.clear();
      recaptchaVerifier.current = null;
      setOtpSent(false);
    } finally {
      setLoading(prev => ({ ...prev, phone: false }));
    }
  };

  const handleAnonymousLogin = async () => {
    setLoading(prev => ({ ...prev, anonymous: true }));
    setError(null);

    try {
      await loginAnonymously();
      navigate('/dashboard');
    } catch (err) {
      handleError(err as AuthError, 'Anonymous login');
    } finally {
      setLoading(prev => ({ ...prev, anonymous: false }));
    }
  };

  if (authLoading) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" variant="primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Helmet>
        <title>Login - RunAmForMe</title>
        <meta name="description" content="Login to your RunAmForMe account to post or run errands." />
      </Helmet>
      <Row className="justify-content-center">
        <Col md={8} lg={6} xl={5}>
          <Card className="shadow-sm">
            <Card.Body className="p-4 p-md-5">
              <Card.Title className="text-center mb-4">
                <h2>Login to RunAmForMe</h2>
              </Card.Title>

              {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleEmailLogin} className="mb-4">
                <Form.Group className="mb-3">
                  <Form.Label>Email address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={Object.values(loading).some(Boolean)}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    disabled={Object.values(loading).some(Boolean)}
                  />
                </Form.Group>
                <div className="text-end mb-3">
  <Link to="/reset-password" className="text-primary" style={{ fontSize: '0.9rem' }}>
    Forgot Password?
  </Link>
</div>


                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={Object.values(loading).some(Boolean)}
                  className="w-100 mb-3"
                >
                  {loading.email ? (
                    <Spinner size="sm" animation="border" role="status" aria-hidden="true" />
                  ) : (
                    'Login with Email'
                  )}
                </Button>
              </Form>

              <div className="text-center text-muted mb-3">OR</div>

              <Button 
                variant="outline-secondary" 
                onClick={handleGoogleLogin}
                disabled={Object.values(loading).some(Boolean)}
                className="w-100 mb-3"
              >
                {loading.google ? (
                  <Spinner size="sm" animation="border" role="status" aria-hidden="true" />
                  ) : (
                    'Continue with Google'
                  )}
              </Button>

              <Form onSubmit={handlePhoneLogin} className="mb-4">
                <Form.Group className="mb-3">
                  <Form.Label>Phone Number</Form.Label>
                  <Form.Control
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="+1234567890"
                    required
                    disabled={otpSent || Object.values(loading).some(Boolean)}
                  />
                </Form.Group>

                {otpSent && (
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label>Username</Form.Label>
                      <Form.Control
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        disabled={Object.values(loading).some(Boolean)}
                        onBlur={async () => {
                          const error = validateUsername(formData.username);
                          if (error) setError(error);
                          else {
                            const uniqueError = await checkUsernameUnique(formData.username);
                            if (uniqueError) setError(uniqueError);
                          }
                        }}
                      />
                      <Form.Text className="text-muted">
                        Lowercase letters, numbers, and underscores only
                      </Form.Text>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>OTP Code</Form.Label>
                      <Form.Control
                        type="text"
                        name="otp"
                        value={formData.otp}
                        onChange={handleChange}
                        required
                        disabled={Object.values(loading).some(Boolean)}
                      />
                    </Form.Group>
                  </>
                )}

                <div id="recaptcha-container" />

                <Button 
                  variant={otpSent ? "success" : "primary"}
                  type="submit"
                  disabled={Object.values(loading).some(Boolean)}
                  className="w-100 mb-3"
                >
                  {loading.phone ? (
                    <Spinner size="sm" animation="border" role="status" aria-hidden="true" />
                  ) : (
                    otpSent ? 'Verify OTP' : 'Continue with Phone'
                  )}
                </Button>
              </Form>

              <div className="text-center text-muted mb-3">OR</div>

              <Button 
                variant="outline-secondary"
                onClick={handleAnonymousLogin}
                disabled={Object.values(loading).some(Boolean)}
                className="w-100 mb-3"
              >
                {loading.anonymous ? (
                  <Spinner size="sm" animation="border" role="status" aria-hidden="true" />
                ) : (
                  'Continue as Guest'
                )}
              </Button>

              <div className="text-center mt-4">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary">
                  Register here
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;