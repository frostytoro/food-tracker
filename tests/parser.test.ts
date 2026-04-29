import { describe, expect, it } from 'vitest';
import type { ParsedFoodCommand } from '../src/types/food.js';

function handleParsedCommand(result: ParsedFoodCommand) {
  return {
    action: result.action,
    canWrite:
      !result.needsConfirmation &&
      result.confidence >= 0.7 &&
      !(
        (result.action === 'add_food' || result.action === 'update_food') &&
        result.missingFields.length > 0
      )
  };
}

describe('parser handling', () => {
  it('blocks low-confidence writes', () => {
    const result = handleParsedCommand({
      action: 'add_food',
      itemName: 'Milk',
      expirationDate: '2026-05-01',
      location: 'Fridge',
      quantity: null,
      category: null,
      notes: null,
      days: null,
      confidence: 0.45,
      needsConfirmation: true,
      missingFields: []
    });

    expect(result.canWrite).toBe(false);
  });

  it('allows confident list actions', () => {
    const result = handleParsedCommand({
      action: 'list_food',
      itemName: null,
      expirationDate: null,
      location: null,
      quantity: null,
      category: null,
      notes: null,
      days: null,
      confidence: 0.99,
      needsConfirmation: false,
      missingFields: []
    });

    expect(result).toEqual({
      action: 'list_food',
      canWrite: true
    });
  });
});

