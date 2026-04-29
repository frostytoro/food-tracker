import { describe, expect, it } from 'vitest';
import { daysUntil, normalizeDateInput } from '../src/utils/date.js';

describe('date utilities', () => {
  it('normalizes relative dates using the configured timezone', () => {
    const normalized = normalizeDateInput(
      'next Friday',
      'America/Los_Angeles',
      new Date('2026-04-28T16:00:00.000Z')
    );

    expect(normalized).toBe('2026-05-01');
  });

  it('calculates days until expiration', () => {
    const result = daysUntil(
      '2026-05-03',
      'America/Los_Angeles',
      new Date('2026-04-28T16:00:00.000Z')
    );

    expect(result).toBe(5);
  });
});

