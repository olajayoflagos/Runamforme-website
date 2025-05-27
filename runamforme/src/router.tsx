// src/router.tsx

import { createBrowserRouter } from "react-router-dom";

// Main page components
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PostErrand from "./pages/PostErrand";
import ErrandsFeedPage from "./pages/ErrandsFeedPage";
import UserProfilePage from "./pages/UserProfilePage";
import ErrandDetailsPage from "./pages/ErrandDetailsPage";
import EditProfilePage from './pages/EditProfilePage';
import NotFoundPage from "./pages/NotFoundPage";
// NEW: Import MessagesPage
import MessagesPage from "./pages/MessagesPage";

// Auth and layout components
import ProtectedRoute from "./routes/ProtectedRoutes";
import AppLayout from "./components/AppLayout";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "login",
      // --- Continued in Part 2 ---
// src/router.tsx
// --- Continued from Part 1 ---

        element: <Login />,
      },
      {
        path: "register",
        element: <Register />,
      },
      // Protected Routes
      {
        path: "dashboard",
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "post",
        element: (
          <ProtectedRoute>
            <PostErrand />
          </ProtectedRoute>
        ),
      },
    // --- Continued in Part 3 ---
// src/router.tsx
// --- Continued from Part 2 ---

      {
        path: "edit-profile",
        element: (
          <ProtectedRoute>
            <EditProfilePage />
          </ProtectedRoute>
        ),
      },
      // Public Routes
      {
        path: "errands",
        element: <ErrandsFeedPage />,
      },
      {
        path: "errands/:id", // Errand ID
        element: <ErrandDetailsPage />,
      },
      {
        path: "profile/:id", // User UID
        element: <UserProfilePage />,
      },
      // NEW: Messages Route
      {
          path: "messages/:userId", // User UID to message
          element: (
             <ProtectedRoute>
                 <MessagesPage />
             </ProtectedRoute>
          ),
      },
    // --- Continued in Part 4 ---
// src/router.tsx
// --- Continued from Part 3 ---

      // Catch-all 404 route
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);

export default router;
