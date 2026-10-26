import { app } from '../../main/app';

import request from 'supertest';

describe('Home page', () => {
  test('redirects to the task list', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/tasks');
  });

  test('shows the not found page for an unknown path', async () => {
    const res = await request(app).get('/no-such-page');
    expect(res.status).toBe(404);
    expect(res.text).toContain('Page not found');
  });
});
