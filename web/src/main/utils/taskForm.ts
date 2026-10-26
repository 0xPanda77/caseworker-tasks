// Reads and validates the create task form, so the user gets friendly errors before we call the API.
import { CreateTaskInput, FieldError, TASK_STATUSES, TaskStatus } from '../services/taskApi';

import { DatePart, londonToIso, parseDate, parseTime } from './dates';

// Same limits as the API schema (api/src/schemas/task.ts).
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;

// The raw form values, kept as strings so we can re-render exactly what the user typed.
export interface TaskForm {
  title: string;
  description: string;
  status: string;
  dueDay: string;
  dueMonth: string;
  dueYear: string;
  dueTime: string;
}

// `field` is the form field name: title, description, status, dueDate or dueTime.
export interface FormError {
  field: string;
  message: string;
}

export type TaskFormResult =
  { ok: true; input: CreateTaskInput } | { ok: false; errors: FormError[]; dateErrorParts: DatePart[] };

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

export function isTaskStatus(value: unknown): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

export function readTaskForm(body: Record<string, unknown> | undefined): TaskForm {
  const data = body ?? {};
  return {
    title: asString(data.title),
    description: asString(data.description),
    status: asString(data.status),
    dueDay: asString(data['dueDate-day']),
    dueMonth: asString(data['dueDate-month']),
    dueYear: asString(data['dueDate-year']),
    dueTime: asString(data.dueTime),
  };
}

export function validateTaskForm(form: TaskForm): TaskFormResult {
  const errors: FormError[] = [];
  let dateErrorParts: DatePart[] = [];

  const title = form.title.trim();
  if (!title) {
    errors.push({ field: 'title', message: 'Enter a title' });
  } else if (title.length > TITLE_MAX) {
    errors.push({ field: 'title', message: `Title must be ${TITLE_MAX} characters or less` });
  }

  const description = form.description.trim();
  if (description.length > DESCRIPTION_MAX) {
    errors.push({ field: 'description', message: `Description must be ${DESCRIPTION_MAX} characters or less` });
  }

  if (!isTaskStatus(form.status)) {
    errors.push({ field: 'status', message: 'Select a status' });
  }

  const date = parseDate('Due date', { day: form.dueDay, month: form.dueMonth, year: form.dueYear });
  if (!date.ok) {
    errors.push({ field: 'dueDate', message: date.message });
    dateErrorParts = date.parts;
  }

  const time = parseTime('Due time', form.dueTime);
  if (!time.ok) {
    errors.push({ field: 'dueTime', message: time.message });
  }

  // `!date.ok || !time.ok` is already covered by `errors`, but tells TypeScript date and time are valid below.
  if (errors.length > 0 || !date.ok || !time.ok) {
    return { ok: false, errors, dateErrorParts };
  }

  return {
    ok: true,
    input: {
      title,
      description: description || undefined,
      status: form.status as TaskStatus,
      dueAt: londonToIso(date.year, date.month, date.day, time.hours, time.minutes),
    },
  };
}

// The API names the combined date-time `dueAt`; on the form that's the due date field.
export function fromApiErrors(apiErrors: FieldError[]): FormError[] {
  return apiErrors.map(error => ({
    field: error.field === 'dueAt' ? 'dueDate' : error.field,
    message: error.message,
  }));
}

// What the templates need to show errors: the error summary list and a message per field.
export function errorView(
  errors: FormError[],
  dateErrorParts: DatePart[] = []
): {
  errorList: { text: string; href: string }[];
  errorMessages: Record<string, string>;
  dateErrorParts: DatePart[];
} {
  const errorMessages: Record<string, string> = {};
  for (const error of errors) {
    errorMessages[error.field] = error.message;
  }

  const errorList = errors.map(error => ({
    text: error.message,
    // The date input has no element with id "dueDate"; link to the first highlighted part instead.
    href: error.field === 'dueDate' ? `#dueDate-${dateErrorParts[0] ?? 'day'}` : `#${error.field}`,
  }));

  // An API error on the due date has no specific part, so highlight all three.
  const parts: DatePart[] =
    errorMessages.dueDate && dateErrorParts.length === 0 ? ['day', 'month', 'year'] : dateErrorParts;

  return { errorList, errorMessages, dateErrorParts: parts };
}
