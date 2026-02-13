import { fileURLToPath } from 'url';
import path from 'path';
import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4, v5 as uuidv5, validate as uuidValidate } from 'uuid';
import type { PoolClient } from 'pg';
import { pool, testDbConnection } from './db';
import { upload, bucketName, bucket } from '../services/googleCloudStorage';
import crypto from 'crypto';
import http from 'http';
import { WebSocketServer } from 'ws';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * If you're using deterministic UUIDs for seeds (like uuid_generate_v5 in SQL),
 * keep this namespace the same one you used there.
 */
const UUID_NAMESPACE = process.env.UUID_NAMESPACE ?? '00000000-0000-0000-0000-000000000000';

const PORT = Number(process.env.PORT ?? 3001);

// --- middleware ---
app.use(
  cors({
    origin: true, // dev-friendly; lock this down for prod
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

// --- helpers ---
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

function toUuid(idOrSlug: string): string {
  if (!idOrSlug) throw new Error('Missing id');
  return uuidValidate(idOrSlug) ? idOrSlug : uuidv5(idOrSlug, UUID_NAMESPACE);
}

function toNumber(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toISODateOnly(v: any): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().split('T')[0];
  // pg often returns DATE as string already
  if (typeof v === 'string') return v.length >= 10 ? v.slice(0, 10) : v;
  return null;
}

function toTrimmedText(v: any): string | null {
  if (v === null || v === undefined) return null;
  const text = String(v).trim();
  return text.length ? text : null;
}

async function withTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// --- mappers (NO password fields) ---
const USER_PUBLIC_SELECT = `
  id, name, email, role, avatar,
  rating, rating_count, bio, location,
  first_name, middle_name, surname,
  date_of_birth, place_of_birth,
  nationality, residency_status, address,
  cv_file_name, created_at, updated_at,
  avatar_file_id, cv_file_id
`;

function mapUser(row: any) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar,
    avatarFileId: row.avatar_file_id ?? null, // Add this
    cvFileId: row.cv_file_id ?? null, // Add this
    rating: toNumber(row.rating) ?? 0,
    ratingCount: row.rating_count ?? 0,
    bio: row.bio ?? null,
    location: row.location ?? null,
    firstName: row.first_name ?? null,
    middleName: row.middle_name ?? null,
    surname: row.surname ?? null,
    dateOfBirth: toISODateOnly(row.date_of_birth),
    placeOfBirth: row.place_of_birth ?? null,
    nationality: row.nationality ?? null,
    residencyStatus: row.residency_status ?? null,
    address: row.address ?? null,
    cvFileName: row.cv_file_name ?? null,
    createdAt: row.created_at?.toISOString?.() ?? null,
    updatedAt: row.updated_at?.toISOString?.() ?? null,
  };
}

const JOB_SELECT = `
  id, client_id, assigned_maid_id,
  title, description, location,
  public_area, full_address, place_id,
  latitude, longitude,
  area_size, price, currency,
  date, status, rooms, bathrooms,
  images, payment_type, start_time, end_time,
  duration, work_dates, created_at, updated_at
`;

async function autoCompleteOverdueJobs(jobId?: string): Promise<void> {
  await withTx(async (client) => {
    const params: any[] = [];
    const where: string[] = ["status = 'IN_PROGRESS'"];
    if (jobId) {
      params.push(jobId);
      where.push(`id = $${params.length}`);
    }

    const { rows } = await client.query(
      `
        SELECT id
        FROM jobs
        WHERE ${where.join(' AND ')}
          AND COALESCE((SELECT MAX(d) FROM unnest(work_dates) AS d), date) < CURRENT_DATE
        FOR UPDATE;
      `,
      params
    );

    for (const row of rows) {
      const updated = await client.query(
        `
          UPDATE jobs
          SET status = 'COMPLETED',
              updated_at = NOW()
          WHERE id = $1
          RETURNING ${JOB_SELECT};
        `,
        [row.id]
      );

      if (updated.rowCount) {
        await client.query(
          `
            INSERT INTO job_history (job_id, status, note, timestamp)
            VALUES ($1, $2, $3, NOW());
          `,
          [row.id, updated.rows[0].status, 'Auto-completed after scheduled end date']
        );
      }
    }
  });
}

type JobViewerContext = {
  viewerId?: string | null;
  viewerRole?: string | null;
};

function canViewPrivateLocation(row: any, viewer?: JobViewerContext): boolean {
  if (!viewer?.viewerId || !viewer?.viewerRole) return false;
  const role = viewer.viewerRole.toUpperCase();
  if (role === 'ADMIN') return true;
  if (role === 'CLIENT') return row.client_id === viewer.viewerId;
  if (role === 'MAID') {
    return row.assigned_maid_id === viewer.viewerId || row.viewer_is_accepted === true;
  }
  return false;
}

function mapJob(row: any, viewer?: JobViewerContext) {
  const includePrivateLocation = canViewPrivateLocation(row, viewer);
  return {
    id: row.id,
    clientId: row.client_id,
    assignedMaidId: row.assigned_maid_id ?? null,
    title: row.title,
    description: row.description ?? '',
    location: row.location ?? '',
    publicArea: row.public_area ?? row.location ?? '',
    fullAddress: includePrivateLocation ? (row.full_address ?? null) : null,
    placeId: includePrivateLocation ? (row.place_id ?? null) : null,
    latitude: includePrivateLocation ? toNumber(row.latitude) : null,
    longitude: includePrivateLocation ? toNumber(row.longitude) : null,
    areaSize: toNumber(row.area_size) ?? 0,
    price: toNumber(row.price) ?? 0,
    currency: row.currency ?? 'R',
    date: toISODateOnly(row.date) ?? '',
    status: row.status,
    rooms: row.rooms ?? 0,
    bathrooms: row.bathrooms ?? 0,
    images: row.images ?? [],
    paymentType: row.payment_type,
    startTime: row.start_time ?? null,
    endTime: row.end_time ?? null,
    duration: row.duration ?? null,
    workDates: row.work_dates ?? [],
    createdAt: row.created_at?.toISOString?.() ?? null,
    updatedAt: row.updated_at?.toISOString?.() ?? null,
  };
}

function mapApplication(row: any) {
  return {
    id: row.id,
    jobId: row.job_id,
    maidId: row.maid_id,
    status: row.status,
    message: row.message ?? '',
    appliedAt: row.applied_at?.toISOString?.() ?? null,
    updatedAt: row.updated_at?.toISOString?.() ?? null,
  };
}

function mapNotification(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    message: row.message,
    type: row.type,
    read: !!row.read,
    timestamp: row.timestamp?.toISOString?.() ?? null,
  };
}

function getJobViewerContext(req: Request): JobViewerContext {
  const viewerIdRaw = String(req.query.viewerId ?? '');
  const viewerRoleRaw = String(req.query.viewerRole ?? '');
  return {
    viewerId: viewerIdRaw ? toUuid(viewerIdRaw) : null,
    viewerRole: viewerRoleRaw ? viewerRoleRaw.toUpperCase() : null,
  };
}

