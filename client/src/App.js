import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import ThemeProvider from './components/ThemeProvider';

// Components
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Exams from './pages/Exams';
import Syllabus from './pages/Syllabus';
import Predictions from './pages/Predictions';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuthStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { user, isLoading } = useAuthStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Main Layout Component
const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 pt-20 text-gray-900 dark:text-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  const { initializeAuth } = useAuthStore();
  
  React.useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);
  
  return (
    <ThemeProvider>
      <Router>
        <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/attendance" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Attendance />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/exams" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Exams />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/syllabus" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Syllabus />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/predictions" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Predictions />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 404 Route */}
          <Route 
            path="*" 
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">404</h1>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Page not found</p>
                  <button 
                    onClick={() => window.history.back()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            } 
          />
        </Routes>
        
        {/* Toast notifications */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: 'toast-custom',
            style: {
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              maxWidth: '400px',
            },
          }}
        />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
