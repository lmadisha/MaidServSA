import { useEffect, useState } from 'react';
import { Application, Job, Notification, User } from '../types';
import { db } from '../services/db';

export const useAppData = (viewer?: User | null) => {
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [u, j, a, n] = await Promise.all([
          db.getUsers(),
          db.getJobs(
            viewer?.id && viewer.role ? { viewerId: viewer.id, viewerRole: viewer.role } : undefined
          ),
          db.getApplications(),
          db.getNotifications(),
        ]);

        setUsers(u);
        setJobs(j);
        setApplications(a);
        setNotifications(n);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [viewer?.id, viewer?.role]);

  return {
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
  };
};