function buildJobQuery(viewer: JobViewerContext, jobId?: string) {
  const params: any[] = [];
  let viewerSelect = 'FALSE as viewer_is_accepted';

  if (viewer.viewerRole === 'MAID' && viewer.viewerId) {
    params.push(viewer.viewerId);
    viewerSelect = `EXISTS (
      SELECT 1
      FROM applications app
      WHERE app.job_id = jobs.id
        AND app.maid_id = $1
        AND app.status = 'ACCEPTED'
    ) as viewer_is_accepted`;
  }

  let where = '';
  if (jobId) {
    params.push(jobId);
    where = `WHERE jobs.id = $${params.length}`;
  }

  return {
    sql: `SELECT ${JOB_SELECT}, ${viewerSelect} FROM jobs ${where}`,
    params,
  };
}

function mapMessageReport(row: any) {
  return {
    id: row.id,
    messageId: row.message_id,
    reporterId: row.reporter_id,
    reason: row.reason ?? '',
    status: row.status ?? 'OPEN',
    createdAt: row.created_at?.toISOString?.() ?? null,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at?.toISOString?.() ?? null,
    resolutionNote: row.resolution_note ?? null,
  };
}

function mapMessage(row: any) {
  return {
    id: row.id,
    jobId: row.job_id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    attachments: row.attachments ?? [],
    editedAt: row.edited_at?.toISOString?.() ?? null,
    deletedAt: row.deleted_at?.toISOString?.() ?? null,
    readAt: row.read_at?.toISOString?.() ?? null,
    timestamp: row.timestamp?.toISOString?.() ?? null,
  };
}

async function getMessagingParticipants(jobId: string) {
  const jobQ = await pool.query(
    `SELECT id, client_id, assigned_maid_id, status
     FROM jobs
     WHERE id = $1 LIMIT 1;`,
    [jobId]
  );

  if (!jobQ.rowCount) {
    return { error: 'NOT_FOUND' as const };
  }

  const { client_id: clientId, assigned_maid_id: maidId, status } = jobQ.rows[0];

  if (!maidId) {
    return { error: 'NOT_READY' as const };
  }
  if (status !== 'IN_PROGRESS') {
    return { error: 'NOT_READY' as const };
  }

  const appQ = await pool.query(
    `SELECT status
     FROM applications
     WHERE job_id = $1
       AND maid_id = $2
     LIMIT 1;`,
    [jobId, maidId]
  );

  if (!appQ.rowCount || appQ.rows[0].status !== 'ACCEPTED') {
    return { error: 'NOT_READY' as const };
  }

  return { clientId, maidId };
}

async function getUserRole(userId: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT role FROM users WHERE id = $1 LIMIT 1;`, [userId]);
  return rows[0]?.role ?? null;
}

async function ensureMessagingSchema() {
  await pool.query(
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;`
  );
  await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_by UUID;`);
  await pool.query(`CREATE TABLE IF NOT EXISTS message_reads (
      message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id),
      read_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (message_id, user_id)
    );`);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);`
  );
  await pool.query(`CREATE TABLE IF NOT EXISTS message_reports (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
      reporter_id UUID REFERENCES users(id),
      reason TEXT,
      status TEXT CHECK (status IN ('OPEN','REVIEWED','RESOLVED')) DEFAULT 'OPEN',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      reviewed_by UUID REFERENCES users(id),
      reviewed_at TIMESTAMPTZ,
      resolution_note TEXT
    );`);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_message_reports_status ON message_reports(status);`
  );
}

async function ensureJobsSchema() {
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS public_area TEXT;`);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS full_address TEXT;`);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS place_id TEXT;`);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,6);`);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,6);`);
}

function normalizeAttachments(input: any): any[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      type: 'file',
      fileId: item.fileId,
    }));
}

async function validateAndNormalizeAttachments(
  attachments: any[],
  senderId: string
): Promise<{
  valid: boolean;
  error?: string;
  attachments?: any[];
}> {
  const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
  const maxSize = 100 * 1024 * 1024;
  const maxCount = 10;

  if (attachments.length > maxCount) {
    return { valid: false, error: `You can attach up to ${maxCount} files.` };
  }

  const fileIds = attachments.map((attachment) => String(attachment.fileId ?? '')).filter(Boolean);
  if (fileIds.length !== attachments.length) {
    return { valid: false, error: 'Each attachment must include a fileId.' };
  }

  const { rows } = await pool.query(
    `
      SELECT id, owner_user_id, original_name, mime_type, size_bytes
      FROM user_files
      WHERE id = ANY($1::uuid[]);
    `,
    [fileIds]
  );

  if (rows.length !== fileIds.length) {
    return { valid: false, error: 'One or more attachments are invalid.' };
  }

  const normalized = [];
  for (const row of rows) {
    if (row.owner_user_id !== senderId) {
      return { valid: false, error: 'Attachments must belong to the sender.' };
    }
    if (!allowedMimeTypes.includes(row.mime_type)) {
      return { valid: false, error: 'Only PDF or image attachments are allowed.' };
    }
    if (Number(row.size_bytes) > maxSize) {
      return { valid: false, error: 'Each file must be 100MB or less.' };
    }
    normalized.push({
      type: 'file',
      fileId: row.id,
      name: row.original_name,
      mimeType: row.mime_type,
      size: Number(row.size_bytes),
    });
  }

  return { valid: true, attachments: normalized };
}

async function resolveAttachmentsWithUrls(attachments: any[]): Promise<any[]> {
  return Promise.all(
    attachments.map(async (attachment) => {
      if (attachment?.type !== 'file' || !attachment.fileId) {
        return attachment;
      }
      const url = await generateSignedUrl(String(attachment.fileId));
      return {
        ...attachment,
        url,
      };
    })
  );
}

// --- health ---
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/**
 * AUTH
 * Minimal: register + login. No JWT/session yet.
 * (You can add JWT later once your UI flow is stable.)
 */
app.post(
  '/api/auth/register',
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    console.log('[API] ' + JSON.stringify(body, null, 2));
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const password = String(body.password ?? '');
    const role = String(body.role ?? 'CLIENT').toUpperCase();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const created = await withTx(async (client) => {
      const existing = await client.query('SELECT id FROM users WHERE email = $1;', [email]);
      if (existing.rowCount) {
        return null;
      }

      const userId = body.id ? toUuid(String(body.id)) : uuidv4();
      const passwordHash = await bcrypt.hash(password, 12);

      const { rows } = await client.query(
        `
          INSERT INTO users (id, name, email, role, avatar,
                             rating, rating_count, bio, location,
                             first_name, middle_name, surname,
                             date_of_birth, place_of_birth, nationality, residency_status, address,
                             cv_file_name, password_hash, password_changed_at)
          VALUES ($1, $2, $3, $4, $5,
                  $6, $7, $8, $9,
                  $10, $11, $12,
                  $13, $14, $15, $16, $17,
                  $18,
                  $19, NOW())
            RETURNING ${USER_PUBLIC_SELECT};
        `,
        [
          userId,
          body.name ?? `${body.firstName ?? ''} ${body.surname ?? ''}`.trim() ?? 'User',
          email,
          role,
          body.avatar ?? null,
          body.rating ?? 0,
          body.ratingCount ?? 0,
          body.bio ?? null,
          body.location ?? null,
          body.firstName ?? null,
          body.middleName ?? null,
          body.surname ?? null,
          body.dateOfBirth ?? null,
          body.placeOfBirth ?? null,
          body.nationality ?? null,
          body.residencyStatus ?? null,
          body.address ?? null,
          body.cvFileName ?? null,
          passwordHash,
        ]
      );

      return mapUser(rows[0]);
    });

    if (!created) {
      return res.status(409).json({ error: 'Email already exists.' });
    }

    res.status(201).json(created);
  })
);

