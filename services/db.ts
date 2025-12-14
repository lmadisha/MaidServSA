import { Pool, PoolClient } from 'pg';
import {
  Application,
  ApplicationStatus,
  ExperienceAnswer,
  Job,
  JobHistoryEntry,
  JobStatus,
  Message,
  Notification,
  PaymentType,
  Review,
  User,
  UserRole,
} from '../types';

// PostgreSQL schema to move the current in-memory/localStorage data model into a real database
// The database runs on localhost:5432 with user/password postgres/postgres
export const POSTGRES_SCHEMA_QUERIES: string[] = [
  // Extensions & enums
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
  `CREATE TYPE IF NOT EXISTS user_role AS ENUM ('CLIENT', 'MAID', 'ADMIN');`,
  `CREATE TYPE IF NOT EXISTS job_status AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');`,
  `CREATE TYPE IF NOT EXISTS payment_type AS ENUM ('FIXED', 'HOURLY');`,
  `CREATE TYPE IF NOT EXISTS application_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');`,

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
  {
    id: 'client1',
    name: 'Sarah Connor',
    email: 'sarah@example.com',
    role: UserRole.CLIENT,
    avatar: 'https://picsum.photos/200/200?random=1',
    rating: 4.8,
    ratingCount: 12,
    location: 'Cape Town',
    firstName: 'Sarah',
    surname: 'Connor',
    nationality: 'South African',
    residencyStatus: 'Citizen (Born)',
  },
  {
    id: 'maid1',
    name: 'Martha Kent',
    email: 'martha@example.com',
    role: UserRole.MAID,
    avatar: 'https://picsum.photos/200/200?random=2',
    rating: 4.9,
    ratingCount: 24,
    bio: 'Experienced cleaner with 10 years in luxury homes. Specialized in deep cleaning.',
    location: 'Cape Town',
    firstName: 'Martha',
    surname: 'Kent',
    nationality: 'South African',
    residencyStatus: 'Permanent Resident',
    experienceAnswers: [
      { questionId: 'q1', question: 'How many years of professional cleaning experience do you have?', answer: '10 years' },
      { questionId: 'q2', question: 'Are you comfortable working in homes with pets?', answer: 'Yes, I love dogs and cats.' },
      { questionId: 'q3', question: 'Do you have experience with deep cleaning or specialized surfaces?', answer: 'Yes, treated marble and hardwood floors extensively.' },
      { questionId: 'q4', question: 'Are you available for weekend shifts?', answer: 'Saturdays only.' },
    ],
    cvFileName: 'Martha_Kent_CV_2024.pdf',
  },
  {
    id: 'maid2',
    name: 'Diana Prince',
    email: 'diana@example.com',
    role: UserRole.MAID,
    avatar: 'https://picsum.photos/200/200?random=3',
    rating: 5.0,
    ratingCount: 8,
    bio: 'Fast, efficient, and reliable. I bring my own eco-friendly supplies.',
    location: 'Johannesburg',
    firstName: 'Diana',
    surname: 'Prince',
    nationality: 'Zimbabwean',
    residencyStatus: 'Work Visa',
    experienceAnswers: [
      { questionId: 'q1', question: 'How many years of professional cleaning experience do you have?', answer: '5 years' },
      { questionId: 'q2', question: 'Are you comfortable working in homes with pets?', answer: 'Yes.' },
      { questionId: 'q3', question: 'Do you have experience with deep cleaning or specialized surfaces?', answer: 'General cleaning only.' },
      { questionId: 'q4', question: 'Are you available for weekend shifts?', answer: 'Yes, both days.' },
    ],
  },
  {
    id: 'admin1',
    name: 'System Admin',
    email: 'admin@maidservsa.com',
    role: UserRole.ADMIN,
    avatar: 'https://ui-avatars.com/api/?name=Admin&background=0D9488&color=fff',
    rating: 5.0,
    ratingCount: 0,
    location: 'HQ',
    nationality: 'South African',
    residencyStatus: 'Citizen (Born)',
  },
];

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);

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
    history: [{ status: JobStatus.OPEN, timestamp: new Date(today.getTime() - 86400000).toISOString(), note: 'Job posted' }],
  },
  {
    id: 'job2',
    clientId: 'client1',
    title: 'Weekly Maintenance Clean',
    description: 'Regular cleaning needed for a small studio. Dusting, mopping, and laundry.',
    location: 'City Bowl, Cape Town',
    areaSize: 45,
    price: 50,
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
    history: [{ status: JobStatus.OPEN, timestamp: new Date().toISOString(), note: 'Job posted' }],
  },
];

const connectionString =
  (typeof process !== 'undefined' && (process as any).env?.DATABASE_URL) ||
  'postgres://postgres:postgres@localhost:5432/postgres';

