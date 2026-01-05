import { Pool } from 'pg';

// Optional debug logs (safe)
console.log('[DB] DB_USER=', process.env.DB_USER);
console.log('[DB] DB_HOST=', process.env.DB_HOST);
console.log('[DB] DB_NAME=', process.env.DB_NAME);
console.log('[DB] DATABASE_URL exists?', Boolean(process.env.DATABASE_URL));

if (process.env.DATABASE_URL) {
  try {
    const u = new URL(process.env.DATABASE_URL);
    console.log('[DB] DATABASE_URL user=', u.username);
    console.log('[DB] DATABASE_URL host=', u.hostname);
    console.log('[DB] DATABASE_URL port=', u.port || '(default)');
    console.log('[DB] DATABASE_URL db=', u.pathname);
  } catch {
    console.log('[DB] DATABASE_URL is not a valid URL string');
  }
}

// ✅ ONE pool for the whole API
export const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString:
          process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres',
      }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 5432),
        database: process.env.DB_NAME ?? 'postgres',
        user: process.env.DB_USER ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
      }
);

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err);
  // Don’t hard-exit here unless you REALLY want the whole API to die
});

// ✅ Use this in server startup or a /healthz route
export async function testDbConnection(): Promise<void> {
  const res = await pool.query('SELECT NOW() AS server_time');
  console.log('✅ DB connected. Server time:', res.rows[0].server_time);
}
