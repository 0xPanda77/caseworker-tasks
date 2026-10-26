// Task business logic. Takes the db as a parameter so it can be tested against a test database.
import { asc, eq } from 'drizzle-orm';

import type { Db } from '../db/client.js';
import { tasks, type TaskRow } from '../db/schema.js';
import type { CreateTaskInput, TaskResponse } from '../schemas/task.js';

export type TaskStatus = TaskRow['status'];

export async function createTask(db: Db, input: CreateTaskInput): Promise<TaskRow> {
  const [task] = await db
    .insert(tasks)
    .values({
      title: input.title,
      description: input.description,
      status: input.status,
      dueAt: new Date(input.dueAt),
    })
    .returning();

  // An insert with RETURNING always gives back one row; this narrows the type.
  if (!task) {
    throw new Error('Insert did not return a task');
  }
  return task;
}

// Soonest due first. createdAt then id break ties so the order is stable.
export async function listTasks(db: Db): Promise<TaskRow[]> {
  return db.select().from(tasks).orderBy(asc(tasks.dueAt), asc(tasks.createdAt), asc(tasks.id));
}

export async function getTask(db: Db, id: string): Promise<TaskRow | undefined> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
  return task;
}

export async function updateTaskStatus(
  db: Db,
  id: string,
  status: TaskStatus,
): Promise<TaskRow | undefined> {
  const [task] = await db
    .update(tasks)
    .set({ status, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  return task;
}

export async function deleteTask(db: Db, id: string): Promise<boolean> {
  const deleted = await db.delete(tasks).where(eq(tasks.id, id)).returning({ id: tasks.id });
  return deleted.length > 0;
}

export function toTaskResponse(row: TaskRow): TaskResponse {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    dueAt: row.dueAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
