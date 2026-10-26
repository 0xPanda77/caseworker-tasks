// Unit tests for the Zod schemas in src/schemas/task.ts. No app or database involved.
import { describe, expect, it } from 'vitest';

import { TASK_STATUSES } from '../src/db/schema.js';
import {
  CreateTaskSchema,
  TaskIdParamSchema,
  UpdateTaskStatusSchema,
} from '../src/schemas/task.js';

const validTask = {
  title: 'Review case bundle',
  description: 'Check exhibits before the hearing',
  status: 'IN_PROGRESS',
  dueAt: '2026-11-05T17:00:00Z',
};

describe('CreateTaskSchema', () => {
  it('accepts a valid task', () => {
    expect(CreateTaskSchema.parse(validTask)).toEqual(validTask);
  });

  it('defaults status to TODO and leaves description optional', () => {
    const result = CreateTaskSchema.parse({ title: 'Call witness', dueAt: validTask.dueAt });

    expect(result).toEqual({ title: 'Call witness', status: 'TODO', dueAt: validTask.dueAt });
  });

  it('trims title and description', () => {
    const result = CreateTaskSchema.parse({
      ...validTask,
      title: '  Review case bundle  ',
      description: '  Check exhibits  ',
    });

    expect(result.title).toBe('Review case bundle');
    expect(result.description).toBe('Check exhibits');
  });

  it('rejects a whitespace-only title', () => {
    const result = CreateTaskSchema.safeParse({ ...validTask, title: '   ' });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([['title']]);
  });

  it('enforces the title and description length limits', () => {
    expect(CreateTaskSchema.safeParse({ ...validTask, title: 'a'.repeat(200) }).success).toBe(true);
    expect(CreateTaskSchema.safeParse({ ...validTask, title: 'a'.repeat(201) }).success).toBe(
      false,
    );
    expect(
      CreateTaskSchema.safeParse({ ...validTask, description: 'a'.repeat(2000) }).success,
    ).toBe(true);
    expect(
      CreateTaskSchema.safeParse({ ...validTask, description: 'a'.repeat(2001) }).success,
    ).toBe(false);
  });

  it('accepts a date-time with a UTC offset', () => {
    expect(
      CreateTaskSchema.safeParse({ ...validTask, dueAt: '2026-11-05T17:00:00+01:00' }).success,
    ).toBe(true);
  });

  it.each(['2026-11-05', '2026-11-05T17:00:00', 'next Tuesday'])(
    'rejects %s as a due date',
    (dueAt) => {
      const result = CreateTaskSchema.safeParse({ ...validTask, dueAt });

      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => issue.path)).toEqual([['dueAt']]);
    },
  );

  it('rejects unknown fields', () => {
    const result = CreateTaskSchema.safeParse({ ...validTask, priority: 'high' });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toMatchObject([{ code: 'unrecognized_keys', keys: ['priority'] }]);
  });
});

describe('UpdateTaskStatusSchema', () => {
  it.each(TASK_STATUSES)('accepts %s', (status) => {
    expect(UpdateTaskStatusSchema.parse({ status })).toEqual({ status });
  });

  it.each(['ARCHIVED', 'done', '', undefined])('rejects status %s', (status) => {
    expect(UpdateTaskStatusSchema.safeParse({ status }).success).toBe(false);
  });

  it('rejects fields other than status', () => {
    expect(UpdateTaskStatusSchema.safeParse({ status: 'DONE', title: 'Renamed' }).success).toBe(
      false,
    );
  });
});

describe('TaskIdParamSchema', () => {
  it('accepts a uuid', () => {
    const id = '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

    expect(TaskIdParamSchema.parse({ id })).toEqual({ id });
  });

  it('rejects a non-uuid id', () => {
    expect(TaskIdParamSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
  });
});
