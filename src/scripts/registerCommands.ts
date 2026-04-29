import { getEnv } from '../config/env.js';
import { Logger } from '../utils/logger.js';
import { FoodCommandParser } from '../ai/parser.js';
import { AudioTranscriptionService } from '../ai/transcription.js';
import { NotionFoodService } from '../notion/service.js';
import { DiscordFoodBot } from '../discord/bot.js';
import { createOpenAIClient } from '../openai/client.js';

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

  await bot.registerGuildCommands();
  logger.info('Registered guild slash commands.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(message);
  process.exitCode = 1;
});
