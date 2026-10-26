import { describe, expect, it } from 'vitest';

import { buildTestApp } from './helpers/app.js';

const { app } = buildTestApp();

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await app.request('/health');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});

describe('docs', () => {
  it('serves the OpenAPI document', async () => {
    const res = await app.request('/openapi.json');

    expect(res.status).toBe(200);
    const doc = (await res.json()) as { openapi: string; paths: Record<string, unknown> };
    expect(doc.openapi).toBe('3.1.0');
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining(['/health', '/tasks', '/tasks/{id}', '/tasks/{id}/status']),
    );
  });
});
