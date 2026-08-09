import { loadConfig } from "./config.js";
import { getTelegramUpdates } from "./telegram.js";
import {
  chatLabelFromMessage,
  printChatIdBanner,
  readRememberedChats,
  rememberChat,
} from "./telegramChats.js";

/**
 * Prints chat ids from people who messaged the bot.
 *
 * Note: only one process can call getUpdates at a time. If npm start is
 * running, it already consumes /start — look at that terminal, or use the
 * remembered chats below (written whenever the inbox sees /start).
 */
const { botToken, chatId: configuredChatId } = loadConfig({
  requireTelegram: false,
});

if (!botToken) {
  console.error("Add TELEGRAM_BOT_TOKEN to .env first.");
  process.exitCode = 1;
} else {
  const seen = new Map();

  if (configuredChatId) {
    seen.set(String(configuredChatId), "(already in .env as TELEGRAM_CHAT_ID)");
  }

  const remembered = await readRememberedChats();
  for (const [id, meta] of Object.entries(remembered)) {
    const label = meta?.label ? String(meta.label) : "";
    const prev = seen.get(id);
    seen.set(id, [label, prev].filter(Boolean).join(" — ") || "remembered");
  }

  let conflict = false;
  let queueEmpty = false;

  try {
    const updates = await getTelegramUpdates(botToken, 0, { timeout: 0 });
    queueEmpty = updates.length === 0;

    for (const update of updates) {
      const msg = update.message;
      if (!msg?.chat) continue;
      const id = String(msg.chat.id);
      const label = chatLabelFromMessage(msg);
      seen.set(id, label || seen.get(id) || "");
      await rememberChat(id, label);
    }
  } catch (error) {
    const message = error.message || String(error);
    if (/conflict|terminated by other getUpdates/i.test(message)) {
      conflict = true;
    } else {
      console.error(message);
      process.exitCode = 1;
    }
  }

  if (seen.size > 0) {
    console.log("Chat ids found — put one in .env as TELEGRAM_CHAT_ID:\n");
    for (const [id, label] of seen) {
      printChatIdBanner(id, label);
    }
  } else {
    console.log("No chat ids found yet.\n");
  }

  if (conflict) {
    console.log(
      "Note: getUpdates is already in use (usually npm start). That process owns the live queue.",
    );
    console.log(
      "Look in the npm start terminal for a \"TELEGRAM CHAT ID: …\" banner after /start,",
    );
    console.log("or stop npm start, tap Start in Telegram, then re-run this command.\n");
  } else if (queueEmpty && !configuredChatId && seen.size === 0) {
    console.log("No recent messages in Telegram's queue.");
    console.log("1) Open your bot in Telegram and tap Start (or send /start)");
    console.log("2) Prefer: keep npm start running — the chat id prints there");
    console.log("3) Or stop npm start, tap Start, then: npm run telegram:chat-id\n");
  } else if (queueEmpty && configuredChatId) {
    console.log(
      `Configured TELEGRAM_CHAT_ID=${configuredChatId} — you are already set.`,
    );
    console.log(
      "(Live queue was empty because npm start may have already consumed /start.)\n",
    );
  }
}
