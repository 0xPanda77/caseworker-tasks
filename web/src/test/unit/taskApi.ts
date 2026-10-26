import { createTask, deleteTask, getTask, listTasks, updateTaskStatus } from '../../main/services/taskApi';

import axios, { AxiosError, AxiosResponse } from 'axios';

const task = {
  id: '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  title: 'Review case bundle',
  description: null,
  status: 'TODO',
  dueAt: '2026-11-05T17:00:00.000Z',
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
};

// Builds the error axios throws for a non-2xx response.
const httpError = (status: number, data: unknown = {}) =>
  new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data,
  } as AxiosResponse);

describe('taskApi', () => {
  afterEach(() => jest.restoreAllMocks());

  test('listTasks returns the tasks', async () => {
    const get = jest.spyOn(axios, 'get').mockResolvedValue({ data: [task] });
    await expect(listTasks()).resolves.toEqual([task]);
    expect(get).toHaveBeenCalledWith('http://localhost:4000/tasks', expect.anything());
  });

  test('getTask returns ok with the task', async () => {
    jest.spyOn(axios, 'get').mockResolvedValue({ data: task });
    await expect(getTask(task.id)).resolves.toEqual({ kind: 'ok', value: task });
  });

  test('getTask maps a 404 to notFound', async () => {
    jest.spyOn(axios, 'get').mockRejectedValue(httpError(404, { status: 404, title: 'Not Found' }));
    await expect(getTask(task.id)).resolves.toEqual({ kind: 'notFound' });
  });

  test('getTask maps a 400 for a malformed id to notFound', async () => {
    jest.spyOn(axios, 'get').mockRejectedValue(httpError(400, { errors: [{ field: 'id', message: 'Invalid UUID' }] }));
    await expect(getTask('abc')).resolves.toEqual({ kind: 'notFound' });
  });

  test('createTask posts the input and returns the created task', async () => {
    const post = jest.spyOn(axios, 'post').mockResolvedValue({ data: task });
    const input = { title: task.title, status: 'TODO' as const, dueAt: task.dueAt };
    await expect(createTask(input)).resolves.toEqual({ kind: 'ok', value: task });
    expect(post).toHaveBeenCalledWith('http://localhost:4000/tasks', input, expect.anything());
  });

  test('createTask maps a 400 to field errors', async () => {
    const errors = [{ field: 'title', message: 'Too small' }];
    jest.spyOn(axios, 'post').mockRejectedValue(httpError(400, { status: 400, errors }));
    await expect(createTask({ title: '', dueAt: task.dueAt })).resolves.toEqual({ kind: 'invalid', errors });
  });

  test('updateTaskStatus patches the status', async () => {
    const patch = jest.spyOn(axios, 'patch').mockResolvedValue({ data: { ...task, status: 'DONE' } });
    await expect(updateTaskStatus(task.id, 'DONE')).resolves.toMatchObject({ kind: 'ok', value: { status: 'DONE' } });
    expect(patch).toHaveBeenCalledWith(
      `http://localhost:4000/tasks/${task.id}/status`,
      { status: 'DONE' },
      expect.anything()
    );
  });

  test('deleteTask returns ok on 204 and notFound on 404', async () => {
    const del = jest.spyOn(axios, 'delete').mockResolvedValueOnce({ status: 204 });
    await expect(deleteTask(task.id)).resolves.toEqual({ kind: 'ok', value: null });

    del.mockRejectedValueOnce(httpError(404));
    await expect(deleteTask(task.id)).resolves.toEqual({ kind: 'notFound' });
  });

  test('rethrows other errors so they reach the error page', async () => {
    jest.spyOn(axios, 'get').mockRejectedValue(httpError(500));
    await expect(getTask(task.id)).rejects.toThrow('status code 500');
  });

  test('rethrows network errors', async () => {
    jest.spyOn(axios, 'get').mockRejectedValue(new Error('connect ECONNREFUSED'));
    await expect(listTasks()).rejects.toThrow('ECONNREFUSED');
  });
});
