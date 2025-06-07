import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './routes/ProtectedRoutes';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import PostErrand from './pages/PostErrand';
import Dashboard from './pages/Dashboard';
import EditProfilePage from './pages/EditProfilePage';
import ErrandsFeedPage from './pages/ErrandsFeedPage';
import UserProfilePage from './pages/UserProfilePage';
import ErrandDetailsPage from './pages/ErrandDetailsPage';
import MessagesPage from './pages/MessagesPage';
import LeaveReviewPage from './pages/LeaveReviewPage';
import WalletPage from './pages/WalletPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import VerificationPage from './pages/VerificationPage';
import NotificationsPage from './pages/NotificationsPage';
import EditErrandPage from './pages/EditErrandPage';
import ResetPassword from './pages/ResetPassword';
import TrackErrandsPage from './pages/TrackErrandsPage';
import { Suspense } from 'react';
import LoadingSpinner from './components/LoadingSpinner';


const App = () => {
  return (
    <AuthProvider>
      <Router>
        {/* Main app container with proper semantic structure */}
        <div className="d-flex flex-column min-vh-100">
          <AppLayout>
            {/* Main content area with proper ARIA landmark */}
            <main className="flex-grow-1">
            <Suspense fallback={
              <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <LoadingSpinner />
                <span className="visually-hidden">Loading...</span>
              </div>
            }>
              <Routes>
                {/* Public Routes with consistent layout containers */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route 
                  path="/errands" 
                  element={
                    <div className="container py-3 py-md-4">
                      <ErrandsFeedPage />
                    </div>
                  } 
                />
                <Route 
                  path="/verify-email/:token"
                  element={
                    <div className="container py-3 py-md-4">
                      <VerificationPage />
                    </div>
                  }
                />
                <Route 
                  path="/reset-password" 
                  element={
                    <div className="container py-3 py-md-4">
                      <ResetPassword />
                    </div>
                  }
                />
                <Route 
                  path="/errands/:id" 
                  element={
                    <div className="container py-3 py-md-4">
                      <ErrandDetailsPage />
                    </div>
                  } 
                />
                <Route 
                  path="/profile/:id" 
                  element={
                    <div className="container py-3 py-md-4">
                      <UserProfilePage />
                    </div>
                  } 
                />

                {/* Protected Routes with consistent padding */}
                <Route element={<ProtectedRoute />}>
                  <Route 
                    path="/dashboard" 
                    element={
                      <div className="container py-3 py-md-4">
                        <Dashboard />
                      </div>
                    } 
                  />
                  <Route 
                    path="/post-errand" 
                    element={
                      <div className="container py-3 py-md-4">
                        <PostErrand />
                      </div>
                    } 
                  />
                  <Route 
                    path="/edit-errand/:id" 
                    element={
                      <div className="container py-3 py-md-4">
                        <EditErrandPage />
                      </div>
                    }
                  />
                  <Route 
                    path="/track-errands" 
                    element={
                      <div className="container py-3 py-md-4">
                        <TrackErrandsPage />
                      </div>
                    }
                  />
                  <Route 
                    path="/notifications" 
                    element={
                      <div className="container py-3 py-md-4">
                        <NotificationsPage />
                      </div>
                    }
                  />
                  <Route 
                    path="/edit-profile" 
                    element={
                      <div className="container py-3 py-md-4">
                        <EditProfilePage />
                      </div>
                    } 
                  />
                  <Route 
                    path="/settings" 
                    element={
                      <div className="container py-3 py-md-4">
                        <SettingsPage />
                      </div>
                    } 
                  />
                  <Route 
                    path="/messages" 
                    element={
                      <div className="container-fluid p-0">
                        <MessagesPage />
                      </div>
                    } 
                  />
                  <Route 
                    path="/messages/:conversationId" 
                    element={
                      <div className="container-fluid p-0">
                        <MessagesPage />
                      </div>
                    } 
                  />
                  <Route 
                    path="/leave-review/:errandId/:runnerId" 
                    element={
                      <div className="container py-3 py-md-4">
                        <LeaveReviewPage />
                      </div>
                    } 
                  />
                  <Route 
                    path="/wallet" 
                    element={
                      <div className="container py-3 py-md-4">
                        <WalletPage />
                      </div>
                    } 
                  />
                </Route>

                

                {/* 404 page with proper semantic markup */}
                <Route path="*" element={<NotFoundPage />} />
                <Route path="/verify-email" element={<VerificationPage />} />
              </Routes>
              
            </Suspense>
            </main>
          </AppLayout>
          
          
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;