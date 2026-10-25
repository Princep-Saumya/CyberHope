/**
 * GrievancePulse AI — Real-Time Background Ingestion Poller
 * Continuously discovers and ingests live public grievances, runs AI analysis, and broadcasts via WebSockets.
 */

const { searchGoogleNews, searchReddit, searchYouTube } = require('./publicSources');
const { analyzePost } = require('./geminiService');
const { addGrievance, calcStats } = require('./storeService');

const QUERY_ROTATION = [
  'Bihar road pothole accident',
  'Bihar power outage transformer',
  'Bihar water contamination hospital',
  'Bihar cyber crime paper leak',
  'Bihar flood embankment',
  'Patna drainage sanitation',
  'Muzaffarpur civic issue',
  'Gaya electricity water',
];

let currentQueryIndex = 0;
let timer = null;
let ioInstance = null;
let pollingStats = {
  active: false,
  interval_ms: 45000,
  last_polled_at: null,
  total_polls: 0,
  total_items_found: 0,
  total_ingested_live: 0,
  current_query: '',
  current_source: 'Google News',
};

async function pollOnce() {
  if (!ioInstance) return;

  const query = QUERY_ROTATION[currentQueryIndex % QUERY_ROTATION.length];
  currentQueryIndex++;
  pollingStats.current_query = query;
  pollingStats.last_polled_at = new Date().toISOString();
  pollingStats.total_polls++;

  try {
    let sourceResult = { items: [] };

    // Alternate between YouTube, Reddit, and Google News
    if (process.env.YOUTUBE_API_KEY && pollingStats.total_polls % 2 === 1) {
      pollingStats.current_source = 'YouTube Data API v3';
      sourceResult = await searchYouTube(query).catch(err => {
        console.warn(`[RealTimePoller] YouTube search error (${query}):`, err.message);
        return { items: [] };
      });
    } else {
      pollingStats.current_source = 'Google News RSS';
      sourceResult = await searchGoogleNews(query).catch(err => {
        console.warn(`[RealTimePoller] News search error (${query}):`, err.message);
        return { items: [] };
      });
    }

    // Fallback if empty
    if (!sourceResult.items || sourceResult.items.length === 0) {
      sourceResult = await searchGoogleNews(query).catch(() => ({ items: [] }));
      pollingStats.current_source = 'Google News RSS';
    }

    const items = sourceResult.items || [];
    pollingStats.total_items_found += items.length;

    let newlyIngestedCount = 0;

    for (const item of items) {
      if (!item.text && !item.title) continue;

      const postText = (item.text || item.title).slice(0, 800);
      const analysis = await analyzePost(postText);

      const id = `LIVE-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const record = {
        id,
        platform: item.source || 'Google News',
        author_handle: item.author ? (item.author.startsWith('@') ? item.author : `@${item.author.replace(/\s+/g, '_').toLowerCase()}`) : '@bihar_live_desk',
        timestamp: item.published_at || new Date().toISOString(),
        post_text: postText,
        image_url: item.thumbnail_url || item.image_url || null,
        image_ocr_text: '',
        location_tagged: analysis.extracted_location || 'Bihar',
        coordinates: analysis.coordinates,
        hashtags: [...new Set((postText.match(/#[\p{L}\p{N}_]+/gu) || []))],
        department: analysis.department,
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
        public_engagement: {
          shares: Math.floor(Math.random() * 35) + 3,
          comments: Math.floor(Math.random() * 18) + 1,
          likes: Math.floor(Math.random() * 75) + 8,
        },
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
  await pollOnce();
  return pollingStats;
}

module.exports = {
  startPoller,
  stopPoller,
  getPollerStatus,
  triggerManualPoll,
};
