import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createDb } from '../src/db/client.js';
import type { TaskRow } from '../src/db/schema.js';
import { env } from '../src/env.js';
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  toTaskResponse,
  updateTaskStatus,
} from '../src/services/taskService.js';
import { migrateTestDb, resetTasks } from './helpers/testDb.js';

const { db, close } = createDb(env.DATABASE_URL);

beforeAll(async () => {
  await migrateTestDb(db);
});

beforeEach(async () => {
  await resetTasks(db);
});

afterAll(async () => {
  await close();
});

describe('taskService', () => {
  it('createTask inserts and returns the row', async () => {
    const task = await createTask(db, {
      title: 'Review case bundle',
      description: 'Check exhibits',
      status: 'IN_PROGRESS',
      dueAt: '2026-11-05T17:00:00Z',
    });

    expect(task.id).toEqual(expect.any(String));
    expect(task.title).toBe('Review case bundle');
    expect(task.description).toBe('Check exhibits');
    expect(task.status).toBe('IN_PROGRESS');
    expect(task.dueAt.toISOString()).toBe('2026-11-05T17:00:00.000Z');
    expect(task.createdAt).toBeInstanceOf(Date);
    expect(task.updatedAt).toBeInstanceOf(Date);
  });

  it('createTask stores a missing description as null', async () => {
    const task = await createTask(db, {
      title: 'No description',
      status: 'TODO',
      dueAt: '2026-11-05T17:00:00Z',
    });

    expect(task.description).toBeNull();
  });

  it('listTasks returns an empty array when there are no tasks', async () => {
    expect(await listTasks(db)).toEqual([]);
  });

  it('listTasks orders by dueAt ascending', async () => {
    await createTask(db, { title: 'Later', status: 'TODO', dueAt: '2026-12-01T09:00:00Z' });
    await createTask(db, { title: 'Soonest', status: 'TODO', dueAt: '2026-11-01T09:00:00Z' });
    await createTask(db, { title: 'Middle', status: 'TODO', dueAt: '2026-11-15T09:00:00Z' });

    const list = await listTasks(db);

    expect(list.map((task) => task.title)).toEqual(['Soonest', 'Middle', 'Later']);
  });

  it('getTask returns the task by id', async () => {
    const created = await createTask(db, {
      title: 'Find me',
      status: 'TODO',
      dueAt: '2026-11-05T17:00:00Z',
    });

    expect(await getTask(db, created.id)).toEqual(created);
  });

  it('getTask returns undefined for a missing id', async () => {
    expect(await getTask(db, randomUUID())).toBeUndefined();
  });

  it('updateTaskStatus changes the status and updatedAt', async () => {
    const created = await createTask(db, {
      title: 'Update me',
      status: 'TODO',
      dueAt: '2026-11-05T17:00:00Z',
    });

    // updatedAt is set by the app, so compare against the app clock, not the db's now().
    const beforeUpdate = new Date();
    const updated = await updateTaskStatus(db, created.id, 'DONE');

    expect(updated?.status).toBe('DONE');
    expect(updated?.title).toBe('Update me');
    expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    expect(await getTask(db, created.id)).toEqual(updated);
  });

  it('updateTaskStatus returns undefined for a missing id', async () => {
    expect(await updateTaskStatus(db, randomUUID(), 'DONE')).toBeUndefined();
  });

  it('deleteTask removes the task and returns true', async () => {
    const created = await createTask(db, {
      title: 'Delete me',
      status: 'TODO',
      dueAt: '2026-11-05T17:00:00Z',
    });

    expect(await deleteTask(db, created.id)).toBe(true);
    expect(await getTask(db, created.id)).toBeUndefined();
  });

  it('deleteTask returns false for a missing id', async () => {
    expect(await deleteTask(db, randomUUID())).toBe(false);
  });

  it('toTaskResponse maps Dates to ISO strings', () => {
    const row: TaskRow = {
      id: '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      title: 'Review case bundle',
      description: null,
      status: 'TODO',
      dueAt: new Date('2026-11-05T17:00:00Z'),
      createdAt: new Date('2026-10-01T08:00:00Z'),
      updatedAt: new Date('2026-10-02T08:00:00Z'),
    };

    expect(toTaskResponse(row)).toEqual({
      id: '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      title: 'Review case bundle',
      description: null,
      status: 'TODO',
      dueAt: '2026-11-05T17:00:00.000Z',
      createdAt: '2026-10-01T08:00:00.000Z',
      updatedAt: '2026-10-02T08:00:00.000Z',
    });
  });
});
