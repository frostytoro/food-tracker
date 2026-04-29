import type OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import type { ParsedFoodCommand } from '../types/food.js';
import { ACTION_VALUES } from '../types/food.js';

const parsedFoodCommandSchema = z.object({
  action: z.enum(ACTION_VALUES),
  itemName: z.string().nullable(),
  expirationDate: z.string().nullable(),
  location: z.string().nullable(),
  quantity: z.string().nullable(),
  category: z.string().nullable(),
  notes: z.string().nullable(),
  days: z.number().int().nullable(),
  confidence: z.number().min(0).max(1),
  needsConfirmation: z.boolean(),
  missingFields: z.array(z.string())
});

function buildParsingPrompt(message: string, timezone: string, todayIso: string): string {
  return [
    'You parse food tracking requests for a Discord bot.',
    `The server timezone is ${timezone}.`,
    `Today in that timezone is ${todayIso}.`,
    'Convert relative dates like tomorrow, next Friday, and in 5 days into YYYY-MM-DD using that timezone.',
    'Never invent dates. If the user does not provide enough date information, set expirationDate to null and add it to missingFields.',
    'Required fields for add_food and update_food are itemName and expirationDate unless the request is clearly about updating a different field without touching the expiration date.',
    'If the request is ambiguous, confidence should be low and needsConfirmation should be true.',
    'For list_food, expiring_food, and help, leave unrelated fields null.',
    'missingFields should only contain fields the bot still needs before writing to Notion.',
    'Return only the structured object.',
    `User message: ${message}`
  ].join('\n');
}

export class FoodCommandParser {
  constructor(
    private readonly openai: OpenAI,
    private readonly model: string,
    private readonly timezone: string
  ) {}

  async parseMessage(message: string, todayIso: string): Promise<ParsedFoodCommand> {
    const response = await this.openai.responses.parse({
      model: this.model,
      input: buildParsingPrompt(message, this.timezone, todayIso),
      text: {
        format: zodTextFormat(parsedFoodCommandSchema, 'food_command')
      }
    });

    if (!response.output_parsed) {
      throw new Error('OpenAI returned no parsed command output');
    }

    return response.output_parsed;
  }
}
