// src/components/NavBar.tsx
import React from 'react'; // Import React
// Import Link from react-router-dom for navigation
import { Link } from 'react-router-dom';
// Import Firebase Auth functions
import { signOut } from 'firebase/auth';
// Import the auth instance from your config file
import { auth } from '../firebase/config';
// Import the useAuth hook from your AuthContext to get user state
import { useAuth } from '../contexts/AuthContext';

const NavBar: React.FC = () => {
  // Get the currentUser object and the loading state from the authentication context
  const { currentUser, loading } = useAuth();

  // Function to handle user logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // The onAuthStateChanged listener in AuthContext will detect the logout
      // and update the global state, which will automatically cause
      // UI elements that depend on currentUser (like this NavBar) to re-render.
      // Navigation away from protected pages is handled by ProtectedRoute.
    } catch (error) {
      console.error("Logout error:", error);
      // TODO: Implement a user-friendly way to display logout errors
      alert("Logout failed. Please try again."); // Basic feedback for now
    }
  };

  // Optional: Show a simplified loading state for the navbar
  // while the initial auth state is being determined. This prevents
  // the wrong links/buttons from flashing briefly on page load.
  if (loading) {
     return (
        <nav className="navbar navbar-expand-lg navbar-light bg-light shadow-sm">
           <div className="container">
              <span className="navbar-brand text-primary fw-bold">RunAmForMe</span>
              <span className="navbar-text ms-auto">Loading...</span> {/* Added ms-auto for spacing */}
           </div>
        </nav>
     );
  }

  // Once loading is complete, render the appropriate navbar based on auth state
  return (
    // Use Bootstrap classes for styling and responsiveness
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm"> {/* Lighter background, subtle shadow */}
      <div className="container">
        {/* Navbar Brand/Logo */}
        {/* Use Bootstrap utility for text color and font weight */}
        <Link className="navbar-brand text-primary fw-bold" to="/">
            {/* You could replace "RunAmForMe" text with an actual logo image */}
            RunAmForMe
        </Link>
        {/* Toggler button for mobile responsiveness */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse" // Bootstrap data attribute for collapse functionality
          data-bs-target="#navbarNav" // Target the collapsible element's ID
          aria-controls="navbarNav" // Accessibility: associates button with collapsible region
          aria-expanded="false" // Accessibility: indicates if the region is expanded
          aria-label="Toggle navigation" // Accessibility: label for screen readers
        >
          <span className="navbar-toggler-icon"></span> {/* Bootstrap icon for toggler */}
        </button>
        {/* Collapsible content (navbar links and buttons) */}
        <div className="collapse navbar-collapse" id="navbarNav">
          {/* Navigation Links */}
          <ul className="navbar-nav me-auto mb-2 mb-lg-0"> {/* me-auto pushes subsequent content to the right, mb for small screens */}
            {/* Home link - always visible */}
            <li className="nav-item">
              <Link className="nav-link" aria-current="page" to="/">Home</Link> {/* aria-current for accessibility on active link */}
            </li>
             {/* Show Post Errand link only if user is logged in */}
            {currentUser && (
              <li className="nav-item">
                <Link className="nav-link" to="/post">Post Errand</Link>
              </li>
            )}
             {/* Show Dashboard link only if user is logged in */}
            {currentUser && (
              <li className="nav-item">
                <Link className="nav-link" to="/dashboard">Dashboard</Link>
              </li>
            )}
             {/* Show Errands Feed link - generally public */}
            <li className="nav-item">
              <Link className="nav-link" to="/errands">Browse Errands</Link> {/* Link to the Errands Feed Page */}
            </li>
             {/* You could add more links here (e.g., About, Contact, specific features) */}
          </ul>
          {/* Auth Buttons (Login/Register or Logout) - aligned to the right */}
          <div className="d-flex"> {/* Use d-flex for horizontal alignment of buttons */}
            {currentUser ? (
              // If user is logged in, show Logout button
              // Use Bootstrap button classes for styling
              <button className="btn btn-outline-danger" onClick={handleLogout}> {/* Outline danger for logout */}
                Logout
              </button>
            ) : (
              // If user is logged out, show Login and Register buttons
              <>
                {/* Login button */}
                <Link className="btn btn-outline-primary me-2" to="/login"> {/* Outline primary, right margin */}
                    Login
                </Link>
                {/* Register button */}
                <Link className="btn btn-primary" to="/register"> {/* Primary button */}
                    Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
