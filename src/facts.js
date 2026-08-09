import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAvailableTopics, markTopicSent } from "./history.js";
import { fetchTopicImageUrl } from "./image.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FACTS_PATH = path.join(__dirname, "..", "data", "facts.json");

const OPENERS = [
  "Good morning. Your scheduled markets briefing has arrived.",
  "Dispatch from the desk of continuing education (unpaid edition).",
  "Official notice: today’s agenda includes one useful finance concept.",
  "Breaking: something more durable than yesterday’s headline just landed.",
  "Your complimentary dose of financial literacy, filed on time.",
];

const CLOSERS = [
  "Please acknowledge receipt by updating one mental model.",
  "End of briefing. Side effects may include fewer hollow takes in meetings.",
  "Filed under: things more useful than another hot take on rates.",
  "That concludes today’s presentation. No RSVP required.",
  "With professional regards from your unpaid markets correspondent.",
];

let cachedFacts;

async function loadFacts() {
  if (!cachedFacts) {
    cachedFacts = JSON.parse(await readFile(FACTS_PATH, "utf8"));
  }
  return cachedFacts;
}

function pickLine(lines, seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  }
  return lines[hash % lines.length];
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Telegram HTML caption / message body (photo is attached separately when present). */
export function formatMessage(topic, fact, { credit, category } = {}) {
  const opener = pickLine(OPENERS, topic + fact.slice(0, 24));
  const closer = pickLine(CLOSERS, fact.slice(-24) + topic);

  const lines = [
    "📈 <b>Daily Finance Briefing</b>",
    "",
    escapeHtml(opener),
    "",
    `<b>Subject:</b> ${escapeHtml(topic)}`,
  ];

  if (category) {
    lines.push(`<b>Desk:</b> ${escapeHtml(category)}`);
  }

  lines.push(
    `<b>Clearance level:</b> Professionally useful`,
    "",
    "<b>Today’s finding:</b>",
    escapeHtml(fact),
    "",
    escapeHtml(closer),
  );

  if (credit) {
    lines.push("", `<i>${escapeHtml(credit)}</i>`);
  }

  return lines.join("\n");
}

export async function getDailyFinanceFact({ recordHistory = true } = {}) {
  const facts = await loadFacts();
  const keys = facts.map((entry) => entry.topic);
  const available = await getAvailableTopics(keys, {
    resetIfEmpty: recordHistory,
  });

  const topicKey = available[0];
  const entry = facts.find((fact) => fact.topic === topicKey);

  if (!entry) {
    throw new Error("Could not pick a finance fact.");
  }

  const { imageUrl, credit } = await fetchTopicImageUrl(
    entry.topic,
    entry.wikiTitle,
  );

  if (recordHistory) {
    await markTopicSent(entry.topic);
  }

  return {
    topic: entry.topic,
    category: entry.category || null,
    fact: entry.fact,
    imageUrl,
    credit,
    sourceUrl: null,
    message: formatMessage(entry.topic, entry.fact, {
      credit,
      category: entry.category,
    }),
  };
}
