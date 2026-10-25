/**
 * Safely parses and validates external source URLs before opening in browser.
 * Reddit strictly requires `/comments/<base36_id>/...`. Slugs without a valid
 * post ID (like dummy seed links /comments/muzaffarpur_blackout) trigger Reddit's
 * HTTP 500 "Internal Server Error". This helper redirects those to r/bihar search.
 */
export function getSafeSourceUrl(url, platform) {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (platform === 'Reddit' || /reddit\.com/i.test(trimmed)) {
    // Match /comments/<postIdOrSlug>
    const match = /reddit\.com\/r\/([^/]+)\/comments\/([^/?#]+)/i.exec(trimmed);
    if (match) {
      const subreddit = match[1] || 'bihar';
      const idOrSlug = match[2];
      // Reddit post IDs are 5-8 char base36 alphanumeric (e.g. '1x0ganv')
      if (!/^[0-9a-zA-Z]{5,8}$/.test(idOrSlug)) {
        const query = idOrSlug.replace(/[_-]+/g, ' ').trim();
        return `https://www.reddit.com/r/${subreddit}/search/?q=${encodeURIComponent(query)}&restrict_sr=1`;
      }
    }
  }

  return trimmed;
}
