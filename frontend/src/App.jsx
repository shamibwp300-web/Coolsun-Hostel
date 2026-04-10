import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/dashboard/Dashboard';
import Wizard from './components/Wizard';
import Reports from './pages/Reports';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
// Lazy load future pages
import Tenants from './pages/Tenants';
import Finance from './pages/Finance';
import Settings from './pages/Settings';
import Rooms from './pages/Rooms';
import BulkRenting from './pages/BulkRenting';
import PoliceVerification from './pages/PoliceVerification';
import Electricity from './pages/Electricity';
import Tasks from './pages/Tasks';
import AuditLog from './pages/AuditLog';
import Maintenance from './pages/dashboard/IssueInbox'; // Reuse or create new page
import GenerateRent from './pages/finance/GenerateRent';
import ReceiveRent from './pages/finance/ReceiveRent';

function App() {
  // Global Reset: Ensure scrollbar is never locked on mount
  React.useEffect(() => {
    document.body.style.overflow = 'unset';
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-midnight text-white selection:bg-blue-500 selection:text-white">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Protected Routes Wrapped in Layout */}
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
            path="/wizard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Wizard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/rooms"
            element={
              <ProtectedRoute>
                <Layout>
                  <Rooms />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/bulk-rent"
            element={
              <ProtectedRoute>
                <Layout>
                  <BulkRenting />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tenants"
            element={
              <ProtectedRoute>
                <Layout>
                  <Tenants />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/finance"
            element={
              <ProtectedRoute>
                <Layout>
                  <Finance />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/generate"
            element={
              <ProtectedRoute>
                <Layout>
                  <GenerateRent />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/receive"
            element={
              <ProtectedRoute>
                <Layout>
                  <ReceiveRent />
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

          <Route
            path="/maintenance"
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="glass-panel p-8">
                    <h1 className="text-3xl font-bold mb-6">Maintenance Hub</h1>
                    <Maintenance />
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/electricity"
            element={
              <ProtectedRoute>
                <Layout>
                  <Electricity />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/police"
            element={
              <ProtectedRoute>
                <Layout>
                  <PoliceVerification />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <Layout>
                  <Tasks />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <ProtectedRoute>
                <Layout>
                  <AuditLog />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            }
          />

        </Routes>
      </div>
    </Router>
  );
}

export default App;
