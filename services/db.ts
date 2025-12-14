import { User, Job, Application, Message, Review, Notification, UserRole, JobStatus, PaymentType, ApplicationStatus } from '../types';

// PostgreSQL schema to move the current in-memory/localStorage data model into a real database
// The database runs on localhost:5432 with user/password postgres/postgres
export const POSTGRES_SCHEMA_QUERIES: string[] = [
  // Extensions & enums
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
  `CREATE TYPE user_role AS ENUM ('CLIENT', 'MAID', 'ADMIN');`,
  `CREATE TYPE job_status AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');`,
  `CREATE TYPE payment_type AS ENUM ('FIXED', 'HOURLY');`,
  `CREATE TYPE application_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');`,

  // Users
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL,
    avatar TEXT,
    rating NUMERIC(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    bio TEXT,
    location TEXT,
    is_suspended BOOLEAN DEFAULT FALSE,
    first_name TEXT,
    middle_name TEXT,
    surname TEXT,
    date_of_birth DATE,
    address TEXT,
    place_of_birth TEXT,
    nationality TEXT,
    residency_status TEXT,
    languages TEXT,
    education_level TEXT,
    marital_status TEXT,
    school TEXT,
    cv_file_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // Jobs
  `CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    area_size INTEGER,
    price NUMERIC(10,2),
    currency TEXT DEFAULT 'R',
    date DATE,
    status job_status NOT NULL DEFAULT 'OPEN',
    rooms SMALLINT,
    bathrooms SMALLINT,
    images TEXT[],
    payment_type payment_type NOT NULL,
    start_time TIME,
    end_time TIME,
    duration NUMERIC(5,2),
    work_dates DATE[],
    assigned_maid_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // Job history
  `CREATE TABLE IF NOT EXISTS job_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    status job_status NOT NULL,
    note TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
  );`,

  // Applications
  `CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    maid_id UUID REFERENCES users(id),
    status application_status NOT NULL DEFAULT 'PENDING',
    message TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // Messages
  `CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    receiver_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
  );`,

  // Reviews
  `CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id),
    reviewee_id UUID REFERENCES users(id),
    rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // Notifications
  `CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info','success','warning','error')),
    read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ DEFAULT NOW()
  );`,

  // Experience answers
  `CREATE TABLE IF NOT EXISTS experience_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // Helpful indexes
  `CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);`,
  `CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);`,
  `CREATE INDEX IF NOT EXISTS idx_messages_job_id ON messages(job_id);`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`
];

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
    const query = `SELECT * FROM users ORDER BY created_at DESC;`;
    void query;
    return this.get<User[]>(KEYS.USERS);
  }

  async saveUser(user: User): Promise<User> {
    await this.delay();
    const query = `INSERT INTO users (id, name, email, role, avatar, rating, rating_count, bio, location, is_suspended, first_name, middle_name, surname, date_of_birth, address, place_of_birth, nationality, residency_status, languages, education_level, marital_status, school, cv_file_name)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
                   ON CONFLICT (id) DO UPDATE SET
                     name=EXCLUDED.name,
                     email=EXCLUDED.email,
                     role=EXCLUDED.role,
                     avatar=EXCLUDED.avatar,
                     rating=EXCLUDED.rating,
                     rating_count=EXCLUDED.rating_count,
                     bio=EXCLUDED.bio,
                     location=EXCLUDED.location,
                     is_suspended=EXCLUDED.is_suspended,
                     first_name=EXCLUDED.first_name,
                     middle_name=EXCLUDED.middle_name,
                     surname=EXCLUDED.surname,
                     date_of_birth=EXCLUDED.date_of_birth,
                     address=EXCLUDED.address,
                     place_of_birth=EXCLUDED.place_of_birth,
                     nationality=EXCLUDED.nationality,
                     residency_status=EXCLUDED.residency_status,
                     languages=EXCLUDED.languages,
                     education_level=EXCLUDED.education_level,
                     marital_status=EXCLUDED.marital_status,
                     school=EXCLUDED.school,
                     cv_file_name=EXCLUDED.cv_file_name,
                     updated_at=NOW();`;
    void query;
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
    const query = `SELECT * FROM jobs ORDER BY date ASC;`;
    void query;
    return this.get<Job[]>(KEYS.JOBS);
  }

  async saveJob(job: Job): Promise<Job> {
    await this.delay();
    const query = `INSERT INTO jobs (id, client_id, title, description, location, area_size, price, currency, date, status, rooms, bathrooms, images, payment_type, start_time, end_time, duration, work_dates, assigned_maid_id)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
                   ON CONFLICT (id) DO UPDATE SET
                     title=EXCLUDED.title,
                     description=EXCLUDED.description,
                     location=EXCLUDED.location,
                     area_size=EXCLUDED.area_size,
                     price=EXCLUDED.price,
                     currency=EXCLUDED.currency,
                     date=EXCLUDED.date,
                     status=EXCLUDED.status,
                     rooms=EXCLUDED.rooms,
                     bathrooms=EXCLUDED.bathrooms,
                     images=EXCLUDED.images,
                     payment_type=EXCLUDED.payment_type,
                     start_time=EXCLUDED.start_time,
                     end_time=EXCLUDED.end_time,
                     duration=EXCLUDED.duration,
                     work_dates=EXCLUDED.work_dates,
                     assigned_maid_id=EXCLUDED.assigned_maid_id,
                     updated_at=NOW();`;
    void query;
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
    const query = `DELETE FROM jobs WHERE id = $1;`;
    void query;
    const jobs = this.get<Job[]>(KEYS.JOBS);
    this.set(KEYS.JOBS, jobs.filter(j => j.id !== jobId));
  }

  // --- APPLICATIONS ---
  async getApplications(): Promise<Application[]> {
    await this.delay();
    const query = `SELECT * FROM applications ORDER BY applied_at DESC;`;
    void query;
    return this.get<Application[]>(KEYS.APPLICATIONS);
  }

  async saveApplication(app: Application): Promise<Application> {
    await this.delay();
    const query = `INSERT INTO applications (id, job_id, maid_id, status, message, applied_at, updated_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7)
                   ON CONFLICT (id) DO UPDATE SET
                     status=EXCLUDED.status,
                     message=EXCLUDED.message,
                     updated_at=NOW();`;
    void query;
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
    const query = `SELECT * FROM messages WHERE job_id = $1 AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2)) ORDER BY timestamp;`;
    void query;
    return this.get<Message[]>(KEYS.MESSAGES);
  }

  async saveMessage(msg: Message): Promise<Message> {
    await this.delay(100); // Faster for chat
    const query = `INSERT INTO messages (id, job_id, sender_id, receiver_id, content, timestamp)
                   VALUES ($1,$2,$3,$4,$5,$6);`;
    void query;
    const messages = this.get<Message[]>(KEYS.MESSAGES);
    messages.push(msg);
    this.set(KEYS.MESSAGES, messages);
    return msg;
  }

  // --- REVIEWS ---
  async getReviews(): Promise<Review[]> {
    await this.delay();
    const query = `SELECT * FROM reviews WHERE reviewee_id = $1 ORDER BY created_at DESC;`;
    void query;
    return this.get<Review[]>(KEYS.REVIEWS);
  }

  async saveReview(review: Review): Promise<Review> {
    await this.delay();
    const query = `INSERT INTO reviews (id, job_id, reviewer_id, reviewee_id, rating, comment, created_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7);`;
    void query;
    const reviews = this.get<Review[]>(KEYS.REVIEWS);
    reviews.push(review);
    this.set(KEYS.REVIEWS, reviews);
    return review;
  }

  // --- NOTIFICATIONS ---
  async getNotifications(): Promise<Notification[]> {
    await this.delay();
    const query = `SELECT * FROM notifications WHERE user_id = $1 ORDER BY timestamp DESC;`;
    void query;
    return this.get<Notification[]>(KEYS.NOTIFICATIONS);
  }

  async saveNotification(note: Notification): Promise<Notification> {
    await this.delay();
    const query = `INSERT INTO notifications (id, user_id, message, type, read, timestamp)
                   VALUES ($1,$2,$3,$4,$5,$6);`;
    void query;
    const notifications = this.get<Notification[]>(KEYS.NOTIFICATIONS);
    notifications.push(note);
    this.set(KEYS.NOTIFICATIONS, notifications);
    return note;
  }

  async markNotificationsRead(userId: string): Promise<void> {
    await this.delay();
    const query = `UPDATE notifications SET read = TRUE WHERE user_id = $1;`;
    void query;
    const notifications = this.get<Notification[]>(KEYS.NOTIFICATIONS);
    const updated = notifications.map(n => n.userId === userId ? { ...n, read: true } : n);
    this.set(KEYS.NOTIFICATIONS, updated);
  }
}

export const db = new DBService();
