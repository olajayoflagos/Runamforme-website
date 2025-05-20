// src/pages/Login.tsx - Part 1 of 2
import React, { useState } from "react"; // Import React and useState hook
// Import Link and useNavigate from react-router-dom for navigation
import { Link, useNavigate } from "react-router-dom";
// Import necessary Firebase Auth functions
import { signInWithEmailAndPassword } from "firebase/auth"; // For email/password login
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"; // For Google login
// Import the auth instance from your config file
import { auth } from "../firebase/config";
// Import the useAuth hook from your AuthContext to get user state
import { useAuth } from "../contexts/AuthContext";

const Login: React.FC = () => {
  const navigate = useNavigate();
  // Get the currentUser object and the initial auth loading state from the context
  const { currentUser, loading: authLoading } = useAuth();

  // State for email/password login form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Loading state specifically for the email/password login action
  const [emailPasswordLoading, setEmailPasswordLoading] = useState(false);
  // Error state specifically for the email/password login action
  const [emailPasswordError, setEmailPasswordError] = useState<string | null>(null);

  // Loading state specifically for the Google login action
  const [googleLoading, setGoogleLoading] = useState(false);
  // Error state specifically for the Google login action
  const [googleError, setGoogleError] = useState<string | null>(null);

  // If user is already logged in (and auth state is done loading), redirect them away from the login page.
  // This check should happen first before rendering the form content.
  // `replace: true` prevents navigating back to the login page using the browser's back button.
  if (!authLoading && currentUser) {
    navigate("/dashboard", { replace: true });
    return null; // Return null while redirecting
  }

   // While the initial authentication state is loading, show a loading indicator.
   // This prevents flickering or showing the login form momentarily when the user is actually logged in.
   if (authLoading) {
     return (
        <div className="container my-5 text-center">
           <div>Loading user session...</div> {/* Consistent loading message styling */}
        </div>
     );
   }

  // Handle Email/Password Login form submission
  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default browser form submission

    // Reset loading and error states before the action
    setEmailPasswordLoading(true);
    setEmailPasswordError(null);

    try {
      // Use Firebase Auth SDK function to sign in with email and password
      await signInWithEmailAndPassword(auth, email, password);
      // Success! The onAuthStateChanged listener in AuthContext will detect this
      // and update the global currentUser state. The redirect logic at the
      // top of this component will then handle navigation to the dashboard.
      // No need to call navigate here.

    } catch (err: any) { // Catch the error (using `any` for simplicity with Firebase Auth errors)
      console.error("Email/Password Login failed:", err);
      setEmailPasswordLoading(false); // Stop loading on error

      // Display user-friendly error messages based on Firebase Auth error codes
      // https://firebase.google.com/docs/auth/admin/errors
      if (err.code) {
        switch (err.code) {
            case 'auth/invalid-email':
                setEmailPasswordError("Invalid email address format.");
                break;
            case 'auth/user-disabled':
                setEmailPasswordError("This user account has been disabled.");
                break;
            case 'auth/user-not-found':
            case 'auth/wrong-password': // For security, don't distinguish between user not found and wrong password
            case 'auth/invalid-credential': // Newer code for invalid email/password combo
                setEmailPasswordError("Invalid email or password.");
                break;
            // Add more cases for other specific errors if needed
            default:
                // Fallback for unhandled Firebase errors
                if (err.message.startsWith("Firebase: Error")) {
                     setEmailPasswordError(err.message.replace("Firebase: Error", "Login failed"));
                } else {
                    setEmailPasswordError("An unexpected error occurred during login.");
                }
        }
      } else {
        // Handle non-Firebase errors
        setEmailPasswordError("An unexpected error occurred during login.");
      }
    }
    // On successful login, the component will unmount due to navigation,
    // so no need to explicitly set loading to false in the success path.
  };

   // Handle Google Login button click
  const handleGoogleLogin = async () => {
    // Create a new GoogleAuthProvider instance (can also be imported from auth.ts)
    const provider = new GoogleAuthProvider();

    // Reset loading and error states before the action
    setGoogleLoading(true);
    setGoogleError(null); // Clear previous Google errors (using emailPasswordError for display below)
    setEmailPasswordError(null); // Clear email/password errors too for clarity


    try {
      // Use Firebase Auth SDK function to sign in with Google popup
      await signInWithPopup(auth, provider);
      // Success! AuthContext listener will update state and trigger navigation.
      // No need to call navigate here.

    } catch (err: any) { // Catch the error
      console.error("Google Login failed:", err);
      setGoogleLoading(false); // Stop loading on error

      // Only show/set an error if it's NOT the user closing the popup or cancelling the request
      // This is good UX.
      if (err.code && err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
         // Use the general error state for display
         // You might want to keep separate error states and display areas
         setEmailPasswordError(`Google sign-in failed: ${err.message}`); // Provide error details
      }
       // If the user closed the popup or cancelled, we silently ignore it.
    }
    // On successful login, the component will unmount due to navigation.
  };

  // This is the end of Part 1. The render return statement and JSX will be in Part 2.
