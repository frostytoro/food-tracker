import cron from 'node-cron';
import type { GuildTextBasedChannel } from 'discord.js';
import { DateTime } from 'luxon';
import type { Logger } from '../utils/logger.js';
import type { NotionFoodService } from '../notion/service.js';
import { formatExpiringReport } from '../discord/formatters.js';
import type { ReminderStateStore } from './reminderStore.js';

interface ReminderDeps {
  cronExpression: string;
  timezone: string;
  expiringSoonDays: number;
  notionService: NotionFoodService;
  reminderChannel: GuildTextBasedChannel;
  stateStore: ReminderStateStore;
  logger: Logger;
}

export function startReminderJob({
  cronExpression,
  timezone,
  expiringSoonDays,
  notionService,
  reminderChannel,
  stateStore,
  logger
}: ReminderDeps) {
  return cron.schedule(
    cronExpression,
    async () => {
      const today = DateTime.now().setZone(timezone).toISODate();
      const state = await stateStore.getState();

      if (state.lastReminderDate === today) {
        logger.info('Skipping reminder because it already ran today.', { today });
        return;
      }

      const expiring = await notionService.findItemsExpiringWithin(expiringSoonDays, timezone);
      const expired = await notionService.findExpiredItems(timezone);
      const message = formatExpiringReport(expiring, expired, timezone);

      await reminderChannel.send({
        content: `Daily food expiration report for ${today}\n\n${message}`
      });

      await stateStore.saveState({
        lastReminderDate: today
      });
    },
    {
      timezone
    }
  );
}
