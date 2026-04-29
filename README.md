# Food Tracker Discord Bot

A production-ready Discord bot and lightweight AI agent for tracking food expiration dates in a Notion database. It supports slash commands, natural-language text messages in allowed channels, Discord voice messages and audio attachments, daily reminders, and structured parsing with OpenAI.

## Features

- Slash commands:
  - `/add-food`
  - `/update-food`
  - `/remove-food`
  - `/list-food`
  - `/expiring`
  - `/help`
- Plain-text requests in allowed channels
- Voice-message and audio attachment transcription with OpenAI
- Notion-backed food storage and expiration tracking
- Daily reminder job with duplicate-run protection
- Startup env validation and safe defaults
- Per-user cooldown for AI parsing requests
- TypeScript, ESLint, Prettier, and Vitest
- Render background worker deployment support

## Tech Stack

- Node.js
- TypeScript
- [discord.js](https://discord.js.org/)
- [OpenAI API](https://platform.openai.com/docs/overview)
- [Notion API](https://developers.notion.com/)
- [node-cron](https://github.com/node-cron/node-cron)
- [zod](https://zod.dev/)
- [vitest](https://vitest.dev/)

## Supported Notion Database Properties

The bot now supports both the original generic schema and the property names from your current Notion setup.

Supported title property:

- `Item` or `Name`

Supported expiration date property:

- `Expiration Date` or `Expiration`

Optional supported properties:

- `Category`
- `Expiration Notes` or `Notes`
- `Location`
- `Quantity`
- `Status`
- `Added By`
- `Last edited time` or `Last Updated`

For your current database from the screenshot, the important columns are:

- `Item`
- `Category`
- `Expiration`
- `Expiration Notes`
- `Last edited time`

If both `Expiration` and `Expiration Date` exist, the bot now treats `Expiration` as the source of truth for reminders, expiring-item checks, and expired-item checks.

## Environment Variables

Copy [.env.example](/C:/Users/dvillatoro/Documents/New%20project/.env.example) to `.env` and fill in your values.

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
DISCORD_ALLOWED_CHANNEL_IDS=
DISCORD_REMINDER_CHANNEL_ID=

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe

NOTION_API_KEY=
NOTION_DATABASE_ID=

EXPIRING_SOON_DAYS=5
REMINDER_CRON=0 9 * * *
TIMEZONE=America/Los_Angeles
DRY_RUN=false
LOG_LEVEL=info
```

## Discord Setup

1. Create a Discord application in the Discord Developer Portal.
2. Create a bot user for the application.
3. Enable `MESSAGE CONTENT INTENT` for plain-text parsing.
4. Invite the bot to your server with:
   - `bot`
   - `applications.commands`
5. Give the bot at least:
   - `View Channels`
   - `Send Messages`
   - `Use Slash Commands`
   - `Read Message History`
   - `Attach Files`
6. Set:
   - `DISCORD_CLIENT_ID` to the Application ID
   - `DISCORD_GUILD_ID` to your server ID
   - `DISCORD_ALLOWED_CHANNEL_IDS` to a comma-separated list
   - `DISCORD_REMINDER_CHANNEL_ID` to the reminder channel ID
   - `DISCORD_TOKEN` to the bot token

## Notion Setup

1. Create a Notion integration at [Notion Integrations](https://www.notion.so/my-integrations).
2. Copy the integration secret into `NOTION_API_KEY`.
3. Create the food tracking database with at least a title column and expiration date column.
4. Share the database with the integration.
5. Copy the database ID into `NOTION_DATABASE_ID`.

For your current setup, use the database ID from the path part of the URL, not the `v=` parameter. Example:

```txt
https://www.notion.so/6fcb01ceca794188a717b3064dd6b9aa?v=c155e4a18d83416c9143742361596963
```

Use:

```txt
NOTION_DATABASE_ID=6fcb01ceca794188a717b3064dd6b9aa
```

Do not use the `v=` value as the database ID.

## OpenAI Setup

1. Create or choose an OpenAI API key.
2. Set `OPENAI_API_KEY`.
3. Recommended defaults:
   - `OPENAI_MODEL=gpt-4.1-mini`
   - `OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe`

The bot uses OpenAI Structured Outputs for natural-language parsing and the audio transcription API for voice messages. Official references:

- [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs?lang=javascript)
- [Speech to text](https://platform.openai.com/docs/guides/speech-to-text?lang=javascript)

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`.

3. Register slash commands for your development guild:

```bash
npm run register:commands
```

4. Start the bot:

```bash
npm run dev
```

## Available Commands

### Slash commands

- `/add-food name:milk expiration:next Friday location:Fridge`
- `/update-food name:milk expiration:2026-05-08`
- `/remove-food name:milk status:Used`
- `/list-food`
- `/expiring days:7`
- `/help`

### Plain-text examples

- `Add broccoli to the pantry list and give it an expiration date of May 12, 2026.`
- `Add milk to fridge, expires next Friday.`
- `What food is expiring this week?`

### Voice message behavior

When a user uploads a Discord voice message or supported audio attachment in an allowed channel, the bot:

1. Downloads the audio to a temporary file.
2. Sends it to OpenAI transcription.
3. Parses the transcript into a structured command.
4. Executes the corresponding Notion action.
5. Replies with the transcript and the final result.

If confidence is low or required fields are missing, the bot asks for clarification instead of writing to Notion.

## Reminder Job

- Runs on `REMINDER_CRON`
- Uses `TIMEZONE`
- Looks ahead `EXPIRING_SOON_DAYS`
- Posts to `DISCORD_REMINDER_CHANNEL_ID`
- Stores the last successful reminder date in `data/reminder-state.json` to reduce duplicate sends after a restart

Note: local file persistence works well for local development and many worker restarts, but Render disks are not a durable database. If you need stronger duplicate protection across deploys or instance replacement, move this state into Redis, Notion, or another persistent store later.

## Render Deployment

This project is set up for Render as a Background Worker.

### Option 1: Blueprint

Use [render.yaml](/C:/Users/dvillatoro/Documents/New%20project/render.yaml) and create a new Blueprint deployment in Render.

### Option 2: Manual Background Worker

1. Create a new `Background Worker` in Render.
2. Connect the GitHub repo.
3. Set:
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm run start`
   - Node version: `24.12.0`
4. Add all environment variables from `.env.example`.

## Docker

Build locally with:

```bash
docker build -t food-tracker-bot .
```

Run with:

```bash
docker run --env-file .env food-tracker-bot
```

## Testing

Run the test suite:

```bash
npm run test
```

Run linting:

```bash
npm run lint
```

Build the project:

```bash
npm run build
```

## Troubleshooting

- If slash commands do not appear, rerun `npm run register:commands` and confirm the bot is in the target guild.
- If plain text messages are ignored, make sure `MESSAGE CONTENT INTENT` is enabled and the channel ID is in `DISCORD_ALLOWED_CHANNEL_IDS`.
- If Notion writes fail, confirm the database is shared with the integration and that the database includes either `Item` or `Name`, plus either `Expiration Date` or `Expiration`.
- If audio messages fail, confirm the attachment format is one of the supported OpenAI transcription formats.
- If reminders do not post, confirm the bot can access the reminder channel and `REMINDER_CRON` is valid.
- If the bot logs env validation errors at startup, check `.env` for missing required values.

## Security Notes

- Never commit `.env`.
- Rotate any secrets that were pasted into chat or shared insecurely.
- The logger avoids printing secrets, but upstream SDK errors may still contain request context, so keep production logs private.

## Future Improvements

- Persist duplicate-reminder state in Redis or a database
- Add interactive confirmation buttons for low-confidence requests
- Add item IDs or select menus for disambiguating duplicate food names
- Support global slash command registration after the guild-only phase
