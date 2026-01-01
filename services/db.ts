import type { Application, Job, Notification, User } from '../types';

const API_BASE = '/api';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
  }

  return (await res.json()) as T;
}

class DBService {
  // --- USERS ---
  getUsers(): Promise<User[]> {
    return api<User[]>('/users');
  }

  saveUser(user: User): Promise<User> {
    return api<User>(`/users/${user.id}`, { method: 'PUT', body: JSON.stringify(user) });
  }

  // --- JOBS ---
  getJobs(): Promise<Job[]> {
    return api<Job[]>('/jobs');
  }

  saveJob(job: Job): Promise<Job> {
    return api<Job>(`/jobs/${job.id}`, { method: 'PUT', body: JSON.stringify(job) });
  }

  deleteJob(jobId: string): Promise<void> {
    return api<void>(`/jobs/${jobId}`, { method: 'DELETE' });
  }

  // --- APPLICATIONS ---
  getApplications(): Promise<Application[]> {
    return api<Application[]>('/applications');
  }

  saveApplication(app: Application): Promise<Application> {
    return api<Application>(`/applications/${app.id}`, { method: 'PUT', body: JSON.stringify(app) });
  }

  // --- NOTIFICATIONS ---
  getNotifications(): Promise<Notification[]> {
    return api<Notification[]>('/notifications');
  }

  saveNotification(note: Notification): Promise<Notification> {
    return api<Notification>(`/notifications/${note.id}`, { method: 'PUT', body: JSON.stringify(note) });
  }

  markNotificationsRead(userId: string): Promise<void> {
    return api<void>(`/notifications/mark-read`, { method: 'POST', body: JSON.stringify({ userId }) });
  }
}

export const db = new DBService();
