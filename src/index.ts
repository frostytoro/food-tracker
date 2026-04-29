import path from 'node:path';
import { getEnv } from './config/env.js';
import { Logger } from './utils/logger.js';
import { FoodCommandParser } from './ai/parser.js';
import { AudioTranscriptionService } from './ai/transcription.js';
import { NotionFoodService } from './notion/service.js';
import { DiscordFoodBot } from './discord/bot.js';
import { ReminderStateStore } from './scheduler/reminderStore.js';
import { startReminderJob } from './scheduler/reminderService.js';
import { createOpenAIClient } from './openai/client.js';

async function main() {
  const env = getEnv();
  const logger = new Logger(env.LOG_LEVEL);
  const openai = createOpenAIClient(env.OPENAI_API_KEY);
  const parser = new FoodCommandParser(openai, env.OPENAI_MODEL, env.TIMEZONE);
  const transcriptionService = new AudioTranscriptionService(openai, env.OPENAI_TRANSCRIPTION_MODEL);
  const notionService = new NotionFoodService(
    env.NOTION_API_KEY,
    env.NOTION_DATABASE_ID,
    logger,
    env.DRY_RUN
  );

  const bot = new DiscordFoodBot({
    env,
    logger,
    parser,
    transcriptionService,
    notionService
  });

  await bot.start();

  bot.client.once('ready', () => {
    const reminderChannel = bot.getReminderChannel();
    const stateStore = new ReminderStateStore(path.resolve('data/reminder-state.json'));

    startReminderJob({
      cronExpression: env.REMINDER_CRON,
      timezone: env.TIMEZONE,
      expiringSoonDays: env.EXPIRING_SOON_DAYS,
      notionService,
      reminderChannel,
      stateStore,
      logger
    });

    logger.info('Reminder scheduler started.', {
      cron: env.REMINDER_CRON,
      timezone: env.TIMEZONE
    });
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(message);
  process.exitCode = 1;
});
