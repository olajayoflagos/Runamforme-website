// firebase/auth.ts
// Import only the necessary Auth methods
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
// Import the initialized auth instance from your config file
import { auth } from "./config";

// Create a GoogleAuthProvider instance
const provider = new GoogleAuthProvider();

// Export helper functions for auth actions
export const loginWithGoogle = () => signInWithPopup(auth, provider);
export const logout = () => signOut(auth);

// Re-export the auth instance itself if components still import it from here
export { auth };
