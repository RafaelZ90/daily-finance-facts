const API = "https://api.telegram.org";
const PHOTO_CAPTION_LIMIT = 1024;
const MESSAGE_LIMIT = 4096;

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

/**
 * Split a long HTML briefing into ≤4096-char chunks at paragraph boundaries.
 * Prefers keeping section headers with their following body text.
 */
export function splitTelegramHtml(textHtml, limit = MESSAGE_LIMIT) {
  if (!textHtml || textHtml.length <= limit) return [textHtml];

  const paragraphs = textHtml.split("\n\n");
  const chunks = [];
  let current = "";

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length <= limit) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);
    if (para.length <= limit) {
      current = para;
      continue;
    }
    // Hard-split oversized paragraphs on single newlines, then by length.
    let rest = para;
    while (rest.length > limit) {
      let cut = rest.lastIndexOf("\n", limit);
      if (cut < limit * 0.5) cut = limit;
      chunks.push(rest.slice(0, cut).trimEnd());
      rest = rest.slice(cut).trimStart();
    }
    current = rest;
  }
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

async function sendTelegramMessages({ botToken, chatId, textHtml }) {
  const parts = splitTelegramHtml(textHtml);
  let last;
  for (let i = 0; i < parts.length; i += 1) {
    const suffix =
      parts.length > 1 ? `\n\n<i>(${i + 1}/${parts.length})</i>` : "";
    let body = parts[i];
    if (suffix && body.length + suffix.length <= MESSAGE_LIMIT) {
      body += suffix;
    }
    last = await sendTelegramMessage({ botToken, chatId, textHtml: body });
  }
  return last;
}

/**
 * Send photo + caption when a curated public image exists.
 * Long briefings: short photo caption, then text in one or more messages
 * (split at section boundaries if over Telegram’s ~4096 limit).
 */
export async function sendTelegramBriefing({
  botToken,
  chatId,
  messageHtml,
  imageUrl,
  photoCaptionHtml,
}) {
  if (imageUrl) {
    const fitsInCaption = messageHtml.length <= PHOTO_CAPTION_LIMIT;
    const caption = fitsInCaption
      ? messageHtml
      : photoCaptionHtml ||
        "📈 <b>Daily Finance Facts</b>\n\nFull briefing follows ↓";

    try {
      await telegramCall(botToken, "sendPhoto", {
        chat_id: chatId,
        photo: imageUrl,
        caption,
        parse_mode: "HTML",
      });
      if (!fitsInCaption) {
        await sendTelegramMessages({
          botToken,
          chatId,
          textHtml: messageHtml,
        });
      }
      return;
    } catch (error) {
      console.warn(`Photo send failed (${error.message}); sending text only.`);
    }
  }

  return sendTelegramMessages({
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
    "📈 <b>Daily Finance Facts</b> — you're subscribed.",
    "",
    `You'll get one educational finance briefing every day at <b>${sendTimeLabel}</b>: a deeper desk-style explanation, a fully worked example, a plain-language “explain like I’m 5” takeaway, plus further-reading links (and a diagram only when a good public one exists).`,
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
      "📈 <b>Daily Finance Facts</b> — command list",
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
