import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_GUILD_ID: z.string().min(1, 'DISCORD_GUILD_ID is required'),
  DISCORD_ALLOWED_CHANNEL_IDS: z.string().min(1, 'DISCORD_ALLOWED_CHANNEL_IDS is required'),
  DISCORD_REMINDER_CHANNEL_ID: z.string().min(1, 'DISCORD_REMINDER_CHANNEL_ID is required'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_MODEL: z.string().min(1).default('gpt-4.1-mini'),
  OPENAI_TRANSCRIPTION_MODEL: z.string().min(1).default('gpt-4o-mini-transcribe'),
  NOTION_API_KEY: z.string().min(1, 'NOTION_API_KEY is required'),
  NOTION_DATABASE_ID: z.string().min(1, 'NOTION_DATABASE_ID is required'),
  EXPIRING_SOON_DAYS: z.coerce.number().int().positive().default(5),
  REMINDER_CRON: z.string().min(1).default('0 9 * * *'),
  TIMEZONE: z.string().min(1).default('America/Los_Angeles'),
  DRY_RUN: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info')
});

export type RawEnv = z.input<typeof envSchema>;
export type AppEnv = z.infer<typeof envSchema> & {
  allowedChannelIds: string[];
};

export function parseEnv(rawEnv: NodeJS.ProcessEnv): AppEnv {
  const parsed = envSchema.parse(rawEnv);
  const allowedChannelIds = parsed.DISCORD_ALLOWED_CHANNEL_IDS.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (allowedChannelIds.length === 0) {
    throw new Error('DISCORD_ALLOWED_CHANNEL_IDS must contain at least one channel ID');
  }

  return {
    ...parsed,
    allowedChannelIds
  };
}

export function getEnv(): AppEnv {
  return parseEnv(process.env);
}
