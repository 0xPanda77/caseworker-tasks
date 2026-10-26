import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

export const taskStatus = pgEnum('task_status', TASK_STATUSES);

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  status: taskStatus('status').notNull().default('TODO'),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // Drizzle sets this on every update it runs. It is app-side, so raw SQL updates won't change it.
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
