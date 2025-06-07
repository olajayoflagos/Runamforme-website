import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { RecaptchaVerifier, type ConfirmationResult, type AuthError } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import type { UserProfileWriteData } from '../types';
import { Button, Card, Form, Alert, Spinner, Container, Row, Col } from 'react-bootstrap';

const restrictedWords = new Set([
  'apple', 'money', 'agent', 'white', 'black', 'green', 'sweet', 'store', 'hello', 'world'
]);

function isUsernameRestricted(username: string): boolean {
  if (!username || username.length < 6) return true;
  if (/agent/i.test(username)) return true;
  if (restrictedWords.has(username.toLowerCase())) return true;
  return false;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading, register, loginWithGoogle, loginWithPhone } = useAuth();
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);
  const confirmationResult = useRef<ConfirmationResult | null>(null);
  const [phoneData, setPhoneData] = useState<{ name: string; username: string }>({ name: '', username: '' });

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    phoneNumber: '',
    otp: '',
  });
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState({
    email: false,
    google: false,
    phone: false,
  });
  const [error, setError] = useState<string | null>(null);

  const [showGoogleDetails, setShowGoogleDetails] = useState(false);
const [googleForm, setGoogleForm] = useState({
  name: '',
  username: '',
  acceptedTerms: false,
});
const [googleError, setGoogleError] = useState<string | null>(null);


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
    if (isUsernameRestricted(username)) return 'Username is restricted or too short (5+ letters, avoid common words like "agent")';
    if (username.length < 6) return 'Username must be at least 6 characters';
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
      case 'auth/email-already-in-use':
        errorMessage = 'Email already in use';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email format';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password must be at least 6 characters';
        break;
      case 'auth/invalid-phone-number':
        errorMessage = 'Invalid phone number format';
        break;
      case 'auth/invalid-verification-code':
        errorMessage = 'Invalid OTP code';
        break;
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return;
    }
    setError(errorMessage);
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(prev => ({ ...prev, email: true }));
    setError(null);

    const usernameError = validateUsername(formData.username);
    if (usernameError) {
      setError(usernameError);
      setLoading(prev => ({ ...prev, email: false }));
      return;
    }

    const uniqueError = await checkUsernameUnique(formData.username);
    if (uniqueError) {
      setError(uniqueError);
      setLoading(prev => ({ ...prev, email: false }));
      return;
    }

    try {
      await register(formData.email, formData.password, formData.name, formData.username);
      navigate('/dashboard');
    } catch (err) {
      handleError(err as AuthError, 'Email registration');
    } finally {
      setLoading(prev => ({ ...prev, email: false }));
    }
  };

  const handleGoogleRegister = async () => {
  setLoading(prev => ({ ...prev, google: true }));
  setError(null);


  try {
    await loginWithGoogle();
    const uid = auth.currentUser?.uid;
    
if (!uid) return setGoogleError('User not authenticated');

const userRef = doc(db, 'users', uid!);
const snap = await getDoc(userRef);


    // If profile already exists, navigate
    if (snap.exists()) {
      navigate('/dashboard');
    } else {
      // Show username + terms form
      setShowGoogleDetails(true);
    }
  } catch (err) {
    handleError(err as AuthError, 'Google registration');
  } finally {
    setLoading(prev => ({ ...prev, google: false }));
  }
};


  const handlePhoneRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(prev => ({ ...prev, phone: true }));
    setError(null);

    if (!otpSent) {
      const usernameError = validateUsername(formData.username);
      if (usernameError) {
        setError(usernameError);
        setLoading(prev => ({ ...prev, phone: false }));
        return;
      }

      const uniqueError = await checkUsernameUnique(formData.username);
      if (uniqueError) {
        setError(uniqueError);
        setLoading(prev => ({ ...prev, phone: false }));
        return;
      }

      try {
        if (!recaptchaVerifier.current) {
          recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
          });
        }
        const result = await loginWithPhone(formData.phoneNumber, recaptchaVerifier.current);
        confirmationResult.current = result;
        setPhoneData({ name: formData.name, username: formData.username });
        setOtpSent(true);
      } catch (err) {
        handleError(err as AuthError, 'Phone registration');
        recaptchaVerifier.current?.clear();
        recaptchaVerifier.current = null;
        setLoading(prev => ({ ...prev, phone: false }));
      }
    } else if (confirmationResult.current) {
      try {
        const userCredential = await confirmationResult.current.confirm(formData.otp);
        const userRef = doc(db, 'users', userCredential.user.uid);
        const profileData: UserProfileWriteData = {
          name: phoneData.name || 'New User',
          username: phoneData.username,
          searchableUsername: phoneData.username.toLowerCase(),
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
        await setDoc(userRef, profileData, { merge: true });
        navigate('/dashboard');
      } catch (err) {
        handleError(err as AuthError, 'Phone OTP verification');
        recaptchaVerifier.current?.clear();
        recaptchaVerifier.current = null;
        setOtpSent(false);
      } finally {
        setLoading(prev => ({ ...prev, phone: false }));
      }
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
        <title>Register - RunAmForMe</title>
        <meta name="description" content="Create a free account to start posting or running errands on RunAmForMe." />
      </Helmet>
      <Row className="justify-content-center">
        <Col md={8} lg={6} xl={5}>
          <Card className="shadow-sm">
            <Card.Body className="p-4 p-md-5">
              <Card.Title className="text-center mb-4">
                <h2>Create Your Account</h2>
              </Card.Title>

              {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleEmailRegister} className="mb-4">
                <Form.Group className="mb-3">
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={Object.values(loading).some(Boolean)}
                  />
                </Form.Group>

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
                  <Form.Label>Email</Form.Label>
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
                    minLength={6}
                    required
                    disabled={Object.values(loading).some(Boolean)}
                  />
                  <Form.Text className="text-muted">
                    At least 6 characters
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3" controlId="termsConsentEmail">
  <Form.Check
    type="checkbox"
    label={
      <>
        I agree to the <Link to="/terms">Terms & Conditions</Link>
      </>
    }
    required
  />
</Form.Group>


                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={Object.values(loading).some(Boolean)}
                  className="w-100 mb-3"
                >
                  {loading.email ? (
                    <Spinner size="sm" animation="border" role="status" aria-hidden="true" />
                  ) : (
                    'Register with Email'
                  )}
                </Button>
              </Form>

              <div className="text-center text-muted mb-3">OR</div>

              <Button 
                variant="outline-secondary" 
                onClick={handleGoogleRegister}
                disabled={Object.values(loading).some(Boolean)}
                className="w-100 mb-3"
              >
                {loading.google ? (
                  <Spinner size="sm" animation="border" role="status" aria-hidden="true" />
                ) : (
                  'Continue with Google'
                )}
              </Button>

              <Form onSubmit={handlePhoneRegister} className="mb-4">
                <Form.Group className="mb-3">
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={otpSent || Object.values(loading).some(Boolean)}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    disabled={otpSent || Object.values(loading).some(Boolean)}
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

                <Form.Group className="mb-3" controlId="termsConsentPhone">
  <Form.Check
    type="checkbox"
    label={
      <>
        I agree to the <Link to="/terms">Terms & Conditions</Link>
      </>
    }
    required
  />
</Form.Group>


                {otpSent && (
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
                    otpSent ? 'Verify OTP' : 'Register with Phone'
                  )}
                </Button>
              </Form>
{showGoogleDetails && (
  <Form
    onSubmit={async (e) => {
      e.preventDefault();
      const { name, username, acceptedTerms } = googleForm;

      const usernameError = validateUsername(username);
      if (usernameError) return setGoogleError(usernameError);
      if (!acceptedTerms) return setGoogleError('You must accept the Terms & Conditions');

      const uniqueError = await checkUsernameUnique(username);
      if (uniqueError) return setGoogleError(uniqueError);

      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return setGoogleError('User not authenticated');
        const userRef = doc(db, 'users', uid);
        const profileData: UserProfileWriteData = {
          name,
          username,
          searchableUsername: username.toLowerCase(),
          email: auth.currentUser?.email || '',
          userType: 'both',
          createdAt: serverTimestamp(),
          followersCount: 0,
          followingCount: 0,
          likes: 0,
          bio: '',
          isVerified: false,
          walletBalance: 0,
          avatarUrl: auth.currentUser?.photoURL || '',
        };
        await setDoc(userRef, profileData);
        navigate('/dashboard');
      } catch (err) {
        console.error('Google profile creation failed:', err);
        setGoogleError('Failed to save profile. Please try again.');
      }
    }}
    className="mt-4"
  >
    <Form.Group className="mb-3">
      <Form.Label>Full Name</Form.Label>
      <Form.Control
        type="text"
        value={googleForm.name}
        onChange={(e) => setGoogleForm((prev) => ({ ...prev, name: e.target.value }))}
        required
      />
    </Form.Group>

    <Form.Group className="mb-3">
      <Form.Label>Username</Form.Label>
      <Form.Control
        type="text"
        value={googleForm.username}
        onChange={(e) => setGoogleForm((prev) => ({ ...prev, username: e.target.value.toLowerCase() }))}
        required
      />
    </Form.Group>

    <Form.Group className="mb-3">
      <Form.Check
        type="checkbox"
        label={
          <>
            I agree to the <Link to="/terms">Terms & Conditions</Link>
          </>
        }
        checked={googleForm.acceptedTerms}
        onChange={(e) => setGoogleForm((prev) => ({ ...prev, acceptedTerms: e.target.checked }))}
        required
      />
    </Form.Group>

    {googleError && <Alert variant="danger">{googleError}</Alert>}

    <Button type="submit" variant="primary" className="w-100">Complete Signup</Button>
  </Form>
)}

              <div className="text-center mt-4">
                Already have an account?{' '}
                <Link to="/login" className="text-primary">
                  Login
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Register;