const Parser = require('rss-parser');
const { consumeDailyQuota, getDailyUsage } = require('./quotaService');
const { getGeminiHealth } = require('./geminiService');
const { getGroqStatus } = require('./groqService');
const { getSearchTaxonomy } = require('./osintTaxonomy');

const rssParser = new Parser();
const MAX_QUERY_LENGTH = 160;
const MAX_RESULTS = 20;
const REQUEST_TIMEOUT_MS = 10000;
const GOOGLE_NEWS_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const GOOGLE_NEWS_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
const YOUTUBE_MIN_INTERVAL_MS = 60 * 1000;
const YOUTUBE_DAILY_SEARCH_LIMIT = 40;
let redditToken = null;
let youtubeNextRequestAt = 0;
let youtubeQueue = Promise.resolve();
let youtubeRequestsPending = 0;
const youtubeSearchCache = new Map();

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeQuery(query) {
  if (typeof query !== 'string' || !query.trim()) {
    const error = new Error('Enter a search phrase.');
    error.status = 400;
    throw error;
  }
  if (query.trim().length > MAX_QUERY_LENGTH) {
    const error = new Error(`Search phrases must be ${MAX_QUERY_LENGTH} characters or fewer.`);
    error.status = 400;
    throw error;
  }
  return query.trim();
}

function getSourceStatus() {
  const youtubeSearchCount = getDailyUsage('youtube');
  const geminiRequestCount = getDailyUsage('gemini');
  const redditConfigured = Boolean(
    process.env.REDDIT_CLIENT_ID &&
    process.env.REDDIT_CLIENT_SECRET &&
    process.env.REDDIT_USER_AGENT
  );
  const youtubeConfigured = Boolean(process.env.YOUTUBE_API_KEY);
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const geminiHealth = getGeminiHealth();
  const groqStatus = getGroqStatus();

  return {
    'google-news': {
      configured: true,
      label: 'Google News RSS',
      free: true,
      status: 'Active (No key required)',
    },
    reddit: {
      configured: redditConfigured,
      label: 'Reddit (r/bihar, r/patna)',
      free: true,
      status: redditConfigured ? 'Active (OAuth)' : 'Pending API credentials',
      reason: redditConfigured ? null : 'Reddit OAuth credentials not configured in server/.env',
    },
    youtube: {
      configured: youtubeConfigured,
      label: 'YouTube Data API v3 (Public Videos)',
      free: true,
      status: youtubeConfigured ? 'Active' : 'Pending API Key',
      reason: youtubeConfigured ? null : 'YOUTUBE_API_KEY not configured in server/.env',
      daily_search_limit: YOUTUBE_DAILY_SEARCH_LIMIT,
      searches_today: youtubeSearchCount,
      searches_remaining: Math.max(0, YOUTUBE_DAILY_SEARCH_LIMIT - youtubeSearchCount),
      minimum_interval_seconds: YOUTUBE_MIN_INTERVAL_MS / 1000,
    },
    groq: {
      ...groqStatus,
      label: `Groq ${groqStatus.model} (Text Triage)`,
    },
    gemini: {
      configured: geminiConfigured,
      label: `Google Gemini ${process.env.GEMINI_MODEL || 'gemini-3.8-flash'} (Image Analysis / Text Fallback)`,
      free: true,
      status: geminiConfigured
        ? geminiHealth.status === 'ready' ? `Configured (${process.env.GEMINI_MODEL || 'gemini-3.8-flash'})` : geminiHealth.status
        : 'Running on Heuristic Fallback',
      reason: geminiConfigured ? geminiHealth.reason : 'GEMINI_API_KEY not configured in server/.env',
      last_failure_at: geminiHealth.last_failure_at,
      daily_request_limit: 100,
      requests_today: geminiRequestCount,
      requests_remaining: Math.max(0, 100 - geminiRequestCount),
      minimum_interval_seconds: 6,
    },
  };
}

function getOsintTaxonomy() {
  return getSearchTaxonomy();
}

// ─── Google News RSS Ingestion (100% Free, Zero Key) ─────────────────────────

async function searchGoogleNews(query) {
  const terms = normalizeQuery(query).replace(/\bwhen:\d+[hdm]\b/gi, '').trim();
  const url = new URL('https://news.google.com/rss/search');
  url.searchParams.set('q', `${terms} Bihar when:1d`);
  url.searchParams.set('hl', 'en-IN');
  url.searchParams.set('gl', 'IN');
  url.searchParams.set('ceid', 'IN:en');

  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`Google News returned HTTP ${response.status}.`);
  }

  const xml = await response.text();
  const feed = await rssParser.parseString(xml);
  const now = Date.now();
  const items = (feed.items || [])
    .map(item => {
      const publishedAt = item.isoDate || item.pubDate || null;
      const publishedAtMs = publishedAt ? Date.parse(publishedAt) : NaN;
      return {
        id: item.guid || item.link,
        source: 'Google News',
        title: item.title || 'Untitled article',
        text: item.contentSnippet || item.content || item.title || '',
        author: item.creator || 'News publisher',
        published_at: publishedAt,
        url: item.link || null,
        publishedAtMs,
      };
    })
    .filter(item => Number.isFinite(item.publishedAtMs)
      && item.publishedAtMs >= now - GOOGLE_NEWS_MAX_AGE_MS
      && item.publishedAtMs <= now + GOOGLE_NEWS_FUTURE_TOLERANCE_MS)
    .sort((a, b) => b.publishedAtMs - a.publishedAtMs)
    .slice(0, MAX_RESULTS)
    .map(({ publishedAtMs: _publishedAtMs, ...item }) => item);

  return { source: 'google-news', count: items.length, items };
}