const POOL = new Pool({
  connectionString,
});

const mapUserRow = (row: any, experienceAnswers: ExperienceAnswer[] | undefined = undefined): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role as UserRole,
  avatar: row.avatar ?? '',
  rating: Number(row.rating ?? 0),
  ratingCount: Number(row.rating_count ?? 0),
  bio: row.bio ?? undefined,
  location: row.location ?? undefined,
  isSuspended: row.is_suspended ?? undefined,
  firstName: row.first_name ?? undefined,
  middleName: row.middle_name ?? undefined,
  surname: row.surname ?? undefined,
  dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth).toISOString().split('T')[0] : undefined,
  address: row.address ?? undefined,
  placeOfBirth: row.place_of_birth ?? undefined,
  nationality: row.nationality ?? undefined,
  residencyStatus: row.residency_status ?? undefined,
  languages: row.languages ?? undefined,
  educationLevel: row.education_level ?? undefined,
  maritalStatus: row.marital_status ?? undefined,
  school: row.school ?? undefined,
  cvFileName: row.cv_file_name ?? undefined,
  experienceAnswers,
});

const mapJobRow = (row: any, history: JobHistoryEntry[]): Job => ({
  id: row.id,
  clientId: row.client_id,
  title: row.title,
  description: row.description ?? '',
  location: row.location ?? '',
  areaSize: Number(row.area_size ?? 0),
  price: Number(row.price ?? 0),
  currency: row.currency ?? 'R',
  date: row.date ? new Date(row.date).toISOString().split('T')[0] : '',
  status: row.status as JobStatus,
  rooms: Number(row.rooms ?? 0),
  bathrooms: Number(row.bathrooms ?? 0),
  images: row.images ?? [],
  assignedMaidId: row.assigned_maid_id ?? undefined,
  paymentType: row.payment_type as PaymentType,
  startTime: row.start_time ?? '',
  endTime: row.end_time ?? '',
  duration: Number(row.duration ?? 0),
  workDates: row.work_dates?.map((d: Date) => new Date(d).toISOString().split('T')[0]) ?? [],
  history,
});

const mapApplicationRow = (row: any): Application => ({
  id: row.id,
  jobId: row.job_id,
  maidId: row.maid_id,
  status: row.status as ApplicationStatus,
  message: row.message ?? '',
  appliedAt: row.applied_at?.toISOString?.() ?? new Date().toISOString(),
});

const mapMessageRow = (row: any): Message => ({
  id: row.id,
  senderId: row.sender_id,
  receiverId: row.receiver_id,
  content: row.content,
  timestamp: row.timestamp?.toISOString?.() ?? new Date().toISOString(),
  jobId: row.job_id,
});

const mapReviewRow = (row: any): Review => ({
  id: row.id,
  jobId: row.job_id,
  reviewerId: row.reviewer_id,
  revieweeId: row.reviewee_id,
  rating: Number(row.rating ?? 0),
  comment: row.comment ?? '',
  createdAt: row.created_at?.toISOString?.() ?? new Date().toISOString(),
});

const mapNotificationRow = (row: any): Notification => ({
  id: row.id,
  userId: row.user_id,
  message: row.message,
  type: row.type,
  read: row.read,
  timestamp: row.timestamp?.toISOString?.() ?? new Date().toISOString(),
});

class DBService {
  private ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  private async init() {
    const client = await POOL.connect();
    try {
      for (const query of POSTGRES_SCHEMA_QUERIES) {
        await client.query(query);
      }
      await this.seed(client);
    } finally {
      client.release();
    }
  }

  private async seed(client: PoolClient) {
    const { rows } = await client.query<{ count: string }>('SELECT COUNT(*)::int AS count FROM users;');
    const hasData = Number(rows[0].count) > 0;
    if (hasData) return;

    for (const user of SEED_USERS) {
      await this.insertUser(client, user);
    }
    for (const job of SEED_JOBS) {
      await this.insertJob(client, job);
    }
  }

