import { Task } from '../../main/services/taskApi';
import { isOverdue } from '../../main/utils/taskStatus';

const task = (status: Task['status'], dueAt: string): Task => ({
  id: '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  title: 'Review case bundle',
  description: null,
  status,
  dueAt,
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
});

describe('isOverdue', () => {
  const now = new Date('2026-11-05T12:00:00Z');

  test('is overdue when the due time has passed and the task is not done', () => {
    expect(isOverdue(task('TODO', '2026-11-05T11:59:00Z'), now)).toBe(true);
    expect(isOverdue(task('IN_PROGRESS', '2026-11-01T09:00:00Z'), now)).toBe(true);
  });

  test('is not overdue when done', () => {
    expect(isOverdue(task('DONE', '2026-11-01T09:00:00Z'), now)).toBe(false);
  });

  test('is not overdue when due in the future', () => {
    expect(isOverdue(task('TODO', '2026-11-05T12:01:00Z'), now)).toBe(false);
  });
});
