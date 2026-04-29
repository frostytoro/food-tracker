import { describe, expect, it } from 'vitest';
import { buildFoodCreateProperties } from '../src/notion/mapper.js';

describe('Notion mapper', () => {
  it('maps a food item into create properties', () => {
    const payload = buildFoodCreateProperties(
      {
        Item: 'title',
        Category: 'rich_text',
        'Expiration Date': 'date',
        'Expiration Notes': 'rich_text',
        'Last edited time': 'last_edited_time'
      },
      {
        itemName: 'Broccoli',
        expirationDate: '2026-05-12',
        category: 'Produce',
        notes: 'Fresh'
      }
    );

    expect(payload.Item).toBeDefined();
    expect(payload['Expiration Date']).toEqual({
      date: {
        start: '2026-05-12'
      }
    });
    expect(payload['Expiration Notes']).toEqual({
      rich_text: [
        {
          type: 'text',
          text: {
            content: 'Fresh'
          }
        }
      ]
    });
  });
});