app.post(
  '/api/auth/login',
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `
          SELECT ${USER_PUBLIC_SELECT}, password_hash
          FROM users
          WHERE email = $1 LIMIT 1;
        `,
        [email]
      );

      if (!rows.length) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      const row = rows[0];
      const ok = await bcrypt.compare(password, row.password_hash);
      if (!ok) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      // return safe user only
      return res.json(mapUser(row));
    } finally {
      client.release();
    }
  })
);

// --- USERS ---
app.get(
  '/api/users',
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT ${USER_PUBLIC_SELECT}
       FROM users
       ORDER BY created_at DESC;`
    );
    res.json(rows.map(mapUser));
  })
);

app.get(
  '/api/users/:id',
  asyncHandler(async (req, res) => {
    const id = toUuid(req.params.id);

    // 1. Get the user
    const userResult = await pool.query(
      `SELECT ${USER_PUBLIC_SELECT}
       FROM users
       WHERE id = $1 LIMIT 1;`,
      [id]
    );
    if (!userResult.rows.length) return res.status(404).json({ error: 'User not found' });

    const userRow = userResult.rows[0];

    // 2. Get their experience answers
    const answersResult = await pool.query(
      `SELECT question_id, question, answer FROM experience_answers WHERE user_id = $1`,
      [id]
    );

    // 3. Map it all together
    const user = {
      ...mapUser(userRow),
      experienceAnswers: answersResult.rows.map((r) => ({
        questionId: r.question_id,
        question: r.question,
        answer: r.answer,
      })),
    };

    res.json(user);
  })
);

app.put(
  '/api/users/:id',
  asyncHandler(async (req, res) => {
    const id = toUuid(req.params.id);
    const u = req.body ?? {};

    const updatedUser = await withTx(async (client) => {
      // 1. Update the main users table
      const { rows } = await client.query(
        `
          UPDATE users
          SET name             = COALESCE($2, name),
              avatar           = COALESCE($3, avatar),
              rating           = COALESCE($4, rating),
              rating_count     = COALESCE($5, rating_count),
              bio              = $6,
              location         = $7,
              first_name       = $8,
              middle_name      = $9,
              surname          = $10,
              date_of_birth    = $11,
              place_of_birth   = $12,
              nationality      = $13,
              residency_status = $14,
              address          = $15,
              cv_file_name     = $16,
              updated_at     = NOW(),
              avatar_file_id = $17, -- New Column
              cv_file_id     = $18
          WHERE id = $1
            RETURNING ${USER_PUBLIC_SELECT};
        `,
        [
          id,
          u.name ?? null,
          u.avatar ?? null,
          u.rating ?? null,
          u.ratingCount ?? null,
          u.bio ?? null,
          u.location ?? null,
          u.firstName ?? null,
          u.middleName ?? null,
          u.surname ?? null,
          u.dateOfBirth ?? null,
          u.placeOfBirth ?? null,
          u.nationality ?? null,
          u.residencyStatus ?? null,
          u.address ?? null,
          u.cvFileName ?? null,
          u.avatarFileId ?? null,
          u.cvFileId ?? null,
        ]
      );

      if (!rows.length) return null;

      // 2. Handle Experience Answers (The missing part!)
      if (Array.isArray(u.experienceAnswers)) {
        for (const ans of u.experienceAnswers) {
          await client.query(
            `
              INSERT INTO experience_answers (user_id, question_id, question, answer)
              VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, question_id) 
              DO
              UPDATE SET
                question = EXCLUDED.question,
                answer = EXCLUDED.answer;
            `,
            [id, ans.questionId, ans.question, ans.answer]
          );
        }
      }

      return mapUser(rows[0]);
    });

    if (!updatedUser) return res.status(404).json({ error: 'User not found' });
    res.json(updatedUser);
  })
);

// Optional: change password endpoint (handy for your UI flow)
app.post(
  '/api/users/:id/change-password',
  asyncHandler(async (req, res) => {
    const id = toUuid(req.params.id);
    const { currentPassword, newPassword } = req.body ?? {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required.' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    await withTx(async (client) => {
      const { rows } = await client.query(
        `SELECT password_hash
         FROM users
         WHERE id = $1 FOR UPDATE;`,
        [id]
      );
      if (!rows.length) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const ok = await bcrypt.compare(String(currentPassword), rows[0].password_hash);
      if (!ok) {
        res.status(401).json({ error: 'Invalid current password.' });
        return;
      }

      const nextHash = await bcrypt.hash(String(newPassword), 12);
      await client.query(
        `
          UPDATE users
          SET password_hash             = $2,
              password_changed_at       = NOW(),
              password_reset_token_hash = NULL,
              password_reset_expires_at = NULL,
              updated_at                = NOW()
          WHERE id = $1;
        `,
        [id, nextHash]
      );

      res.json({ ok: true });
    });
  })
);

// --- EXPERIENCE ANSWERS (maids) ---
app.get(
  '/api/users/:userId/experience_answers',
  asyncHandler(async (req, res) => {
    const userId = toUuid(req.params.userId);
    const { rows } = await pool.query(
      `
        SELECT user_id, question_id, question, answer
        FROM experience_answers
        WHERE user_id = $1
        ORDER BY question_id;
      `,
      [userId]
    );
    res.json(
      rows.map((r) => ({
        userId: r.user_id,
        questionId: r.question_id,
        question: r.question,
        answer: r.answer ?? '',
      }))
    );
  })
);

app.put(
  '/api/users/:userId/experience_answers',
  asyncHandler(async (req, res) => {
    const userId = toUuid(req.params.userId);
    const answers = Array.isArray(req.body) ? req.body : [];

    await withTx(async (client) => {
      for (const a of answers) {
        await client.query(
          `
            INSERT INTO experience_answers (user_id, question_id, question, answer)
            VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, question_id)
          DO
            UPDATE SET
              question = EXCLUDED.question,
              answer = EXCLUDED.answer;
          `,
          [userId, a.questionId, a.question, a.answer ?? '']
        );
      }
    });

    res.json({ ok: true });
  })
);

// --- JOBS ---
app.get(
  '/api/jobs',
  asyncHandler(async (_req, res) => {
    await autoCompleteOverdueJobs();
    const viewer = getJobViewerContext(_req);
    const { sql, params } = buildJobQuery(viewer);
    const { rows } = await pool.query(`${sql} ORDER BY created_at DESC;`, params);
    res.json(rows.map((row) => mapJob(row, viewer)));
  })
);

app.get(
  '/api/jobs/:id',
  asyncHandler(async (req, res) => {
    const id = toUuid(req.params.id);
    await autoCompleteOverdueJobs(id);
    const viewer = getJobViewerContext(req);
    const { sql, params } = buildJobQuery(viewer, id);
    const { rows } = await pool.query(`${sql} LIMIT 1;`, params);
    if (!rows.length) return res.status(404).json({ error: 'Job not found' });
    res.json(mapJob(rows[0], viewer));
  })
);

app.get(
  '/api/job_history',
  asyncHandler(async (req, res) => {
    const jobIdRaw = String(req.query.jobId ?? '');
    if (!jobIdRaw) return res.status(400).json({ error: 'jobId is required' });
    const jobId = toUuid(jobIdRaw);

    const { rows } = await pool.query(
      `
        SELECT job_id, status, note, timestamp
        FROM job_history
        WHERE job_id = $1
        ORDER BY timestamp ASC;
      `,
      [jobId]
    );

    res.json(
      rows.map((r) => ({
        jobId: r.job_id,
        status: r.status,
        note: r.note ?? null,
        timestamp: r.timestamp?.toISOString?.() ?? null,
      }))
    );
  })
);

// Create job (and history entry)
app.post(
  '/api/jobs',
  asyncHandler(async (req, res) => {
    const j = req.body ?? {};
    const jobId = j.id ? toUuid(String(j.id)) : uuidv4();
    const clientId = toUuid(String(j.clientId));
    const normalizedPublicArea = toTrimmedText(j.publicArea) ?? toTrimmedText(j.location);
    const normalizedFullAddress =
      toTrimmedText(j.fullAddress) ?? toTrimmedText(j.location) ?? normalizedPublicArea;
    const normalizedPlaceId = toTrimmedText(j.placeId);
    const normalizedLatitude = toNumber(j.latitude);
    const normalizedLongitude = toNumber(j.longitude);

    const created = await withTx(async (client) => {
      const { rows } = await client.query(
        `
          INSERT INTO jobs (id, client_id, assigned_maid_id,
                            title, description, location,
                            public_area, full_address, place_id,
                            latitude, longitude,
                            area_size, price, currency,
                            date, status, rooms, bathrooms,
                            images, payment_type, start_time, end_time,
                            duration, work_dates)
          VALUES ($1, $2, $3,
                  $4, $5, $6,
                  $7, $8, $9,
                  $10, $11,
                  $12, $13, $14,
                  $15, $16, $17, $18,
                  $19, $20, $21, $22,
                  $23, $24)
            RETURNING ${JOB_SELECT};
        `,
        [
          jobId,
          clientId,
          j.assignedMaidId ? toUuid(String(j.assignedMaidId)) : null,
          j.title,
          j.description ?? null,
          normalizedPublicArea,
          normalizedPublicArea,
          normalizedFullAddress,
          normalizedPlaceId,
          normalizedLatitude,
          normalizedLongitude,
          j.areaSize ?? null,
          j.price ?? null,
          j.currency ?? 'R',
          j.date ?? null,
          j.status ?? 'OPEN',
          j.rooms ?? null,
          j.bathrooms ?? null,
          j.images ?? [],
          j.paymentType ?? 'FIXED',
          j.startTime ?? null,
          j.endTime ?? null,
          j.duration ?? null,
          j.workDates ?? [],
        ]
      );

      await client.query(
        `
          INSERT INTO job_history (job_id, status, note, timestamp)
          VALUES ($1, $2, $3, NOW());
        `,
        [jobId, j.status ?? 'OPEN', 'Job posted']
      );

      return mapJob(rows[0], { viewerId: clientId, viewerRole: 'CLIENT' });
    });

    res.status(201).json(created);
  })
);

// Update job (and history entry ONLY if status changes)
app.put(
  '/api/jobs/:id',
  asyncHandler(async (req, res) => {
    const jobId = toUuid(req.params.id);
    const j = req.body ?? {};
    const normalizedPublicArea = toTrimmedText(j.publicArea) ?? toTrimmedText(j.location);
    const normalizedFullAddress =
      toTrimmedText(j.fullAddress) ?? toTrimmedText(j.location) ?? normalizedPublicArea;
    const normalizedPlaceId = toTrimmedText(j.placeId);
    const normalizedLatitude = toNumber(j.latitude);
    const normalizedLongitude = toNumber(j.longitude);

    const result = await withTx<{ job?: any; error?: string } | null>(async (client) => {
      const existing = await client.query(
        `SELECT status
                                           FROM jobs
                                           WHERE id = $1 FOR UPDATE;`,
        [jobId]
      );
      if (!existing.rowCount) return null;

      const prevStatus = existing.rows[0].status;

      // Block update if status is not OPEN
      if (prevStatus !== 'OPEN') {
        return { error: 'LOCKED' };
      }

      const { rows } = await client.query(
        `UPDATE jobs
          SET assigned_maid_id = $2,
              title            = COALESCE($3, title),
              description      = $4,
              location         = COALESCE($5, location),
              public_area      = COALESCE($6, public_area),
              full_address     = COALESCE($7, full_address),
              place_id         = COALESCE($8, place_id),
              latitude         = COALESCE($9, latitude),
              longitude        = COALESCE($10, longitude),
              area_size        = $11,
              price            = $12,
              currency         = COALESCE($13, currency),
              date             = $14,
              status           = COALESCE($15, status),
              rooms            = $16,
              bathrooms        = $17,
              images           = COALESCE($18, images),
              payment_type     = COALESCE($19, payment_type),
              start_time       = $20,
              end_time         = $21,
              duration         = $22,
              work_dates       = COALESCE($23, work_dates),
              updated_at       = NOW()
          WHERE id = $1
           RETURNING ${JOB_SELECT};`,
        [
          jobId,
          j.assignedMaidId ? toUuid(String(j.assignedMaidId)) : null,
          j.title ?? null,
          j.description ?? null,
          normalizedPublicArea,
          normalizedPublicArea,
          normalizedFullAddress,
          normalizedPlaceId,
          normalizedLatitude,
          normalizedLongitude,
          j.areaSize ?? null,
          j.price ?? null,
          j.currency ?? null,
          j.date ?? null,
          j.status ?? null,
          j.rooms ?? null,
          j.bathrooms ?? null,
          j.images ?? null,
          j.paymentType ?? null,
          j.startTime ?? null,
          j.endTime ?? null,
          j.duration ?? null,
          j.workDates ?? null,
        ]
      );

      const updatedRow = rows[0];
      const nextStatus = updatedRow.status;

      if (j.status && j.status !== prevStatus) {
        await client.query(
          `INSERT INTO job_history (job_id, status, note, timestamp)
           VALUES ($1, $2, $3, NOW());`,
          [jobId, nextStatus, `Status changed: ${prevStatus} → ${nextStatus}`]
        );
      }

      return { job: mapJob(updatedRow, { viewerId: updatedRow.client_id, viewerRole: 'CLIENT' }) };
    });

    // Handle results OUTSIDE the transaction block
    if (!result) return res.status(404).json({ error: 'Job not found' });

    if (result.error === 'LOCKED') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This job is already in progress and cannot be edited.',
      });
    }

    res.json(result.job);
  })
);

app.patch(
  '/api/jobs/:id/complete',
  asyncHandler(async (req, res) => {
    const jobId = toUuid(req.params.id);
    const clientIdRaw = String(req.body?.clientId ?? '');
    if (!clientIdRaw) return res.status(400).json({ error: 'clientId is required.' });
    const clientId = toUuid(clientIdRaw);

    const result = await withTx(async (client) => {
      const jobQ = await client.query(
        `SELECT client_id, status
         FROM jobs
         WHERE id = $1 FOR UPDATE;`,
        [jobId]
      );
      if (!jobQ.rowCount) return null;

      if (jobQ.rows[0].client_id !== clientId) {
        return { error: 'FORBIDDEN' as const };
      }

      const status = jobQ.rows[0].status;
      if (status === 'COMPLETED') {
        const { rows } = await client.query(`SELECT ${JOB_SELECT} FROM jobs WHERE id = $1`, [
          jobId,
        ]);
        return { job: mapJob(rows[0], { viewerId: clientId, viewerRole: 'CLIENT' }) };
      }
      if (status !== 'IN_PROGRESS') {
        return { error: 'INVALID_STATUS' as const };
      }

      const { rows } = await client.query(
        `
          UPDATE jobs
          SET status = 'COMPLETED',
              updated_at = NOW()
          WHERE id = $1
          RETURNING ${JOB_SELECT};
        `,
        [jobId]
      );

      await client.query(
        `
          INSERT INTO job_history (job_id, status, note, timestamp)
          VALUES ($1, $2, $3, NOW());
        `,
        [jobId, rows[0].status, 'Client marked job as completed']
      );

      return { job: mapJob(rows[0], { viewerId: clientId, viewerRole: 'CLIENT' }) };
    });

    if (!result) return res.status(404).json({ error: 'Job not found' });
    if (result.error === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Only the client can complete this job.' });
    }
    if (result.error === 'INVALID_STATUS') {
      return res.status(400).json({ error: 'Job is not in progress.' });
    }

    res.json(result.job);
  })
);

// --- APPLICATIONS ---
app.get(
  '/api/applications',
  asyncHandler(async (req, res) => {
    const jobIdRaw = req.query.jobId ? String(req.query.jobId) : '';
    const maidIdRaw = req.query.maidId ? String(req.query.maidId) : '';

    const where: string[] = [];
    const params: any[] = [];

    if (jobIdRaw) {
      params.push(toUuid(jobIdRaw));
      where.push(`job_id = $${params.length}`);
    }
    if (maidIdRaw) {
      params.push(toUuid(maidIdRaw));
      where.push(`maid_id = $${params.length}`);
    }

    const sql = `
      SELECT id, job_id, maid_id, status, message, applied_at, updated_at
      FROM applications ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY applied_at DESC;
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows.map(mapApplication));
  })
);

