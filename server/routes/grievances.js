/**
 * GrievancePulse AI — Grievances Router
 * Handles all /api/* endpoints with central store service.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { analyzePost, generateOfficialResponse } = require('../services/geminiService');
const { getMasterTickets } = require('../utils/clustering');
const {
  getStore,
  getGrievance,
  fetchGrievances,
  addGrievance,
  updateGrievanceStatus,
  recordAcknowledgment,
  updateGrievanceAnalysis,
  calcStats,
} = require('../services/storeService');
const { getPollerStatus, triggerManualPoll } = require('../services/realTimePoller');

// ─── Real-Time Stream Status & Trigger ────────────────────────────────────────

router.get('/realtime/status', (_req, res) => {
  res.json(getPollerStatus());
});

router.post('/realtime/poll-now', async (_req, res) => {
  try {
    const status = await triggerManualPoll();
    res.json({ success: true, message: 'Poll cycle triggered', status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Grievance CRUD Endpoints ─────────────────────────────────────────────────

// GET /api/grievances — multi-parameter filtered list
router.get('/grievances', (req, res) => {
  try {
    const results = fetchGrievances(req.query);
    res.json({ count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grievances/:id — single record
router.get('/grievances/:id', (req, res) => {
  const record = getGrievance(req.params.id);
  if (!record) return res.status(404).json({ error: 'Grievance not found' });
  res.json(record);
});

// PATCH /api/grievances/:id/status — update status lifecycle
router.patch('/grievances/:id/status', (req, res) => {
  const { status } = req.body;
  const VALID_STATUSES = ['Received', 'Assigned', 'Under Investigation', 'Resolved', 'Closed'];

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const updated = updateGrievanceStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: 'Grievance not found' });

  res.json({ success: true, record: updated });
});

// POST /api/grievances/:id/acknowledgment — record an acknowledgment draft locally
router.post('/grievances/:id/acknowledgment', (req, res) => {
  const { message } = req.body;
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'message must be 2000 characters or fewer' });
  }

  const updated = recordAcknowledgment(req.params.id, message);
  if (!updated) return res.status(404).json({ error: 'Grievance not found' });

  res.json({ success: true, record: updated, delivery: 'recorded' });
});

// POST /api/analyze — Gemini AI analysis pipeline
router.post('/analyze', async (req, res) => {
  const { post_text, image_ocr_text, grievance_id } = req.body;

  if (!post_text) return res.status(400).json({ error: 'post_text is required' });

  try {
    const analysis = await analyzePost(post_text, image_ocr_text || '');

    if (grievance_id) {
      updateGrievanceAnalysis(grievance_id, analysis);
    }

    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clusters — master ticket summaries
router.get('/clusters', (_req, res) => {
  try {
    const masters = getMasterTickets(getStore());
    res.json({ count: masters.length, data: masters });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats — dashboard analytics
router.get('/stats', (_req, res) => {
  try {
    res.json(calcStats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/grievances/import — public source import
router.post('/grievances/import', async (req, res) => {
  const { source, source_id, source_url, author, published_at, post_text } = req.body;
  if (!['Google News', 'Reddit', 'YouTube', 'Public Forum'].includes(source)) {
    return res.status(400).json({ error: 'Invalid source provider.' });
  }
  if (typeof post_text !== 'string' || !post_text.trim() || post_text.length > 4000) {
    return res.status(400).json({ error: 'post_text must contain 1 to 4000 characters.' });
  }
  if (typeof source_url !== 'string') {
    return res.status(400).json({ error: 'source_url is required.' });
  }

  try {
    const analysis = await analyzePost(post_text.trim());
    const id = `EXT-${crypto.randomUUID()}`;
    const record = {
      id,
      platform: source,
      author_handle: typeof author === 'string' && author.trim() ? author.slice(0, 100) : source,
      timestamp: typeof published_at === 'string' && Number.isFinite(Date.parse(published_at))
        ? new Date(published_at).toISOString()
        : new Date().toISOString(),
      post_text: post_text.trim(),
      image_url: null,
      image_ocr_text: '',
      location_tagged: analysis.extracted_location || 'Bihar',
      coordinates: analysis.coordinates,
      hashtags: [...new Set(post_text.match(/#[\p{L}\p{N}_]+/gu) || [])],
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
      source_id: typeof source_id === 'string' ? source_id.slice(0, 200) : null,
      source_url,
      imported_at: new Date().toISOString(),
      public_engagement: {
        shares: Math.floor(Math.random() * 30) + 2,
        comments: Math.floor(Math.random() * 12) + 1,
        likes: Math.floor(Math.random() * 50) + 5,
      },
    };

    const { record: savedRecord, duplicate } = addGrievance(record);
    res.status(201).json({ success: true, duplicate, record: savedRecord, analysis });
  } catch (error) {
    res.status(502).json({ error: `Could not analyze this source item: ${error.message}` });
  }
});

// POST /api/sample-reports — analyze and add a simulated or test report
router.post('/sample-reports', async (req, res) => {
  const { post_text, platform, author_handle, location_tagged, coordinates, hashtags } = req.body;
  if (typeof post_text !== 'string' || !post_text.trim()) {
    return res.status(400).json({ error: 'post_text is required' });
  }

  try {
    const analysis = await analyzePost(post_text.trim());
    const timestamp = new Date().toISOString();
    const record = {
      id: `SAMPLE-${Date.now()}`,
      platform: typeof platform === 'string' ? platform.slice(0, 40) : 'Sample Entry',
      author_handle: typeof author_handle === 'string' ? author_handle.slice(0, 80) : '@sample_report',
      timestamp,
      post_text: post_text.trim(),
      image_url: null,
      image_ocr_text: '',
      location_tagged: typeof location_tagged === 'string' && location_tagged.trim()
        ? location_tagged.trim().slice(0, 120)
        : analysis.extracted_location,
      coordinates: coordinates || analysis.coordinates,
      hashtags: hashtags || [],
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
      is_simulated: true,
      public_engagement: {
        shares: Math.floor(Math.random() * 45) + 5,
        comments: Math.floor(Math.random() * 20) + 2,
        likes: Math.floor(Math.random() * 110) + 12,
      },
    };

    const { record: savedRecord } = addGrievance(record);
    res.status(201).json({ success: true, record: savedRecord, analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/official-response — generate official Bihar Govt response
router.post('/official-response', async (req, res) => {
  const { grievance_id } = req.body;
  if (!grievance_id) return res.status(400).json({ error: 'grievance_id is required' });

  const grievance = getGrievance(grievance_id);
  if (!grievance) return res.status(404).json({ error: 'Grievance not found' });

  try {
    const result = await generateOfficialResponse(grievance);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/grievances/:id/escalate — escalate to District Nodal Officer
router.patch('/grievances/:id/escalate', (req, res) => {
  const grievance = getGrievance(req.params.id);
  if (!grievance) return res.status(404).json({ error: 'Grievance not found' });

  const updated = updateGrievanceStatus(req.params.id, 'Escalated to DM');
  res.json({ success: true, record: updated });
});

module.exports = router;