// src/pages/Login.tsx - Part 2 of 2
// ... (Code from Part 1 above - including imports, state, authLoading check, handleEmailPasswordLogin, handleGoogleLogin functions)

  // If we reach here, authLoading is false, and there is no currentUser, so render the login form.
  return (
    // Use Bootstrap container and grid for layout and centering
    <div className="container my-5"> {/* Add vertical margin */}
      <div className="row justify-content-center"> {/* Center the column horizontally */}
        <div className="col-md-8 col-lg-6 col-xl-5"> {/* Responsive column width */}
          {/* Main Card wrapping the login form and buttons */}
          <div className="card shadow p-4 p-md-5"> {/* Add shadow and padding (more on medium+ screens) */}
            <h2 className="card-title text-center mb-4">Login to RunAmForMe</h2> {/* Centered title with bottom margin */}

            {/* Display general error message if any login method failed */}
            {(emailPasswordError || googleError) && (
              <div className="alert alert-danger text-center" role="alert">
                {emailPasswordError || googleError} {/* Display the relevant error message */}
              </div>
            )}

            {/* --- Email/Password Login Form --- */}
             <p className="text-center text-muted mb-3">Sign in with your email and password.</p> {/* Descriptive text */}
             <form onSubmit={handleEmailPasswordLogin}>
                {/* Email Input */}
                <div className="mb-3">
                   <label htmlFor="emailLogin" className="form-label">Email address</label> {/* Form label */}
                   <input
                      type="email"
                      className="form-control" // Bootstrap form control styling
                      id="emailLogin" // ID for label association
                      value={email} // Controlled component: value from state
                      onChange={(e) => setEmail(e.target.value)} // Update state on change
                      required // HTML5 validation
                      disabled={emailPasswordLoading || googleLoading} // Disable inputs if either login method is loading
                      aria-describedby="emailLoginHelp" // Accessibility
                   />
                    {/* Optional help text */}
                   {/* <div id="emailLoginHelp" className="form-text">Enter the email address you registered with.</div> */}
                </div>
                 {/* Password Input */}
                 <div className="mb-3">
                   <label htmlFor="passwordLogin" className="form-label">Password</label> {/* Form label */}
                   <input
                      type="password"
                      className="form-control" // Bootstrap form control styling
                      id="passwordLogin" // ID for label association
                      value={password} // Controlled component: value from state
                      onChange={(e) => setPassword(e.target.value)} // Update state on change
                      required // HTML5 validation
                       minLength={6} // Minimum length (should match Firebase Auth setting)
                      disabled={emailPasswordLoading || googleLoading} // Disable inputs
                       aria-describedby="passwordLoginHelp" // Accessibility
                   />
                    {/* Optional help text */}
                   {/* <div id="passwordLoginHelp" className="form-text">Enter your password.</div> */}
                 </div>

                 {/* Email/Password Login Button */}
                 <button
                   type="submit" // Button type is submit to trigger form onSubmit
                   className="btn btn-primary w-100 mb-3 d-flex align-items-center justify-content-center" // Primary button, full width, bottom margin, flexbox for centering content
                   disabled={emailPasswordLoading || googleLoading} // Disable button if any login method is loading
                 >
                    {/* Show spinner while email/password login is loading */}
                    {emailPasswordLoading && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>}
                    {/* Button text changes based on loading state */}
                    {emailPasswordLoading ? 'Signing In...' : 'Login with Email'}
                 </button>
             </form>
            {/* --- End Email/Password Login Form --- */}


             {/* --- Divider --- */}
            <hr className="my-4"/> {/* Horizontal rule divider with vertical margin */}
            <p className="text-center text-muted">OR</p> {/* Optional separator text */}
            <hr className="my-4"/>
             {/* --- End Divider --- */}


             {/* --- Google Login Button --- */}
             <button
                className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center" // Outline secondary button, full width, flexbox for centering
                onClick={handleGoogleLogin} // Attach click handler for Google login
                disabled={emailPasswordLoading || googleLoading} // Disable button if any login method is loading
             >
                {/* Show spinner while Google login is loading */}
                {googleLoading && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>}
                Sign in with Google
             </button>
            {/* --- End Google Login Button --- */}


            {/* Link to Registration Page */}
            <div className="mt-4 text-center"> {/* Add top margin, center text */}
              Don't have an account? <Link to="/register">Register here</Link> {/* Link component for navigation */}
            </div>
            {/* Optional: Add a forgot password link here later */}
            {/* <div className="mt-2 text-center">
               <Link to="/forgot-password">Forgot Password?</Link>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
