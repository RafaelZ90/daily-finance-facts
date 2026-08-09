import "dotenv/config";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env (see .env.example).`,
    );
  }
  return value;
}

export function loadConfig({ requireTelegram = true } = {}) {
  const timezone = process.env.TZ?.trim() || "Asia/Singapore";
  // Optional / deprecated — daily sends use data/subscribers.json instead.
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() || "";

  if (!requireTelegram) {
    return {
      botToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || "",
      chatId,
      timezone,
    };
  }

  return {
    botToken: required("TELEGRAM_BOT_TOKEN"),
    chatId,
    timezone,
  };
}
