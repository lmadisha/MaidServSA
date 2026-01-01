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

  const handleSignUp = async (userData: Partial<User>) => {
    if (users.some((u) => u.email.toLowerCase() === userData.email?.toLowerCase())) {
      alert('An account with this email already exists.');
      return;
    }

    const newUser: User = {
      rating: 0,
      ratingCount: 0,
      id: `user_${Date.now()}`,
      email: userData.email!,
      name: userData.name!,
      role: userData.role!,
      avatar: userData.avatar!,
      firstName: userData.name?.split(' ')[0] || '',
      surname: userData.name?.split(' ').slice(1).join(' ') || '',
      experienceAnswers: [],
    };

    const saved = await db.saveUser(newUser);
    setUsers((prev) => [...prev, saved]);
    setCurrentUser(saved);
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
    const saved = await db.saveJob(job);
    setJobs((prev) => [...prev, saved]);
  };

  const handleUpdateJob = async (job: Job) => {
    const saved = await db.saveJob(job);
    setJobs((prev) => prev.map((j) => (j.id === saved.id ? saved : j)));
  };

  const handleDeleteJob = async (jobId: string) => {
    await db.deleteJob(jobId);
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  const handleApply = async (jobId: string, message: string) => {
    if (!currentUser) return;
    const newApp: Application = {
      id: `app_${Date.now()}`,
      jobId,
      maidId: currentUser.id,
      status: ApplicationStatus.PENDING,
      message,
      appliedAt: new Date().toISOString(),
    };
    const saved = await db.saveApplication(newApp);
    setApplications((prev) => [...prev, saved]);

    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      const note: Notification = {
        id: `not_${Date.now()}`,
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
    const app = applications.find((a) => a.id === appId);
    if (app) {
      const updated = { ...app, status };
      await db.saveApplication(updated);
      setApplications((prev) => prev.map((a) => (a.id === appId ? updated : a)));

      const note: Notification = {
        id: `not_${Date.now()}`,
        userId: app.maidId,
        message: `Your application for job ID ${app.jobId} was ${status.toLowerCase()}`,
        type: status === ApplicationStatus.ACCEPTED ? 'success' : 'error',
        read: false,
        timestamp: new Date().toISOString(),
      };
      const savedNote = await db.saveNotification(note);
      setNotifications((prev) => [...prev, savedNote]);
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
