import * as chrono from 'chrono-node';
import { DateTime } from 'luxon';

const weekdayLookup: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7
};

export function getTodayInTimezone(timezone: string, now = new Date()): DateTime {
  return DateTime.fromJSDate(now, { zone: timezone }).startOf('day');
}

export function normalizeDateInput(
  input: string,
  timezone: string,
  now = new Date()
): string | null {
  const reference = getTodayInTimezone(timezone, now);
  const nextWeekdayMatch = input.trim().toLowerCase().match(/^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);

  if (nextWeekdayMatch) {
    const weekdayName = nextWeekdayMatch[1] as keyof typeof weekdayLookup;
    const targetWeekday = weekdayLookup[weekdayName];
    if (targetWeekday === undefined) {
      return null;
    }
    const delta = ((targetWeekday - reference.weekday + 7) % 7) || 7;
    return reference.plus({ days: delta }).toISODate();
  }

  const parsed = chrono.parseDate(input, reference.toJSDate(), {
    forwardDate: true
  });

  if (!parsed) {
    return null;
  }

  return DateTime.fromJSDate(parsed, { zone: timezone }).toISODate();
}

export function ensureIsoDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = DateTime.fromISO(value, { zone: 'utc' });
  return parsed.isValid ? parsed.toISODate() : null;
}

export function isExpired(isoDate: string, timezone: string, now = new Date()): boolean {
  const target = DateTime.fromISO(isoDate, { zone: timezone }).startOf('day');
  const today = getTodayInTimezone(timezone, now);
  return target < today;
}

export function daysUntil(isoDate: string, timezone: string, now = new Date()): number {
  const target = DateTime.fromISO(isoDate, { zone: timezone }).startOf('day');
  const today = getTodayInTimezone(timezone, now);
  return Math.round(target.diff(today, 'days').days);
}

export function formatFriendlyDate(isoDate: string, timezone: string): string {
  return DateTime.fromISO(isoDate, { zone: timezone }).toFormat('MMM d, yyyy');
}
