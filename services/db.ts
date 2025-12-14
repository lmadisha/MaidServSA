import { User, Job, Application, Message, Review, Notification, UserRole, JobStatus, PaymentType, ApplicationStatus } from '../types';

// Seed Data (Simulating the initial DB state)
const SEED_USERS: User[] = [
  { id: 'client1', name: 'Sarah Connor', email: 'sarah@example.com', role: UserRole.CLIENT, avatar: 'https://picsum.photos/200/200?random=1', rating: 4.8, ratingCount: 12, location: 'Cape Town', firstName: 'Sarah', surname: 'Connor', nationality: 'South African', residencyStatus: 'Citizen (Born)' },
  { id: 'maid1', name: 'Martha Kent', email: 'martha@example.com', role: UserRole.MAID, avatar: 'https://picsum.photos/200/200?random=2', rating: 4.9, ratingCount: 24, bio: 'Experienced cleaner with 10 years in luxury homes. Specialized in deep cleaning.', location: 'Cape Town', firstName: 'Martha', surname: 'Kent', nationality: 'South African', residencyStatus: 'Permanent Resident', experienceAnswers: [{ questionId: 'q1', question: 'How many years of professional cleaning experience do you have?', answer: '10 years' }, { questionId: 'q2', question: 'Are you comfortable working in homes with pets?', answer: 'Yes, I love dogs and cats.' }, { questionId: 'q3', question: 'Do you have experience with deep cleaning or specialized surfaces?', answer: 'Yes, treated marble and hardwood floors extensively.' }, { questionId: 'q4', question: 'Are you available for weekend shifts?', answer: 'Saturdays only.' }], cvFileName: 'Martha_Kent_CV_2024.pdf' },
  { id: 'maid2', name: 'Diana Prince', email: 'diana@example.com', role: UserRole.MAID, avatar: 'https://picsum.photos/200/200?random=3', rating: 5.0, ratingCount: 8, bio: 'Fast, efficient, and reliable. I bring my own eco-friendly supplies.', location: 'Johannesburg', firstName: 'Diana', surname: 'Prince', nationality: 'Zimbabwean', residencyStatus: 'Work Visa', experienceAnswers: [{ questionId: 'q1', question: 'How many years of professional cleaning experience do you have?', answer: '5 years' }, { questionId: 'q2', question: 'Are you comfortable working in homes with pets?', answer: 'Yes.' }, { questionId: 'q3', question: 'Do you have experience with deep cleaning or specialized surfaces?', answer: 'General cleaning only.' }, { questionId: 'q4', question: 'Are you available for weekend shifts?', answer: 'Yes, both days.' }] },
  { id: 'admin1', name: 'System Admin', email: 'admin@maidservsa.com', role: UserRole.ADMIN, avatar: 'https://ui-avatars.com/api/?name=Admin&background=0D9488&color=fff', rating: 5.0, ratingCount: 0, location: 'HQ', nationality: 'South African', residencyStatus: 'Citizen (Born)' },
];

const today = new Date();
const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7);

const SEED_JOBS: Job[] = [
  {
    id: 'job1',
    clientId: 'client1',
    title: 'Deep Clean for 3 Bed Apartment',
    description: 'Looking for a thorough spring clean. Focus on bathrooms and kitchen windows.',
    location: 'Sea Point, Cape Town',
    areaSize: 120,
    price: 800,
    currency: 'R',
    date: tomorrow.toISOString().split('T')[0],
    status: JobStatus.OPEN,
    rooms: 3,
    bathrooms: 2,
    images: ['https://picsum.photos/800/600?random=10'],
    paymentType: PaymentType.FIXED,
    startTime: '08:00',
    endTime: '16:00',
    duration: 8,
    workDates: [tomorrow.toISOString().split('T')[0]],
    history: [
      { status: JobStatus.OPEN, timestamp: new Date(today.getTime() - 86400000).toISOString(), note: 'Job posted' }
    ]
  },
  {
    id: 'job2',
    clientId: 'client1',
    title: 'Weekly Maintenance Clean',
    description: 'Regular cleaning needed for a small studio. Dusting, mopping, and laundry.',
    location: 'City Bowl, Cape Town',
    areaSize: 45,
    price: 50, // Hourly rate example
    currency: 'R',
    date: nextWeek.toISOString().split('T')[0],
    status: JobStatus.OPEN,
    rooms: 1,
    bathrooms: 1,
    images: ['https://picsum.photos/800/600?random=11'],
    paymentType: PaymentType.HOURLY,
    startTime: '09:00',
    endTime: '12:00',
    duration: 3,
    workDates: [nextWeek.toISOString().split('T')[0]],
    history: [
      { status: JobStatus.OPEN, timestamp: new Date().toISOString(), note: 'Job posted' }
    ]
  },
];

