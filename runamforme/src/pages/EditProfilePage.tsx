// src/pages/EditProfilePage.tsx
import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import type { UserProfile } from '../types';

const EditProfilePage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          setError('Profile not found.');
        }
      } catch (err) {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        name: profile.name || '',
        username: profile.username || '',
        bio: profile.bio || '',
      });
      navigate('/profile');
    } catch (err) {
      setError('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="container my-5 text-center">Loading...</div>;
  if (error) return <div className="container my-5 alert alert-danger text-center">{error}</div>;

  return (
    <div className="container my-5">
      <h2>Edit Profile</h2>
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="mb-3">
          <label className="form-label">Name</label>
          <input type="text" name="name" value={profile.name || ''} onChange={handleChange} className="form-control" required />
        </div>
        <div className="mb-3">
          <label className="form-label">Username</label>
          <input type="text" name="username" value={profile.username || ''} onChange={handleChange} className="form-control" required />
        </div>
        <div className="mb-3">
          <label className="form-label">Bio</label>
          <textarea name="bio" value={profile.bio || ''} onChange={handleChange} className="form-control" rows={4} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default EditProfilePage;