/**
 * Maid applies → client gets notification
 * (single transaction)
 */
app.post(
  '/api/applications',
  asyncHandler(async (req, res) => {
    const a = req.body ?? {};
    const appId = a.id ? toUuid(String(a.id)) : uuidv4();
    const jobId = toUuid(String(a.jobId));
    const maidId = toUuid(String(a.maidId));
    const message = String(a.message ?? '').trim();

    if (!message) return res.status(400).json({ error: 'Application message is required.' });

    const created = await withTx(async (client) => {
      // validate job exists
      const jobQ = await client.query(
        `SELECT id, client_id, title, status
         FROM jobs
         WHERE id = $1 FOR UPDATE;`,
        [jobId]
      );
      if (!jobQ.rowCount) throw new Error('Job not found');
      if (jobQ.rows[0].status !== 'OPEN') throw new Error('Job is not open');

      // prevent duplicate apply (by maid+job)
      const dup = await client.query(
        `SELECT id
         FROM applications
         WHERE job_id = $1
           AND maid_id = $2 LIMIT 1;`,
        [jobId, maidId]
      );
      if (dup.rowCount) {
        // update message instead of creating a second application
        const { rows } = await client.query(
          `
            UPDATE applications
            SET message = $2,
                updated_at = NOW()
            WHERE id = $1 RETURNING id, job_id, maid_id, status, message, applied_at, updated_at;
          `,
          [dup.rows[0].id, message]
        );
        return { application: mapApplication(rows[0]), created: false };
      }

      const { rows } = await client.query(
        `
          INSERT INTO applications (id, job_id, maid_id, status, message, applied_at, updated_at)
          VALUES ($1, $2, $3, 'PENDING', $4, NOW(),
                  NOW()) RETURNING id, job_id, maid_id, status, message, applied_at, updated_at;
        `,
        [appId, jobId, maidId, message]
      );

      // build notification to client
      const maidQ = await client.query(
        `SELECT name
                                        FROM users
                                        WHERE id = $1 LIMIT 1;`,
        [maidId]
      );
      const maidName = maidQ.rows[0]?.name ?? 'A maid';
      const clientId = jobQ.rows[0].client_id;
      const jobTitle = jobQ.rows[0].title;

      await client.query(
        `
          INSERT INTO notifications (id, user_id, message, type, read, timestamp)
          VALUES ($1, $2, $3, 'info', false, NOW());
        `,
        [uuidv4(), clientId, `New application from ${maidName} for "${jobTitle}"`]
      );

      return { application: mapApplication(rows[0]), created: true };
    });

    res.status(created.created ? 201 : 200).json(created.application);
  })
);

