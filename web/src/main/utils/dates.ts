// Date helpers. Caseworkers enter and read times in UK local time (Europe/London);
// the API stores and returns ISO 8601 instants.
const TIME_ZONE = 'Europe/London';

export interface DateParts {
  day: string;
  month: string;
  year: string;
}

// The fields of the date input that should be highlighted for an error.
export type DatePart = 'day' | 'month' | 'year';

export type ParseDateResult =
  { ok: true; day: number; month: number; year: number } | { ok: false; message: string; parts: DatePart[] };

export type ParseTimeResult = { ok: true; hours: number; minutes: number } | { ok: false; message: string };

// Validates the GOV.UK date input fields. Error messages follow the Design System date input guidance.
export function parseDate(label: string, input: DateParts): ParseDateResult {
  const day = input.day.trim();
  const month = input.month.trim();
  const year = input.year.trim();

  if (!day && !month && !year) {
    return { ok: false, message: `Enter the ${label.toLowerCase()}`, parts: ['day', 'month', 'year'] };
  }

  const missing: DatePart[] = [];
  if (!day) {
    missing.push('day');
  }
  if (!month) {
    missing.push('month');
  }
  if (!year) {
    missing.push('year');
  }
  if (missing.length > 0) {
    return { ok: false, message: `${label} must include a ${missing.join(' and ')}`, parts: missing };
  }

  if (!/^\d{4}$/.test(year)) {
    return { ok: false, message: 'Year must include 4 numbers', parts: ['year'] };
  }

  const realDate = {
    ok: false as const,
    message: `${label} must be a real date`,
    parts: ['day', 'month', 'year'] as DatePart[],
  };
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month)) {
    return realDate;
  }

  const d = Number(day);
  const m = Number(month);
  const y = Number(year);

  // Date.UTC rolls 31 February over into March, so check the parts survive the round trip.
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return realDate;
  }

  return { ok: true, day: d, month: m, year: y };
}

// Accepts 24-hour times ("14:30", "9:05") and 12-hour times ("2:30pm", "2pm", "9.15am").
export function parseTime(label: string, input: string): ParseTimeResult {
  const value = input.trim().toLowerCase();
  if (!value) {
    return { ok: false, message: `Enter the ${label.toLowerCase()}` };
  }

  const invalid = { ok: false as const, message: `${label} must be a real time, like 9:30am or 14:30` };
  const match = /^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/.exec(value);
  if (!match) {
    return invalid;
  }

  let hours = Number(match[1]);
  const minutes = match[2] === undefined ? 0 : Number(match[2]);
  const period = match[3];

  if (minutes > 59) {
    return invalid;
  }

  if (period) {
    if (hours < 1 || hours > 12) {
      return invalid;
    }
    // 12am is midnight (0) and 12pm is midday (12).
    hours = (hours % 12) + (period === 'pm' ? 12 : 0);
  } else if (match[2] === undefined || hours > 23) {
    // Without am/pm we need hours and minutes, e.g. "14" alone is ambiguous.
    return invalid;
  }

  return { ok: true, hours, minutes };
}

// London is either GMT (+0) or BST (+1). Ask Intl which one applies at this instant.
function londonOffsetMinutes(date: Date): number {
  const zoneName = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, timeZoneName: 'shortOffset' })
    .formatToParts(date)
    .find(part => part.type === 'timeZoneName')?.value;
  const match = /GMT([+-]\d+)?/.exec(zoneName ?? '');
  return match && match[1] ? Number(match[1]) * 60 : 0;
}

// Turns a UK local date and time into an ISO 8601 UTC string for the API.
export function londonToIso(year: number, month: number, day: number, hours: number, minutes: number): string {
  const asIfUtc = Date.UTC(year, month - 1, day, hours, minutes);
  // Use the offset in force at that local time (close enough except inside the 1-hour clock-change gap).
  const offset = londonOffsetMinutes(new Date(asIfUtc));
  return new Date(asIfUtc - offset * 60 * 1000).toISOString();
}

// Formats an ISO date-time GOV.UK style, in UK time: "5 November 2026 at 2:30pm", "1 June 2026 at 10am".
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';

  const hours = Number(get('hour'));
  const minutes = get('minute');

  let time: string;
  if (hours === 0 && minutes === '00') {
    time = 'midnight';
  } else if (hours === 12 && minutes === '00') {
    time = 'midday';
  } else {
    const hours12 = hours % 12 === 0 ? 12 : hours % 12;
    const period = hours < 12 ? 'am' : 'pm';
    time = minutes === '00' ? `${hours12}${period}` : `${hours12}:${minutes}${period}`;
  }

  return `${get('day')} ${get('month')} ${get('year')} at ${time}`;
}
