// src/routes/ProtectedRoute.tsx
import type { ReactNode } from "react";
// Import Navigate from react-router-dom for redirection
import { Navigate } from "react-router-dom";
// Import the useAuth hook from your AuthContext
import { useAuth } from "../contexts/AuthContext";
import React from 'react'; // Import React

interface Props {
  children: ReactNode; // The protected components/pages to render
}

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  // Get the currentUser and loading state from the authentication context
  const { currentUser, loading } = useAuth();

  // If the authentication state is still loading, show a loading indicator.
  // This prevents the app from redirecting to login before the auth state is known.
  if (loading) {
    // You can replace this with a more sophisticated loading spinner component
    return <div>Checking authentication status...</div>;
  }

  // If loading is complete and there is a currentUser, render the protected children.
  if (currentUser) {
    return <>{children}</>; // Use a fragment to render children
  }

  // If loading is complete and there is no currentUser, redirect to the login page.
  // `replace` ensures the login page replaces the current history entry,
  // so the user cannot use the back button to return to the protected page.
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;
