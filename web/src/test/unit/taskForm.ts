import { TaskForm, errorView, fromApiErrors, readTaskForm, validateTaskForm } from '../../main/utils/taskForm';

const validForm: TaskForm = {
  title: '  Review case bundle  ',
  description: '',
  status: 'TODO',
  dueDay: '5',
  dueMonth: '11',
  dueYear: '2026',
  dueTime: '2:30pm',
};

describe('readTaskForm', () => {
  test('reads the form body, including the date input fields', () => {
    expect(
      readTaskForm({
        title: 'A',
        description: 'B',
        status: 'DONE',
        'dueDate-day': '1',
        'dueDate-month': '2',
        'dueDate-year': '2027',
        dueTime: '9am',
      })
    ).toEqual({
      title: 'A',
      description: 'B',
      status: 'DONE',
      dueDay: '1',
      dueMonth: '2',
      dueYear: '2027',
      dueTime: '9am',
    });
  });

  test('treats a missing body or non-string values as empty', () => {
    expect(readTaskForm(undefined).title).toBe('');
    expect(readTaskForm({ title: ['a', 'b'] }).title).toBe('');
  });
});

describe('validateTaskForm', () => {
  test('builds the API input from a valid form', () => {
    expect(validateTaskForm(validForm)).toEqual({
      ok: true,
      input: {
        title: 'Review case bundle',
        description: undefined,
        status: 'TODO',
        dueAt: '2026-11-05T14:30:00.000Z',
      },
    });
  });

  test('keeps a description', () => {
    const result = validateTaskForm({ ...validForm, description: ' Check exhibits ' });
    expect(result).toMatchObject({ ok: true, input: { description: 'Check exhibits' } });
  });

  test('reports every invalid field', () => {
    const result = validateTaskForm({
      title: ' ',
      description: 'x'.repeat(2001),
      status: 'NOPE',
      dueDay: '',
      dueMonth: '11',
      dueYear: '2026',
      dueTime: '',
    });
    expect(result).toEqual({
      ok: false,
      errors: [
        { field: 'title', message: 'Enter a title' },
        { field: 'description', message: 'Description must be 2000 characters or less' },
        { field: 'status', message: 'Select a status' },
        { field: 'dueDate', message: 'Due date must include a day' },
        { field: 'dueTime', message: 'Enter the due time' },
      ],
      dateErrorParts: ['day'],
    });
  });

  test('rejects a title over 200 characters', () => {
    const result = validateTaskForm({ ...validForm, title: 'x'.repeat(201) });
    expect(result).toMatchObject({
      ok: false,
      errors: [{ field: 'title', message: 'Title must be 200 characters or less' }],
    });
  });
});

describe('fromApiErrors', () => {
  test('maps the API dueAt field to the due date field', () => {
    expect(
      fromApiErrors([
        { field: 'dueAt', message: 'Invalid ISO datetime' },
        { field: 'title', message: 'Too small' },
      ])
    ).toEqual([
      { field: 'dueDate', message: 'Invalid ISO datetime' },
      { field: 'title', message: 'Too small' },
    ]);
  });
});

describe('errorView', () => {
  test('links the summary to each field and the first highlighted date part', () => {
    expect(
      errorView(
        [
          { field: 'title', message: 'Enter a title' },
          { field: 'dueDate', message: 'Due date must include a month' },
        ],
        ['month']
      )
    ).toEqual({
      errorList: [
        { text: 'Enter a title', href: '#title' },
        { text: 'Due date must include a month', href: '#dueDate-month' },
      ],
      errorMessages: { title: 'Enter a title', dueDate: 'Due date must include a month' },
      dateErrorParts: ['month'],
    });
  });

  test('highlights the whole date when the error has no specific part', () => {
    const view = errorView([{ field: 'dueDate', message: 'Invalid' }]);
    expect(view.errorList[0].href).toBe('#dueDate-day');
    expect(view.dateErrorParts).toEqual(['day', 'month', 'year']);
  });
});
