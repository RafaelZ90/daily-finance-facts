import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CHATS_PATH = path.join(ROOT, "data", "telegram-chats.json");
const ENV_PATH = path.join(ROOT, ".env");

export function chatLabelFromMessage(msg) {
  const chat = msg?.chat;
  if (!chat) return "";
  if (chat.type === "private") {
    return (
      [chat.first_name, chat.last_name].filter(Boolean).join(" ") +
      (chat.username ? ` @${chat.username}` : "")
    ).trim();
  }
  return (chat.title || chat.type || "").trim();
}

export async function readRememberedChats() {
  try {
    const raw = await readFile(CHATS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed?.chats && typeof parsed.chats === "object" ? parsed.chats : {};
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

/** Persist a chat id so telegram:chat-id still works after getUpdates is consumed. */
export async function rememberChat(chatId, label = "") {
  const id = String(chatId);
  const chats = await readRememberedChats();
  chats[id] = {
    label: label || chats[id]?.label || "",
    seenAt: new Date().toISOString(),
  };
  await mkdir(path.dirname(CHATS_PATH), { recursive: true });
  await writeFile(
    CHATS_PATH,
    JSON.stringify({ chats, updatedAt: new Date().toISOString() }, null, 2),
  );
  return chats;
}

/**
 * If TELEGRAM_CHAT_ID is empty in .env, write this chat id.
 * Returns { wrote: boolean, previous: string }.
 */
export async function ensureChatIdInEnv(chatId) {
  const id = String(chatId);
  let raw;
  try {
    raw = await readFile(ENV_PATH, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeFile(ENV_PATH, `TELEGRAM_CHAT_ID=${id}\n`, "utf8");
      return { wrote: true, previous: "" };
    }
    throw error;
  }

  const match = raw.match(/^TELEGRAM_CHAT_ID=(.*)$/m);
  const previous = match ? match[1].trim() : "";
  if (previous) {
    return { wrote: false, previous };
  }

  const next = match
    ? raw.replace(/^TELEGRAM_CHAT_ID=.*$/m, `TELEGRAM_CHAT_ID=${id}`)
    : `${raw.replace(/\s*$/, "")}\nTELEGRAM_CHAT_ID=${id}\n`;

  await writeFile(ENV_PATH, next, "utf8");
  return { wrote: true, previous: "" };
}

export function printChatIdBanner(chatId, label, { autoWrote = false } = {}) {
  const who = label ? ` (${label})` : "";
  console.log("");
  console.log("────────────────────────────────────────");
  console.log(`  TELEGRAM CHAT ID: ${chatId}${who}`);
  if (autoWrote) {
    console.log("  ✓ Wrote this to .env as TELEGRAM_CHAT_ID");
  } else {
    console.log("  → Put this in .env as TELEGRAM_CHAT_ID (if not set)");
  }
  console.log("────────────────────────────────────────");
  console.log("");
}
