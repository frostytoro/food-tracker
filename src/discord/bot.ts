import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  type ApplicationCommandOptionChoiceData,
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  REST,
  Routes,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type GuildTextBasedChannel,
  type Message
} from 'discord.js';
import type { AppEnv } from '../config/env.js';
import type { FoodCommandParser } from '../ai/parser.js';
import type { AudioTranscriptionService } from '../ai/transcription.js';
import type { Logger } from '../utils/logger.js';
import type { NotionFoodService } from '../notion/service.js';
import { CooldownManager } from './cooldown.js';
import { slashCommands } from './commands.js';
import { formatExpiringReport, formatFoodItem, formatFoodListPage, helpMessage } from './formatters.js';
import { ensureIsoDate, getTodayInTimezone, normalizeDateInput } from '../utils/date.js';

interface BotDependencies {
  env: AppEnv;
  logger: Logger;
  parser: FoodCommandParser;
  transcriptionService: AudioTranscriptionService;
  notionService: NotionFoodService;
}

interface CommandContext {
  requestSource: 'slash' | 'text' | 'voice';
  actorName: string;
}

export class DiscordFoodBot {
  readonly client: Client;
  readonly cooldownManager = new CooldownManager(5_000);

  constructor(private readonly deps: BotDependencies) {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
    });
  }

  async start(): Promise<void> {
    this.registerEventHandlers();
    await this.client.login(this.deps.env.DISCORD_TOKEN);
  }

  async registerGuildCommands(): Promise<void> {
    const rest = new REST({ version: '10' }).setToken(this.deps.env.DISCORD_TOKEN);
    await rest.put(
      Routes.applicationGuildCommands(this.deps.env.DISCORD_CLIENT_ID, this.deps.env.DISCORD_GUILD_ID),
      {
        body: slashCommands
      }
    );
  }

  private registerEventHandlers(): void {
    this.client.once(Events.ClientReady, (client) => {
      void (async () => {
        this.deps.logger.info('Discord bot connected.', {
          user: client.user.tag
        });
        await this.deps.notionService.ensureSchema();
      })();
    });

    this.client.on(Events.InteractionCreate, (interaction) => {
      void (async () => {
        if (interaction.isAutocomplete()) {
          try {
            await this.handleAutocomplete(interaction);
          } catch (error) {
            this.deps.logger.error('Failed handling autocomplete interaction.', {
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
          return;
        }

        if (!interaction.isChatInputCommand()) {
          return;
        }

        try {
          await this.handleSlashCommand(interaction);
        } catch (error) {
          this.deps.logger.error('Failed handling slash command.', {
            command: interaction.commandName,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          await replySafely(interaction, 'Something went wrong while processing that command.');
        }
      })();
    });

    this.client.on(Events.MessageCreate, (message) => {
      void (async () => {
        if (message.author.bot || !message.inGuild()) {
          return;
        }

        if (!this.isAllowedChannel(message.channelId)) {
          return;
        }

        try {
          await this.handleMessage(message);
        } catch (error) {
          this.deps.logger.error('Failed handling message.', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          await message.reply('Something went wrong while processing that message.');
        }
      })();
    });
  }

  private async handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!this.isAllowedChannel(interaction.channelId)) {
      await interaction.reply({
        content: 'This bot only works in the configured food-tracking channels.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const actorName = interaction.user.username;
    switch (interaction.commandName) {
      case 'add-food': {
        const expirationInput = interaction.options.getString('expiration');
        const normalizedExpiration = expirationInput
          ? normalizeDateInput(expirationInput, this.deps.env.TIMEZONE)
          : null;

        if (expirationInput && !normalizedExpiration) {
          await interaction.reply('I could not understand that expiration date. Try a date like 2026-05-12 or next Friday.');
          return;
        }

        const created = await this.deps.notionService.addFood({
          itemName: interaction.options.getString('name', true),
          expirationDate: normalizedExpiration,
          location: interaction.options.getString('location'),
          quantity: interaction.options.getString('quantity'),
          category: interaction.options.getString('category'),
          notes: interaction.options.getString('notes'),
          addedBy: actorName,
          status: 'Active'
        });

        await interaction.reply(`Added food item:\n${formatFoodItem(created, this.deps.env.TIMEZONE)}`);
        return;
      }
      case 'update-food': {
        const matches = await this.deps.notionService.findByName(interaction.options.getString('name', true));
        const activeMatches = matches.filter((item) => item.status !== 'Removed' && item.status !== 'Used');
        if (activeMatches.length !== 1) {
          await interaction.reply(
            activeMatches.length === 0
              ? 'I could not find a matching active food item to update.'
              : 'I found multiple matching food items. Please be more specific.'
          );
          return;
        }

        const match = activeMatches[0];
        if (!match) {
          throw new Error('Expected exactly one active match for update-food');
        }

        const expirationInput = interaction.options.getString('expiration');
        const normalizedExpiration = expirationInput
          ? normalizeDateInput(expirationInput, this.deps.env.TIMEZONE)
          : null;

        if (expirationInput && !normalizedExpiration) {
          await interaction.reply('I could not understand that expiration date.');
          return;
        }

        await this.deps.notionService.updateFood(match.id, {
          expirationDate: normalizedExpiration,
          location: interaction.options.getString('location'),
          quantity: interaction.options.getString('quantity'),
          category: interaction.options.getString('category'),
          notes: interaction.options.getString('notes'),
          addedBy: actorName
        });

        await interaction.reply(`Updated **${match.name}**.`);
        return;
      }
      case 'remove-food': {
        const matches = await this.deps.notionService.findByName(interaction.options.getString('name', true));
        const activeMatches = matches.filter((item) => item.status !== 'Removed' && item.status !== 'Used');
        if (activeMatches.length !== 1) {
          await interaction.reply(
            activeMatches.length === 0
              ? 'I could not find a matching active food item to remove.'
              : 'I found multiple matching food items. Please be more specific.'
          );
          return;
        }

        const match = activeMatches[0];
        if (!match) {
          throw new Error('Expected exactly one active match for remove-food');
        }
        const status = interaction.options.getString('status') ?? 'Removed';
        await this.deps.notionService.softRemoveFood(match.id, status);
        await interaction.reply(`Marked **${match.name}** as **${status}**.`);
        return;
      }
      case 'list-food': {
        const page = interaction.options.getInteger('page') ?? 1;
        const items = await this.deps.notionService.listCurrentFoodItems(this.deps.env.TIMEZONE);
        await interaction.reply(formatFoodListPage(items, page, 10, this.deps.env.TIMEZONE));
        return;
      }
      case 'expiring': {
        const days = interaction.options.getInteger('days') ?? this.deps.env.EXPIRING_SOON_DAYS;
        const expiring = await this.deps.notionService.findItemsExpiringWithin(days, this.deps.env.TIMEZONE);
        const expired = await this.deps.notionService.findExpiredItems(this.deps.env.TIMEZONE);
        await interaction.reply(formatExpiringReport(expiring, expired, this.deps.env.TIMEZONE));
        return;
      }
      case 'help': {
        await interaction.reply(helpMessage());
        return;
      }
      default: {
        await interaction.reply('Unknown command.');
      }
    }
  }

  private async handleMessage(message: Message): Promise<void> {
    if (!this.cooldownManager.canProceed(message.author.id)) {
      await message.reply('Please wait a few seconds before sending another food-tracking request.');
      return;
    }

    const audioAttachment = message.attachments.find((attachment) => isAudioAttachment(attachment.contentType, attachment.name));

    if (audioAttachment) {
      const transcript = await this.handleAudioAttachment(audioAttachment.url);
      const reply = await this.executeParsedCommand(transcript, {
        requestSource: 'voice',
        actorName: message.author.username
      });
      await message.reply(`Transcript: "${transcript}"\n\n${reply}`);
      return;
    }

    if (!message.content.trim()) {
      return;
    }

    const reply = await this.executeParsedCommand(message.content, {
      requestSource: 'text',
      actorName: message.author.username
    });
    await message.reply(reply);
  }

  private async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const query = focused.value.toLowerCase();
    let options: string[] = [];

    if (focused.name === 'category') {
      options = await this.deps.notionService.getPropertyOptions(['Category']);
    } else if (focused.name === 'location') {
      options = await this.deps.notionService.getPropertyOptions(['Location']);
    } else {
      await interaction.respond([]);
      return;
    }

    const filtered = options
      .filter((option) => option.toLowerCase().includes(query))
      .slice(0, 25)
      .map(
        (option): ApplicationCommandOptionChoiceData<string> => ({
          name: option,
          value: option
        })
      );

    await interaction.respond(filtered);
  }

  private async handleAudioAttachment(url: string): Promise<string> {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'food-tracker-'));
    const tempFile = path.join(tempDir, 'voice-message');

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download attachment: ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(tempFile, buffer);
      return await this.deps.transcriptionService.transcribeFile(tempFile);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private async executeParsedCommand(message: string, context: CommandContext): Promise<string> {
    const today = getTodayInTimezone(this.deps.env.TIMEZONE).toISODate();
    if (!today) {
      throw new Error('Failed to resolve the current date in the configured timezone');
    }

    const parsed = await this.deps.parser.parseMessage(message, today);
    const normalizedExpiration = ensureIsoDate(parsed.expirationDate);

    if (parsed.needsConfirmation || parsed.confidence < 0.7) {
      return `I am not confident enough to write that to Notion yet. Please confirm or rephrase.\n\nParsed action: ${parsed.action}\nItem: ${parsed.itemName ?? 'Unknown'}\nExpiration: ${normalizedExpiration ?? 'Missing'}`;
    }

    if ((parsed.action === 'add_food' || parsed.action === 'update_food') && parsed.missingFields.length > 0) {
      return `I still need ${parsed.missingFields.join(', ')} before I can update Notion.`;
    }

    switch (parsed.action) {
      case 'add_food': {
        if (!parsed.itemName || !normalizedExpiration) {
          return 'I need both the food item name and an expiration date before I can add it.';
        }

        const created = await this.deps.notionService.addFood({
          itemName: parsed.itemName,
          expirationDate: normalizedExpiration,
          location: parsed.location,
          quantity: parsed.quantity,
          category: parsed.category,
          notes: parsed.notes,
          status: 'Active',
          addedBy: context.actorName
        });

        return `Added food item:\n${formatFoodItem(created, this.deps.env.TIMEZONE)}`;
      }
      case 'update_food': {
        if (!parsed.itemName) {
          return 'I need the food item name before I can update it.';
        }

        const matches = await this.deps.notionService.findByName(parsed.itemName);
        const activeMatches = matches.filter((item) => item.status !== 'Removed' && item.status !== 'Used');

        if (activeMatches.length !== 1) {
          return activeMatches.length === 0
            ? 'I could not find a matching active food item to update.'
            : 'I found multiple matching food items. Please be more specific.';
        }

        const match = activeMatches[0];
        if (!match) {
          throw new Error('Expected exactly one active match for update_food');
        }

        const updatePayload = {
          expirationDate: normalizedExpiration,
          location: parsed.location,
          quantity: parsed.quantity,
          category: parsed.category,
          notes: parsed.notes,
          addedBy: context.actorName
        };

        const hasAnyUpdate = Object.values(updatePayload).some((value) => value !== null && value !== undefined);
        if (!hasAnyUpdate) {
          return 'I could not find any updated fields to change.';
        }

        await this.deps.notionService.updateFood(match.id, updatePayload);
        return `Updated **${match.name}** successfully.`;
      }
      case 'remove_food': {
        if (!parsed.itemName) {
          return 'I need the food item name before I can remove it.';
        }

        const matches = await this.deps.notionService.findByName(parsed.itemName);
        const activeMatches = matches.filter((item) => item.status !== 'Removed' && item.status !== 'Used');

        if (activeMatches.length !== 1) {
          return activeMatches.length === 0
            ? 'I could not find a matching active food item to remove.'
            : 'I found multiple matching food items. Please be more specific.';
        }

        const match = activeMatches[0];
        if (!match) {
          throw new Error('Expected exactly one active match for remove_food');
        }
        await this.deps.notionService.softRemoveFood(match.id);
        return `Marked **${match.name}** as **Removed**.`;
      }
      case 'list_food': {
        const items = await this.deps.notionService.listCurrentFoodItems(this.deps.env.TIMEZONE);
        return formatFoodListPage(items, 1, 10, this.deps.env.TIMEZONE);
      }
      case 'expiring_food': {
        const days = parsed.days ?? this.deps.env.EXPIRING_SOON_DAYS;
        const expiring = await this.deps.notionService.findItemsExpiringWithin(days, this.deps.env.TIMEZONE);
        const expired = await this.deps.notionService.findExpiredItems(this.deps.env.TIMEZONE);
        return formatExpiringReport(expiring, expired, this.deps.env.TIMEZONE);
      }
      case 'help':
        return helpMessage();
      default:
        return 'I could not understand that request. Try `/help` for examples.';
    }
  }

  isAllowedChannel(channelId: string | null): boolean {
    return channelId ? this.deps.env.allowedChannelIds.includes(channelId) : false;
  }

  getReminderChannel(): GuildTextBasedChannel {
    const channel = this.client.channels.cache.get(this.deps.env.DISCORD_REMINDER_CHANNEL_ID);
    if (!channel || channel.type === ChannelType.DM) {
      throw new Error('Reminder channel is not available in the client cache');
    }

    return channel as GuildTextBasedChannel;
  }
}

async function replySafely(interaction: ChatInputCommandInteraction, content: string): Promise<void> {
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(content);
    return;
  }

  await interaction.reply(content);
}

function isAudioAttachment(contentType: string | null, fileName: string): boolean {
  return Boolean(
    contentType?.startsWith('audio/') || /\.(mp3|mp4|m4a|ogg|wav|webm)$/i.test(fileName)
  );
}
