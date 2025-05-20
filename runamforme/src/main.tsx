// main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
// Import RouterProvider from react-router-dom for the new routing setup
import { RouterProvider } from "react-router-dom";
// Import the AuthProvider from your contexts
import { AuthProvider } from "./contexts/AuthContext";
// Import the router instance defined in your router.tsx file
import router from "./router";
// Import your global styles
import './index.css';

// Get the root element from index.html
const container = document.getElementById("root");

// Ensure the container exists before creating the root
if (!container) {
  throw new Error("Root element '#root' not found in the document.");
}

// Create the React root
const root = ReactDOM.createRoot(container);

// Render the application wrapped in StrictMode, AuthProvider, and RouterProvider
root.render(
  <React.StrictMode>
    {/* AuthProvider wraps the entire application to provide authentication context */}
    <AuthProvider>
      {/* RouterProvider renders the component tree based on the router definition */}
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
