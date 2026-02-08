import type { Application, Job, Message, Notification, User } from '../types';

const API_BASE = '/api';

type ApiErrorPayload = { error?: string; message?: string };

async function api<T>(path: string, init: RequestInit = {}, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const hasBody = init.body != null;

  // Normalize headers (works with object / array / Headers)
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
      let msg = text;

      // Try to unwrap { error: "..."} or { message: "..."} responses
      try {
        const parsed = JSON.parse(text) as ApiErrorPayload;
        msg = parsed.error || parsed.message || text;
      } catch {
        // ignore JSON parse errors
      }

      throw new Error(`API ${res.status} ${res.statusText}: ${msg}`);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

class DBService {
  // ---------------- USERS ----------------
  getUsers(): Promise<User[]> {
    return api<User[]>('/users');
  }

  getUser(userId: string): Promise<User> {
    return api<User>(`/users/${userId}`);
  }

  async register(user: Partial<User>, password: string): Promise<User> {
    return api<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...user, password }),
    });
  }

  // You can keep createUser but it's redundant now,
  // or update it to point to register:
  async createUser(user: Partial<User>, password: string): Promise<User> {
    // Point to the register endpoint, NOT /users/:id
    return api<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...user, password }),
    });
  }

  updateUser(user: User): Promise<User> {
    return api<User>(`/users/${user.id}`, { method: 'PUT', body: JSON.stringify(user) });
  }

  // Backwards-compat alias (your code currently calls saveUser)
  saveUser(user: User): Promise<User> {
    return this.updateUser(user);
  }

  /**
   * AUTH: Login
   * POST /api/auth/login
   */
  async login(email: string, password: string): Promise<User> {
    return api<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // ---------------- JOBS ----------------
  getJobs(): Promise<Job[]> {
    return api<Job[]>('/jobs');
  }

  getJob(jobId: string): Promise<Job> {
    return api<Job>(`/jobs/${jobId}`);
  }

  createJob(job: Partial<Job>): Promise<Job> {
    return api<Job>('/jobs', { method: 'POST', body: JSON.stringify(job) });
  }

  updateJob(job: Job): Promise<Job> {
    return api<Job>(`/jobs/${job.id}`, { method: 'PUT', body: JSON.stringify(job) });
  }

  // Backwards-compat alias (your code currently calls saveJob)
  async saveJob(job: Job): Promise<Job> {
    // Check if this is a brand new job (usually by checking if we are in the 'handlePostJob' flow)
    // For safety, let's just make sure we have a dedicated create/update logic
    if (job.id && (await this.getJob(job.id).catch(() => null))) {
      return this.updateJob(job);
    }
    return api<Job>('/jobs', { method: 'POST', body: JSON.stringify(job) });
  }

  deleteJob(jobId: string): Promise<void> {
    return api<void>(`/jobs/${jobId}`, { method: 'DELETE' });
  }

  // -------------- APPLICATIONS --------------
  // Add this specific method for the Accept/Reject flow
  async updateApplicationStatus(appId: string, status: string): Promise<any> {
    return api<any>(`/applications/${appId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  getApplications(): Promise<Application[]> {
    return api<Application[]>('/applications');
  }

  getApplication(applicationId: string): Promise<Application> {
    return api<Application>(`/applications/${applicationId}`);
  }

  async createApplication(app: Partial<Application>): Promise<Application> {
    return api<Application>('/applications', { method: 'POST', body: JSON.stringify(app) });
  }

  updateApplication(app: Application): Promise<Application> {
    return api<Application>(`/applications/${app.id}`, {
      method: 'PUT',
      body: JSON.stringify(app),
    });
  }

  // Backwards-compat alias
  saveApplication(app: Application): Promise<Application> {
    return this.updateApplication(app);
  }

  // -------------- NOTIFICATIONS --------------
  getNotifications(): Promise<Notification[]> {
    return api<Notification[]>('/notifications');
  }

  getNotification(notificationId: string): Promise<Notification> {
    return api<Notification>(`/notifications/${notificationId}`);
  }

  /**
   * CREATE notification - expects:
   *   POST /api/notifications
   */
  async createNotification(note: Partial<Notification>): Promise<Notification> {
    return api<Notification>('/notifications', { method: 'POST', body: JSON.stringify(note) });
  }

  updateNotification(note: Notification): Promise<Notification> {
    return api<Notification>(`/notifications/${note.id}`, {
      method: 'PUT',
      body: JSON.stringify(note),
    });
  }

  // Backwards-compat alias
  saveNotification(note: Notification): Promise<Notification> {
    return this.updateNotification(note);
  }

  markNotificationsRead(userId: string): Promise<void> {
    return api<void>(`/notifications/mark_read`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  markSingleNotificationRead(id: string): Promise<void> {
    return api<void>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  // Get the experince answer from maid to client
  getExperienceAnswers(userId: string): Promise<any[]> {
    return api<any[]>(`/users/${userId}/experience_answers`);
  }

  // This is for the create, update, delete of the new columns in user avatar_file_id and cv_file_id
  async uploadFile(
    file: File,
    userId: string,
    folder: 'avatars' | 'cvs' | 'messages'
  ): Promise<{ id: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('folder', folder);

    const res = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData, // Do NOT set Content-Type header; browser does it for FormData
    });

    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  }

  async getSignedUrl(fileId: string): Promise<string> {
    const data = await api<{ url: string }>(`/files/signed-url/${fileId}`);
    return data.url;
  }

  // -------------- MESSAGES --------------
  getMessages(jobId: string, userId: string): Promise<Message[]> {
    const query = new URLSearchParams({ jobId, userId });
    return api<Message[]>(`/messages?${query.toString()}`);
  }

  createMessage(message: Partial<Message>): Promise<Message> {
    return api<Message>('/messages', { method: 'POST', body: JSON.stringify(message) });
  }

  updateMessage(messageId: string, content: string, senderId: string): Promise<Message> {
    return api<Message>(`/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content, senderId }),
    });
  }

  deleteMessage(messageId: string, senderId: string): Promise<Message> {
    return api<Message>(`/messages/${messageId}`, {
      method: 'DELETE',
      body: JSON.stringify({ senderId }),
    });
  }

  markMessagesRead(jobId: string, userId: string): Promise<{ messageIds: string[]; readAt: string }> {
    return api<{ messageIds: string[]; readAt: string }>(`/messages/read`, {
      method: 'POST',
      body: JSON.stringify({ jobId, userId }),
    });
  }

  reportMessage(messageId: string, reporterId: string, reason: string): Promise<void> {
    return api<void>(`/messages/${messageId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reporterId, reason }),
    });
  }
}

export const db = new DBService();
