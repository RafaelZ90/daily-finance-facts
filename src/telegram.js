const API = "https://api.telegram.org";

async function telegramCall(botToken, method, payload, { timeoutMs } = {}) {
  const response = await fetch(`${API}/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(
      `Telegram ${method} failed: ${data.description || JSON.stringify(data)}`,
    );
  }
  return data.result;
}

export async function sendTelegramMessage({ botToken, chatId, textHtml }) {
  return telegramCall(botToken, "sendMessage", {
    chat_id: chatId,
    text: textHtml,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

/** Send photo + caption when possible; fall back to text-only. */
export async function sendTelegramBriefing({
  botToken,
  chatId,
  messageHtml,
  imageUrl,
}) {
  if (imageUrl) {
    try {
      return await telegramCall(botToken, "sendPhoto", {
        chat_id: chatId,
        photo: imageUrl,
        caption: messageHtml,
        parse_mode: "HTML",
      });
    } catch (error) {
      console.warn(`Photo send failed (${error.message}); sending text only.`);
    }
  }

  return sendTelegramMessage({
    botToken,
    chatId,
    textHtml: messageHtml,
  });
}

export async function getTelegramUpdates(
  botToken,
  offset = 0,
  { timeout = 0 } = {},
) {
  return telegramCall(
    botToken,
    "getUpdates",
    {
      offset,
      timeout,
      allowed_updates: ["message"],
    },
    { timeoutMs: timeout > 0 ? (timeout + 5) * 1000 : undefined },
  );
}

export function commandsHelpHtml(sendTimeLabel = "8:00 AM") {
  return [
    "<b>What you can do</b>",
    `• <b>/start</b> — subscribe to the daily briefing`,
    `• <b>/stop</b> or <b>/unsubscribe</b> — leave the list`,
    `• <b>/help</b> — show available commands`,
    `• <b>/fact</b> or any message — one on-demand finance briefing (≈30s cooldown)`,
    `• Automatic — one shared briefing every day at <b>${sendTimeLabel}</b>`,
  ].join("\n");
}

export function welcomeMessageHtml(sendTimeLabel = "8:00 AM") {
  return [
    "📈 <b>Daily Finance Briefing</b> — you're subscribed.",
    "",
    `You'll get one sharp educational finance note every day at <b>${sendTimeLabel}</b>.`,
    "",
    commandsHelpHtml(sendTimeLabel),
    "",
    "Asset classes, market structure, risk, instruments — no meme tips, no get-rich-quick.",
    "",
    "<i>Tip: leave this chat open — the briefings arrive here.</i>",
  ].join("\n");
}

export async function sendWelcomeMessage({ botToken, chatId, sendTimeLabel }) {
  return sendTelegramMessage({
    botToken,
    chatId,
    textHtml: welcomeMessageHtml(sendTimeLabel),
  });
}

export async function sendHelpMessage({ botToken, chatId, sendTimeLabel }) {
  return sendTelegramMessage({
    botToken,
    chatId,
    textHtml: [
      "📈 <b>Daily Finance Briefing</b> — command list",
      "",
      commandsHelpHtml(sendTimeLabel),
    ].join("\n"),
  });
}

export async function sendUnsubscribedMessage({ botToken, chatId }) {
  return sendTelegramMessage({
    botToken,
    chatId,
    textHtml: [
      "You've been removed from the daily list.",
      "",
      "Send <b>/start</b> anytime to subscribe again.",
    ].join("\n"),
  });
}

const BOT_COMMANDS = [
  { command: "start", description: "Subscribe to the daily briefing" },
  { command: "stop", description: "Unsubscribe from the daily list" },
  { command: "help", description: "Show available commands" },
  { command: "fact", description: "Get a finance briefing now" },
];

export async function registerBotCommands(botToken) {
  return telegramCall(botToken, "setMyCommands", {
    commands: BOT_COMMANDS,
  });
}

export function isStartCommand(text = "") {
  return /^\/start(?:@\w+)?(?:\s|$)/i.test(text.trim());
}

export function isStopCommand(text = "") {
  const t = text.trim();
  return (
    /^\/stop(?:@\w+)?(?:\s|$)/i.test(t) ||
    /^\/unsubscribe(?:@\w+)?(?:\s|$)/i.test(t)
  );
}

export function isHelpCommand(text = "") {
  const t = text.trim();
  return (
    /^\/help(?:@\w+)?(?:\s|$)/i.test(t) || /^help[!?.]*$/i.test(t)
  );
}