/**
 * Client decision endpoint (THE “accept flow”):
 * One transaction updates:
 * - application status
 * - job assigned maid + job status
 * - job history entry
 * - notifications (accepted maid + auto-rejected others)
 */
app.patch(
  '/api/applications/:id/status',
  asyncHandler(async (req, res) => {
    const applicationId = toUuid(req.params.id);
    const status = String(req.body?.status ?? '').toUpperCase();

    if (!['ACCEPTED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const out = await withTx(async (client) => {
      const appQ = await client.query(
        `
          SELECT id, job_id, maid_id, status
          FROM applications
          WHERE id = $1
            FOR UPDATE;
        `,
        [applicationId]
      );
      if (!appQ.rowCount) return null;

      const appRow = appQ.rows[0];
      const jobId = appRow.job_id;
      const maidId = appRow.maid_id;

      const jobQ = await client.query(
        `SELECT id, client_id, title, status
         FROM jobs
         WHERE id = $1 FOR UPDATE;`,
        [jobId]
      );
      if (!jobQ.rowCount) throw new Error('Job not found');
      const jobTitle = jobQ.rows[0].title;
      const clientId = jobQ.rows[0].client_id;

      // update the chosen application
      const updatedAppQ = await client.query(
        `
          UPDATE applications
          SET status = $2,
              updated_at = NOW()
          WHERE id = $1 RETURNING id, job_id, maid_id, status, message, applied_at, updated_at;
        `,
        [applicationId, status]
      );

      // accept flow: assign maid, set job in progress, write history, notify
      if (status === 'ACCEPTED') {
        // assign maid + flip job status (OPEN -> IN_PROGRESS)
        const updatedJobQ = await client.query(
          `
            UPDATE jobs
            SET assigned_maid_id = $2,
                status           = CASE WHEN status = 'OPEN' THEN 'IN_PROGRESS' ELSE status END,
                updated_at       = NOW()
            WHERE id = $1
              RETURNING ${JOB_SELECT};
          `,
          [jobId, maidId]
        );

        await client.query(
          `
            INSERT INTO job_history (job_id, status, note, timestamp)
            VALUES ($1, $2, $3, NOW());
          `,
          [jobId, updatedJobQ.rows[0].status, 'Maid accepted and assigned']
        );

        // notify accepted maid
        await client.query(
          `
            INSERT INTO notifications (id, user_id, message, type, read, timestamp)
            VALUES ($1, $2, $3, 'success', false, NOW());
          `,
          [uuidv4(), maidId, `✅ You were accepted for "${jobTitle}".`]
        );

        // auto-reject other pending applications + notify them
        const othersQ = await client.query(
          `
            SELECT id, maid_id
            FROM applications
            WHERE job_id = $1
              AND id <> $2
              AND status = 'PENDING'
              FOR UPDATE;
          `,
          [jobId, applicationId]
        );

        if (othersQ.rowCount) {
          await client.query(
            `
              UPDATE applications
              SET status = 'REJECTED',
                  updated_at = NOW()
              WHERE job_id = $1
                AND id <> $2
                AND status = 'PENDING';
            `,
            [jobId, applicationId]
          );

          for (const r of othersQ.rows) {
            await client.query(
              `
                INSERT INTO notifications (id, user_id, message, type, read, timestamp)
                VALUES ($1, $2, $3, 'error', false, NOW());
              `,
              [uuidv4(), r.maid_id, `❌ "${jobTitle}" has been filled.`]
            );
          }
        }

        // (optional) notify client too (they triggered it, but still useful in logs)
        await client.query(
          `
            INSERT INTO notifications (id, user_id, message, type, read, timestamp)
            VALUES ($1, $2, $3, 'info', false, NOW());
          `,
          [uuidv4(), clientId, `You accepted an applicant for "${jobTitle}".`]
        );

        return {
          application: mapApplication(updatedAppQ.rows[0]),
          job: mapJob(updatedJobQ.rows[0], { viewerId: clientId, viewerRole: 'CLIENT' }),
        };
      }

      // reject flow: notify maid
      if (status === 'REJECTED') {
        await client.query(
          `
            INSERT INTO notifications (id, user_id, message, type, read, timestamp)
            VALUES ($1, $2, $3, 'error', false, NOW());
          `,
          [uuidv4(), maidId, `❌ Your application for "${jobTitle}" was rejected.`]
        );
      }

      return {
        application: mapApplication(updatedAppQ.rows[0]),
      };
    });

    if (!out) return res.status(404).json({ error: 'Application not found' });
    res.json(out);
  })
);

