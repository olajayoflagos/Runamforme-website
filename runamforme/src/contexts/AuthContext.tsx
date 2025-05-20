// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
// Import auth directly from the centralized config
import { auth } from "../firebase/config";

// Define the shape of the context, including the user and a loading state
interface AuthContextType {
  currentUser: User | null;
  loading: boolean; // Add loading state to indicate if the initial auth check is complete
}

// Create the context with initial values (currentUser is null, loading is true initially)
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true, // Initial loading state is true before Firebase checks the session
});

// Create the provider component that wraps the application or parts of it
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // State to track the initial auth loading status

  // useEffect hook to listen for changes in Firebase Authentication state
  useEffect(() => {
    // onAuthStateChanged is a Firebase Auth listener. It fires immediately with the
    // current user state and then whenever the state changes (login, logout, etc.).
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user); // Update the currentUser state
      setLoading(false); // Once the initial check is done, set loading to false
    });

    // Cleanup function: This runs when the component unmounts, ensuring the listener is detached
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this effect runs only once on component mount

  // The value provided to the context consumers
  const contextValue = {
      currentUser,
      loading
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {/* Optionally render a loading indicator here while loading is true,
          or let components consume the loading state and handle it themselves.
          Rendering children conditionally here is one strategy: */}
       {/* {loading ? <div>Loading authentication...</div> : children} */}
       {/* Or, just render children always and let consumers handle loading: */}
       {children}
    </AuthContext.Provider>
  );
};

// Custom hook to make consuming the AuthContext easier in functional components
export const useAuth = () => useContext(AuthContext);
