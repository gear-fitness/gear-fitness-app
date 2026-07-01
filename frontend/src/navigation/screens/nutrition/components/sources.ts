/**
 * Helpers for rendering the web sources Perplexity Sonar cited when estimating a
 * food's nutrition: turning raw citation URLs into a display host and a favicon.
 */

/** Bare host for a URL, without the leading "www." — "" if it can't be parsed. */
export function hostOf(url: string): string {
  try {
    const h = new URL(url).hostname;
    return h.replace(/^www\./, "");
  } catch {
    // Fall back to a best-effort regex for malformed/relative URLs.
    const m = url.match(/^(?:https?:\/\/)?([^/?#]+)/i);
    return m ? m[1].replace(/^www\./, "") : "";
  }
}

/**
 * Favicon URL for a source. DuckDuckGo's icon service is CORS-free, returns a
 * clean square PNG, and needs no API key — a good fit for small RN <Image>s.
 */
export function faviconOf(url: string): string {
  const host = hostOf(url);
  return `https://icons.duckduckgo.com/ip3/${host}.ico`;
}
