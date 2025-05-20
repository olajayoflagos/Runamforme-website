// router.tsx
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
import NotFoundPage from "./pages/NotFoundPage";
// Auth and layout
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
        element: <Login />,
      },
      {
        path: "register",
        element: <Register />,
      },
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
      {
        path: "errands",
        element: <ErrandsFeedPage />,
      },
      {
        path: "errands/:id",
        element: <ErrandDetailsPage />,
      },
      {
        path: "profile/:uid",
        element: <UserProfilePage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);

export default router;
