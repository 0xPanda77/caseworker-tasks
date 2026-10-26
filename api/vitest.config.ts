import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Test files share one tasks table and truncate it, so run them one at a time.
    fileParallelism: false,
    include: ['test/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      // Integration tests use a separate database so they never touch dev data.
      DATABASE_URL:
        process.env.DATABASE_URL_TEST ?? 'postgres://postgres:postgres@localhost:5432/tasks_test',
    },
  },
});