  private async insertUser(client: PoolClient, user: User) {
    await client.query(
      `INSERT INTO users (id, name, email, role, avatar, rating, rating_count, bio, location, is_suspended, first_name, middle_name, surname, date_of_birth, address, place_of_birth, nationality, residency_status, languages, education_level, marital_status, school, cv_file_name)
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
         updated_at=NOW();`,
      [
        user.id,
        user.name,
        user.email,
        user.role,
        user.avatar ?? null,
        user.rating ?? 0,
        user.ratingCount ?? 0,
        user.bio ?? null,
        user.location ?? null,
        user.isSuspended ?? false,
        user.firstName ?? null,
        user.middleName ?? null,
        user.surname ?? null,
        user.dateOfBirth ?? null,
        user.address ?? null,
        user.placeOfBirth ?? null,
        user.nationality ?? null,
        user.residencyStatus ?? null,
        user.languages ?? null,
        user.educationLevel ?? null,
        user.maritalStatus ?? null,
        user.school ?? null,
        user.cvFileName ?? null,
      ],
    );

    await client.query('DELETE FROM experience_answers WHERE user_id = $1;', [user.id]);
    if (user.experienceAnswers?.length) {
      for (const answer of user.experienceAnswers) {
        await client.query(
          `INSERT INTO experience_answers (user_id, question_id, question, answer) VALUES ($1,$2,$3,$4);`,
          [user.id, answer.questionId, answer.question, answer.answer],
        );
      }
    }
  }

  private async insertJob(client: PoolClient, job: Job) {
    await client.query(
      `INSERT INTO jobs (id, client_id, title, description, location, area_size, price, currency, date, status, rooms, bathrooms, images, payment_type, start_time, end_time, duration, work_dates, assigned_maid_id)
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
         updated_at=NOW();`,
      [
        job.id,
        job.clientId,
        job.title,
        job.description ?? null,
        job.location ?? null,
        job.areaSize ?? null,
        job.price ?? null,
        job.currency ?? 'R',
        job.date ?? null,
        job.status ?? JobStatus.OPEN,
        job.rooms ?? null,
        job.bathrooms ?? null,
        job.images ?? [],
        job.paymentType ?? PaymentType.FIXED,
        job.startTime ?? null,
        job.endTime ?? null,
        job.duration ?? null,
        job.workDates ?? [],
        job.assignedMaidId ?? null,
      ],
    );

    await client.query('DELETE FROM job_history WHERE job_id = $1;', [job.id]);
    if (job.history?.length) {
      for (const entry of job.history) {
        await client.query(
          `INSERT INTO job_history (job_id, status, note, timestamp) VALUES ($1,$2,$3,$4);`,
          [job.id, entry.status, entry.note ?? null, entry.timestamp],
        );
      }
    }
  }

  // --- USERS ---
  async getUsers(): Promise<User[]> {
    await this.ready;
    const client = await POOL.connect();
    try {
      const { rows } = await client.query('SELECT * FROM users ORDER BY created_at DESC;');
      const userIds = rows.map(r => r.id);
      const { rows: experienceRows } = await client.query('SELECT user_id, question_id, question, answer FROM experience_answers WHERE user_id = ANY($1);', [userIds]);
      const grouped = new Map<string, ExperienceAnswer[]>();
      for (const exp of experienceRows) {
        const arr = grouped.get(exp.user_id) ?? [];
        arr.push({ questionId: exp.question_id, question: exp.question, answer: exp.answer });
        grouped.set(exp.user_id, arr);
      }
      return rows.map(row => mapUserRow(row, grouped.get(row.id)));
    } finally {
      client.release();
    }
  }

  async saveUser(user: User): Promise<User> {
    await this.ready;
    const client = await POOL.connect();
    try {
      await this.insertUser(client, user);
      const { rows } = await client.query('SELECT * FROM users WHERE id = $1;', [user.id]);
      return mapUserRow(rows[0], user.experienceAnswers ?? []);
    } finally {
      client.release();
    }
  }

  // --- JOBS ---
  async getJobs(): Promise<Job[]> {
    await this.ready;
    const client = await POOL.connect();
    try {
      const { rows } = await client.query('SELECT * FROM jobs ORDER BY date ASC;');
      const jobIds = rows.map(r => r.id);
      const { rows: historyRows } = await client.query('SELECT job_id, status, note, timestamp FROM job_history WHERE job_id = ANY($1) ORDER BY timestamp ASC;', [jobIds]);
      const grouped = new Map<string, JobHistoryEntry[]>();
      for (const h of historyRows) {
        const arr = grouped.get(h.job_id) ?? [];
        arr.push({ status: h.status, note: h.note ?? undefined, timestamp: h.timestamp?.toISOString?.() ?? new Date().toISOString() });
        grouped.set(h.job_id, arr);
      }
      return rows.map(row => mapJobRow(row, grouped.get(row.id) ?? []));
    } finally {
      client.release();
    }
  }

  async saveJob(job: Job): Promise<Job> {
    await this.ready;
    const client = await POOL.connect();
    try {
      await this.insertJob(client, job);
      const { rows } = await client.query('SELECT * FROM jobs WHERE id = $1;', [job.id]);
      const { rows: historyRows } = await client.query('SELECT job_id, status, note, timestamp FROM job_history WHERE job_id = $1 ORDER BY timestamp ASC;', [job.id]);
      const history = historyRows.map(h => ({ status: h.status, note: h.note ?? undefined, timestamp: h.timestamp?.toISOString?.() ?? new Date().toISOString() }));
      return mapJobRow(rows[0], history);
    } finally {
      client.release();
    }
  }

