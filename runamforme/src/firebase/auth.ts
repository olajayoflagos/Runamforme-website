import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile as updateFirebaseProfile,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signInAnonymously,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from './config';
import type { UserProfileWriteData, AccountDetails } from '../types';

const provider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    await createOrUpdateUserProfile(result.user);
    return result.user;
  } catch (error) {
    console.error('Google login failed:', error);
    throw new Error('Unable to sign in with Google. Please try again.');
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout failed:', error);
    throw new Error('Unable to sign out. Please try again.');
  }
};

export const registerWithEmail = async (email: string, password: string, displayName: string, username: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateFirebaseProfile(user, { displayName });


await createOrUpdateUserProfile(user, {
  name: displayName,
  username: username.toLowerCase(),
  searchableUsername: username.toLowerCase(),
});

// After profile is safely created, save username
await setDoc(doc(db, 'usernames', username.toLowerCase()), {
  userId: user.uid,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});


    return user;
  } catch (error) {
    console.error('Registration failed:', error);
    throw new Error('Unable to register. Please check your details and try again.');
  }
};



export const loginWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Email login failed:', error);
    throw new Error('Invalid email or password. Please try again.');
  }
};

export const loginWithPhone = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier, name: string, username: string) => {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    return { confirmationResult, name, username };
  } catch (error) {
    console.error('Phone login failed:', error);
    throw new Error('Unable to sign in with phone number. Please try again.');
  }
};

export const loginAnonymously = async () => {
  try {
    const result = await signInAnonymously(auth);
    await createOrUpdateUserProfile(result.user, {
      name: 'Anonymous User',
      username: `guest_${result.user.uid.slice(0, 8)}`,
      searchableUsername: `guest_${result.user.uid.slice(0, 8)}`,
      blockedUsers: [],
      messageBackgroundUrl: '',
    });
    return result.user;
  } catch (error) {
    console.error('Anonymous login failed:', error);
    throw new Error('Unable to sign in anonymously. Please try again.');
  }
};

const createOrUpdateUserProfile = async (user: User, extraData: Partial<UserProfileWriteData> = {}) => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const profileData: UserProfileWriteData = {
        name: user.displayName || extraData.name || 'Anonymous User',
        email: user.email || extraData.email || '',
        username: extraData.username || `user_${user.uid.slice(0, 8)}`,
        searchableUsername: extraData.searchableUsername || extraData.username?.toLowerCase() || `user_${user.uid.slice(0, 8)}`,
        userType: 'both',
        createdAt: serverTimestamp(),
        followersCount: 0,
        followingCount: 0,
        likes: 0,
        bio: extraData.bio || '',
        isVerified: false,
        walletBalance: 0,
        avatarUrl: extraData.avatarUrl || '',
        blockedUsers: extraData.blockedUsers || [],
        messageBackgroundUrl: extraData.messageBackgroundUrl || '',
      };
      await setDoc(userRef, profileData);
    }
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    throw new Error('Unable to create user profile. Please try again.');
  }
};

export const updateProfile = async (userId: string, profileData: Partial<UserProfileWriteData>) => {
  try {
    const finalProfileData = {
      ...profileData,
      searchableUsername: profileData.username ? profileData.username.toLowerCase() : undefined,
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', userId), finalProfileData, { merge: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error('Unable to update profile. Please try again.');
  }
};

export const updateAccountDetails = async (userId: string, details: AccountDetails) => {
  try {
    await setDoc(
      doc(db, 'users', userId),
      { accountDetails: details, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating account details:', error);
    throw new Error('Unable to update account details. Please try again.');
  }
};

export const updateUserProfileAvatar = async (userId: string, avatarUrl: string) => {
  try {
    await setDoc(
      doc(db, 'users', userId),
      { avatarUrl, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating profile avatar:', error);
    throw new Error('Unable to update profile avatar. Please try again.');
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Unable to send password reset email. Please check your email and try again.');
  }
};

export { auth };