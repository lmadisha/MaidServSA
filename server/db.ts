import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';

export const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: (process.env.DB_NAME || 'postgres'),
    user: (process.env.DB_USER || 'postgres'),
    password: (process.env.DB_PASSWORD || 'postgres'),
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

async function testDbConnection() {
  const pool = new Pool({
    // If you have DATABASE_URL set, pg can use that too.
    // If connectionString is undefined, it will just use the individual fields below.
    connectionString: process.env.DATABASE_URL,

    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "postgres",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  });

  try {
    // Simple ping query
    const res = await pool.query("SELECT NOW() AS server_time");
    console.log("✅ DB connected. Server time:", res.rows[0].server_time);
  } catch (err) {
    console.error("❌ DB connection failed:", err);
    process.exitCode = 1;
  } finally {
    await pool.end(); // clean exit for standalone scripts  [oai_citation:0‡Node Postgres](https://node-postgres.com/apis/pool)
  }
}

(async () => {
  await testDbConnection();
})(); 