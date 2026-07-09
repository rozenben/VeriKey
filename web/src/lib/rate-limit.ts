import pool from '@/lib/db';

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const windowSec = Math.ceil(windowMs / 1000);
  const result = await pool.query(
    `INSERT INTO rate_limit_buckets (bucket_key, count, reset_at)
     VALUES ($1, 1, NOW() + ($2 * INTERVAL '1 second'))
     ON CONFLICT (bucket_key) DO UPDATE
       SET count = CASE
             WHEN rate_limit_buckets.reset_at <= NOW() THEN 1
             ELSE rate_limit_buckets.count + 1
           END,
           reset_at = CASE
             WHEN rate_limit_buckets.reset_at <= NOW() THEN NOW() + ($2 * INTERVAL '1 second')
             ELSE rate_limit_buckets.reset_at
           END
     RETURNING count`,
    [key, windowSec]
  );
  return result.rows[0].count <= limit;
}