// DB Keys
const KEYS = {
  USERS: 'maidserv_users',
  JOBS: 'maidserv_jobs',
  APPLICATIONS: 'maidserv_applications',
  REVIEWS: 'maidserv_reviews',
  MESSAGES: 'maidserv_messages',
  NOTIFICATIONS: 'maidserv_notifications'
};

class DBService {
  constructor() {
    this.init();
  }

  private init() {
    if (!localStorage.getItem(KEYS.USERS)) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(SEED_USERS));
    }
    if (!localStorage.getItem(KEYS.JOBS)) {
      localStorage.setItem(KEYS.JOBS, JSON.stringify(SEED_JOBS));
    }
    if (!localStorage.getItem(KEYS.APPLICATIONS)) {
      localStorage.setItem(KEYS.APPLICATIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(KEYS.REVIEWS)) {
      localStorage.setItem(KEYS.REVIEWS, JSON.stringify([]));
    }
    if (!localStorage.getItem(KEYS.MESSAGES)) {
      localStorage.setItem(KEYS.MESSAGES, JSON.stringify([]));
    }
    if (!localStorage.getItem(KEYS.NOTIFICATIONS)) {
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([]));
    }
  }

  private delay(ms: number = 300) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private get<T>(key: string): any[] {
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    } else {
      return [];
    }
  }

  private set(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- USERS ---
  async getUsers(): Promise<User[]> {
    await this.delay();
    return this.get<User[]>(KEYS.USERS);
  }

  async saveUser(user: User): Promise<User> {
    await this.delay();
    const users = this.get<User[]>(KEYS.USERS);
    const existingIndex = users.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    this.set(KEYS.USERS, users);
    return user;
  }

  // --- JOBS ---
  async getJobs(): Promise<Job[]> {
    await this.delay();
    return this.get<Job[]>(KEYS.JOBS);
  }

  async saveJob(job: Job): Promise<Job> {
    await this.delay();
    const jobs = this.get<Job[]>(KEYS.JOBS);
    const existingIndex = jobs.findIndex(j => j.id === job.id);
    if (existingIndex >= 0) {
      jobs[existingIndex] = job;
    } else {
      jobs.push(job);
    }
    this.set(KEYS.JOBS, jobs);
    return job;
  }

  async deleteJob(jobId: string): Promise<void> {
    await this.delay();
    const jobs = this.get<Job[]>(KEYS.JOBS);
    this.set(KEYS.JOBS, jobs.filter(j => j.id !== jobId));
  }

  // --- APPLICATIONS ---
  async getApplications(): Promise<Application[]> {
    await this.delay();
    return this.get<Application[]>(KEYS.APPLICATIONS);
  }

  async saveApplication(app: Application): Promise<Application> {
    await this.delay();
    const apps = this.get<Application[]>(KEYS.APPLICATIONS);
    const existingIndex = apps.findIndex(a => a.id === app.id);
    if (existingIndex >= 0) {
      apps[existingIndex] = app;
    } else {
      apps.push(app);
    }
    this.set(KEYS.APPLICATIONS, apps);
    return app;
  }

  // --- MESSAGES ---
  async getMessages(): Promise<Message[]> {
    await this.delay();
    return this.get<Message[]>(KEYS.MESSAGES);
  }

  async saveMessage(msg: Message): Promise<Message> {
    await this.delay(100); // Faster for chat
    const messages = this.get<Message[]>(KEYS.MESSAGES);
    messages.push(msg);
    this.set(KEYS.MESSAGES, messages);
    return msg;
  }

  // --- REVIEWS ---
  async getReviews(): Promise<Review[]> {
    await this.delay();
    return this.get<Review[]>(KEYS.REVIEWS);
  }

  async saveReview(review: Review): Promise<Review> {
    await this.delay();
    const reviews = this.get<Review[]>(KEYS.REVIEWS);
    reviews.push(review);
    this.set(KEYS.REVIEWS, reviews);
    return review;
  }

  // --- NOTIFICATIONS ---
  async getNotifications(): Promise<Notification[]> {
    await this.delay();
    return this.get<Notification[]>(KEYS.NOTIFICATIONS);
  }

  async saveNotification(note: Notification): Promise<Notification> {
    await this.delay();
    const notifications = this.get<Notification[]>(KEYS.NOTIFICATIONS);
    notifications.push(note);
    this.set(KEYS.NOTIFICATIONS, notifications);
    return note;
  }

  async markNotificationsRead(userId: string): Promise<void> {
    await this.delay();
    const notifications = this.get<Notification[]>(KEYS.NOTIFICATIONS);
    const updated = notifications.map(n => n.userId === userId ? { ...n, read: true } : n);
    this.set(KEYS.NOTIFICATIONS, updated);
  }
}

export const db = new DBService();
