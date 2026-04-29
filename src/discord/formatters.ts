import type { FoodItem } from '../types/food.js';
import { daysUntil, formatFriendlyDate } from '../utils/date.js';

export function formatFoodItem(item: FoodItem, timezone: string, now = new Date()): string {
  const expiration = item.expirationDate
    ? `${formatFriendlyDate(item.expirationDate, timezone)} (${daysUntil(item.expirationDate, timezone, now)} days)`
    : 'No expiration set';

  return [
    `• **${item.name}**`,
    `Status: ${item.status ?? 'Unknown'}`,
    `Expiration: ${expiration}`,
    `Location: ${item.location ?? 'Unknown'}`,
    item.quantity ? `Quantity: ${item.quantity}` : null,
    item.category ? `Category: ${item.category}` : null,
    item.notes ? `Notes: ${item.notes}` : null
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatExpiringReport(
  expiringItems: FoodItem[],
  expiredItems: FoodItem[],
  timezone: string,
  now = new Date()
): string {
  const soonSection =
    expiringItems.length > 0
      ? expiringItems.map((item) => formatFoodItem(item, timezone, now)).join('\n\n')
      : 'No items are expiring soon.';

  const expiredSection =
    expiredItems.length > 0
      ? expiredItems.map((item) => formatFoodItem(item, timezone, now)).join('\n\n')
      : 'No items are already expired.';

  return [`## Expiring Soon`, soonSection, `## Already Expired`, expiredSection].join('\n\n');
}

export function helpMessage(): string {
  return [
    'I can track food expiration dates in Notion from slash commands, plain text, and voice messages.',
    '',
    'Slash commands:',
    '/add-food name:<item> expiration:<date>',
    '/update-food name:<item> expiration:<date>',
    '/remove-food name:<item>',
    '/list-food',
    '/expiring days:<number>',
    '/help',
    '',
    'Plain text examples:',
    '"Add broccoli to the pantry list and give it an expiration date of May 12, 2026."',
    '"Add milk to fridge, expires next Friday."',
    '"What food is expiring this week?"',
    '',
    'Voice messages:',
    'Attach or send a Discord voice message in the allowed channel and I will transcribe it before making any Notion changes.'
  ].join('\n');
}

