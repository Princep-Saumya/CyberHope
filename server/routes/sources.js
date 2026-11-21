const express = require('express');
const { getOsintTaxonomy, getSourceStatus, searchPublicSource } = require('../services/publicSources');
const { createRateLimit } = require('../middleware/rateLimit');
const { fetchGrievances } = require('../services/storeService');
const { matchesLocalSearch } = require('../utils/feedSearch');
const { getSector } = require('../services/osintTaxonomy');

const router = express.Router();
const sourceSearchLimit = createRateLimit({ windowMs: 60 * 1000, max: 20 });

function getLocalSearchMatches(query, source) {
  return fetchGrievances()
    .filter(record => matchesLocalSearch(record, query))
    .filter(record => source !== 'youtube' || /youtube/i.test(record.platform || ''))
    .slice(0, 20)
    .map(record => ({
      id: `local-${record.id}`,
      source: record.platform || 'Saved report',
      title: record.title || record.headline || record.category || 'Saved OSINT report',
      text: record.post_text || record.ai_summary || record.title || '',
      author: record.author_handle || 'Saved report',
      published_at: record.timestamp || record.imported_at || null,
      url: record.source_url || null,
      thumbnail_url: record.image_url || null,
      is_cached: true,
    }));
}

function isYouTubeQuotaFailure(error) {
  return (error.status === 429 || error.status === 403)
    && (/quota|daily safety limit/i.test(error.message) || error.isQuotaExceeded);
}

router.get('/sources/status', (_req, res) => {
  res.json({ sources: getSourceStatus() });
});

router.get('/sources/taxonomy', (_req, res) => {
  res.json({ count: getOsintTaxonomy().length, sectors: getOsintTaxonomy() });
});

router.get('/sources/search', sourceSearchLimit, async (req, res) => {
  try {
    const sectorId = typeof req.query.sector === 'string' ? req.query.sector : '';
    if (sectorId && !getSector(sectorId)) {
      return res.status(400).json({ error: 'Selected OSINT sector is not recognized.' });
    }
    const results = await searchPublicSource(req.query.source, req.query.q, {
      signal: AbortSignal.timeout(10000),
      sectorId,
    });
    const youtubeQuotaReached = results.source === 'all'
      && results.source_status?.some(status => status.source === 'youtube'
        && /quota|daily safety limit/i.test(status.error || ''));
    if (youtubeQuotaReached) {
      const cachedItems = getLocalSearchMatches(req.query.q, 'all');
      if (cachedItems.length) {
        return res.json({
          ...results,
          count: results.items.length + cachedItems.length,
          items: [...results.items, ...cachedItems],
          source_status: [
            ...results.source_status,
            {
              source: 'Saved OSINT records',
              count: cachedItems.length,
              source_mode: 'cached-local',
              message: 'Showing saved matches because the live YouTube quota is exhausted.',
            },
          ],
          retrieved_at: new Date().toISOString(),
        });
      }
    }
    res.json({ ...results, retrieved_at: new Date().toISOString() });
  } catch (error) {
    if (req.query.source === 'youtube' && isYouTubeQuotaFailure(error)) {
      const items = getLocalSearchMatches(req.query.q, 'youtube');
      return res.json({
        source: 'youtube',
        source_mode: 'cached-local',
        cache_reason: 'YouTube daily search quota reached',
        count: items.length,
        items,
        source_status: [{
          source: 'YouTube',
          count: 0,
          error: 'Daily live YouTube quota reached.',
        }, {
          source: 'Saved OSINT records',
          count: items.length,
          source_mode: 'cached-local',
          message: 'Showing cached OSINT matches (Live API quota reached).',
        }],
        retrieved_at: new Date().toISOString(),
      });
    }
    const status = error.status || (error.name === 'TimeoutError' ? 504 : 502);
    res.status(status).json({ error: error.message || 'Public source search failed.' });
  }
});

module.exports = router;
