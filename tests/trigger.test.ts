import { describe, expect, it } from 'vitest';
import { stripTriggerPhrase } from '../src/discord/bot.js';

describe('stripTriggerPhrase', () => {
  it('strips the Hey Kirby trigger and returns the command body', () => {
    expect(stripTriggerPhrase('Hey Kirby, add broccoli to the pantry')).toBe(
      'add broccoli to the pantry'
    );
  });

  it('matches the trigger phrase case-insensitively', () => {
    expect(stripTriggerPhrase('hey kirby, what food is expiring this week?')).toBe(
      'what food is expiring this week?'
    );
  });

  it('ignores messages without the trigger', () => {
    expect(stripTriggerPhrase('add broccoli to the pantry')).toBeNull();
  });

  it('ignores trigger-only messages', () => {
    expect(stripTriggerPhrase('Hey Kirby,')).toBeNull();
  });
});
