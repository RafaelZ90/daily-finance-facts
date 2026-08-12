import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAvailableTopics, markTopicSent } from "./history.js";
import { resolveFactImage } from "./image.js";

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

function entryTitle(entry) {
  return entry.title || entry.topic;
}

function entryBody(entry) {
  return entry.body || entry.fact;
}

function entryKey(entry) {
  return entryTitle(entry);
}

/**
 * Telegram HTML caption / message body.
 * Photo is attached separately only when a curated imageUrl exists.
 * Sections: Explanation → Example → Explain like I’m 5 → closer → Links.
 */
export function formatMessage(
  topic,
  body,
  { credit, category, example, eli5, links = [] } = {},
) {
  const opener = pickLine(OPENERS, topic + body.slice(0, 24));
  const closer = pickLine(CLOSERS, body.slice(-24) + topic);

  const lines = [
    "📈 <b>Daily Finance Facts</b>",
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
    "<b>Explanation:</b>",
    escapeHtml(body),
  );

  if (example) {
    lines.push("", "<b>Example:</b>", escapeHtml(example));
  }

  if (eli5) {
    lines.push(
      "",
      "<b>Explain like I’m 5:</b>",
      escapeHtml(eli5),
    );
  }

  lines.push("", escapeHtml(closer));

  if (links?.length) {
    lines.push("", "<b>Links:</b>");
    for (const link of links) {
      if (!link?.url) continue;
      const label = escapeHtml(link.label || "Source");
      const url = escapeHtml(link.url);
      lines.push(`• <a href="${url}">${label}</a>`);
    }
  }

  if (credit) {
    lines.push("", `<i>${escapeHtml(credit)}</i>`);
  }

  return lines.join("\n");
}

export function photoCaptionHtml(topic, category) {
  const lines = [
    "📈 <b>Daily Finance Facts</b>",
    `<b>Subject:</b> ${escapeHtml(topic)}`,
  ];
  if (category) {
    lines.push(`<b>Desk:</b> ${escapeHtml(category)}`);
  }
  lines.push("", "Full briefing follows ↓");
  return lines.join("\n");
}

export async function getDailyFinanceFact({ recordHistory = true } = {}) {
  const facts = await loadFacts();
  const keys = facts.map(entryKey);
  const available = await getAvailableTopics(keys, {
    resetIfEmpty: recordHistory,
  });

  const topicKey = available[0];
  const entry = facts.find((fact) => entryKey(fact) === topicKey);

  if (!entry) {
    throw new Error("Could not pick a finance fact.");
  }

  const title = entryTitle(entry);
  const body = entryBody(entry);
  const example = entry.example || null;
  const eli5 = entry.eli5 || entry.simple || null;
  const { imageUrl, credit } = await resolveFactImage(entry);

  if (recordHistory) {
    await markTopicSent(title);
  }

  const message = formatMessage(title, body, {
    credit,
    category: entry.category,
    example,
    eli5,
    links: entry.links || [],
  });

  return {
    topic: title,
    category: entry.category || null,
    fact: body,
    example,
    eli5,
    links: entry.links || [],
    imageUrl,
    credit,
    sourceUrl: entry.links?.[0]?.url || null,
    message,
    photoCaption: photoCaptionHtml(title, entry.category),
  };
}
