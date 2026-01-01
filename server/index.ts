import express from 'express';
import cors from 'cors';
import { pool } from './db';

const PORT = Number(process.env.PORT || 3001);

const app = express();
app.use(cors());
app.use(express.json());

// Small helper so async route errors always reach the error middleware
const asyncHandler =
  (fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>) =>
  (req: express.Request, res: express.Response, next: express.NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Basic DB + API health check (useful for Docker / deploys)
app.get(
  '/healthz',
  asyncHandler(async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  }),
);


// --- USERS ---
app.get('/api/users', asyncHandler(async (_req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT * FROM users ORDER BY created_at DESC;');
    const userIds = rows.map(r => r.id);
    const { rows: expRows } = userIds.length
      ? await client.query(
          'SELECT user_id, question_id, question, answer FROM experience_answers WHERE user_id = ANY($1);',
          [userIds],
        )
      : { rows: [] as any[] };

    const grouped = new Map<string, Array<{ questionId: string; question: string; answer: string }>>();
    for (const exp of expRows) {
      const arr = grouped.get(exp.user_id) ?? [];
      arr.push({ questionId: exp.question_id, question: exp.question, answer: exp.answer });
      grouped.set(exp.user_id, arr);
    }

    res.json(
      rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
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
        experienceAnswers: grouped.get(row.id) ?? [],
      })),
    );
  } finally {
    client.release();
  }
}));

app.put('/api/users/:id', asyncHandler(async (req, res) => {
  const user = req.body;
  const client = await pool.connect();
  await client.query('BEGIN');
  try {
    try {
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

      const { rows } = await client.query('SELECT * FROM users WHERE id = $1;', [user.id]);
      res.json({ id: rows[0].id, ...user });
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}));

// --- JOBS ---
app.get('/api/jobs', asyncHandler(async (_req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT * FROM jobs ORDER BY date ASC;');
    const jobIds = rows.map(r => r.id);
    const { rows: historyRows } = jobIds.length
      ? await client.query(
          'SELECT job_id, status, note, timestamp FROM job_history WHERE job_id = ANY($1) ORDER BY timestamp ASC;',
          [jobIds],
        )
      : { rows: [] as any[] };

    const grouped = new Map<string, Array<{ status: string; note?: string; timestamp: string }>>();
    for (const h of historyRows) {
      const arr = grouped.get(h.job_id) ?? [];
      arr.push({ status: h.status, note: h.note ?? undefined, timestamp: h.timestamp?.toISOString?.() ?? new Date().toISOString() });
      grouped.set(h.job_id, arr);
    }

    res.json(
      rows.map(row => ({
        id: row.id,
        clientId: row.client_id,
        title: row.title,
        description: row.description ?? '',
        location: row.location ?? '',
        areaSize: Number(row.area_size ?? 0),
        price: Number(row.price ?? 0),
        currency: row.currency ?? 'R',
        date: row.date ? new Date(row.date).toISOString().split('T')[0] : '',
        status: row.status,
        rooms: Number(row.rooms ?? 0),
        bathrooms: Number(row.bathrooms ?? 0),
        images: row.images ?? [],
        assignedMaidId: row.assigned_maid_id ?? undefined,
        paymentType: row.payment_type,
        startTime: row.start_time ?? '',
        endTime: row.end_time ?? '',
        duration: Number(row.duration ?? 0),
        workDates: row.work_dates?.map((d: Date) => new Date(d).toISOString().split('T')[0]) ?? [],
        history: grouped.get(row.id) ?? [],
      })),
    );
  } finally {
    client.release();
  }
}));

app.put('/api/jobs/:id', asyncHandler(async (req, res) => {
  const job = req.body;
  const client = await pool.connect();
  await client.query('BEGIN');
  try {
    try {
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
          job.status,
          job.rooms ?? null,
          job.bathrooms ?? null,
          job.images ?? [],
          job.paymentType,
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

      res.json(job);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}));

app.delete('/api/jobs/:id', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM jobs WHERE id = $1;', [req.params.id]);
    res.json({ ok: true });
  } finally {
    client.release();
  }
}));

// --- APPLICATIONS ---
app.get('/api/applications', asyncHandler(async (_req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT * FROM applications ORDER BY applied_at DESC;');
    res.json(
      rows.map(row => ({
        id: row.id,
        jobId: row.job_id,
        maidId: row.maid_id,
        status: row.status,
        message: row.message ?? '',
        appliedAt: row.applied_at?.toISOString?.() ?? new Date().toISOString(),
      })),
    );
  } finally {
    client.release();
  }
}));

app.put('/api/applications/:id', asyncHandler(async (req, res) => {
  const appBody = req.body;
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO applications (id, job_id, maid_id, status, message, applied_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET
         status=EXCLUDED.status,
         message=EXCLUDED.message,
         updated_at=NOW();`,
      [
        appBody.id,
        appBody.jobId,
        appBody.maidId,
        appBody.status,
        appBody.message ?? null,
        appBody.appliedAt ?? new Date().toISOString(),
        new Date().toISOString(),
      ],
    );
    res.json(appBody);
  } finally {
    client.release();
  }
}));

// --- NOTIFICATIONS ---
app.get('/api/notifications', asyncHandler(async (_req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT * FROM notifications ORDER BY timestamp DESC;');
    res.json(
      rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        message: row.message,
        type: row.type,
        read: row.read,
        timestamp: row.timestamp?.toISOString?.() ?? new Date().toISOString(),
      })),
    );
  } finally {
    client.release();
  }
}));

app.put('/api/notifications/:id', asyncHandler(async (req, res) => {
  const note = req.body;
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO notifications (id, user_id, message, type, read, timestamp)
       VALUES ($1,$2,$3,$4,$5,$6);`,
      [note.id, note.userId, note.message, note.type, note.read ?? false, note.timestamp ?? new Date().toISOString()],
    );
    res.json(note);
  } finally {
    client.release();
  }
}));

app.post('/api/notifications/mark-read', asyncHandler(async (req, res) => {
  const { userId } = req.body ?? {};
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const client = await pool.connect();
  try {
    await client.query('UPDATE notifications SET read = TRUE WHERE user_id = $1;', [userId]);
    res.json({ ok: true });
  } finally {
    client.release();
  }
}));

// Global error handler (must be after routes)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});


const server = app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

const shutdown = async (signal: string) => {
  console.log(`\n${signal} received: shutting down...`);
  try {
    await new Promise<void>((resolve, reject) => {
      server.close(err => (err ? reject(err) : resolve()));
    });
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Shutdown error', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
