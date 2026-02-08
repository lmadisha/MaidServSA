export const POSTGRES_SCHEMA_QUERIES: string[] = [
  // Extensions
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`,

  // Enums
  `CREATE TYPE IF NOT EXISTS user_role AS ENUM ('CLIENT', 'MAID', 'ADMIN');`,
  `CREATE TYPE IF NOT EXISTS job_status AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');`,
  `CREATE TYPE IF NOT EXISTS payment_type AS ENUM ('FIXED', 'HOURLY');`,
  `CREATE TYPE IF NOT EXISTS application_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');`,

  // updated_at trigger helper (for user_files)
  `
  CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$;
  `,

  // -----------------------
  // Core Tables
  // -----------------------
  `CREATE TABLE IF NOT EXISTS users
  (
    id
    UUID
    PRIMARY
    KEY
    DEFAULT
    uuid_generate_v4
   (
   ),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,

    -- NOTE: matches current DB export (password_hash is nullable there)
    password_hash TEXT,
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
    updated_at TIMESTAMPTZ DEFAULT NOW
   (
   ),
    password_changed_at TIMESTAMPTZ,
    password_reset_token_hash TEXT,
    password_reset_expires_at TIMESTAMPTZ
    );`,

  // user_files (for avatars/cvs/etc.)
  // NOTE: matches current DB export (owner_user_id has NO FK there)
  `CREATE TABLE IF NOT EXISTS user_files
  (
    id
    UUID
    PRIMARY
    KEY
    DEFAULT
    gen_random_uuid
   (
   ),
    owner_user_id UUID NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK
   (
     size_bytes
     >=
     0
   ),
    storage_provider TEXT NOT NULL DEFAULT 'gcs',
    bucket TEXT NOT NULL,
    object_key TEXT NOT NULL,
    checksum_sha256 TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'active'
    CHECK
   (
     status
     IN
   (
     'active',
     'deleted',
     'quarantined'
   )),
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
   (
   ),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
   (
   ),
    CONSTRAINT uq_user_files_storage UNIQUE
   (
     storage_provider,
     bucket,
     object_key
   )
    );`,

  // Add these columns to users if missing (for FK linking)
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='users' AND column_name='avatar_file_id'
    ) THEN
      ALTER TABLE public.users ADD COLUMN avatar_file_id UUID;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='users' AND column_name='cv_file_id'
    ) THEN
      ALTER TABLE public.users ADD COLUMN cv_file_id UUID;
    END IF;
  END $$;
  `,

  // Add FKs to users (idempotent)
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_avatar_file'
    ) THEN
      ALTER TABLE public.users
        ADD CONSTRAINT fk_users_avatar_file
        FOREIGN KEY (avatar_file_id) REFERENCES public.user_files(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_cv_file'
    ) THEN
      ALTER TABLE public.users
        ADD CONSTRAINT fk_users_cv_file
        FOREIGN KEY (cv_file_id) REFERENCES public.user_files(id) ON DELETE SET NULL;
    END IF;
  END $$;
  `,

  // Trigger for user_files updated_at (safe rerun)
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_files_updated_at'
    ) THEN
      CREATE TRIGGER trg_user_files_updated_at
      BEFORE UPDATE ON public.user_files
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    END IF;
  END $$;
  `,

  `CREATE TABLE IF NOT EXISTS jobs
  (
    id
    UUID
    PRIMARY
    KEY
    DEFAULT
    uuid_generate_v4
   (
   ),
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

  `CREATE TABLE IF NOT EXISTS job_history
  (
    id
    UUID
    PRIMARY
    KEY
    DEFAULT
    uuid_generate_v4
   (
   ),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    status job_status NOT NULL,
    note TEXT,
    "timestamp" TIMESTAMPTZ DEFAULT NOW
   (
   )
    );`,

  `CREATE TABLE IF NOT EXISTS applications
  (
    id
    UUID
    PRIMARY
    KEY
    DEFAULT
    uuid_generate_v4
   (
   ),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    maid_id UUID REFERENCES users(id),
    status application_status NOT NULL DEFAULT 'PENDING',
    message TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,

  // -----------------------
  // Messaging
  // -----------------------
  `CREATE TABLE IF NOT EXISTS messages
  (
    id
    UUID
    PRIMARY
    KEY
    DEFAULT
    uuid_generate_v4
   (
   ),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    receiver_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ DEFAULT NOW
   (
   ),
    attachments JSONB DEFAULT '[]'::jsonb,
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,

    -- NOTE: matches current DB export (column exists, but NO FK constraint)
    deleted_by UUID
    );`,

  // If table already existed (old shape), add the missing columns safely
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='messages' AND column_name='attachments'
    ) THEN
      ALTER TABLE public.messages ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='messages' AND column_name='edited_at'
    ) THEN
      ALTER TABLE public.messages ADD COLUMN edited_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='messages' AND column_name='deleted_at'
    ) THEN
      ALTER TABLE public.messages ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='messages' AND column_name='deleted_by'
    ) THEN
      ALTER TABLE public.messages ADD COLUMN deleted_by UUID;
    END IF;
  END $$;
  `,

  `CREATE TABLE IF NOT EXISTS message_reads
  (
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
  );`,

  // -----------------------
  // Reviews + Notifications + Experience Answers
  // -----------------------
  `CREATE TABLE IF NOT EXISTS reviews
  (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id),
    reviewee_id UUID REFERENCES users(id),
    rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  `CREATE TABLE IF NOT EXISTS notifications
  (
    id
    UUID
    PRIMARY
    KEY
    DEFAULT
    uuid_generate_v4
   (
   ),
    user_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info','success','warning','error')),
    read BOOLEAN DEFAULT FALSE,
    "timestamp" TIMESTAMPTZ DEFAULT NOW
   (
   )
    );`,

  `CREATE TABLE IF NOT EXISTS experience_answers
  (
    id
    UUID
    PRIMARY
    KEY
    DEFAULT
    uuid_generate_v4
   (
   ),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
    );`,

  // Unique rule for experience_answers (idempotent)
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_question'
    ) THEN
      ALTER TABLE public.experience_answers
        ADD CONSTRAINT unique_user_question UNIQUE (user_id, question_id);
    END IF;
  END $$;
  `,

  // -----------------------
  // Indexes (synced to DB export)
  // -----------------------
  `CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);`,
  `CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);`,
  `CREATE INDEX IF NOT EXISTS idx_messages_job_id ON messages(job_id);`,
  `CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`,

  `CREATE INDEX IF NOT EXISTS idx_user_files_checksum ON user_files(checksum_sha256);`,
  `CREATE INDEX IF NOT EXISTS idx_user_files_mime_type ON user_files(mime_type);`,
  `CREATE INDEX IF NOT EXISTS idx_user_files_owner_created ON user_files(owner_user_id, created_at DESC);`,
];