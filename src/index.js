import cron from "node-cron";
import { loadConfig } from "./config.js";
import { sendDailyFact } from "./sendDaily.js";
import { listSubscribers, subscribe } from "./subscribers.js";
import { startTelegramInbox } from "./telegramInbox.js";

const config = loadConfig({ requireTelegram: false });
const { timezone, botToken, chatId: legacyChatId } = config;

/** One-time: if .env still has TELEGRAM_CHAT_ID and the list is empty, keep them subscribed. */
async function migrateLegacyChatId() {
  if (!legacyChatId) return;
  const existing = await listSubscribers();
  if (existing.some((s) => s.chatId === String(legacyChatId))) return;
  if (existing.length > 0) return;
  const { created } = await subscribe(legacyChatId, {
    name: "from TELEGRAM_CHAT_ID",
  });
  if (created) {
    console.log(
      `Migrated TELEGRAM_CHAT_ID=${legacyChatId} into subscribers (you can remove it from .env).`,
    );
  }
}

const expression = "0 8 * * *";
const sendTimeLabel = "8:00 AM";

console.log(`Daily Finance Facts scheduler started`);
console.log(`Timezone: ${timezone}`);
console.log(`Schedule: every day at ${sendTimeLabel}`);
console.log(`Keep this process running (or use a process manager).`);

cron.schedule(
  expression,
  async () => {
    const stamp = new Date().toLocaleString("en-GB", { timeZone: timezone });
    console.log(`\n[${stamp}] Sending today's finance briefing…`);
    try {
      await sendDailyFact();
    } catch (error) {
      console.error(`[${stamp}] Failed:`, error.message || error);
    }
  },
  { timezone },
);

try {
  loadConfig({ requireTelegram: true });
  await migrateLegacyChatId();
  const subscribers = await listSubscribers();
  console.log(
    `Telegram bot token present. Subscribers: ${subscribers.length}`,
  );
} catch (error) {
  console.warn(`Warning: ${error.message}`);
  console.warn("Fix .env before 08:00 or the send will fail.");
}

if (botToken) {
  startTelegramInbox({ botToken, sendTimeLabel }).catch((error) => {
    console.error("Telegram inbox crashed:", error.message || error);
  });
} else {
  console.warn(
    "TELEGRAM_BOT_TOKEN missing — /start and on-demand facts disabled.",
  );
}
