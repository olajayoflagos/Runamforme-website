// src/pages/Register.tsx - Part 1 of 2
import React, { useState } from 'react'; // Import React and useState hook
// Import Link and useNavigate from react-router-dom for navigation
import { Link, useNavigate } from 'react-router-dom';
// Import Firebase Auth function for creating users with email/password
import { createUserWithEmailAndPassword } from 'firebase/auth';
// Import Firestore functions for adding and querying documents
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs,  } from 'firebase/firestore'; // Added FieldValue although not strictly needed for '0' initialization
// Import the auth and db instances from your config file
import { auth } from '../firebase/config';
import { db } from '../firebase/config';
// Import the useAuth hook from your AuthContext to check auth state
import { useAuth } from '../contexts/AuthContext';
// Import the UserProfileWriteData type from your types file
import type { UserProfileWriteData } from '../types'; // <-- Ensure this import is correct

const Register: React.FC = () => {
  // State for form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState(''); // State for username input

  // State for registration process feedback
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Loading state for the registration process

  const navigate = useNavigate();
  // Get the current user and the initial auth loading state from the context
  const { currentUser, loading: authLoading } = useAuth();

  // If user is already logged in (and auth state is done loading), redirect them away from the registration page.
  if (!authLoading && currentUser) {
    navigate("/dashboard", { replace: true });
    return null; // Return null while redirecting
  }

   // While the initial authentication state is loading, show a loading indicator.
   if (authLoading) {
    return (
       <div className="container my-5 text-center">
          <div>Checking user session...</div> {/* Consistent loading message styling */}
       </div>
    );
   }

  // Basic client-side username validation (more robust checks needed backend)
  const validateUsername = (inputUsername: string) => {
      if (!inputUsername || !inputUsername.trim()) return "Username is required."; // Check for empty or whitespace
      if (inputUsername.trim().length < 3) return "Username must be at least 3 characters long.";
      // Allows letters (uppercase and lowercase), numbers, and underscores
      if (!/^[a-zA-Z0-9_]+$/.test(inputUsername.trim())) return "Username can only contain letters, numbers, and underscores.";
      // Add other checks as needed (e.g., no offensive words - best done backend)
      return null; // No errors
  }

  // Handle Registration form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default browser form submission

    // Reset loading and error states before the action
    setLoading(true);
    setError(null); // Clear previous errors

    // Client-side validation for username
    const usernameError = validateUsername(username);
    if(usernameError) {
        setError(usernameError);
        setLoading(false);
        return; // Stop submission if client-side validation fails
    }

    // Get the lowercase, trimmed username for consistency
    const processedUsername = username.trim().toLowerCase();

    try {
      // --- Client-side Check for Username Uniqueness (Crucial!) ---
      // This check provides immediate feedback to the user but is NOT secure or guaranteed unique.
      // A Cloud Function triggered *before* profile creation (using a transaction)
      // is the secure and atomic way to ensure true uniqueness and avoid race conditions.
      // For now, we include this client-side check as a basic filter before attempting Auth creation.
      const usernameQuery = query(collection(db, 'users'), where('username', '==', processedUsername));
      const usernameSnapshot = await getDocs(usernameQuery);
      if (!usernameSnapshot.empty) {
          setError(`Username '@${processedUsername}' is already taken. Please choose a different one.`);
          setLoading(false);
          return; // Stop registration if username exists based on this check
      }
       // IMPORTANT: A race condition is still possible here! The secure check must be server-side.
      // ---------------------------------------------------------


      // Create the user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Create the corresponding user profile document in Firestore
      // The document ID will be the user's Firebase Auth UID
      const userProfileData: UserProfileWriteData = { // <-- Using the correct type here
        uid: newUser.uid, // Set the uid field within the document data
        name: name.trim(), // Store trimmed name
        email: newUser.email || email.trim(), // Use the email from Auth user if available (more reliable)
        username: processedUsername, // Store the lowercase, trimmed username
        userType: 'requester', // Default user type on registration
        createdAt: serverTimestamp(), // Use serverTimestamp for creation time (FieldValue type)
        followersCount: 0, // Initialize counters to 0 (number type, which is allowed by FieldValue union)
        followingCount: 0,
        likesCount: 0,
        // Add other optional profile fields here initialized to default values or undefined
        bio: '', // Example: Initialize bio as an empty string
        // avatarUrl: undefined, // Example: leave undefined initially
        isVerified: false, // Example: initialize as false
      };

      // Set the document in the 'users' collection with the user's UID as the document ID
      await setDoc(doc(db, 'users', newUser.uid), userProfileData);

      // Success! The onAuthStateChanged listener in AuthContext will detect this new user
      // and update the global currentUser state. The redirect logic at the top
      // of this component will then handle navigation to the dashboard.
      // No need to call navigate here.

    } catch (err: any) { // Catch the error (using `any` for simplicity with Firebase Auth/Firestore errors)
      console.error("Registration error:", err);
      setLoading(false); // Stop loading on error

      // Display user-friendly error messages based on Firebase Auth/Firestore error codes
      if (err.code) {
        switch (err.code) {
            case 'auth/email-already-in-use':
                setError("This email address is already in use. Try logging in.");
                break;
            case 'auth/invalid-email':
                setError("Invalid email address format.");
                break;
            case 'auth/operation-not-allowed':
                setError("Email/password sign-up is disabled. Please contact support."); // Should be enabled in Firebase Console
                break;
             case 'auth/weak-password':
                setError("Password is too weak. Please choose a stronger password (minimum 6 characters).");
                break;
            case 'firestore/unavailable': // Example Firestore error
            case 'firestore/internal':
                setError("Database error during profile creation. Please try again.");
                break;
            // Add more cases for other specific errors if needed
            default:
                // Fallback for unhandled Firebase errors
                if (err.message && err.message.startsWith("Firebase: Error")) {
                     setError(err.message.replace("Firebase: Error", "Registration failed"));
                } else {
                    setError("An unexpected error occurred during registration.");
                }
        }
      } else {
        // Handle non-Firebase errors
        setError('An unexpected error occurred during registration.');
      }
    }
    // On successful registration, the component will unmount due to navigation.
  };

  // This is the end of Part 1. The render return statement and JSX will be in Part 2.
