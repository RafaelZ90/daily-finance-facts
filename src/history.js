import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_PATH = path.join(__dirname, "..", "data", "history.json");

export async function readHistory() {
  try {
    const raw = await readFile(HISTORY_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.sent) ? parsed.sent : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export async function writeHistory(sent) {
  await mkdir(path.dirname(HISTORY_PATH), { recursive: true });
  await writeFile(
    HISTORY_PATH,
    JSON.stringify({ sent, updatedAt: new Date().toISOString() }, null, 2),
  );
}

export async function markTopicSent(topic) {
  const sent = await readHistory();
  if (!sent.includes(topic)) {
    sent.push(topic);
    await writeHistory(sent);
  }
}

/** Shuffled list of topics not yet sent (resets cycle when exhausted). */
export async function getAvailableTopics(allTopics, { resetIfEmpty = true } = {}) {
  const sent = await readHistory();
  let pool = allTopics.filter((name) => !sent.includes(name));

  if (pool.length === 0 && resetIfEmpty) {
    await writeHistory([]);
    pool = [...allTopics];
  }

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool;
}
