/**
 * One-shot: add template `eli5` strings for facts missing them.
 * Does not rewrite body/example — only fills eli5 from title + category.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FACTS_PATH = path.join(__dirname, "..", "data", "facts.json");

function templateEli5(title, category) {
  const desk = category ? ` (${category})` : "";
  return `“${title}”${desk} is just a grown-up name for a simple money idea — like explaining why piggy banks, IOUs, or trading stickers can feel fair or unfair when something important changes.`;
}

const facts = JSON.parse(await readFile(FACTS_PATH, "utf8"));
let added = 0;

for (const entry of facts) {
  if (entry.eli5 || entry.simple) continue;
  entry.eli5 = templateEli5(entry.title || entry.topic, entry.category);
  added += 1;
}

if (added > 0) {
  await writeFile(FACTS_PATH, `${JSON.stringify(facts, null, 2)}\n`, "utf8");
}

console.log(`eli5: ${added} added, ${facts.length} total facts`);