// src/pages/Register.tsx - Part 2 of 2
// ... (Code from Part 1 above - including imports, state, authLoading check, validateUsername, handleSubmit functions)

  // If we reach here, authLoading is false, and there is no currentUser, so render the registration form.
  return (
    // Use Bootstrap container and grid for layout and centering
    <div className="container my-5"> {/* Add vertical margin */}
      <div className="row justify-content-center"> {/* Center the column horizontally */}
        <div className="col-md-8 col-lg-6 col-xl-5"> {/* Responsive column width (consistent with Login) */}
          {/* Main Card wrapping the registration form */}
          <div className="card shadow p-4 p-md-5"> {/* Add shadow and padding (more on medium+ screens) */}
            <h2 className="card-title text-center mb-4">Create Your RunAmForMe Account</h2> {/* Centered title with bottom margin */}

            {/* Display error message if registration failed */}
            {error && <div className="alert alert-danger text-center" role="alert">{error}</div>}

            {/* --- Registration Form --- */}
            <form onSubmit={handleSubmit}>
              {/* Full Name Input */}
              <div className="mb-3">
                <label htmlFor="name" className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control" // Bootstrap form control styling
                  id="name" // ID for label association
                  value={name} // Controlled component: value from state
                  onChange={(e) => setName(e.target.value)} // Update state on change
                  required // HTML5 validation
                  disabled={loading} // Disable input while registration is loading
                />
              </div>
               {/* Username Input */}
               <div className="mb-3">
                <label htmlFor="username" className="form-label">Choose a Username</label> {/* New field for username */}
                <input
                  type="text"
                  className="form-control" // Bootstrap form control styling
                  id="username" // ID for label association
                  value={username} // Controlled component: value from state
                  onChange={(e) => setUsername(e.target.value.toLowerCase())} // Update state and convert to lowercase
                  required // HTML5 validation
                  disabled={loading} // Disable input while registration is loading
                   aria-describedby="usernameHelp" // Accessibility
                   // Optional: Add basic client-side validation feedback on blur
                   onBlur={() => {
                       const usernameError = validateUsername(username);
                       if(usernameError) {
                           setError(usernameError);
                       } else {
                            // If the current error displayed was the username error, clear it on valid blur
                            // This prevents clearing other errors (like auth errors) prematurely.
                            if (error === validateUsername(username)) {
                                setError(null);
                            }
                       }
                   }}
                />
                 {/* Help text for username format and uniqueness */}
                 <div id="usernameHelp" className="form-text">Lowercase letters, numbers, and underscores only. This must be unique.</div>
              </div>
              {/* Email Input */}
              <div className="mb-3">
                <label htmlFor="emailRegister" className="form-label">Email address</label> {/* Specific ID to avoid conflict with Login if both are ever on the same page */}
                <input
                  type="email"
                  className="form-control"
                  id="emailRegister"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              {/* Password Input */}
              <div className="mb-3">
                <label htmlFor="passwordRegister" className="form-label">Create a Password</label> {/* Updated label, specific ID */}
                <input
                  type="password"
                  className="form-control"
                  id="passwordRegister"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6} // Match Firebase Auth minimum password length
                  required
                  disabled={loading}
                />
              </div>
              {/* Submit Button */}
              <button
                type="submit" // Button type is submit to trigger form onSubmit
                className="btn btn-primary w-100 mt-3 d-flex align-items-center justify-content-center" // Primary button, full width, top margin, flexbox for centering
                disabled={loading} // Disable button while registration is loading
              >
                {/* Show spinner while registration is loading */}
                {loading && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>}
                {/* Button text changes based on loading state */}
                {loading ? 'Creating account...' : 'Register'}
              </button>
            </form>
            {/* --- End Registration Form --- */}

            {/* Link to Login Page */}
            <div className="mt-3 text-center"> {/* Add top margin, center text */}
              Already have an account? <Link to="/login">Login</Link> {/* Link component for navigation */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
