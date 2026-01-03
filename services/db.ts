import type { Application, Job, Notification, User } from '../types';

const API_BASE = '/api';

async function api<T>(path: string, init: RequestInit = {}, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const hasBody = init.body != null;

  // Use Headers so it works whether init.headers is an object, array, or Headers instance
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (hasBody && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      signal: init.signal ?? controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
    }

    if (res.status === 204) return undefined as T;

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
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
    return api<Application>(`/applications/${app.id}`, {
      method: 'PUT',
      body: JSON.stringify(app),
    });
  }

  // --- NOTIFICATIONS ---
  getNotifications(): Promise<Notification[]> {
    return api<Notification[]>('/notifications');
  }

  saveNotification(note: Notification): Promise<Notification> {
    return api<Notification>(`/notifications/${note.id}`, {
      method: 'PUT',
      body: JSON.stringify(note),
    });
  }

  markNotificationsRead(userId: string): Promise<void> {
    return api<void>(`/notifications/mark-read`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }
}

export const db = new DBService();
