import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Application, ApplicationStatus, Job, Notification, User } from '../types';
import { db } from '../services/db';

interface ApplicationActionDependencies {
  currentUser: User | null;
  jobs: Job[];
  setApplications: Dispatch<SetStateAction<Application[]>>;
  setJobs: Dispatch<SetStateAction<Job[]>>;
  setNotifications: Dispatch<SetStateAction<Notification[]>>;
}

export const useApplicationActions = ({
  currentUser,
  jobs,
  setApplications,
  setJobs,
  setNotifications,
}: ApplicationActionDependencies) => {
  const handleApply = useCallback(
    async (jobId: string, message: string) => {
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
    },
    [currentUser, jobs, setApplications, setNotifications]
  );

  const handleUpdateApplicationStatus = useCallback(
    async (appId: string, status: ApplicationStatus) => {
      try {
        const result = await db.updateApplicationStatus(appId, status);

        if (result.application) {
          setApplications((prev) => prev.map((a) => (a.id === appId ? result.application : a)));
        }
        if (result.job) {
          setJobs((prev) => prev.map((j) => (j.id === result.job.id ? result.job : j)));
        }

        const allNotes = await db.getNotifications();
        setNotifications(allNotes);
      } catch (error) {
        alert('Failed to update application status');
      }
    },
    [setApplications, setJobs, setNotifications]
  );

  return { handleApply, handleUpdateApplicationStatus };
};
