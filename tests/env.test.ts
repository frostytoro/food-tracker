import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env.js';

describe('parseEnv', () => {
  it('parses and normalizes allowed channel ids', () => {
    const env = parseEnv({
      DISCORD_TOKEN: 'token',
      DISCORD_CLIENT_ID: 'client',
      DISCORD_GUILD_ID: 'guild',
      DISCORD_ALLOWED_CHANNEL_IDS: '123,456',
      DISCORD_REMINDER_CHANNEL_ID: '123',
      OPENAI_API_KEY: 'openai',
      OPENAI_MODEL: 'gpt-4.1-mini',
      OPENAI_TRANSCRIPTION_MODEL: 'gpt-4o-mini-transcribe',
      NOTION_API_KEY: 'notion',
      NOTION_DATABASE_ID: 'database',
      EXPIRING_SOON_DAYS: '5',
      REMINDER_CRON: '0 9 * * *',
      TIMEZONE: 'America/Los_Angeles',
      DRY_RUN: 'false',
      LOG_LEVEL: 'info'
    });

    expect(env.allowedChannelIds).toEqual(['123', '456']);
    expect(env.DRY_RUN).toBe(false);
  });

  it('throws when allowed channels are missing', () => {
    expect(() =>
      parseEnv({
        DISCORD_TOKEN: 'token',
        DISCORD_CLIENT_ID: 'client',
        DISCORD_GUILD_ID: 'guild',
        DISCORD_ALLOWED_CHANNEL_IDS: '   ',
        DISCORD_REMINDER_CHANNEL_ID: '123',
        OPENAI_API_KEY: 'openai',
        OPENAI_MODEL: 'gpt-4.1-mini',
        OPENAI_TRANSCRIPTION_MODEL: 'gpt-4o-mini-transcribe',
        NOTION_API_KEY: 'notion',
        NOTION_DATABASE_ID: 'database',
        EXPIRING_SOON_DAYS: '5',
        REMINDER_CRON: '0 9 * * *',
        TIMEZONE: 'America/Los_Angeles',
        DRY_RUN: 'false',
        LOG_LEVEL: 'info'
      })
    ).toThrow('DISCORD_ALLOWED_CHANNEL_IDS must contain at least one channel ID');
  });
});

