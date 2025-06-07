import React, { useEffect, useState } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import type { UserProfile } from '../types';
import { Form, Button, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';

const SettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [accountDetails, setAccountDetails] = useState('');
  const [messageBackgroundUrl, setMessageBackgroundUrl] = useState('');
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    errandHistoryVisibility: 'public',
    showReviews: true,
    hideWalletBalance: false,
  });
  const [notificationPreferences, setNotificationPreferences] = useState({
    email: true,
    push: true,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setUserProfile(data);
          setPrivacySettings({
            profileVisibility: data.privacySettings?.profileVisibility ?? privacySettings.profileVisibility,
            errandHistoryVisibility: data.privacySettings?.errandHistoryVisibility ?? privacySettings.errandHistoryVisibility,
            showReviews: data.privacySettings?.showReviews ?? privacySettings.showReviews,
            hideWalletBalance: data.privacySettings?.hideWalletBalance ?? privacySettings.hideWalletBalance,
          });
          setNotificationPreferences(data.notificationPreferences || notificationPreferences);
          setMessageBackgroundUrl(data.messageBackgroundUrl || '');
          setAccountDetails(typeof data.accountDetails === 'string' ? data.accountDetails : '');
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await axios.post(
        `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`,
        formData
      );
      const data = res.data as { data: { url: string } };
      const imageUrl = data.data.url;
      setMessageBackgroundUrl(imageUrl);
      setMessage('Image uploaded successfully.');
    } catch (error) {
      console.error('Upload failed:', error);
      setMessage('Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    setMessage(null);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        privacySettings,
        notificationPreferences,
        messageBackgroundUrl,
        accountDetails,
      });
      setMessage('Settings saved successfully.');
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center my-5"><Spinner animation="border" /></div>;
  }

  return (
    <div className="container my-5">
      <h2 className="mb-4">Settings</h2>

      {message && <Alert variant="info">{message}</Alert>}

      <Form>
        <h5>Privacy Settings</h5>
        <Form.Group className="mb-3">
          <Form.Label>Profile Visibility</Form.Label>
          <Form.Select
            value={privacySettings.profileVisibility}
            onChange={(e) =>
              setPrivacySettings((prev) => ({ ...prev, profileVisibility: e.target.value as 'public' | 'private' }))
            }
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Errand History Visibility</Form.Label>
          <Form.Select
            value={privacySettings.errandHistoryVisibility}
            onChange={(e) =>
              setPrivacySettings((prev) => ({ ...prev, errandHistoryVisibility: e.target.value as 'public' | 'private' }))
            }
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </Form.Select>
        </Form.Group>

        <Form.Check
          type="checkbox"
          label="Show reviews to others"
          checked={privacySettings.showReviews}
          onChange={(e) =>
            setPrivacySettings((prev) => ({ ...prev, showReviews: e.target.checked }))
          }
        />
        <Form.Check
          type="checkbox"
          label="Hide wallet balance"
          checked={privacySettings.hideWalletBalance}
          onChange={(e) =>
            setPrivacySettings((prev) => ({ ...prev, hideWalletBalance: e.target.checked }))
          }
        />

        <hr />
        <h5>Notification Preferences</h5>
        <Form.Check
          type="checkbox"
          label="Email Notifications"
          checked={notificationPreferences.email}
          onChange={(e) =>
            setNotificationPreferences((prev) => ({ ...prev, email: e.target.checked }))
          }
        />
        <Form.Check
          type="checkbox"
          label="Push Notifications"
          checked={notificationPreferences.push}
          onChange={(e) =>
            setNotificationPreferences((prev) => ({ ...prev, push: e.target.checked }))
          }
        />

        <hr />
        <h5>Message Background</h5>
        <Form.Group className="mb-3">
          <Form.Label>Upload Background Image</Form.Label>
          <Form.Control type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
          {uploading && <div className="mt-2"><Spinner animation="border" size="sm" /> Uploading...</div>}
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Or Use Background Image URL</Form.Label>
          <Form.Control
            type="text"
            value={messageBackgroundUrl}
            onChange={(e) => setMessageBackgroundUrl(e.target.value)}
            placeholder="https://..."
          />
        </Form.Group>
        {messageBackgroundUrl && (
          <div className="mb-3">
            <small className="text-muted">Preview:</small><br />
            <img src={messageBackgroundUrl} alt="Preview" className="img-fluid rounded shadow-sm" style={{ maxHeight: '180px' }} />
          </div>
        )}

        <hr />
        <h5>Withdrawal Account Details</h5>
        <Form.Group className="mb-4">
          <Form.Label>Account Info</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={accountDetails}
            onChange={(e) => setAccountDetails(e.target.value)}
            placeholder="Bank name, account number, account name"
          />
        </Form.Group>

        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          className="w-100"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Form>
    </div>
  );
};

export default SettingsPage;
