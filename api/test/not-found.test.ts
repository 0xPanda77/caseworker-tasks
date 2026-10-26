import { describe, expect, it } from 'vitest';

import { buildTestApp } from './helpers/app.js';

const { app } = buildTestApp();

describe('unknown routes', () => {
  it('returns a 404 problem-details response', async () => {
    const res = await app.request('/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
    expect(await res.json()).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'No route for GET /does-not-exist',
      instance: '/does-not-exist',
    });
  });
});