app.delete(
  '/api/applications/:id',
  asyncHandler(async (req, res) => {
    const id = toUuid(req.params.id);
    await pool.query(
      `DELETE
                      FROM applications
                      WHERE id = $1;`,
      [id]
    );
    res.json({ ok: true });
  })
);

// --- MESSAGES ---
app.get(
  '/api/messages',
  asyncHandler(async (req, res) => {
    const jobIdRaw = String(req.query.jobId ?? '');
    const userIdRaw = String(req.query.userId ?? '');

    if (!jobIdRaw || !userIdRaw) {
      return res.status(400).json({ error: 'jobId and userId are required.' });
    }

    const jobId = toUuid(jobIdRaw);
    const userId = toUuid(userIdRaw);

    const role = await getUserRole(userId);
    if (role !== 'ADMIN') {
      const participants = await getMessagingParticipants(jobId);
      if ('error' in participants) {
        const status = participants.error === 'NOT_FOUND' ? 404 : 403;
        return res.status(status).json({
          error:
            participants.error === 'NOT_FOUND'
              ? 'Job not found.'
              : 'Messaging is only available while a job is in progress.',
        });
      }

      if (![participants.clientId, participants.maidId].includes(userId)) {
        return res.status(403).json({ error: 'You do not have access to this conversation.' });
      }
    }

    const { rows } = await pool.query(
      `
        SELECT m.id, m.job_id, m.sender_id, m.receiver_id, m.content,
               m.attachments, m.edited_at, m.deleted_at, m.timestamp,
               mr.read_at
        FROM messages m
        LEFT JOIN message_reads mr
          ON mr.message_id = m.id AND mr.user_id = m.receiver_id
        WHERE m.job_id = $1
        ORDER BY m.timestamp ASC;
      `,
      [jobId]
    );

    const messages = await Promise.all(
      rows.map(async (row) => {
        const resolvedAttachments = await resolveAttachmentsWithUrls(row.attachments ?? []);
        return mapMessage({ ...row, attachments: resolvedAttachments });
      })
    );
    res.json(messages);
  })
);

app.post(
  '/api/messages',
  asyncHandler(async (req, res) => {
    const m = req.body ?? {};
    const jobId = toUuid(String(m.jobId ?? ''));
    const senderIdRaw = String(m.senderId ?? '');
    const receiverIdRaw = String(m.receiverId ?? '');
    if (!senderIdRaw || !receiverIdRaw) {
      return res.status(400).json({ error: 'senderId and receiverId are required.' });
    }
    const senderId = toUuid(senderIdRaw);
    const receiverId = toUuid(receiverIdRaw);
    const content = String(m.content ?? '').trim();
    const attachments = normalizeAttachments(m.attachments);

    if (!content && attachments.length === 0) {
      return res.status(400).json({ error: 'Message content or attachments are required.' });
    }
    const attachmentValidation = await validateAndNormalizeAttachments(attachments, senderId);
    if (!attachmentValidation.valid) {
      return res.status(400).json({ error: attachmentValidation.error });
    }

    const participants = await getMessagingParticipants(jobId);
    if ('error' in participants) {
      const status = participants.error === 'NOT_FOUND' ? 404 : 403;
      return res.status(status).json({
        error:
          participants.error === 'NOT_FOUND'
            ? 'Job not found.'
            : 'Messaging is only available while a job is in progress.',
      });
    }

    const allowed = [participants.clientId, participants.maidId];
    if (!allowed.includes(senderId) || !allowed.includes(receiverId) || senderId === receiverId) {
      return res.status(403).json({ error: 'Invalid message participants.' });
    }

    const id = uuidv4();
    const { rows } = await pool.query(
      `
        INSERT INTO messages (id, job_id, sender_id, receiver_id, content, attachments, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, job_id, sender_id, receiver_id, content, attachments, edited_at, deleted_at, timestamp;
      `,
      [
        id,
        jobId,
        senderId,
        receiverId,
        content,
        JSON.stringify(attachmentValidation.attachments ?? []),
      ]
    );

    const resolvedAttachments = await resolveAttachmentsWithUrls(rows[0].attachments ?? []);
    const messageResponse = mapMessage({ ...rows[0], attachments: resolvedAttachments });
    broadcastToJob(jobId, { type: 'message.created', payload: messageResponse });
    res.status(201).json(messageResponse);
  })
);

app.patch(
  '/api/messages/:id',
  asyncHandler(async (req, res) => {
    const messageId = toUuid(req.params.id);
    const content = String(req.body?.content ?? '').trim();
    const senderIdRaw = String(req.body?.senderId ?? '');
    if (!senderIdRaw) return res.status(400).json({ error: 'senderId is required.' });
    const senderId = toUuid(senderIdRaw);
    if (!content) return res.status(400).json({ error: 'Message content is required.' });

    const messageQ = await pool.query(
      `SELECT id, job_id, sender_id, deleted_at
       FROM messages
       WHERE id = $1 LIMIT 1;`,
      [messageId]
    );
    if (!messageQ.rowCount) return res.status(404).json({ error: 'Message not found.' });

    const jobId = messageQ.rows[0].job_id;
    const senderRole = await getUserRole(senderId);
    if (senderRole !== 'ADMIN') {
      const participants = await getMessagingParticipants(jobId);
      if ('error' in participants) {
        const status = participants.error === 'NOT_FOUND' ? 404 : 403;
        return res.status(status).json({
          error:
            participants.error === 'NOT_FOUND'
              ? 'Job not found.'
              : 'Messaging is only available while a job is in progress.',
        });
      }
    }
    if (messageQ.rows[0].sender_id !== senderId && senderRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Only the sender or an admin can edit this message.' });
    }
    if (messageQ.rows[0].deleted_at) {
      return res.status(400).json({ error: 'Deleted messages cannot be edited.' });
    }

    const { rows } = await pool.query(
      `
        UPDATE messages
        SET content = $2,
            edited_at = NOW()
        WHERE id = $1
        RETURNING id, job_id, sender_id, receiver_id, content, attachments, edited_at, deleted_at, timestamp;
      `,
      [messageId, content]
    );

    const message = mapMessage(rows[0]);
    broadcastToJob(message.jobId, { type: 'message.updated', payload: message });
    res.json(message);
  })
);

