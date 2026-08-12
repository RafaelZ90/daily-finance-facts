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

const SHORT_BODY_CHARS = 220;
const SHORT_EXAMPLE_CHARS = 140;

/** Pull dollar/percent/integer tokens for a one-line numeric walkthrough. */
function extractNumbers(text) {
  return (text.match(/\$?\d[\d,]*(?:\.\d+)?%?/g) || []).slice(0, 4);
}

function expandBriefing(topic, body, category) {
  if (!body) {
    return `Today’s desk note covers ${topic}${category ? ` (${category})` : ""}: a concept worth keeping in your mental model when you read market headlines or size a position.`;
  }
  if (body.length >= SHORT_BODY_CHARS) return body;
  const desk = category ? ` under ${category}` : "";
  return `${body} Put differently: ${topic}${desk} is one of those ideas that keeps showing up once you look past the headline — it connects cash flows, risk, and how prices move in the real world.`;
}

function expandExample(topic, example, body = "") {
  const seed = example || body || topic;
  if (example && example.length >= SHORT_EXAMPLE_CHARS) return example;

  const nums = extractNumbers(seed);
  if (example) {
    if (nums.length >= 2) {
      return `${example} Numeric walkthrough: start at ${nums[0]}, apply the change described above, and you land near ${nums[nums.length - 1]} — that gap is “${topic}” on a single line item.`;
    }
    return `${example} Step-by-step: pick a round starting amount (say $100), apply one change that illustrates “${topic}”, then write down what moved and what stayed fixed.`;
  }

  if (nums.length >= 2) {
    return `Using numbers from the briefing: begin at ${nums[0]}, walk through one realistic change, and compare to ${nums[nums.length - 1]}. That before → after gap is how desks sanity-check “${topic}” before trusting a headline figure.`;
  }
  return `Picture a simple ticket: start with $100 (or 100 units). Apply the idea behind “${topic}” in two steps — write starting value, one change, ending value. That mini walkthrough is how practitioners test intuition before sizing a trade.`;
}

function resolveEli5(topic, eli5, category) {
  if (eli5) return eli5;
  const desk = category ? ` (${category})` : "";
  return `“${topic}”${desk} is just a grown-up name for a simple money idea — like explaining why piggy banks, IOUs, or trading stickers can feel fair or unfair when something important changes.`;
}

/**
 * Telegram HTML caption / message body.
 * Photo is attached separately only when a curated imageUrl exists.
 * Sections: Briefing → Example → Explain like I’m 5 → closer → Links.
 */
export function formatMessage(
  topic,
  body,
  { credit, category, example, eli5, links = [] } = {},
) {
  const briefing = expandBriefing(topic, body, category);
  const workedExample = expandExample(topic, example, briefing);
  const plainTakeaway = resolveEli5(topic, eli5, category);

  const opener = pickLine(OPENERS, topic + briefing.slice(0, 24));
  const closer = pickLine(CLOSERS, briefing.slice(-24) + topic);

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
    "<b>Briefing:</b>",
    escapeHtml(briefing),
    "",
    "<b>Example:</b>",
    escapeHtml(workedExample),
    "",
    "<b>Explain like I’m 5:</b>",
    escapeHtml(plainTakeaway),
  );

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
