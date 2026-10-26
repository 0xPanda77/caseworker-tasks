// OpenAPI route definitions for /tasks. Handlers live in tasks.handlers.ts.
import { createRoute, z } from '@hono/zod-openapi';

import { problemDoc } from '../lib/problem.js';
import {
  CreateTaskSchema,
  TaskIdParamSchema,
  TaskListSchema,
  TaskSchema,
  UpdateTaskStatusSchema,
} from '../schemas/task.js';

const tags = ['Tasks'];

const json = <T>(schema: T) => ({ 'application/json': { schema } });

// Any route can fail unexpectedly; app.onError returns this without internal details.
const serverError = problemDoc('Unexpected server error');

export const createTaskRoute = createRoute({
  method: 'post',
  path: '/tasks',
  tags,
  summary: 'Create a task',
  request: { body: { required: true, content: json(CreateTaskSchema) } },
  responses: {
    201: {
      description: 'Task created',
      headers: z.object({
        Location: z.string().openapi({ example: '/tasks/3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d' }),
      }),
      content: json(TaskSchema),
    },
    400: problemDoc('Invalid input (per-field errors in `errors`)'),
    500: serverError,
  },
});

export const listTasksRoute = createRoute({
  method: 'get',
  path: '/tasks',
  tags,
  summary: 'List all tasks, sorted by due date',
  responses: {
    200: { description: 'All tasks', content: json(TaskListSchema) },
    500: serverError,
  },
});

export const getTaskRoute = createRoute({
  method: 'get',
  path: '/tasks/{id}',
  tags,
  summary: 'Get a task by ID',
  request: { params: TaskIdParamSchema },
  responses: {
    200: { description: 'The task', content: json(TaskSchema) },
    400: problemDoc('Invalid ID'),
    404: problemDoc('Task not found'),
    500: serverError,
  },
});

export const updateTaskStatusRoute = createRoute({
  method: 'patch',
  path: '/tasks/{id}/status',
  tags,
  summary: 'Update the status of a task',
  request: {
    params: TaskIdParamSchema,
    body: { required: true, content: json(UpdateTaskStatusSchema) },
  },
  responses: {
    200: { description: 'Updated task', content: json(TaskSchema) },
    400: problemDoc('Invalid input'),
    404: problemDoc('Task not found'),
    500: serverError,
  },
});

export const deleteTaskRoute = createRoute({
  method: 'delete',
  path: '/tasks/{id}',
  tags,
  summary: 'Delete a task',
  request: { params: TaskIdParamSchema },
  responses: {
    204: { description: 'Task deleted' },
    400: problemDoc('Invalid ID'),
    404: problemDoc('Task not found'),
    500: serverError,
  },
});
