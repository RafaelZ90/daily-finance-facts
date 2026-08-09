import { loadConfig } from "./config.js";
import { getDailyFinanceFact } from "./facts.js";
import { listSubscribers } from "./subscribers.js";
import { sendTelegramBriefing } from "./telegram.js";

export async function sendDailyFact({ dryRun = false } = {}) {
  const fact = await getDailyFinanceFact({ recordHistory: !dryRun });

  if (dryRun) {
    console.log("— dry run (not sent) —\n");
    if (fact.imageUrl) {
      console.log("Photo:", fact.imageUrl);
      console.log("");
    }
    console.log(fact.message);
    return { ...fact, sent: false };
  }

  const { botToken } = loadConfig({ requireTelegram: true });
  const subscribers = await listSubscribers();

  if (subscribers.length === 0) {
    console.warn(
      "No subscribers yet — nothing sent. People join with /start in Telegram.",
    );
    return { ...fact, sent: false, sentCount: 0 };
  }

  let sentCount = 0;
  const failures = [];

  for (const sub of subscribers) {
    const who = sub.name ? `${sub.name} (${sub.chatId})` : sub.chatId;
    try {
      await sendTelegramBriefing({
        botToken,
        chatId: sub.chatId,
        messageHtml: fact.message,
        imageUrl: fact.imageUrl,
      });
      sentCount += 1;
      console.log(`Sent briefing about ${fact.topic} → ${who}`);
    } catch (error) {
      failures.push({ chatId: sub.chatId, error: error.message || String(error) });
      console.error(
        `Failed to send to ${who}:`,
        error.message || error,
      );
    }
  }

  console.log(
    `Daily send done: ${sentCount}/${subscribers.length} subscriber(s) got ${fact.topic}` +
      (failures.length ? ` (${failures.length} failed)` : ""),
  );

  return {
    ...fact,
    sent: sentCount > 0,
    sentCount,
    failures,
  };
}
