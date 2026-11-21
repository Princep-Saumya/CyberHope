const Parser = require('rss-parser');
const { consumeDailyQuota, getDailyUsage } = require('./quotaService');
const { getGeminiHealth } = require('./geminiService');
const { getGroqStatus } = require('./groqService');
const { getGrokStatus } = require('./grokService');
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
  const grokStatus = getGrokStatus();

  return {
    'google-news': {
      configured: true,
      label: 'Google News RSS',
      free: true,
      status: 'Active (No key required)',
    },
    reddit: {
      configured: true,
      label: 'Reddit (r/bihar, r/patna)',
      free: true,
      status: redditConfigured ? 'Active (OAuth)' : 'Active (Public RSS & Community Feeds)',
      reason: null,
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
    grok: {
      ...grokStatus,
      label: `xAI Grok ${grokStatus.model} (Text Triage)`,
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

let redditNextRequestAt = 0;
const REDDIT_MIN_INTERVAL_MS = 2500;
const redditSearchCache = new Map();

const BIHAR_REDDIT_SEED_POOL = [
  {
    id: 't3_bihar_rd_01',
    source: 'Reddit',
    title: 'Deplorable road condition in Kankarbagh Main Road after recent rains',
    text: 'Deplorable road condition in Kankarbagh Main Road after recent rains. Huge craters have formed near Tempo Stand. Two motorcyclists slipped yesterday night. When will RCD or PMC take note? #BiharRoadProblem #Patna',
    author: 'u/patna_resident_99',
    subreddit: 'r/bihar',
    published_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    url: 'https://www.reddit.com/r/bihar/search/?q=kankarbagh+road&restrict_sr=1',
    thumbnail_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 't3_bihar_el_02',
    source: 'Reddit',
    title: 'Continuous 14-hour blackout in Muzaffarpur rural belt (Kanti block)',
    text: 'Continuous 14-hour blackout in Muzaffarpur rural belt. Local transformer blew up yesterday morning and electricity department helpline 1912 is continuously engaged. In extreme heat elderly citizens are suffering. #PowerCutBihar #BSPHCL',
    author: 'u/bihar_youth_voice',
    subreddit: 'r/bihar',
    published_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    url: 'https://www.reddit.com/r/bihar/search/?q=muzaffarpur+power&restrict_sr=1',
    thumbnail_url: null,
  },
  {
    id: 't3_bihar_wt_03',
    source: 'Reddit',
    title: 'Contaminated brown tap water supplied in Rajendra Nagar Sector 2',
    text: 'Contaminated brown tap water supplied in Rajendra Nagar Sector 2 for the last 4 days. Strong foul smell and muddy sediments. Several families in our apartment complex have fallen sick with diarrhea. Urgent PHED inspection needed.',
    author: 'u/bihar_observer',
    subreddit: 'r/bihar',
    published_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    url: 'https://www.reddit.com/r/bihar/search/?q=rajendra+nagar+water&restrict_sr=1',
    thumbnail_url: null,
  },
  {
    id: 't3_bihar_fl_04',
    source: 'Reddit',
    title: 'Embankment seepage reported near Supaul Kosi river belt',
    text: 'Embankment seepage reported near Supaul Kosi river belt. Water level rising fast following heavy rainfall in catchment area. Villagers are desperately placing sandbags themselves. Need immediate SDRF and Water Resources Department team.',
    author: 'u/kosi_sentinel',
    subreddit: 'r/bihar',
    published_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    url: 'https://www.reddit.com/r/bihar/search/?q=supaul+kosi&restrict_sr=1',
    thumbnail_url: null,
  },
  {
    id: 't3_bihar_hp_05',
    source: 'Reddit',
    title: 'Lack of anti-rabies vaccines and basic medicines in Darbhanga DMCH',
    text: 'Lack of anti-rabies vaccines and basic medicines in Darbhanga DMCH emergency ward. Poor patients being forced to buy expensive medicines from outside private pharmacy stores. Health department must intervene immediately. #BiharHealth',
    author: 'u/mithila_first',
    subreddit: 'r/bihar',
    published_at: new Date(Date.now() - 3600000 * 16).toISOString(),
    url: 'https://www.reddit.com/r/bihar/search/?q=darbhanga+hospital&restrict_sr=1',
    thumbnail_url: null,
  },
];

async function searchReddit(query) {
  const terms = normalizeQuery(query);
  const cacheKey = terms.toLowerCase();
  const cached = redditSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const waitMs = redditNextRequestAt - Date.now();
  if (waitMs > 0) await wait(waitMs);
  redditNextRequestAt = Date.now() + REDDIT_MIN_INTERVAL_MS;

  let items = [];
  let sourceMode = 'no-live-results';

  // 1. Try OAuth if configured
  try {
    const token = await getRedditAccessToken().catch(() => null);
    if (token) {
      const url = new URL('https://oauth.reddit.com/r/bihar/search.json');
      url.searchParams.set('q', terms);
      url.searchParams.set('restrict_sr', '1');
      url.searchParams.set('sort', 'new');
      url.searchParams.set('limit', String(MAX_RESULTS));
      const response = await fetch(url, {
        headers: {
          'User-Agent': process.env.REDDIT_USER_AGENT || 'GrievancePulseAI/1.0.0 (by /u/cyberhope_bot)',
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) {
        const result = await response.json();
        items = (result.data?.children || []).map(({ data }) => ({
          id: data.id ? `reddit-${data.id}` : `reddit-${Date.now()}-${Math.random()}`,
          source: 'Reddit',
          title: data.title || 'Untitled post',
          text: [data.title, data.selftext].filter(Boolean).join('\n\n').slice(0, 4000),
          author: data.author ? `u/${data.author}` : 'Reddit user',
          subreddit: data.subreddit_name_prefixed || 'r/bihar',
          published_at: Number.isFinite(data.created_utc) ? new Date(data.created_utc * 1000).toISOString() : null,
          url: data.permalink ? `https://www.reddit.com${data.permalink}` : null,
          thumbnail_url: data.thumbnail && data.thumbnail.startsWith('http') ? data.thumbnail : null,
        }));
        if (items.length) sourceMode = 'live-oauth';
      }
    }
  } catch (oauthErr) {
    console.warn('[searchReddit] OAuth attempt failed:', oauthErr.message);
  }

  // 2. Try Public RSS search
  if (!items.length) {
    try {
      const cleanTerms = terms.replace(/["#]/g, ' ').replace(/\s+/g, ' ').trim();
      const rssUrl = `https://www.reddit.com/r/bihar/search.rss?q=${encodeURIComponent(cleanTerms)}&restrict_sr=1&sort=new`;
      const response = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.ok) {
        const xml = await response.text();
        const feed = await rssParser.parseString(xml);
        items = (feed.items || []).map(item => {
          const rawSnippet = (item.contentSnippet || item.content || '')
            .replace(/\s*submitted by\s+\/u\/[\w-]+\s*\[link\]\s*\[comments\]/gi, '')
            .replace(/<[^>]+>/g, '')
            .trim();
          const imgMatch = (item.content || '').match(/<img[^>]+src=["']([^"']+)["']/i) ||
            (item.content || '').match(/href=["']([^"']+\.(?:jpg|png|webp|jpeg))["']/i);
          const author = item.author ? item.author.replace(/^\/?u\//, 'u/') : 'u/bihar_redditor';
          return {
            id: item.id ? `reddit-${item.id.replace(/[^a-zA-Z0-9_-]/g, '')}` : `reddit-${Date.now()}-${Math.random()}`,
            source: 'Reddit',
            title: item.title || 'Civic issue reported on r/bihar',
            text: [item.title, rawSnippet].filter(Boolean).join('\n\n').slice(0, 4000),
            author,
            subreddit: 'r/bihar',
            published_at: item.isoDate || item.pubDate || new Date().toISOString(),
            url: item.link || 'https://www.reddit.com/r/bihar',
            thumbnail_url: imgMatch ? imgMatch[1].replace(/&amp;/g, '&') : null,
          };
        });
        if (items.length) sourceMode = 'live-rss';
      }
    } catch (rssErr) {
      console.warn(`[searchReddit] Live RSS search error (${terms}):`, rssErr.message);
    }
  }

  // 3. Fallback to curated Bihar civic Reddit feed pool
  if (!items.length) {
    const qLower = terms.toLowerCase();
    const words = qLower.split(/\s+/).filter(w => w.length > 2);
    items = BIHAR_REDDIT_SEED_POOL.filter(p => {
      const pText = (p.title + ' ' + p.text).toLowerCase();
      return words.some(w => pText.includes(w));
    }).slice(0, 4).map(item => ({ ...item, is_demo: true }));
    if (items.length) sourceMode = 'curated-demo';
  }

  const result = { source: 'reddit', source_mode: sourceMode, count: items.length, items };
  redditSearchCache.set(cacheKey, {
    result,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
  return result;
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
  if (source === 'all') {
    const sources = ['google-news', 'reddit'];
    const youtubeWaitMs = youtubeNextRequestAt - Date.now();
    const youtubeSkipped = youtubeRequestsPending > 0 || youtubeWaitMs > 10000;
    if (!youtubeSkipped) sources.push('youtube');
    const settled = await Promise.allSettled(sources.map(provider => searchPublicSource(provider, query)));
    const source_status = settled.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          source: sources[index],
          count: result.value.count,
          source_mode: result.value.source_mode || 'live',
        };
      }
      return {
        source: sources[index],
        count: 0,
        error: result.reason?.message || 'Search failed.',
      };
    });
    if (youtubeSkipped) {
      source_status.push({
        source: 'youtube',
        count: 0,
        error: 'Skipped to respect YouTube request limits; search YouTube separately when ready.',
      });
    }
    const items = settled.flatMap(result => result.status === 'fulfilled' ? result.value.items || [] : []);
    return { source: 'all', count: items.length, items, source_status };
  }
  const error = new Error('Source must be all, google-news, reddit, or youtube.');
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
