import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool(config.db);

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client', err);
  process.exit(1);
});

export const query = <T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: readonly unknown[],
) => pool.query<T>(text, params as unknown[] | undefined);

export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
