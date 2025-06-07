import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, getDocs, updateDoc, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import type { UserProfile } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { Form, Button, Alert, Card, Container, Row, Col, Spinner } from 'react-bootstrap';

const restrictedWords = new Set([
  'apple', 'money', 'agent', 'white', 'black', 'green', 'sweet', 'store', 'hello', 'world'
]);

function isUsernameValid(username: string): boolean {
  if (!username || username.length < 5) return false;
  if (/agent/i.test(username)) return false;
  if (restrictedWords.has(username.toLowerCase())) return false;
  return true;
}

const EditProfilePage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
    avatarUrl: '',
    userType: 'both' as 'user' | 'runner' | 'both',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!currentUser?.uid) {
      setError('No user logged in');
      setLoading(false);
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        setFormData({
          name: data.name || '',
          username: data.username || '',
          bio: data.bio || '',
          avatarUrl: data.avatarUrl || '',
          userType: data.userType || 'both',
        });
      } else {
        setError('Profile not found');
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username.trim()));
      const querySnapshot = await getDocs(q);

      const isAvailable =
        querySnapshot.empty ||
        (querySnapshot.docs.length === 1 && querySnapshot.docs[0].id === currentUser?.uid);
      setUsernameAvailable(isAvailable);
    } catch (err) {
      console.error('Error checking username:', err);
      setUsernameAvailable(null);
    }
  }, [currentUser]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', e.target.files[0]);
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, avatarUrl: data.data.url }));
      } else {
        setError('Failed to upload image. Please try again.');
      }
    } catch (err) {
      setError('Image upload failed. Please check your connection.');
    } finally {
      setImageUploading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));

    if (id === 'username') {
      checkUsernameAvailability(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    setError(null);

    try {
      if (!isUsernameValid(formData.username.trim())) {
  setError('Username is restricted or too short (must be at least 5 characters and not include reserved words).');
  setSaving(false);
  return;
}


      if (usernameAvailable === false) {
        setError('Username is already taken');
        setSaving(false);
        return;
      }

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        name: formData.name.trim(),
        username: formData.username.trim().toLowerCase(),
        searchableUsername: formData.username.trim().toLowerCase(),
        bio: formData.bio.trim(),
        avatarUrl: formData.avatarUrl.trim(),
        userType: formData.userType,
        updatedAt: serverTimestamp(),
      });

      navigate(`/profile/${formData.username.trim().toLowerCase()}`, {
        state: { message: 'Profile updated successfully!' },
      });
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error('Update error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h1 className="h4 mb-0">Edit Profile</h1>
            </Card.Header>
            <Card.Body>
              {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="name">Full Name</Form.Label>
                  <Form.Control
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label htmlFor="username">Username</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text">@</span>
                    <Form.Control
                      type="text"
                      id="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="username"
                      required
                      minLength={3}
                    />
                  </div>
                  {usernameAvailable !== null && (
                    <Form.Text className={usernameAvailable ? 'text-success' : 'text-danger'}>
                      {usernameAvailable ? 'Username available' : 'Username taken'}
                    </Form.Text>
                  )}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label htmlFor="bio">Bio</Form.Label>
                  <Form.Control
                    as="textarea"
                    id="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Tell others about yourself"
                    rows={3}
                    maxLength={200}
                  />
                  <Form.Text>{formData.bio.length}/200</Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label htmlFor="userType">Role</Form.Label>
                  <Form.Select id="userType" value={formData.userType} onChange={handleChange}>
                    <option value="user">User</option>
                    <option value="runner">Runner</option>
                    <option value="both">Both</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label htmlFor="avatar-upload">Profile Picture</Form.Label>
                  <Form.Control
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={imageUploading}
                  />
                  {imageUploading && (
                    <Spinner animation="border" size="sm" className="mt-2" aria-label="Uploading image" />
                  )}
                  {formData.avatarUrl && (
                    <div className="mt-2">
                      <img
                        src={formData.avatarUrl}
                        alt="Profile preview"
                        className="img-thumbnail"
                        style={{ maxWidth: '100px' }}
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/100?text=No+Image';
                        }}
                      />
                    </div>
                  )}
                </Form.Group>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <Button
                    type="button"
                    variant="outline-secondary"
                    className="me-md-2"
                    onClick={() => navigate(-1)}
                    disabled={saving || imageUploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={saving || usernameAvailable === false || imageUploading}
                  >
                    {saving ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" role="status" aria-hidden="true" />
                        Saving...
                      </>
                    ) : 'Save Changes'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EditProfilePage;