  async deleteJob(jobId: string): Promise<void> {
    await this.ready;
    const client = await POOL.connect();
    try {
      await client.query('DELETE FROM jobs WHERE id = $1;', [jobId]);
    } finally {
      client.release();
    }
  }

  // --- APPLICATIONS ---
  async getApplications(): Promise<Application[]> {
    await this.ready;
    const client = await POOL.connect();
    try {
      const { rows } = await client.query('SELECT * FROM applications ORDER BY applied_at DESC;');
      return rows.map(mapApplicationRow);
    } finally {
      client.release();
    }
  }

  async saveApplication(app: Application): Promise<Application> {
    await this.ready;
    const client = await POOL.connect();
    try {
      await client.query(
        `INSERT INTO applications (id, job_id, maid_id, status, message, applied_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET
           status=EXCLUDED.status,
           message=EXCLUDED.message,
           updated_at=NOW();`,
        [app.id, app.jobId, app.maidId, app.status, app.message ?? null, app.appliedAt ?? new Date().toISOString(), app.appliedAt ?? new Date().toISOString()],
      );
      const { rows } = await client.query('SELECT * FROM applications WHERE id = $1;', [app.id]);
      return mapApplicationRow(rows[0]);
    } finally {
      client.release();
    }
  }

  // --- MESSAGES ---
  async getMessages(): Promise<Message[]> {
    await this.ready;
    const client = await POOL.connect();
    try {
      const { rows } = await client.query('SELECT * FROM messages ORDER BY timestamp;');
      return rows.map(mapMessageRow);
    } finally {
      client.release();
    }
  }

  async saveMessage(msg: Message): Promise<Message> {
    await this.ready;
    const client = await POOL.connect();
    try {
      await client.query(
        `INSERT INTO messages (id, job_id, sender_id, receiver_id, content, timestamp) VALUES ($1,$2,$3,$4,$5,$6);`,
        [msg.id, msg.jobId, msg.senderId, msg.receiverId, msg.content, msg.timestamp ?? new Date().toISOString()],
      );
      const { rows } = await client.query('SELECT * FROM messages WHERE id = $1;', [msg.id]);
      return mapMessageRow(rows[0]);
    } finally {
      client.release();
    }
  }

  // --- REVIEWS ---
  async getReviews(): Promise<Review[]> {
    await this.ready;
    const client = await POOL.connect();
    try {
      const { rows } = await client.query('SELECT * FROM reviews ORDER BY created_at DESC;');
      return rows.map(mapReviewRow);
    } finally {
      client.release();
    }
  }

  async saveReview(review: Review): Promise<Review> {
    await this.ready;
    const client = await POOL.connect();
    try {
      await client.query(
        `INSERT INTO reviews (id, job_id, reviewer_id, reviewee_id, rating, comment, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7);`,
        [review.id, review.jobId, review.reviewerId, review.revieweeId, review.rating, review.comment ?? null, review.createdAt ?? new Date().toISOString()],
      );
      const { rows } = await client.query('SELECT * FROM reviews WHERE id = $1;', [review.id]);
      return mapReviewRow(rows[0]);
    } finally {
      client.release();
    }
  }

  // --- NOTIFICATIONS ---
  async getNotifications(): Promise<Notification[]> {
    await this.ready;
    const client = await POOL.connect();
    try {
      const { rows } = await client.query('SELECT * FROM notifications ORDER BY timestamp DESC;');
      return rows.map(mapNotificationRow);
    } finally {
      client.release();
    }
  }

  async saveNotification(note: Notification): Promise<Notification> {
    await this.ready;
    const client = await POOL.connect();
    try {
      await client.query(
        `INSERT INTO notifications (id, user_id, message, type, read, timestamp)
         VALUES ($1,$2,$3,$4,$5,$6);`,
        [note.id, note.userId, note.message, note.type, note.read ?? false, note.timestamp ?? new Date().toISOString()],
      );
      const { rows } = await client.query('SELECT * FROM notifications WHERE id = $1;', [note.id]);
      return mapNotificationRow(rows[0]);
    } finally {
      client.release();
    }
  }

  async markNotificationsRead(userId: string): Promise<void> {
    await this.ready;
    const client = await POOL.connect();
    try {
      await client.query('UPDATE notifications SET read = TRUE WHERE user_id = $1;', [userId]);
    } finally {
      client.release();
    }
  }
}

export const db = new DBService();
