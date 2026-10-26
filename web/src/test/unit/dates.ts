import { formatDateTime, londonToIso, parseDate, parseTime } from '../../main/utils/dates';

describe('parseDate', () => {
  test('accepts a real date', () => {
    expect(parseDate('Due date', { day: '5', month: '11', year: '2026' })).toEqual({
      ok: true,
      day: 5,
      month: 11,
      year: 2026,
    });
  });

  test('asks for the date when every field is empty', () => {
    expect(parseDate('Due date', { day: ' ', month: '', year: '' })).toEqual({
      ok: false,
      message: 'Enter the due date',
      parts: ['day', 'month', 'year'],
    });
  });

  test('names the missing parts', () => {
    expect(parseDate('Due date', { day: '5', month: '', year: '' })).toEqual({
      ok: false,
      message: 'Due date must include a month and year',
      parts: ['month', 'year'],
    });
  });

  test('rejects a year that is not 4 numbers', () => {
    expect(parseDate('Due date', { day: '5', month: '11', year: '26' })).toEqual({
      ok: false,
      message: 'Year must include 4 numbers',
      parts: ['year'],
    });
  });

  test.each([
    ['31 February', { day: '31', month: '2', year: '2026' }],
    ['month 13', { day: '1', month: '13', year: '2026' }],
    ['day 0', { day: '0', month: '1', year: '2026' }],
    ['letters', { day: 'ab', month: '1', year: '2026' }],
  ])('rejects %s as not a real date', (_name, input) => {
    expect(parseDate('Due date', input)).toMatchObject({ ok: false, message: 'Due date must be a real date' });
  });

  test('accepts 29 February in a leap year', () => {
    expect(parseDate('Due date', { day: '29', month: '2', year: '2028' })).toMatchObject({ ok: true });
  });
});

describe('parseTime', () => {
  test.each([
    ['14:30', 14, 30],
    ['9:05', 9, 5],
    ['00:00', 0, 0],
    ['2:30pm', 14, 30],
    ['2pm', 14, 0],
    ['9.15am', 9, 15],
    ['12am', 0, 0],
    ['12pm', 12, 0],
    [' 11:59 PM ', 23, 59],
  ])('parses "%s"', (input, hours, minutes) => {
    expect(parseTime('Due time', input)).toEqual({ ok: true, hours, minutes });
  });

  test('asks for the time when empty', () => {
    expect(parseTime('Due time', '')).toEqual({ ok: false, message: 'Enter the due time' });
  });

  test.each(['24:00', '14', '13pm', '0am', '9:60', 'noon', '9:5'])('rejects "%s"', input => {
    expect(parseTime('Due time', input)).toEqual({
      ok: false,
      message: 'Due time must be a real time, like 9:30am or 14:30',
    });
  });
});

describe('londonToIso', () => {
  test('uses GMT in winter', () => {
    expect(londonToIso(2026, 11, 5, 14, 30)).toBe('2026-11-05T14:30:00.000Z');
  });

  test('uses BST (UTC+1) in summer', () => {
    expect(londonToIso(2026, 6, 1, 10, 0)).toBe('2026-06-01T09:00:00.000Z');
  });
});

describe('formatDateTime', () => {
  test('formats in UK style', () => {
    expect(formatDateTime('2026-11-05T14:30:00Z')).toBe('5 November 2026 at 2:30pm');
  });

  test('converts to UK time during BST', () => {
    expect(formatDateTime('2026-06-01T09:00:00Z')).toBe('1 June 2026 at 10am');
  });

  test('uses midday and midnight', () => {
    expect(formatDateTime('2026-11-05T12:00:00Z')).toBe('5 November 2026 at midday');
    expect(formatDateTime('2026-11-05T00:00:00Z')).toBe('5 November 2026 at midnight');
  });

  test('formats a morning time', () => {
    expect(formatDateTime('2026-01-09T08:05:00Z')).toBe('9 January 2026 at 8:05am');
  });
});
