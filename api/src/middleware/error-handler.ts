import type { ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { problemResponse } from '../lib/problem.js';

export const notFoundHandler: NotFoundHandler = (c) =>
  problemResponse(c, 404, { detail: `No route for ${c.req.method} ${c.req.path}` });

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException && err.status < 500) {
    return problemResponse(c, err.status, { detail: err.message });
  }
  // Log the real error server-side; never leak internals to the client.
  console.error(err);
  return problemResponse(c, 500, { detail: 'An unexpected error occurred' });
};
