import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUBSCRIBERS_PATH = path.join(__dirname, "..", "data", "subscribers.json");

async function readStore() {
  try {
    const raw = await readFile(SUBSCRIBERS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.subscribers) ? parsed.subscribers : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeStore(subscribers) {
  await mkdir(path.dirname(SUBSCRIBERS_PATH), { recursive: true });
  await writeFile(
    SUBSCRIBERS_PATH,
    JSON.stringify(
      { subscribers, updatedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
}

/** @returns {Promise<Array<{ chatId: string, name?: string, joinedAt: string }>>} */
export async function listSubscribers() {
  return readStore();
}

/**
 * Add or refresh a subscriber by chat id.
 * @returns {Promise<{ subscriber: object, created: boolean }>}
 */
export async function subscribe(chatId, meta = {}) {
  const id = String(chatId);
  const subscribers = await readStore();
  const existing = subscribers.find((s) => s.chatId === id);
  const name = meta.name?.trim() || existing?.name || "";

  if (existing) {
    if (name) existing.name = name;
    await writeStore(subscribers);
    return { subscriber: existing, created: false };
  }

  const subscriber = {
    chatId: id,
    ...(name ? { name } : {}),
    joinedAt: new Date().toISOString(),
  };
  subscribers.push(subscriber);
  await writeStore(subscribers);
  return { subscriber, created: true };
}

/**
 * Remove a subscriber by chat id.
 * @returns {Promise<{ removed: boolean, subscriber?: object }>}
 */
export async function unsubscribe(chatId) {
  const id = String(chatId);
  const subscribers = await readStore();
  const index = subscribers.findIndex((s) => s.chatId === id);
  if (index === -1) {
    return { removed: false };
  }
  const [subscriber] = subscribers.splice(index, 1);
  await writeStore(subscribers);
  return { removed: true, subscriber };
}
