import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute, PublicRoute, RoleRoute } from './components/common/RouteGuards';
import { getUserProfile } from './redux/slices/authSlice';

// Auth Pages
import Register from './pages/Register';
import Login from './pages/Login';
import SelectPlan from './pages/SelectPlan';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';

// Dashboard & Modules (lazy-like structure)
import DashboardLayout from './layouts/DashboardLayout';
import HRM from './pages/HRM';
import Tasks from './pages/Tasks';
import CRM from './pages/CRM';
import Chat from './pages/Chat';
import Reports from './pages/Reports';
import SuperAdmin from './pages/SuperAdmin';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Settings from './pages/Settings';
import Billing from './pages/Billing';
import Subscription from './pages/Subscription';
import DailyReports from './pages/DailyReports';
import UserActivity from './pages/UserActivity';
import FollowUps from './pages/FollowUps';
import GoogleOAuthCallback from './pages/crm/GoogleOAuthCallback';

import CallModal from './components/common/CallModal';
import TwilioCallModal from './components/common/TwilioCallModal';
import PostCallModal from './components/common/PostCallModal';

import FollowUpReminder from './components/common/FollowUpReminder';
import { LiveKitProvider } from './context/LiveKitContext';


function App() {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token && !user) {
      dispatch(getUserProfile());
    }
    if (token) {
      dispatch({ type: 'socket/initiate' });
    }
  }, [token, user, dispatch]);

  return (
    <LiveKitProvider>

      <BrowserRouter>
        <Toaster position="top-right" reverseOrder={false} />
        <CallModal />
        <TwilioCallModal />
        <PostCallModal />
        <FollowUpReminder />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/select-plan" element={<ProtectedRoute><SelectPlan /></ProtectedRoute>} />

          {/* Main Dashboard with persistent sidebar layout */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="hrm" element={<HRM />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="crm" element={<CRM />} />
            <Route path="follow-ups" element={<FollowUps />} />
            <Route path="chat" element={<Chat />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="billing" element={<Billing />} />
            <Route path="subscription" element={<Subscription />} />
            <Route path="daily-reports" element={<DailyReports />} />
            <Route path="activity" element={<UserActivity />} />
            <Route path="profile" element={<Profile />} />

            {/* SuperAdmin Integrated Routes */}
            <Route path="superadmin" element={
              <RoleRoute allowedRoles={['superadmin']}>
                <SuperAdmin />
              </RoleRoute>
            } />
            <Route path="superadmin/:subtab" element={
              <RoleRoute allowedRoles={['superadmin']}>
                <SuperAdmin />
              </RoleRoute>
            } />
          </Route>

          <Route path="/crm/auth/callback" element={<ProtectedRoute><GoogleOAuthCallback /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </LiveKitProvider>

  );
}

export default App;