app.delete(
  '/api/messages/:id',
  asyncHandler(async (req, res) => {
    const messageId = toUuid(req.params.id);
    const senderIdRaw = String(req.body?.senderId ?? '');
    if (!senderIdRaw) return res.status(400).json({ error: 'senderId is required.' });
    const senderId = toUuid(senderIdRaw);
    const messageQ = await pool.query(
      `SELECT id, job_id, sender_id, deleted_at
       FROM messages
       WHERE id = $1 LIMIT 1;`,
      [messageId]
    );
    if (!messageQ.rowCount) return res.status(404).json({ error: 'Message not found.' });

    const jobId = messageQ.rows[0].job_id;
    const senderRole = await getUserRole(senderId);
    if (senderRole !== 'ADMIN') {
      const participants = await getMessagingParticipants(jobId);
      if ('error' in participants) {
        const status = participants.error === 'NOT_FOUND' ? 404 : 403;
        return res.status(status).json({
          error:
            participants.error === 'NOT_FOUND'
              ? 'Job not found.'
              : 'Messaging is only available while a job is in progress.',
        });
      }
    }
    if (messageQ.rows[0].sender_id !== senderId && senderRole !== 'ADMIN') {
      return res
        .status(403)
        .json({ error: 'Only the sender or an admin can delete this message.' });
    }
    if (messageQ.rows[0].deleted_at) {
      return res.status(400).json({ error: 'Message already deleted.' });
    }

    const { rows } = await pool.query(
      `
        UPDATE messages
        SET content = '',
            attachments = '[]'::jsonb,
            deleted_at = NOW(),
            deleted_by = $2
        WHERE id = $1
        RETURNING id, job_id, sender_id, receiver_id, content, attachments, edited_at, deleted_at, timestamp;
      `,
      [messageId, senderId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Message not found.' });
    const message = mapMessage(rows[0]);
    broadcastToJob(message.jobId, { type: 'message.deleted', payload: message });
    res.json(message);
  })
);

app.post(
  '/api/messages/read',
  asyncHandler(async (req, res) => {
    const jobId = toUuid(String(req.body?.jobId ?? ''));
    const userId = toUuid(String(req.body?.userId ?? ''));

    const participants = await getMessagingParticipants(jobId);
    if ('error' in participants) {
      const status = participants.error === 'NOT_FOUND' ? 404 : 403;
      return res.status(status).json({
        error:
          participants.error === 'NOT_FOUND'
            ? 'Job not found.'
            : 'Messaging is only available while a job is in progress.',
      });
    }

    if (![participants.clientId, participants.maidId].includes(userId)) {
      return res.status(403).json({ error: 'You do not have access to this conversation.' });
    }

    const { rows } = await pool.query(
      `
        INSERT INTO message_reads (message_id, user_id, read_at)
        SELECT id, $2, NOW()
        FROM messages
        WHERE job_id = $1
          AND receiver_id = $2
          AND deleted_at IS NULL
        ON CONFLICT (message_id, user_id) DO NOTHING
        RETURNING message_id, read_at;
      `,
      [jobId, userId]
    );

    const readAt = rows[0]?.read_at?.toISOString?.() ?? new Date().toISOString();
    const messageIds = rows.map((r) => r.message_id);

    if (messageIds.length) {
      broadcastToJob(jobId, {
        type: 'message.read',
        payload: { messageIds, readAt, readerId: userId },
      });
    }

    res.json({ messageIds, readAt });
  })
);

app.post(
  '/api/messages/:id/report',
  asyncHandler(async (req, res) => {
    const messageId = toUuid(req.params.id);
    const reporterIdRaw = String(req.body?.reporterId ?? '');
    const reason = String(req.body?.reason ?? '').trim();
    if (!reporterIdRaw) return res.status(400).json({ error: 'reporterId is required.' });
    if (!reason) return res.status(400).json({ error: 'Reason is required.' });
    const reporterId = toUuid(reporterIdRaw);

    const { rows } = await pool.query(
      `SELECT id, job_id
       FROM messages
       WHERE id = $1 LIMIT 1;`,
      [messageId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Message not found.' });

    const participants = await getMessagingParticipants(rows[0].job_id);
    if ('error' in participants) {
      const status = participants.error === 'NOT_FOUND' ? 404 : 403;
      return res.status(status).json({
        error:
          participants.error === 'NOT_FOUND'
            ? 'Job not found.'
            : 'Messaging is only available while a job is in progress.',
      });
    }

    if (![participants.clientId, participants.maidId].includes(reporterId)) {
      return res.status(403).json({ error: 'You do not have access to this conversation.' });
    }

    await pool.query(
      `
        INSERT INTO message_reports (id, message_id, reporter_id, reason, status, created_at)
        VALUES ($1, $2, $3, $4, 'OPEN', NOW());
      `,
      [uuidv4(), messageId, reporterId, reason]
    );

    res.status(201).json({ ok: true });
  })
);

app.get(
  '/api/admin/message-reports',
  asyncHandler(async (req, res) => {
    const adminIdRaw = String(req.query.adminId ?? '');
    if (!adminIdRaw) return res.status(400).json({ error: 'adminId is required.' });
    const adminId = toUuid(adminIdRaw);
    const role = await getUserRole(adminId);
    if (role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required.' });

    const { rows } = await pool.query(
      `
        SELECT id, message_id, reporter_id, reason, status, created_at, reviewed_by, reviewed_at, resolution_note
        FROM message_reports
        ORDER BY created_at DESC;
      `
    );

    res.json(rows.map(mapMessageReport));
  })
);

app.patch(
  '/api/admin/message-reports/:id',
  asyncHandler(async (req, res) => {
    const reportId = toUuid(req.params.id);
    const adminIdRaw = String(req.body?.adminId ?? '');
    const status = String(req.body?.status ?? '').toUpperCase();
    const resolutionNote = String(req.body?.resolutionNote ?? '').trim();
    if (!adminIdRaw) return res.status(400).json({ error: 'adminId is required.' });
    const adminId = toUuid(adminIdRaw);
    const role = await getUserRole(adminId);
    if (role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required.' });
    if (!['OPEN', 'REVIEWED', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const { rows } = await pool.query(
      `
        UPDATE message_reports
        SET status = $2,
            reviewed_by = $3,
            reviewed_at = NOW(),
            resolution_note = $4
        WHERE id = $1
        RETURNING id, message_id, reporter_id, reason, status, created_at, reviewed_by, reviewed_at, resolution_note;
      `,
      [reportId, status, adminId, resolutionNote || null]
    );

    if (!rows.length) return res.status(404).json({ error: 'Report not found.' });
    res.json(mapMessageReport(rows[0]));
  })
);

app.patch(
  '/api/admin/messages/:id/redact',
  asyncHandler(async (req, res) => {
    const messageId = toUuid(req.params.id);
    const adminIdRaw = String(req.body?.adminId ?? '');
    if (!adminIdRaw) return res.status(400).json({ error: 'adminId is required.' });
    const adminId = toUuid(adminIdRaw);
    const role = await getUserRole(adminId);
    if (role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required.' });

    const { rows } = await pool.query(
      `
        UPDATE messages
        SET content = '[redacted]',
            attachments = '[]'::jsonb,
            edited_at = NOW()
        WHERE id = $1
        RETURNING id, job_id, sender_id, receiver_id, content, attachments, edited_at, deleted_at, timestamp;
      `,
      [messageId]
    );

    if (!rows.length) return res.status(404).json({ error: 'Message not found.' });
    const message = mapMessage(rows[0]);
    broadcastToJob(message.jobId, { type: 'message.updated', payload: message });
    res.json(message);
  })
);

// --- NOTIFICATIONS ---
app.get(
  '/api/notifications',
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      `
        SELECT id, user_id, message, type, read, timestamp
        FROM notifications
        ORDER BY timestamp DESC;
      `
    );
    res.json(rows.map(mapNotification));
  })
);

app.post(
  '/api/notifications',
  asyncHandler(async (req, res) => {
    const n = req.body ?? {};
    const id = n.id ? toUuid(String(n.id)) : uuidv4();
    const userId = toUuid(String(n.userId));

    const { rows } = await pool.query(
      `
        INSERT INTO notifications (id, user_id, message, type, read, timestamp)
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW())) RETURNING id, user_id, message, type, read, timestamp;
      `,
      [id, userId, n.message, n.type ?? 'info', !!n.read, n.timestamp ?? null]
    );

    res.status(201).json(mapNotification(rows[0]));
  })
);

app.post(
  '/api/notifications/mark_read',
  asyncHandler(async (req, res) => {
    const userId = toUuid(String(req.body?.userId ?? ''));
    await pool.query(
      `UPDATE notifications
                      SET read = true
                      WHERE user_id = $1 AND read = false;`,
      [userId]
    );
    res.json({ ok: true });
  })
);

/**
 * Mark a single notification as read
 */
app.patch(
  '/api/notifications/:id/read',
  asyncHandler(async (req, res) => {
    const id = toUuid(req.params.id);
    const { rows } = await pool.query(
      `UPDATE notifications
       SET read = true
       WHERE id = $1 RETURNING *;`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Notification not found' });
    res.json(mapNotification(rows[0]));
  })
);

// This is to view user's cv's and information

app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// This is where the user's upload their avatars/profile pictures and the CVs

app.post(
  '/api/files/upload',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const userId = req.body.userId; // Passed from frontend
    const folder = req.body.folder || 'misc'; // 'avatars' or 'cvs'
    const file = req.file;
    const allowedMessageTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    const maxMessageFileSize = 100 * 1024 * 1024;

    if (folder === 'messages') {
      if (!allowedMessageTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: 'Only PDF or image files are allowed.' });
      }
      if (file.size > maxMessageFileSize) {
        return res.status(400).json({ error: 'File size must be 100MB or less.' });
      }
    }

    // Generate a unique filename for GCS
    const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const objectKey = `${folder}/${uuidv4()}_${file.originalname}`;

    // 1. Upload to GCS
    const gcsFile = bucket.file(objectKey);
    await gcsFile.save(file.buffer, {
      contentType: file.mimetype,
      resumable: false,
    });

    // 2. Insert into user_files table
    const fileRecord = await withTx(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO user_files (owner_user_id, original_name, mime_type, size_bytes,
                                 storage_provider, bucket, object_key, checksum_sha256, is_public)
         VALUES ($1, $2, $3, $4, 'gcs', $5, $6, $7, true) RETURNING id, object_key;`,
        [userId, file.originalname, file.mimetype, file.size, bucketName, objectKey, fileHash]
      );
      return rows[0];
    });

    // Construct the public URL (Make sure your bucket/objects are public or use signed URLs)
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectKey}`;

    res.status(201).json({
      id: fileRecord.id,
      url: publicUrl,
    });
  })
);

/**
 * Generates a temporary (1 hour) signed URL for a private file
 */
async function generateSignedUrl(fileId: string): Promise<string | null> {
  try {
    const { rows } = await pool.query(`SELECT object_key FROM user_files WHERE id = $1 LIMIT 1`, [
      toUuid(fileId),
    ]);

    if (!rows.length) return null;

    const [url] = await bucket.file(rows[0].object_key).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour from now
    });

    return url;
  } catch (err) {
    console.error('[GCS] Signed URL Error:', err);
    return null;
  }
}

app.get(
  '/api/files/signed-url/:fileId',
  asyncHandler(async (req, res) => {
    const fileId = req.params.fileId;
    const url = await generateSignedUrl(fileId);

    if (!url) return res.status(404).json({ error: 'File not found' });
    res.json({ url });
  })
);

// --- errors ---
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const msg = err?.message ? String(err.message) : 'Server error';
  // if you want: map known errors to 400/404, etc.
  res.status(500).json({ error: msg });
});

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/api/ws/messages' });
const jobSockets = new Map<string, Set<any>>();

