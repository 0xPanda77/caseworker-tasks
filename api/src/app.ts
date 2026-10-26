import { OpenAPIHono, type z } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { logger } from 'hono/logger';

import type { Db } from './db/client.js';
import { type FieldError, problemResponse } from './lib/problem.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerTaskRoutes } from './routes/tasks.handlers.js';

// One field error per Zod issue. An unknown key is reported against the object that
// contains it, so its path is empty; list each key by name instead.
export function toFieldErrors(issues: z.core.$ZodIssue[], target: string): FieldError[] {
  return issues.flatMap((issue) => {
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((key) => ({
        field: [...issue.path, key].join('.'),
        message: 'Unknown field',
      }));
    }
    return [{ field: issue.path.join('.') || target, message: issue.message }];
  });
}

export interface AppDeps {
  db: Db;
  logRequests?: boolean;
}

export function createApp({ db, logRequests = true }: AppDeps) {
  const app = new OpenAPIHono({
    // Runs when request validation fails on any openapi() route.
    defaultHook: (result, c) => {
      if (!result.success) {
        return problemResponse(c, 400, {
          detail: 'Request validation failed',
          errors: toFieldErrors(result.error.issues, result.target),
        });
      }
    },
  });

  if (logRequests) app.use(logger());

  registerHealthRoutes(app);
  registerTaskRoutes(app, db);

  app.doc31('/openapi.json', {
    openapi: '3.1.0',
    info: {
      title: 'Caseworker Tasks API',
      version: '0.1.0',
      description: 'Create and track caseworker tasks.',
    },
  });
  app.get('/docs', swaggerUI({ url: '/openapi.json' }));

  app.notFound(notFoundHandler);
  app.onError(errorHandler);

  return app;
}

export type App = ReturnType<typeof createApp>;
