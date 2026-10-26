import type { OpenAPIHono } from '@hono/zod-openapi';
import type { Context } from 'hono';

import type { Db } from '../db/client.js';
import { problemResponse } from '../lib/problem.js';
import * as taskService from '../services/taskService.js';
import {
  createTaskRoute,
  deleteTaskRoute,
  getTaskRoute,
  listTasksRoute,
  updateTaskStatusRoute,
} from './tasks.routes.js';

// The service returns undefined/false for a missing task; this turns that into a 404 problem.
const taskNotFound = (c: Context, id: string) =>
  problemResponse(c, 404, { detail: `Task ${id} not found` });

export function registerTaskRoutes(app: OpenAPIHono, db: Db) {
  app.openapi(createTaskRoute, async (c) => {
    const task = await taskService.createTask(db, c.req.valid('json'));
    c.header('Location', `/tasks/${task.id}`);
    return c.json(taskService.toTaskResponse(task), 201);
  });

  app.openapi(listTasksRoute, async (c) => {
    const tasks = await taskService.listTasks(db);
    return c.json(tasks.map(taskService.toTaskResponse), 200);
  });

  app.openapi(getTaskRoute, async (c) => {
    const { id } = c.req.valid('param');
    const task = await taskService.getTask(db, id);
    if (!task) return taskNotFound(c, id);
    return c.json(taskService.toTaskResponse(task), 200);
  });

  app.openapi(updateTaskStatusRoute, async (c) => {
    const { id } = c.req.valid('param');
    const { status } = c.req.valid('json');
    const task = await taskService.updateTaskStatus(db, id, status);
    if (!task) return taskNotFound(c, id);
    return c.json(taskService.toTaskResponse(task), 200);
  });

  app.openapi(deleteTaskRoute, async (c) => {
    const { id } = c.req.valid('param');
    const deleted = await taskService.deleteTask(db, id);
    if (!deleted) return taskNotFound(c, id);
    return c.body(null, 204);
  });
}
