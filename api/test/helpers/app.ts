import { createApp } from '../../src/app.js';
import { createDb } from '../../src/db/client.js';
import { env } from '../../src/env.js';

// No query runs until a handler touches the db, so this is safe for tests without Postgres.
export function buildTestApp() {
  const handle = createDb(env.DATABASE_URL);
  return { app: createApp({ db: handle.db, logRequests: false }), ...handle };
}
