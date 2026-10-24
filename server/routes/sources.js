const express = require('express');
const { getOsintTaxonomy, getSourceStatus, searchPublicSource } = require('../services/publicSources');

const router = express.Router();

router.get('/sources/status', (_req, res) => {
  res.json({ sources: getSourceStatus() });
});

router.get('/sources/taxonomy', (_req, res) => {
  res.json({ count: getOsintTaxonomy().length, sectors: getOsintTaxonomy() });
});

router.get('/sources/search', async (req, res) => {
  try {
    const results = await searchPublicSource(req.query.source, req.query.q);
    res.json({ ...results, retrieved_at: new Date().toISOString() });
  } catch (error) {
    const status = error.status || (error.name === 'TimeoutError' ? 504 : 502);
    res.status(status).json({ error: error.message || 'Public source search failed.' });
  }
});

module.exports = router;
