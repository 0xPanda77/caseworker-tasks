// Endpoint integration tests: real app, real test database, requests via app.request().
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTestApp } from './helpers/app.js';
import { migrateTestDb, resetTasks } from './helpers/testDb.js';

const { app, db, close } = buildTestApp();

const validTask = {
  title: 'Review case bundle',
  description: 'Check exhibits before the hearing',
  status: 'IN_PROGRESS',
  dueAt: '2026-11-05T17:00:00Z',
};

function sendJson(method: string, path: string, body: unknown) {
  return app.request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function createTask(overrides: Record<string, unknown> = {}) {
  const res = await sendJson('POST', '/tasks', { ...validTask, ...overrides });
  expect(res.status).toBe(201);
  return (await res.json()) as { id: string; status: string; updatedAt: string };
}

// Checks the RFC 9457 shape and returns the body for further assertions.
async function expectProblem(res: Response, status: number) {
  expect(res.status).toBe(status);
  expect(res.headers.get('content-type')).toContain('application/problem+json');
  const body = (await res.json()) as {
    type: string;
    title: string;
    status: number;
    detail?: string;
    instance?: string;
    errors?: { field: string; message: string }[];
  };
  expect(body).toMatchObject({ type: 'about:blank', status });
  return body;
}

function fieldsWithErrors(body: { errors?: { field: string }[] }) {
  return body.errors?.map((error) => error.field);
}

beforeAll(async () => {
  await migrateTestDb(db);
});

beforeEach(async () => {
  await resetTasks(db);
});

afterAll(async () => {
  await close();
});

describe('POST /tasks', () => {
  it('creates a task and returns 201 with the task', async () => {
    const res = await sendJson('POST', '/tasks', validTask);

    expect(res.status).toBe(201);
    expect(res.headers.get('content-type')).toContain('application/json');
    const task = (await res.json()) as { id: string };
    expect(task).toEqual({
      id: expect.any(String),
      title: 'Review case bundle',
      description: 'Check exhibits before the hearing',
      status: 'IN_PROGRESS',
      dueAt: '2026-11-05T17:00:00.000Z',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(res.headers.get('location')).toBe(`/tasks/${task.id}`);
  });

  it('defaults status to TODO when omitted', async () => {
    const task = await createTask({ status: undefined });

    expect(task.status).toBe('TODO');
  });

  it('accepts a task without a description', async () => {
    const res = await sendJson('POST', '/tasks', {
      title: 'No description',
      dueAt: validTask.dueAt,
    });

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ description: null });
  });

  it('returns 400 with per-field errors when title is missing', async () => {
    const res = await sendJson('POST', '/tasks', { dueAt: validTask.dueAt });

    const body = await expectProblem(res, 400);
    expect(body).toMatchObject({
      title: 'Bad Request',
      detail: 'Request validation failed',
      instance: '/tasks',
    });
    expect(fieldsWithErrors(body)).toEqual(['title']);
    expect(body.errors?.[0]?.message).toEqual(expect.any(String));
  });

  it('returns 400 when title is blank after trimming', async () => {
    const body = await expectProblem(
      await sendJson('POST', '/tasks', { ...validTask, title: '   ' }),
      400,
    );

    expect(fieldsWithErrors(body)).toEqual(['title']);
  });

  it('returns 400 when title is longer than 200 chars', async () => {
    const res = await sendJson('POST', '/tasks', { ...validTask, title: 'a'.repeat(201) });

    expect(fieldsWithErrors(await expectProblem(res, 400))).toEqual(['title']);
  });

  it('returns 400 when description is longer than 2000 chars', async () => {
    const res = await sendJson('POST', '/tasks', { ...validTask, description: 'a'.repeat(2001) });

    expect(fieldsWithErrors(await expectProblem(res, 400))).toEqual(['description']);
  });

  it('returns 400 when dueAt is not a valid ISO date-time', async () => {
    const res = await sendJson('POST', '/tasks', { ...validTask, dueAt: 'next Tuesday' });

    expect(fieldsWithErrors(await expectProblem(res, 400))).toEqual(['dueAt']);
  });

  it('returns 400 when status is not a known value', async () => {
    const res = await sendJson('POST', '/tasks', { ...validTask, status: 'ARCHIVED' });

    expect(fieldsWithErrors(await expectProblem(res, 400))).toEqual(['status']);
  });

  it('returns 400 naming each unknown field', async () => {
    const res = await sendJson('POST', '/tasks', { ...validTask, priority: 'high', owner: 'me' });

    const body = await expectProblem(res, 400);
    expect(body.errors).toEqual([
      { field: 'priority', message: 'Unknown field' },
      { field: 'owner', message: 'Unknown field' },
    ]);
  });

  it('reports unknown fields alongside other field errors', async () => {
    const res = await sendJson('POST', '/tasks', { dueAt: validTask.dueAt, priority: 'high' });

    expect(fieldsWithErrors(await expectProblem(res, 400))).toEqual(
      expect.arrayContaining(['title', 'priority']),
    );
  });

  it('returns 400 when the body is not valid JSON', async () => {
    const res = await app.request('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ not json',
    });

    await expectProblem(res, 400);
  });

  it('does not store anything when validation fails', async () => {
    await sendJson('POST', '/tasks', { dueAt: validTask.dueAt });

    expect(await (await app.request('/tasks')).json()).toEqual([]);
  });
});

