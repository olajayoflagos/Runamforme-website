import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext'; // Add this import
import AppLayout from './components/AppLayout';
import ProtectedRoute from './routes/ProtectedRoutes';
import { Suspense, lazy } from 'react';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy-loaded page components
const Home = lazy(() => import('./pages/Home')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading Home</div> })));
const Login = lazy(() => import('./pages/Login')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading Login</div> })));
const Register = lazy(() => import('./pages/Register')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading Register</div> })));
const Dashboard = lazy(() => import('./pages/Dashboard')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading Dashboard</div> })));
const EditProfilePage = lazy(() => import('./pages/EditProfilePage')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading Edit Profile</div> })));
const ErrandsFeedPage = lazy(() => import('./pages/ErrandsFeedPage')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading Errands Feed</div> })));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading Profile</div> })));
const ErrandDetailsPage = lazy(() => import('./pages/ErrandDetailsPage')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading Errand Details</div> })));
const LeaveReviewPage = lazy(() => import('./pages/LeaveReviewPage')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading Review Page</div> })));
const WalletPage = lazy(() => import('./pages/WalletPage')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading Wallet</div> })));
const MessagesPage = lazy(() => import('./pages/MessagesPage')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading Messages</div> })));
const SettingsPage = lazy(() => import('./pages/SettingsPage')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading Settings</div> })));
const VerificationPage = lazy(() => import('./pages/VerificationPage')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading Verification</div> })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading 404 Page</div> })));
const PostErrand = lazy(() => import('./pages/PostErrand')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading Post Errand</div> })));
const TrackErrandsPage = lazy(() => import('./pages/TrackErrandsPage')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading Track Errands</div> })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading Notifications</div> })));
const ResetPassword = lazy(() => import('./pages/ResetPassword')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading Reset Password</div> })));
const EditErrandPage = lazy(() => import('./pages/EditErrandPage')
  .then(module => ({ default: module.default }))
  .catch(() => ({ default: () => <div>Error loading Edit Errand Page</div> })));


const AppRouter = () => {
  return (
    <AuthProvider>
      <ThemeProvider> {/* Add ThemeProvider here */}
        <Router>
          <AppLayout>
            <Suspense fallback={
              <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <LoadingSpinner />
                <span className="visually-hidden">Loading page...</span>
              </div>
            }>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/errands" element={<ErrandsFeedPage />} />
                <Route path="/errands/:id" element={<ErrandDetailsPage />} />
                <Route path="/profile/:id" element={<UserProfilePage />} />
                <Route path="/verify-email" element={<VerificationPage />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/post-errand" element={<PostErrand />} />
                  <Route path="/edit-profile" element={<EditProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/track-errands" element={<TrackErrandsPage />} />
                  <Route path="/messages/:conversationId" element={<MessagesPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/edit-errand/:id" element={<EditErrandPage />} />
                  <Route path="/leave-review/:errandId/:runnerId" element={<LeaveReviewPage />} />
                  <Route path="/wallet" element={<WalletPage />} />
                </Route>
                
                {/* 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </AppLayout>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default AppRouter;