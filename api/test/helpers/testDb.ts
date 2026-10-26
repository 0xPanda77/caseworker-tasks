// Helpers for integration tests that need a real Postgres (DATABASE_URL_TEST).
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

import type { Db } from '../../src/db/client.js';

export async function migrateTestDb(db: Db) {
  await migrate(db, { migrationsFolder: './drizzle' });
}

export async function resetTasks(db: Db) {
  await db.execute(sql`TRUNCATE TABLE tasks`);
}
