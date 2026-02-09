import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { UserRole } from './types';
import AuthPage from './components/pages/AuthPage';
import ClientDashboard from './components/pages/ClientDashboard';
import HelpPage from './components/pages/HelpPage';
import LandingPage from './components/pages/LandingPage';
import MaidDashboard from './components/pages/MaidDashboard';
import Navbar from './components/pages/Navbar';
import ProfilePage from './components/pages/ProfilePage';
import { useAppData } from './hooks/useAppData';
import { useApplicationActions } from './hooks/useApplicationActions';
import { useAuthActions } from './hooks/useAuthActions';
import { useJobActions } from './hooks/useJobActions';
import { useNotificationActions } from './hooks/useNotificationActions';
import { useUserSession } from './hooks/useUserSession';

const App: React.FC = () => {
  const { currentUser, setCurrentUser } = useUserSession();
  const {
    users,
    setUsers,
    jobs,
    setJobs,
    applications,
    setApplications,
    notifications,
    setNotifications,
    loading,
    setLoading,
  } = useAppData();

  const { handleLogin, handleSignUp, handleLogout, handleUpdateProfile } = useAuthActions({
    users,
    setUsers,
    setCurrentUser,
    setLoading,
  });

  const { handlePostJob, handleUpdateJob, handleCompleteJob, handleDeleteJob } = useJobActions({
    currentUser,
    setJobs,
  });

  const { handleApply, handleUpdateApplicationStatus } = useApplicationActions({
    currentUser,
    jobs,
    setApplications,
    setJobs,
    setNotifications,
  });

  const { handleMarkNotificationsRead, handleNotificationClick } = useNotificationActions({
    currentUser,
    setNotifications,
  });

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-teal-600">Loading...</div>
    );

  return (
    <HashRouter>
      <Navbar
        currentUser={currentUser}
        notifications={notifications}
        onLogout={handleLogout}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onNotificationClick={handleNotificationClick}
      />
      <div className="bg-gray-50 min-h-screen">
        <Routes>
          <Route
            path="/"
            element={
              currentUser ? (
                currentUser.role === UserRole.CLIENT ? (
                  <Navigate to="/client/dashboard" />
                ) : currentUser.role === UserRole.MAID ? (
                  <Navigate to="/maid/dashboard" />
                ) : (
                  <Navigate to="/profile" />
                )
              ) : (
                <LandingPage />
              )
            }
          />

          <Route
            path="/auth"
            element={
              currentUser ? (
                <Navigate to="/" />
              ) : (
                <AuthPage onLogin={handleLogin} onSignUp={handleSignUp} />
              )
            }
          />

          <Route path="/help" element={<HelpPage />} />

          <Route
            path="/client/dashboard"
            element={
              currentUser && currentUser.role === UserRole.CLIENT ? (
                <ClientDashboard
                  user={currentUser}
                  jobs={jobs}
                  applications={applications}
                  users={users}
                  onPostJob={handlePostJob}
                  onUpdateJob={handleUpdateJob}
                  onDeleteJob={handleDeleteJob}
                  onCompleteJob={handleCompleteJob}
                  onUpdateApplicationStatus={handleUpdateApplicationStatus}
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          <Route
            path="/maid/dashboard"
            element={
              currentUser && currentUser.role === UserRole.MAID ? (
                <MaidDashboard
                  user={currentUser}
                  jobs={jobs}
                  applications={applications}
                  users={users}
                  onApply={handleApply}
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          <Route
            path="/profile"
            element={
              currentUser ? (
                <ProfilePage user={currentUser} onUpdate={handleUpdateProfile} />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
