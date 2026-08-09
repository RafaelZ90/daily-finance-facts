const WIKI_USER_AGENT =
  "daily-finance-facts/1.0 (personal Telegram bot; educational)";

async function fetchWikipediaSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": WIKI_USER_AGENT,
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) return null;
  return response.json();
}

function preferLargeImage(summary) {
  let imageUrl = null;
  if (summary?.originalimage?.source) imageUrl = summary.originalimage.source;
  else if (summary?.thumbnail?.source) {
    imageUrl = summary.thumbnail.source.replace(/\/\d+px-/, "/1000px-");
  }
  if (!imageUrl) return null;

  // Skip SVG / diagram-only assets that Telegram often fails to render as photos.
  if (/\.svg(\?|$)/i.test(imageUrl)) return null;

  try {
    const parsed = new URL(imageUrl);
    parsed.search = "";
    return parsed.toString();
  } catch {
    return imageUrl;
  }
}

/**
 * Resolve an optional public image for a finance topic (Wikipedia / Wikimedia).
 * Returns nulls when no suitable photo exists — text-first is fine.
 */
export async function fetchTopicImageUrl(topic, wikiTitle) {
  const candidates = [
    wikiTitle,
    topic,
    `${topic} (finance)`,
    topic.replace(/\s+/g, "_"),
  ].filter(Boolean);

  for (const title of candidates) {
    const summary = await fetchWikipediaSummary(title);
    const imageUrl = preferLargeImage(summary);
    if (imageUrl) {
      return {
        imageUrl,
        credit: summary?.title ? `Image: ${summary.title} (Wikipedia)` : null,
      };
    }
  }

  return { imageUrl: null, credit: null };
}
