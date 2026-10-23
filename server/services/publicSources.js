const Parser = require('rss-parser');

const rssParser = new Parser();
const MAX_QUERY_LENGTH = 160;
const MAX_RESULTS = 20;
const REQUEST_TIMEOUT_MS = 10000;
let redditToken = null;

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
  const redditConfigured = Boolean(
    process.env.REDDIT_CLIENT_ID &&
    process.env.REDDIT_CLIENT_SECRET &&
    process.env.REDDIT_USER_AGENT
  );

  return {
    'google-news': { configured: true, label: 'Google News RSS' },
    reddit: {
      configured: redditConfigured,
      label: 'Reddit',
      reason: redditConfigured ? null : 'Reddit OAuth credentials are not configured.',
    },
  };
}

async function searchGoogleNews(query) {
  const terms = normalizeQuery(query);
  const url = new URL('https://news.google.com/rss/search');
  url.searchParams.set('q', `${terms} Bihar`);
  url.searchParams.set('hl', 'en-IN');
  url.searchParams.set('gl', 'IN');
  url.searchParams.set('ceid', 'IN:en');

  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`Google News returned HTTP ${response.status}.`);
  }

  const xml = await response.text();
  const feed = await rssParser.parseString(xml);
  const items = (feed.items || []).slice(0, MAX_RESULTS).map(item => ({
    id: item.guid || item.link,
    source: 'Google News',
    title: item.title || 'Untitled article',
    text: item.contentSnippet || item.content || item.title || '',
    author: item.creator || 'News publisher',
    published_at: item.isoDate || item.pubDate || null,
    url: item.link || null,
  }));

  return { source: 'google-news', count: items.length, items };
}

async function getRedditAccessToken() {
  if (redditToken && redditToken.expiresAt > Date.now()) {
    return redditToken.value;
  }

  const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT } = process.env;
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET || !REDDIT_USER_AGENT) {
    const error = new Error('Reddit OAuth credentials are not configured on the server.');
    error.status = 503;
    throw error;
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
  const url = new URL('https://oauth.reddit.com/search.json');
  url.searchParams.set('q', `${terms} Bihar`);
  url.searchParams.set('sort', 'new');
  url.searchParams.set('t', 'week');
  url.searchParams.set('limit', String(MAX_RESULTS));
  url.searchParams.set('type', 'link');

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': process.env.REDDIT_USER_AGENT,
    },
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
    subreddit: data.subreddit_name_prefixed || null,
    published_at: Number.isFinite(data.created_utc) ? new Date(data.created_utc * 1000).toISOString() : null,
    url: data.permalink ? `https://www.reddit.com${data.permalink}` : null,
  }));

  return { source: 'reddit', count: items.length, items };
}

async function searchPublicSource(source, query) {
  if (source === 'google-news') return searchGoogleNews(query);
  if (source === 'reddit') return searchReddit(query);
  const error = new Error('Source must be google-news or reddit.');
  error.status = 400;
  throw error;
}

module.exports = { getSourceStatus, searchPublicSource };
