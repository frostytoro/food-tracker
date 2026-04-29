import { describe, expect, it } from 'vitest';
import { buildFoodCreateProperties } from '../src/notion/mapper.js';

describe('Notion mapper', () => {
  it('maps a food item into create properties', () => {
    const payload = buildFoodCreateProperties(
      {
        Location: 'select',
        Quantity: 'rich_text',
        Category: 'rich_text',
        Status: 'select',
        'Added By': 'rich_text',
        Notes: 'rich_text',
        'Last Updated': 'date'
      },
      {
        itemName: 'Broccoli',
        expirationDate: '2026-05-12',
        location: 'Pantry',
        quantity: '1 bunch',
        category: 'Produce',
        status: 'Active',
        addedBy: 'tester',
        notes: 'Fresh'
      }
    );

    expect(payload.Name).toBeDefined();
    expect(payload.Expiration).toEqual({
      date: {
        start: '2026-05-12'
      }
    });
    expect(payload.Location).toEqual({
      select: {
        name: 'Pantry'
      }
    });
  });
});

