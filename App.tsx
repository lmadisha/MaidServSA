import React, { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Application, ApplicationStatus, Job, Notification, User, UserRole } from './types';
import { db } from './services/db';
import AuthPage from './components/pages/AuthPage';
import ClientDashboard from './components/pages/ClientDashboard';
import HelpPage from './components/pages/HelpPage';
import LandingPage from './components/pages/LandingPage';
import MaidDashboard from './components/pages/MaidDashboard';
import Navbar from './components/pages/Navbar';
import ProfilePage from './components/pages/ProfilePage';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setUsers(await db.getUsers());
      setJobs(await db.getJobs());
      setApplications(await db.getApplications());
      setNotifications(await db.getNotifications());
      setLoading(false);
    };
    loadData();
  }, []);

  const handleLogin = (email: string) => {
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      setCurrentUser(user);
    } else {
      alert('User not found. Try the demo accounts or sign up.');
    }
  };

  const handleSignUp = async (userData: Partial<User>, password: string) => {
    // 1. Check local state (optional but good)
    if (users.some((u) => u.email.toLowerCase() === userData.email?.toLowerCase())) {
      alert('An account with this email already exists.');
      return;
    }

    try {
      const newUser: User = {
        rating: 0,
        ratingCount: 0,
        id: crypto.randomUUID(),
        email: userData.email,
        name: userData.name,
        role: userData.role,
        avatar: userData.avatar,
        firstName: userData.name.split(' ')[0] || '',
        surname: userData.surname.split(' ')[0] || '',
        experienceAnswers: [],
      };

      // 3. Call the correct register endpoint with the password
      const created = await db.register(newUser, password);

      console.log(created);

      // 4. Update local state
      setUsers((prev) => [...prev, created]);
      setCurrentUser(created);
    } catch (error: any) {
      // This will catch the "Email already exists" from the server too
      alert(error.message || 'Failed to create account');
      throw error; // Re-throw so AuthPage shows the error message
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleUpdateProfile = async (updatedUser: User) => {
    const saved = await db.saveUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === saved.id ? saved : u)));
    setCurrentUser(saved);
  };

  const handlePostJob = async (job: Job) => {
    const saved = await db.createJob(job);
    setJobs((prev) => [...prev, saved]);
  };

  const handleUpdateJob = async (job: Job) => {
    try {
      const saved = await db.saveJob(job);
      setJobs((prev) => prev.map((j) => (j.id === saved.id ? saved : j)));
    } catch (error: any) {
      // This catches the 403 error from the server
      alert(error.message || 'This job is locked and cannot be edited.');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    await db.deleteJob(jobId);
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  const handleApply = async (jobId: string, message: string) => {
    if (!currentUser) return;
    const newApp: Application = {
      id: crypto.randomUUID(),
      jobId,
      maidId: currentUser.id,
      status: ApplicationStatus.PENDING,
      message,
      appliedAt: new Date().toISOString(),
    };
    const saved = await db.createApplication(newApp);
    setApplications((prev) => [...prev, saved]);

    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      const note: Notification = {
        id: crypto.randomUUID(),
        userId: job.clientId,
        message: `New application from ${currentUser.name} for ${job.title}`,
        type: 'info',
        read: false,
        timestamp: new Date().toISOString(),
      };
      const savedNote = await db.saveNotification(note);
      setNotifications((prev) => [...prev, savedNote]);
    }
  };

  const handleUpdateApplicationStatus = async (appId: string, status: ApplicationStatus) => {
    try {
      // 1. Use the PATCH endpoint we just created
      // This triggers the backend logic to notify the maid and reject others
      const result = await db.updateApplicationStatus(appId, status);

      // 2. Update local state with the returned data
      if (result.application) {
        setApplications((prev) => prev.map((a) => (a.id === appId ? result.application : a)));
      }
      if (result.job) {
        setJobs((prev) => prev.map((j) => (j.id === result.job.id ? result.job : j)));
      }

      // 3. Sync notifications (since the backend just created new ones)
      const allNotes = await db.getNotifications();
      setNotifications(allNotes);
    } catch (error) {
      alert('Failed to update application status');
    }
  };

  const handleMarkNotificationsRead = async () => {
    if (currentUser) {
      await db.markNotificationsRead(currentUser.id);
      setNotifications((prev) =>
        prev.map((n) => (n.userId === currentUser.id ? { ...n, read: true } : n))
      );
    }
  };

  const handleNotificationClick = async (notificationId: string) => {
    try {
      await db.markSingleNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );

      // Optional: Logic to navigate user to the relevant page based on notification
      // e.g., if message contains "job", navigate to dashboard
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  };

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
