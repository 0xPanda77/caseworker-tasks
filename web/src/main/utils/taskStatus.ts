// How task statuses are shown in the UI.
import { Task, TaskStatus } from '../services/taskApi';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
};

// GOV.UK tag colours: https://design-system.service.gov.uk/components/tag/
export const STATUS_TAG_CLASSES: Record<TaskStatus, string> = {
  TODO: 'govuk-tag--grey',
  IN_PROGRESS: 'govuk-tag--blue',
  DONE: 'govuk-tag--green',
};

// A task is overdue if its due time has passed and it isn't done yet.
export function isOverdue(task: Task, now: Date = new Date()): boolean {
  return task.status !== 'DONE' && new Date(task.dueAt).getTime() < now.getTime();
}
