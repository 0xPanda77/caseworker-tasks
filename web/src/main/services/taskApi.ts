// Typed client for the tasks API (../api). Mirrors the API's Zod response schemas.
//
// Expected failures come back as values so routes can act on them:
//   404            -> { kind: 'notFound' }
//   400            -> { kind: 'invalid', errors } (the problem's per-field `errors`)
// Anything else (500, API down, timeout) is thrown, so it reaches the app's error page.
import { config } from '../config';

import axios from 'axios';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueAt: string; // ISO 8601 date-time
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  dueAt: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export type ApiResult<T> = { kind: 'ok'; value: T } | { kind: 'notFound' } | { kind: 'invalid'; errors: FieldError[] };

export const baseUrl = (): string => config.apiUrl;

const TIMEOUT_MS = 5000;

// Maps an axios error to a 404/400 result, or rethrows it.
function toFailure(error: unknown): { kind: 'notFound' } | { kind: 'invalid'; errors: FieldError[] } {
  if (axios.isAxiosError(error) && error.response) {
    const { status, data } = error.response;
    if (status === 404) {
      return { kind: 'notFound' };
    }
    if (status === 400) {
      const errors: FieldError[] = Array.isArray(data?.errors) ? data.errors : [];
      // The API rejects an id that isn't a UUID with a 400. No task can have that id, so it's a 404.
      if (errors.some(e => e.field === 'id')) {
        return { kind: 'notFound' };
      }
      return { kind: 'invalid', errors };
    }
  }
  throw error;
}

export async function listTasks(): Promise<Task[]> {
  const response = await axios.get<Task[]>(`${baseUrl()}/tasks`, { timeout: TIMEOUT_MS });
  return response.data;
}

export async function getTask(id: string): Promise<ApiResult<Task>> {
  try {
    const response = await axios.get<Task>(`${baseUrl()}/tasks/${encodeURIComponent(id)}`, { timeout: TIMEOUT_MS });
    return { kind: 'ok', value: response.data };
  } catch (error) {
    return toFailure(error);
  }
}

export async function createTask(input: CreateTaskInput): Promise<ApiResult<Task>> {
  try {
    const response = await axios.post<Task>(`${baseUrl()}/tasks`, input, { timeout: TIMEOUT_MS });
    return { kind: 'ok', value: response.data };
  } catch (error) {
    return toFailure(error);
  }
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<ApiResult<Task>> {
  try {
    const response = await axios.patch<Task>(
      `${baseUrl()}/tasks/${encodeURIComponent(id)}/status`,
      { status },
      { timeout: TIMEOUT_MS }
    );
    return { kind: 'ok', value: response.data };
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteTask(id: string): Promise<ApiResult<null>> {
  try {
    await axios.delete(`${baseUrl()}/tasks/${encodeURIComponent(id)}`, { timeout: TIMEOUT_MS });
    return { kind: 'ok', value: null };
  } catch (error) {
    return toFailure(error);
  }
}
