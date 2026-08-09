import { getDailyFinanceFact } from "./facts.js";
import { subscribe, unsubscribe } from "./subscribers.js";
import {
  getTelegramUpdates,
  isHelpCommand,
  isStartCommand,
  isStopCommand,
  registerBotCommands,
  sendHelpMessage,
  sendTelegramBriefing,
  sendTelegramMessage,
  sendUnsubscribedMessage,
  sendWelcomeMessage,
} from "./telegram.js";
import {
  chatLabelFromMessage,
  rememberChat,
} from "./telegramChats.js";

const FACT_COOLDOWN_MS = 30_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Long-poll Telegram: /start → subscribe + welcome; /stop → unsubscribe;
 * /help → commands; any other text → fact.
 * Runs forever; safe to start alongside the daily cron.
 *
 * Only one getUpdates consumer can run at a time — keep a single npm start.
 */
export async function startTelegramInbox({
  botToken,
  sendTimeLabel = "8:00 AM",
}) {
  let offset = 0;
  /** @type {Map<string, number>} */
  const lastFactAt = new Map();

  try {
    await registerBotCommands(botToken);
    console.log(
      "Telegram bot commands registered (/start, /stop, /help, /fact).",
    );
  } catch (error) {
    console.warn(
      `Could not register bot commands: ${error.message || error}`,
    );
  }

  console.log(
    "Telegram inbox listening — /start to subscribe, /stop to leave, /fact on demand…",
  );

  while (true) {
    try {
      const updates = await getTelegramUpdates(botToken, offset, {
        timeout: 25,
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        const msg = update.message;
        if (!msg?.chat?.id || !msg.text) continue;

        const chatId = msg.chat.id;
        const chatKey = String(chatId);
        const label = chatLabelFromMessage(msg);
        const name = msg.from?.first_name || msg.chat.first_name || "friend";
        const text = msg.text.trim();

        await rememberChat(chatId, label);

        console.log(
          `[inbox] chat ${chatId} (${name}): ${text.slice(0, 80)}`,
        );

        if (isStartCommand(text)) {
          const { created } = await subscribe(chatId, { name: label || name });
          console.log(
            created
              ? `[subscribe] NEW ${name} (chat ${chatId}) — added to daily list`
              : `[subscribe] ${name} (chat ${chatId}) — already on the list (refreshed)`,
          );
          await sendWelcomeMessage({
            botToken,
            chatId,
            sendTimeLabel,
          });
          continue;
        }

        if (isStopCommand(text)) {
          const { removed } = await unsubscribe(chatId);
          console.log(
            removed
              ? `[unsubscribe] ${name} (chat ${chatId}) — removed from daily list`
              : `[unsubscribe] ${name} (chat ${chatId}) — was not subscribed`,
          );
          await sendUnsubscribedMessage({ botToken, chatId });
          continue;
        }

        if (isHelpCommand(text)) {
          console.log(`[/help] from ${name}`);
          await sendHelpMessage({
            botToken,
            chatId,
            sendTimeLabel,
          });
          continue;
        }

        const now = Date.now();
        const previous = lastFactAt.get(chatKey) || 0;
        const waitMs = FACT_COOLDOWN_MS - (now - previous);
        if (waitMs > 0) {
          const secs = Math.ceil(waitMs / 1000);
          console.log(
            `[fact] rate-limited chat ${chatId} — wait ~${secs}s`,
          );
          await sendTelegramMessage({
            botToken,
            chatId,
            textHtml: `Easy there — one on-demand briefing every 30 seconds. Try again in <b>${secs}</b>s.`,
          });
          continue;
        }

        console.log(`[fact] from ${name} (chat ${chatId}) — sending briefing`);
        try {
          const fact = await getDailyFinanceFact({ recordHistory: true });
          await sendTelegramBriefing({
            botToken,
            chatId,
            messageHtml: fact.message,
            imageUrl: fact.imageUrl,
          });
          lastFactAt.set(chatKey, Date.now());
          console.log(`[fact] sent ${fact.topic} to chat ${chatId}`);
        } catch (error) {
          console.error(
            `[fact] failed for chat ${chatId}:`,
            error.message || error,
          );
          await sendTelegramMessage({
            botToken,
            chatId,
            textHtml:
              "The markets desk hit a snag fetching that briefing. Try again in a moment.",
          });
        }
      }
    } catch (error) {
      console.error("Telegram inbox error:", error.message || error);
      await sleep(3000);
    }
  }
}