describe('GET /tasks', () => {
  it('returns 200 with an empty array when there are no tasks', async () => {
    const res = await app.request('/tasks');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns all tasks sorted by due date ascending', async () => {
    await createTask({ title: 'Later', dueAt: '2026-12-01T09:00:00Z' });
    await createTask({ title: 'Soonest', dueAt: '2026-11-01T09:00:00Z' });
    await createTask({ title: 'Middle', dueAt: '2026-11-15T09:00:00Z' });

    const res = await app.request('/tasks');

    expect(res.status).toBe(200);
    const tasks = (await res.json()) as { title: string }[];
    expect(tasks.map((task) => task.title)).toEqual(['Soonest', 'Middle', 'Later']);
  });
});

describe('GET /tasks/:id', () => {
  it('returns 200 with the task', async () => {
    const created = await createTask();

    const res = await app.request(`/tasks/${created.id}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(created);
  });

  it('returns 404 problem when the task does not exist', async () => {
    const id = randomUUID();

    const body = await expectProblem(await app.request(`/tasks/${id}`), 404);

    expect(body).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: `Task ${id} not found`,
      instance: `/tasks/${id}`,
    });
  });

  it('returns 400 when the id is not a uuid', async () => {
    const body = await expectProblem(await app.request('/tasks/not-a-uuid'), 400);

    expect(fieldsWithErrors(body)).toEqual(['id']);
  });
});

describe('PATCH /tasks/:id/status', () => {
  it('updates the status and returns 200 with the task', async () => {
    const created = await createTask({ status: 'TODO' });

    const res = await sendJson('PATCH', `/tasks/${created.id}/status`, { status: 'DONE' });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: created.id, status: 'DONE' });
    expect(await (await app.request(`/tasks/${created.id}`)).json()).toMatchObject({
      status: 'DONE',
    });
  });

  it('updates updatedAt', async () => {
    const created = await createTask();

    const res = await sendJson('PATCH', `/tasks/${created.id}/status`, { status: 'DONE' });

    const updated = (await res.json()) as { updatedAt: string };
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(created.updatedAt));
  });

  it('returns 400 when status is invalid', async () => {
    const created = await createTask();

    const res = await sendJson('PATCH', `/tasks/${created.id}/status`, { status: 'ARCHIVED' });

    expect(fieldsWithErrors(await expectProblem(res, 400))).toEqual(['status']);
  });

  it('returns 400 when fields other than status are sent', async () => {
    const created = await createTask();

    const res = await sendJson('PATCH', `/tasks/${created.id}/status`, {
      status: 'DONE',
      title: 'Renamed',
    });

    expect((await expectProblem(res, 400)).errors).toEqual([
      { field: 'title', message: 'Unknown field' },
    ]);
  });

  it('returns 400 when the id is not a uuid', async () => {
    const res = await sendJson('PATCH', '/tasks/not-a-uuid/status', { status: 'DONE' });

    expect(fieldsWithErrors(await expectProblem(res, 400))).toEqual(['id']);
  });

  it('returns 404 problem when the task does not exist', async () => {
    const res = await sendJson('PATCH', `/tasks/${randomUUID()}/status`, { status: 'DONE' });

    expect(await expectProblem(res, 404)).toMatchObject({ title: 'Not Found' });
  });
});

describe('DELETE /tasks/:id', () => {
  it('deletes the task and returns 204 with no body', async () => {
    const created = await createTask();

    const res = await app.request(`/tasks/${created.id}`, { method: 'DELETE' });

    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    expect((await app.request(`/tasks/${created.id}`)).status).toBe(404);
  });

  it('returns 404 problem when the task does not exist', async () => {
    const res = await app.request(`/tasks/${randomUUID()}`, { method: 'DELETE' });

    expect(await expectProblem(res, 404)).toMatchObject({ title: 'Not Found' });
  });

  it('returns 400 when the id is not a uuid', async () => {
    const res = await app.request('/tasks/not-a-uuid', { method: 'DELETE' });

    expect(fieldsWithErrors(await expectProblem(res, 400))).toEqual(['id']);
  });
});

describe('errors', () => {
  it('returns a 500 problem without leaking internals when the database fails', async () => {
    // A separate app whose connection is already closed, so every query throws.
    const broken = buildTestApp();
    await broken.close();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const body = await expectProblem(await broken.app.request('/tasks'), 500);

    expect(body).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred',
      instance: '/tasks',
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
