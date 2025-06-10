import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { 
  onAuthStateChanged, 
  type User, 
  sendEmailVerification,
  updateProfile
} from "firebase/auth";
import { auth, loginWithEmail, registerWithEmail, loginWithGoogle, loginWithPhone, loginAnonymously, logout } from "../firebase/auth";
import type { ConfirmationResult } from "firebase/auth";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  authLoading: boolean;
  setAuthLoading: (loading: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithPhone: (phoneNumber: string, recaptchaVerifier: any) => Promise<ConfirmationResult>;
  loginAnonymously: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      setError(null);
    }, (error) => {
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await loginWithEmail(email, password);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string, username: string) => {
    setLoading(true);
    setError(null);
    try {
await registerWithEmail(email, password, displayName, username);

// Re-fetch updated current user after registration
const user = auth.currentUser;

if (user) {
  await sendEmailVerification(user);
  setCurrentUser(user);
}

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logoutAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await logout();
      setCurrentUser(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Logout failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendVerificationEmail = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await sendEmailVerification(currentUser);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send verification email');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const updateUserProfile = useCallback(async (displayName: string, photoURL?: string) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await updateProfile(currentUser, { displayName, photoURL });
      setCurrentUser({ ...currentUser, displayName, photoURL } as User);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Profile update failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const loginWithGoogleAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Google login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithPhoneAuth = useCallback(async (phoneNumber: string, recaptchaVerifier: any) => {
  setLoading(true);
  setError(null);
  try {
    const { confirmationResult } = await loginWithPhone(phoneNumber, recaptchaVerifier, '', '');
    return confirmationResult;
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Phone login failed');
    throw error;
  } finally {
    setLoading(false);
  }
}, []);


  const loginAnonymouslyAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loginAnonymously();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Anonymous login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);
  const value = useMemo(() => ({
    currentUser,
    loading,
    error,
    isAuthenticated: !!currentUser,
    isEmailVerified: currentUser?.emailVerified || false,
    authLoading,
    setAuthLoading,
    login,
    register,
    logout: logoutAuth,
    sendVerificationEmail,
    updateUserProfile,
    loginWithGoogle: loginWithGoogleAuth,
    loginWithPhone: loginWithPhoneAuth,
    loginAnonymously: loginAnonymouslyAuth,
  }), [
    currentUser,
    loading,
    error,
    authLoading,
    setAuthLoading,
    login,
    register,
    logoutAuth,
    sendVerificationEmail,
    updateUserProfile,
    loginWithGoogleAuth,
    loginWithPhoneAuth,
    loginAnonymouslyAuth,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