// ─── Reddit API Ingestion (100% Free Script App) ──────────────────────────────

async function getRedditAccessToken() {
  if (redditToken && redditToken.expiresAt > Date.now()) {
    return redditToken.value;
  }

  const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT } = process.env;
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET || !REDDIT_USER_AGENT) {
    return null;
  }

  const credentials = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': REDDIT_USER_AGENT,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Reddit OAuth returned HTTP ${response.status}.`);
  }

  const result = await response.json();
  if (typeof result.access_token !== 'string' || !Number.isFinite(result.expires_in)) {
    throw new Error('Reddit OAuth returned an invalid access-token response.');
  }

  redditToken = {
    value: result.access_token,
    expiresAt: Date.now() + Math.max(0, result.expires_in - 60) * 1000,
  };
  return redditToken.value;
}

async function searchReddit(query) {
  const terms = normalizeQuery(query);
  const token = await getRedditAccessToken();

  let url;
  let headers = {
    'User-Agent': process.env.REDDIT_USER_AGENT || 'GrievancePulseAI/1.0.0 (by /u/cyberhope_bot)',
  };

  if (token) {
    url = new URL('https://oauth.reddit.com/r/bihar/search.json');
    url.searchParams.set('q', `${terms}`);
    url.searchParams.set('restrict_sr', '1');
    url.searchParams.set('sort', 'new');
    url.searchParams.set('limit', String(MAX_RESULTS));
    headers.Authorization = `Bearer ${token}`;
  } else {
    // Unauthenticated public search on r/bihar
    url = new URL('https://www.reddit.com/r/bihar/search.json');
    url.searchParams.set('q', `${terms}`);
    url.searchParams.set('restrict_sr', '1');
    url.searchParams.set('sort', 'new');
    url.searchParams.set('limit', String(MAX_RESULTS));
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Reddit search returned HTTP ${response.status}.`);
  }

  const result = await response.json();
  const items = (result.data?.children || []).map(({ data }) => ({
    id: data.id,
    source: 'Reddit',
    title: data.title || 'Untitled post',
    text: [data.title, data.selftext].filter(Boolean).join('\n\n').slice(0, 4000),
    author: data.author ? `u/${data.author}` : 'Reddit user',
    subreddit: data.subreddit_name_prefixed || 'r/bihar',
    published_at: Number.isFinite(data.created_utc) ? new Date(data.created_utc * 1000).toISOString() : null,
    url: data.permalink ? `https://www.reddit.com${data.permalink}` : null,
  }));

  return { source: 'reddit', count: items.length, items };
}

// ─── YouTube Data API v3 Ingestion (100% Free - 10,000 units/day) ─────────────

async function searchYouTube(query) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    const error = new Error('YOUTUBE_API_KEY is not configured on the server.');
    error.status = 503;
    throw error;
  }

  const terms = normalizeQuery(query);
  if (youtubeRequestsPending >= 2) {
    const error = new Error('YouTube search is busy. Wait for the current search to finish.');
    error.status = 429;
    throw error;
  }
  youtubeRequestsPending++;
  const pending = youtubeQueue.then(() => performYouTubeSearch(terms, apiKey));
  youtubeQueue = pending.then(
    () => { youtubeRequestsPending--; },
    () => { youtubeRequestsPending--; },
  );
  return pending;
}

async function performYouTubeSearch(terms, apiKey) {
  const cacheKey = terms.toLowerCase();
  const cached = youtubeSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const waitMs = youtubeNextRequestAt - Date.now();
  if (waitMs > 0) await wait(waitMs);
  youtubeNextRequestAt = Date.now() + YOUTUBE_MIN_INTERVAL_MS;
  consumeDailyQuota('youtube', YOUTUBE_DAILY_SEARCH_LIMIT);

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', `${terms} Bihar`);
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(Math.min(MAX_RESULTS, 10)));
  url.searchParams.set('order', 'date');
  url.searchParams.set('key', apiKey);

  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(`YouTube API returned HTTP ${response.status}: ${errBody.error?.message || response.statusText}`);
  }

  const result = await response.json();
  const items = (result.items || []).map(item => ({
    id: item.id?.videoId || item.etag,
    source: 'YouTube',
    title: item.snippet?.title || 'YouTube Video',
    text: `${item.snippet?.title || ''}\n\n${item.snippet?.description || ''}`.trim(),
    author: item.snippet?.channelTitle || 'YouTube Creator',
    published_at: item.snippet?.publishedAt || null,
    url: item.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : null,
    thumbnail_url: item.snippet?.thumbnails?.medium?.url || null,
  }));

  const searchResult = { source: 'youtube', count: items.length, items };
  youtubeSearchCache.set(cacheKey, {
    result: searchResult,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
  return searchResult;
}

// ─── Unified Public Search Router ─────────────────────────────────────────────

async function searchPublicSource(source, query) {
  if (source === 'google-news') return searchGoogleNews(query);
  if (source === 'reddit') return searchReddit(query);
  if (source === 'youtube') return searchYouTube(query);
  const error = new Error('Source must be google-news, reddit, or youtube.');
  error.status = 400;
  throw error;
}

module.exports = {
  getSourceStatus,
  getOsintTaxonomy,
  searchPublicSource,
  searchGoogleNews,
  searchReddit,
  searchYouTube,
};
