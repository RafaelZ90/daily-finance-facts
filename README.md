# Daily Finance Facts

Sends a sharp educational finance briefing on **Telegram** every day at **8:00 AM** to everyone who subscribed via the bot.

This is a **separate** project from [daily-animal-facts](https://github.com/RafaelZ90/daily-animal-facts) — same architecture, different domain (markets education, not wildlife).

## 1. Create the bot (2 minutes)

1. Open Telegram and chat with [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts (pick a name and username)
3. Copy the token BotFather gives you (looks like `123456:ABC-DEF...`)

Use a **new** bot — do not reuse another project's token.

## 2. Put the token in `.env`

```bash
cp .env.example .env
```

Edit `.env`:

```env
TELEGRAM_BOT_TOKEN=paste_token_here
TZ=Asia/Singapore
```

No chat id needed — people subscribe by tapping **Start** in Telegram.

## 3. Install & run

Requires **Node.js 18+**. If you already have a portable Node under another project's `.tools/node`, you can symlink it:

```bash
mkdir -p .tools && ln -sfn ../daily-animal-facts/.tools/node .tools/node
```

Or install Node from [nodejs.org](https://nodejs.org). Then:

```bash
npm install
npm start
```

Open your bot in Telegram and tap **Start** (or send `/start`). That saves their chat id automatically. They'll get the shared daily briefing at 8:00 AM.

- **`/start`** — subscribe + welcome (command list)
- **`/stop`** or **`/unsubscribe`** — leave the list
- **`/fact`** or any other text — one on-demand briefing (≈30s cooldown per chat)
- **`/help`** — show commands again

## 4. Test & schedule

```bash
npm run test:fact   # preview only (no Telegram)
npm run send        # send today's briefing to all subscribers now
npm start           # every day at 08:00 + inbox
```

## Commands

| Command | What it does |
|---|---|
| `npm start` | Scheduler at 08:00 + Telegram inbox (`/start`, `/stop`, `/fact`) |
| `npm run send` | Send one shared briefing immediately to all subscribers |
| `npm run test:fact` | Print a briefing without Telegram |
| `npm run telegram:chat-id` | Legacy helper to list chat ids (optional) |

Subscribers are stored in `data/subscribers.json` (gitignored). Curated briefs live in `data/facts.json`.

## Content

Briefings cover asset classes, market structure, valuation, risk/return, fixed income, derivatives, portfolio theory, liquidity, and systemic risk — written for finance professionals, not consumer tip lists. Images are optional (Wikipedia when a solid photo exists); text-first is the default.
