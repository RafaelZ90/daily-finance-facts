/**
 * Resolve an image only when the fact entry has a curated public URL.
 * No Wikipedia/stock-photo fallback — text-only is correct when none fits.
 */
export async function resolveFactImage(entry = {}) {
  if (!entry.imageUrl) {
    return { imageUrl: null, credit: null };
  }

  // Skip SVGs — Telegram often fails to fetch them as photos.
  if (/\.svg(\?|$)/i.test(entry.imageUrl)) {
    return { imageUrl: null, credit: null };
  }

  try {
    const parsed = new URL(entry.imageUrl);
    parsed.search = "";
    return {
      imageUrl: parsed.toString(),
      credit: entry.imageCredit || null,
    };
  } catch {
    return {
      imageUrl: entry.imageUrl,
      credit: entry.imageCredit || null,
    };
  }
}

/** @deprecated use resolveFactImage */
export async function fetchTopicImageUrl(topic, wikiTitle) {
  return resolveFactImage({ topic, wikiTitle });
}
