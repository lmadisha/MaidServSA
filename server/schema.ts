export const POSTGRES_SCHEMA_QUERIES: string[] = [
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
    `CREATE TYPE IF NOT EXISTS user_role AS ENUM ('CLIENT', 'MAID', 'ADMIN');`,
    `CREATE TYPE IF NOT EXISTS job_status AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');`,
    `CREATE TYPE IF NOT EXISTS payment_type AS ENUM ('FIXED', 'HOURLY');`,
    `CREATE TYPE IF NOT EXISTS application_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');`,

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

    `CREATE TABLE IF NOT EXISTS job_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    status job_status NOT NULL,
    note TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
  );`,

    `CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    maid_id UUID REFERENCES users(id),
    status application_status NOT NULL DEFAULT 'PENDING',
    message TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );`,

    `CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    receiver_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
  );`,

    `CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id),
    reviewee_id UUID REFERENCES users(id),
    rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,

    `CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info','success','warning','error')),
    read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ DEFAULT NOW()
  );`,

    `CREATE TABLE IF NOT EXISTS experience_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,

    `CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);`,
    `CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);`,
    `CREATE INDEX IF NOT EXISTS idx_messages_job_id ON messages(job_id);`,
    `CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`,
];