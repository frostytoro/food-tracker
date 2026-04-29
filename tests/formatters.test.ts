import { describe, expect, it } from 'vitest';
import { formatExpiringReport } from '../src/discord/formatters.js';

describe('formatExpiringReport', () => {
  it('renders expiring and expired sections', () => {
    const output = formatExpiringReport(
      [
        {
          id: '1',
          name: 'Milk',
          expirationDate: '2026-05-01',
          location: 'Fridge',
          quantity: '1 gallon',
          category: 'Dairy',
          status: 'Active',
          addedBy: 'tester',
          notes: null,
          lastUpdated: null
        }
      ],
      [
        {
          id: '2',
          name: 'Spinach',
          expirationDate: '2026-04-26',
          location: 'Fridge',
          quantity: '1 bag',
          category: 'Produce',
          status: 'Active',
          addedBy: 'tester',
          notes: null,
          lastUpdated: null
        }
      ],
      'America/Los_Angeles',
      new Date('2026-04-28T16:00:00.000Z')
    );

    expect(output).toContain('Expiring Soon');
    expect(output).toContain('Already Expired');
    expect(output).toContain('Milk');
    expect(output).toContain('Spinach');
  });
});

