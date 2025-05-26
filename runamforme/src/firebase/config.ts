// firebase/config.ts
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// Import other Firebase services you might use (e.g., getStorage, getFunctions)

// Your Firebase configuration object.
// !! IMPORTANT !! Never hardcode sensitive keys (like API keys) in production client code
// if not using Firebase Hosting. Firebase Hosting automatically provides configuration
// securely. For other deployment environments, use environment variables.
const firebaseConfig = {
  apiKey: "AIzaSyDvh7mhAXD7GVYBwkrcKqF5_0hmbVGRlvg", // Use environment variable in production if not using Firebase Hosting!
  authDomain: "runamforme-website.firebaseapp.com",
  projectId: "runamforme-website",
  storageBucket: "runamforme-website.firebasestorage.app",
  messagingSenderId: "275700867853",
  appId: "1:275700867853:web:aba348a7f2dc643e564644"
};

// Initialize Firebase app only ONCE
const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);

// Export initialized services directly from here
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
// Export other services (storage, functions, etc.) if you initialize them here

// Optional: Export the app instance itself if needed elsewhere (less common now)
export { firebaseApp };