function broadcastToJob(jobId: string, payload: any) {
  const sockets = jobSockets.get(jobId);
  if (!sockets) return;
  const message = JSON.stringify(payload);
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) {
      socket.send(message);
    }
  }
}

wss.on('connection', async (socket, req) => {
  try {
    const url = new URL(req.url ?? '', `http://${req.headers.host}`);
    const jobIdRaw = String(url.searchParams.get('jobId') ?? '');
    const userIdRaw = String(url.searchParams.get('userId') ?? '');
    if (!jobIdRaw || !userIdRaw) {
      socket.close(1008, 'Missing jobId/userId');
      return;
    }

    const jobId = toUuid(jobIdRaw);
    const userId = toUuid(userIdRaw);
    const role = await getUserRole(userId);
    if (role !== 'ADMIN') {
      const participants = await getMessagingParticipants(jobId);
      if ('error' in participants) {
        socket.close(1008, 'Messaging not available');
        return;
      }

      if (![participants.clientId, participants.maidId].includes(userId)) {
        socket.close(1008, 'Unauthorized');
        return;
      }
    }

    socket.jobId = jobId;
    socket.userId = userId;

    if (!jobSockets.has(jobId)) {
      jobSockets.set(jobId, new Set());
    }
    jobSockets.get(jobId)?.add(socket);

    socket.on('message', (data) => {
      try {
        const payload = JSON.parse(data.toString());
        if (payload?.type === 'typing') {
          broadcastToJob(jobId, {
            type: 'typing',
            payload: {
              userId,
              isTyping: !!payload.payload?.isTyping,
            },
          });
        }
      } catch (err) {
        console.error('WS message error', err);
      }
    });

    socket.on('close', () => {
      jobSockets.get(jobId)?.delete(socket);
    });
  } catch (err) {
    console.error('WS connection error', err);
    socket.close(1011, 'Server error');
  }
});

Promise.all([ensureMessagingSchema(), ensureJobsSchema()]).catch((err) => {
  console.error('Failed to ensure DB schema', err);
});

server.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
