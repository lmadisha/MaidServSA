import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Job, User } from '../types';
import { db } from '../services/db';

interface JobActionDependencies {
  currentUser: User | null;
  setJobs: Dispatch<SetStateAction<Job[]>>;
}

export const useJobActions = ({ currentUser, setJobs }: JobActionDependencies) => {
  const handlePostJob = useCallback(
    async (job: Job) => {
      const saved = await db.createJob(job);
      setJobs((prev) => [...prev, saved]);
    },
    [setJobs]
  );

  const handleUpdateJob = useCallback(
    async (job: Job) => {
      try {
        const saved = await db.saveJob(job);
        setJobs((prev) => prev.map((j) => (j.id === saved.id ? saved : j)));
      } catch (error: any) {
        alert(error.message || 'This job is locked and cannot be edited.');
      }
    },
    [setJobs]
  );

  const handleCompleteJob = useCallback(
    async (jobId: string) => {
      if (!currentUser) return;
      try {
        const saved = await db.completeJob(jobId, currentUser.id);
        setJobs((prev) => prev.map((j) => (j.id === saved.id ? saved : j)));
      } catch (error: any) {
        alert(error.message || 'Failed to complete job.');
      }
    },
    [currentUser, setJobs]
  );

  const handleDeleteJob = useCallback(
    async (jobId: string) => {
      await db.deleteJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    },
    [setJobs]
  );

  return { handlePostJob, handleUpdateJob, handleCompleteJob, handleDeleteJob };
};
