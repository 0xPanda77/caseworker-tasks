// Request/response schemas. One source for runtime validation and the OpenAPI spec.
import { z } from '@hono/zod-openapi';

import { TASK_STATUSES } from '../db/schema.js';

export const TaskStatusSchema = z.enum(TASK_STATUSES).openapi('TaskStatus', { example: 'TODO' });

export const TaskIdParamSchema = z.object({
  id: z.uuid().openapi({
    param: { name: 'id', in: 'path' },
    example: '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  }),
});

export const CreateTaskSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(200).openapi({ example: 'Review case bundle' }),
    description: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .openapi({ example: 'Check exhibits before the hearing' }),
    status: TaskStatusSchema.default('TODO'),
    dueAt: z.iso.datetime({ offset: true }).openapi({ example: '2026-11-05T17:00:00Z' }),
  })
  .openapi('CreateTask');

export const UpdateTaskStatusSchema = z
  .strictObject({
    status: TaskStatusSchema,
  })
  .openapi('UpdateTaskStatus');

export const TaskSchema = z
  .object({
    id: z.uuid(),
    title: z.string(),
    description: z.string().nullable(),
    status: TaskStatusSchema,
    dueAt: z.iso.datetime({ offset: true }),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .openapi('Task');

export const TaskListSchema = z.array(TaskSchema).openapi('TaskList');

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof UpdateTaskStatusSchema>;
export type TaskResponse = z.infer<typeof TaskSchema>;
