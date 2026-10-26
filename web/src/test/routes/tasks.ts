import { app } from '../../main/app';
import * as taskApi from '../../main/services/taskApi';
import { Task } from '../../main/services/taskApi';

import request from 'supertest';

// Mock the API calls but keep the real types and constants (e.g. TASK_STATUSES).
jest.mock('../../main/services/taskApi', () => ({
  ...jest.requireActual('../../main/services/taskApi'),
  listTasks: jest.fn(),
  getTask: jest.fn(),
  createTask: jest.fn(),
  updateTaskStatus: jest.fn(),
  deleteTask: jest.fn(),
}));

const api = jest.mocked(taskApi);

const id = '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

const task: Task = {
  id,
  title: 'Review case bundle',
  description: 'Check exhibits before the hearing',
  status: 'TODO',
  dueAt: '2099-11-05T14:30:00.000Z',
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
};

const validForm = {
  title: 'Review case bundle',
  description: '',
  status: 'TODO',
  'dueDate-day': '5',
  'dueDate-month': '11',
  'dueDate-year': '2099',
  dueTime: '2:30pm',
};

beforeEach(() => {
  jest.resetAllMocks();
  // The app's error handler logs errors; keep test output clean.
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

describe('GET /tasks', () => {
  test('lists tasks in a table with status and due date', async () => {
    api.listTasks.mockResolvedValue([task, { ...task, id: 'b', title: 'File order', status: 'DONE' }]);

    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>Tasks - Caseworker tasks - GOV.UK</title>');
    expect(res.text).toContain('govuk-table');
    expect(res.text).toContain('Review case bundle');
    expect(res.text).toContain('To do');
    expect(res.text).toContain('Done');
    expect(res.text).toContain('5 November 2099 at 2:30pm');
    expect(res.text).toContain(`href="/tasks/${id}"`);
    expect(res.text).toContain('href="/tasks/new"');
    expect(res.text).not.toContain('Overdue');
  });

  test('flags overdue tasks that are not done', async () => {
    api.listTasks.mockResolvedValue([
      { ...task, dueAt: '2020-01-01T09:00:00.000Z' },
      { ...task, id: 'b', status: 'DONE', dueAt: '2020-01-01T09:00:00.000Z' },
    ]);

    const res = await request(app).get('/tasks');

    expect(res.text.match(/Overdue/g)).toHaveLength(1);
  });

  test('shows an empty state', async () => {
    api.listTasks.mockResolvedValue([]);

    const res = await request(app).get('/tasks');

    expect(res.text).toContain('There are no tasks yet.');
    expect(res.text).not.toContain('govuk-table');
  });

  test('shows a banner after a delete', async () => {
    api.listTasks.mockResolvedValue([]);

    const res = await request(app).get('/tasks?deleted=1');

    expect(res.text).toContain('govuk-notification-banner--success');
    expect(res.text).toContain('Task deleted');
  });

  test('escapes task titles', async () => {
    api.listTasks.mockResolvedValue([{ ...task, title: '<script>alert(1)</script>' }]);

    const res = await request(app).get('/tasks');

    expect(res.text).not.toContain('<script>alert(1)</script>');
    expect(res.text).toContain('&lt;script&gt;');
  });

  test('shows the error page when the API fails', async () => {
    api.listTasks.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const res = await request(app).get('/tasks');

    expect(res.status).toBe(500);
    expect(res.text).toContain('Sorry, there is a problem with the service');
  });
});

describe('GET /tasks/new', () => {
  test('shows the create form with To do selected', async () => {
    const res = await request(app).get('/tasks/new');

    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>Create a task - Caseworker tasks - GOV.UK</title>');
    expect(res.text).toMatch(/value="TODO" checked/);
    expect(res.text).toContain('name="dueDate-day"');
    expect(res.text).toContain('name="dueTime"');
    expect(res.text).not.toContain('govuk-error-summary');
  });
});

describe('POST /tasks', () => {
  test('creates the task and redirects to it with a banner flag', async () => {
    api.createTask.mockResolvedValue({ kind: 'ok', value: task });

    const res = await request(app).post('/tasks').type('form').send(validForm);

    expect(res.status).toBe(303);
    expect(res.headers.location).toBe(`/tasks/${id}?created=1`);
    expect(api.createTask).toHaveBeenCalledWith({
      title: 'Review case bundle',
      description: undefined,
      status: 'TODO',
      dueAt: '2099-11-05T14:30:00.000Z',
    });
  });

  test('re-renders with an error summary and keeps the values when invalid', async () => {
    const res = await request(app)
      .post('/tasks')
      .type('form')
      .send({ ...validForm, title: '', 'dueDate-day': '31', 'dueDate-month': '2', description: 'Keep me' });

    expect(res.status).toBe(400);
    expect(res.text).toContain('<title>Error: Create a task - Caseworker tasks - GOV.UK</title>');
    expect(res.text).toContain('govuk-error-summary');
    expect(res.text).toContain('href="#title"');
    expect(res.text).toContain('Enter a title');
    expect(res.text).toContain('href="#dueDate-day"');
    expect(res.text).toContain('Due date must be a real date');
    expect(res.text).toContain('Keep me');
    expect(res.text).toContain('value="31"');
    expect(api.createTask).not.toHaveBeenCalled();
  });

  test('re-renders with errors from an API 400', async () => {
    api.createTask.mockResolvedValue({
      kind: 'invalid',
      errors: [{ field: 'dueAt', message: 'Invalid ISO datetime' }],
    });

    const res = await request(app).post('/tasks').type('form').send(validForm);

    expect(res.status).toBe(400);
    expect(res.text).toContain('govuk-error-summary');
    expect(res.text).toContain('Invalid ISO datetime');
    expect(res.text).toContain('href="#dueDate-day"');
    expect(res.text).toContain('value="Review case bundle"');
  });

  test('shows the error page when the API fails', async () => {
    api.createTask.mockRejectedValue(new Error('timeout'));

    const res = await request(app).post('/tasks').type('form').send(validForm);

    expect(res.status).toBe(500);
  });
});

describe('GET /tasks/:id', () => {
  test('shows the task in a summary list', async () => {
    api.getTask.mockResolvedValue({ kind: 'ok', value: task });

    const res = await request(app).get(`/tasks/${id}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>Review case bundle - Caseworker tasks - GOV.UK</title>');
    expect(res.text).toContain('govuk-summary-list');
    expect(res.text).toContain('Check exhibits before the hearing');
    expect(res.text).toContain(`href="/tasks/${id}/status"`);
    expect(res.text).toContain(`href="/tasks/${id}/delete"`);
    expect(res.text).not.toContain('govuk-notification-banner');
    expect(api.getTask).toHaveBeenCalledWith(id);
  });

  test('shows a banner after creating', async () => {
    api.getTask.mockResolvedValue({ kind: 'ok', value: task });

    const res = await request(app).get(`/tasks/${id}?created=1`);

    expect(res.text).toContain('Task created');
  });

  test('shows a banner after changing status', async () => {
    api.getTask.mockResolvedValue({ kind: 'ok', value: { ...task, status: 'IN_PROGRESS' } });

    const res = await request(app).get(`/tasks/${id}?updated=1`);

    expect(res.text).toContain('Status changed to in progress');
  });

  test('shows not found for a missing task', async () => {
    api.getTask.mockResolvedValue({ kind: 'notFound' });

    const res = await request(app).get(`/tasks/${id}`);

    expect(res.status).toBe(404);
    expect(res.text).toContain('<title>Page not found - Caseworker tasks - GOV.UK</title>');
  });
});

describe('GET /tasks/:id/status', () => {
  test('shows the status form with the current status selected', async () => {
    api.getTask.mockResolvedValue({ kind: 'ok', value: { ...task, status: 'IN_PROGRESS' } });

    const res = await request(app).get(`/tasks/${id}/status`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>Change status - Caseworker tasks - GOV.UK</title>');
    expect(res.text).toMatch(/value="IN_PROGRESS" checked/);
  });

  test('shows not found for a missing task', async () => {
    api.getTask.mockResolvedValue({ kind: 'notFound' });

    const res = await request(app).get(`/tasks/${id}/status`);

    expect(res.status).toBe(404);
  });
});

describe('POST /tasks/:id/status', () => {
  test('updates the status and redirects back with a banner flag', async () => {
    api.updateTaskStatus.mockResolvedValue({ kind: 'ok', value: { ...task, status: 'DONE' } });

    const res = await request(app).post(`/tasks/${id}/status`).type('form').send({ status: 'DONE' });

    expect(res.status).toBe(303);
    expect(res.headers.location).toBe(`/tasks/${id}?updated=1`);
    expect(api.updateTaskStatus).toHaveBeenCalledWith(id, 'DONE');
  });

  test('re-renders with an error when no valid status is sent', async () => {
    api.getTask.mockResolvedValue({ kind: 'ok', value: task });

    const res = await request(app).post(`/tasks/${id}/status`).type('form').send({ status: 'NOPE' });

    expect(res.status).toBe(400);
    expect(res.text).toContain('<title>Error: Change status - Caseworker tasks - GOV.UK</title>');
    expect(res.text).toContain('govuk-error-summary');
    expect(res.text).toContain('Select a status');
    expect(api.updateTaskStatus).not.toHaveBeenCalled();
  });

  test('shows not found for a missing task', async () => {
    api.updateTaskStatus.mockResolvedValue({ kind: 'notFound' });

    const res = await request(app).post(`/tasks/${id}/status`).type('form').send({ status: 'DONE' });

    expect(res.status).toBe(404);
  });
});

describe('GET /tasks/:id/delete', () => {
  test('shows the confirmation page with a warning button', async () => {
    api.getTask.mockResolvedValue({ kind: 'ok', value: task });

    const res = await request(app).get(`/tasks/${id}/delete`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Are you sure you want to delete this task?');
    expect(res.text).toContain('govuk-button--warning');
    expect(res.text).toContain(`action="/tasks/${id}/delete"`);
  });

  test('shows not found for a missing task', async () => {
    api.getTask.mockResolvedValue({ kind: 'notFound' });

    const res = await request(app).get(`/tasks/${id}/delete`);

    expect(res.status).toBe(404);
  });
});

describe('POST /tasks/:id/delete', () => {
  test('deletes the task and redirects to the list with a banner flag', async () => {
    api.deleteTask.mockResolvedValue({ kind: 'ok', value: null });

    const res = await request(app).post(`/tasks/${id}/delete`);

    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/tasks?deleted=1');
    expect(api.deleteTask).toHaveBeenCalledWith(id);
  });

  test('shows not found for a missing task', async () => {
    api.deleteTask.mockResolvedValue({ kind: 'notFound' });

    const res = await request(app).post(`/tasks/${id}/delete`);

    expect(res.status).toBe(404);
  });
});
