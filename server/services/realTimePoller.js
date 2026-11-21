/**
 * GrievancePulse AI — Real-Time Background Ingestion Poller
 * Continuously discovers and ingests live public grievances, runs AI analysis, and broadcasts via WebSockets.
 */

const { searchGoogleNews, searchYouTube, searchReddit } = require('./publicSources');
const { analyzePost } = require('./geminiService');
const { addGrievance, calcStats, findDuplicateGrievance } = require('./storeService');
const { getPollQuery } = require('./osintTaxonomy');

const GEMINI_POLL_EVERY_N_POLLS = 40;
const YOUTUBE_POLL_EVERY_N_POLLS = 60;

let currentQueryIndex = 0;
let timer = null;
let ioInstance = null;
let pollInProgress = false;
let lastManualPollAt = 0;
let pollingStats = {
  active: false,
  interval_ms: 45000,
  last_polled_at: null,
  total_polls: 0,
  total_items_found: 0,
  total_ingested_live: 0,
  current_query: '',
  current_sector: '',
  current_source: 'Reddit / News RSS',
  last_poll: null,
};

async function pollOnce() {
  if (!ioInstance || pollInProgress) return;
  pollInProgress = true;

  const { sector, query } = getPollQuery(currentQueryIndex);
  currentQueryIndex++;
  pollingStats.current_query = query;
  pollingStats.current_sector = sector.id;
  pollingStats.last_polled_at = new Date().toISOString();
  pollingStats.total_polls++;
  let itemsFound = 0;
  let newlyIngestedCount = 0;
  let skippedDuplicateCount = 0;
  let skippedDemoCount = 0;

  try {
    const useYouTube = Boolean(process.env.YOUTUBE_API_KEY)
      && pollingStats.total_polls % YOUTUBE_POLL_EVERY_N_POLLS === 1;
    let sourceResult;

    if (useYouTube) {
      pollingStats.current_source = 'YouTube Data API v3';
      sourceResult = await searchYouTube(query).catch(err => {
        console.warn(`[RealTimePoller] YouTube search error (${query}):`, err.message);
        return { items: [] };
      });

      if (!sourceResult.items?.length) {
        pollingStats.current_source = 'Reddit (r/bihar)';
        sourceResult = await searchReddit(query).catch(err => {
          console.warn(`[RealTimePoller] Reddit fallback error (${query}):`, err.message);
          return { items: [] };
        });
      }
    } else if (pollingStats.total_polls % 2 === 1) {
      // Ingest live Reddit feed discussions
      pollingStats.current_source = 'Reddit (r/bihar)';
      sourceResult = await searchReddit(query).catch(err => {
        console.warn(`[RealTimePoller] Reddit search error (${query}):`, err.message);
        return { items: [] };
      });

      if (!sourceResult.items?.length) {
        pollingStats.current_source = 'Google News RSS';
        sourceResult = await searchGoogleNews(query).catch(err => {
          console.warn(`[RealTimePoller] News fallback error (${query}):`, err.message);
          return { items: [] };
        });
      }
    } else {
      // Ingest live Google News feeds
      pollingStats.current_source = 'Google News RSS';
      sourceResult = await searchGoogleNews(query).catch(err => {
        console.warn(`[RealTimePoller] News search error (${query}):`, err.message);
        return { items: [] };
      });

      if (!sourceResult.items?.length) {
        pollingStats.current_source = 'Reddit (r/bihar)';
        sourceResult = await searchReddit(query).catch(err => {
          console.warn(`[RealTimePoller] Reddit fallback error (${query}):`, err.message);
          return { items: [] };
        });
      }
    }

    const items = sourceResult.items || [];
    itemsFound = items.length;
    pollingStats.total_items_found += items.length;

    let usedGeminiThisPoll = false;

    for (const item of items) {
      if (item.is_demo) {
        skippedDemoCount++;
        continue;
      }
      if (!item.text && !item.title) continue;

      const platformName = item.source || (item.subreddit ? 'Reddit' : 'Google News');
      if (findDuplicateGrievance({
        source_id: item.id || null,
        source_url: item.url || null,
        platform: platformName,
      })) {
        skippedDuplicateCount++;
        continue;
      }

      const postText = (item.text || item.title).slice(0, 800);
      const useGemini = pollingStats.total_polls % GEMINI_POLL_EVERY_N_POLLS === 1
        && !usedGeminiThisPoll;
      if (useGemini) usedGeminiThisPoll = true;
      const analysis = await analyzePost(postText, '', { useGemini });

      let authorHandle = item.author;
      if (!authorHandle) {
        authorHandle = platformName === 'Reddit' ? 'u/bihar_redditor' : '@bihar_live_desk';
      } else if (!authorHandle.startsWith('@') && !authorHandle.startsWith('u/')) {
        authorHandle = platformName === 'Reddit' ? `u/${authorHandle.replace(/^\/?u\//, '')}` : `@${authorHandle.replace(/\s+/g, '_').toLowerCase()}`;
      }

      const id = `LIVE-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const record = {
        id,
        platform: platformName,
        author_handle: authorHandle,
        timestamp: item.published_at || new Date().toISOString(),
        post_text: postText,
        image_url: item.thumbnail_url || item.image_url || null,
        image_ocr_text: '',
        location_tagged: analysis.extracted_location || 'Bihar',
        coordinates: analysis.coordinates,
        coordinates_approximate: analysis.coordinates_approximate,
        hashtags: [...new Set((postText.match(/#[\p{L}\p{N}_]+/gu) || []))],
        department: analysis.department,
        sector: analysis.sector,
        sector_label: analysis.sector_label,
        category: analysis.category,
        severity_score: analysis.severity_score,
        priority_score: analysis.priority_score,
        sentiment_score: analysis.sentiment_score,
        sentiment_label: analysis.sentiment_label,
        authenticity_risk_score: analysis.authenticity_risk_score,
        authenticity_flag: analysis.authenticity_flag,
        status: 'Received',
        duplicate_cluster_id: null,
        ai_summary: analysis.summary,
        analysis_mode: analysis.analysis_mode,
        source_id: item.id || null,
        source_url: item.url || null,
        is_realtime_stream: true,
        imported_at: new Date().toISOString(),
      };

      const result = addGrievance(record);

      if (!result.duplicate) {
        newlyIngestedCount++;
        pollingStats.total_ingested_live++;
        console.log(`[RealTimePoller] 📡 Live Grievance Ingested: ${record.id} [${record.department}] - ${record.location_tagged}`);

        // Broadcast to all connected client dashboards
        ioInstance.emit('new_grievance', {
          record: result.record,
          analysis,
          stats: calcStats(),
        });

        // Limit ingestion burst per poll cycle to avoid flooding
        if (newlyIngestedCount >= 2) break;
      }
    }
  } catch (err) {
    console.error('[RealTimePoller] Poll cycle failed:', err.message);
  } finally {
    pollingStats.last_poll = {
      query,
      sector: sector.id,
      source: pollingStats.current_source,
      found: itemsFound,
      ingested: newlyIngestedCount,
      duplicates: skippedDuplicateCount,
      demo_items_skipped: skippedDemoCount,
      completed_at: new Date().toISOString(),
    };
    pollInProgress = false;
  }
}

function startPoller(io, intervalMs = 45000) {
  ioInstance = io;
  pollingStats.interval_ms = intervalMs;
  pollingStats.active = true;

  if (timer) clearInterval(timer);

  // Initial poll after 5 seconds of server startup
  setTimeout(() => {
    pollOnce();
  }, 5000);

  // Recurring cron interval
  timer = setInterval(pollOnce, intervalMs);
  console.log(`📡 Real-Time Ingestion Poller started (Every ${intervalMs / 1000}s)`);
}

function stopPoller() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  pollingStats.active = false;
  console.log('🛑 Real-Time Ingestion Poller stopped');
}

function getPollerStatus() {
  return pollingStats;
}

async function triggerManualPoll() {
  if (pollInProgress) {
    const error = new Error('A feed scan is already running. Wait for it to finish.');
    error.status = 429;
    throw error;
  }

  const elapsed = Date.now() - lastManualPollAt;
  if (elapsed < 6000) {
    const error = new Error('Please wait six seconds between manual feed scans.');
    error.status = 429;
    throw error;
  }

  lastManualPollAt = Date.now();
  await pollOnce();
  return pollingStats;
}

module.exports = {
  startPoller,
  stopPoller,
  getPollerStatus,
  triggerManualPoll,
};
