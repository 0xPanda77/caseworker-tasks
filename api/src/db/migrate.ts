// Applies pending SQL migrations from ./drizzle. Run via `pnpm db:migrate`.
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import { env } from '../env.js';

const client = postgres(env.DATABASE_URL, { max: 1 });

try {
  await migrate(drizzle(client), { migrationsFolder: './drizzle' });
  console.log('Migrations applied');
} catch (err) {
  console.error('Migration failed', err);
  process.exitCode = 1;
} finally {
  await client.end();
}
