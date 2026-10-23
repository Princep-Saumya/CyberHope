/**
 * GrievancePulse AI — Grievances Router
 * Handles all /api/* endpoints with in-memory store + seed fallback.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto');
const { analyzePost, generateOfficialResponse } = require('../services/geminiService');
const { clusterGrievances, getMasterTickets } = require('../utils/clustering');

// ─── In-Memory Store (initialized from seed) ─────────────────────────────────

const SEED_PATH = path.join(__dirname, '../data/seed_grievances.json');
let grievanceStore = [];

function initStore() {
  try {
    const raw = require(SEED_PATH);
    // Apply clustering to seed data (preserves existing cluster IDs)
    grievanceStore = clusterGrievances(raw.map(record => ({ ...record, is_reference_record: true })));
    console.log(`✅ Loaded ${grievanceStore.length} seed grievances into memory store`);
  } catch (err) {
    console.error('❌ Failed to load seed data:', err.message);
    grievanceStore = [];
  }
}

initStore();

// ─── Filtered Store Queries ───────────────────────────────────────────────────

function fetchGrievances(filters = {}) {
  const { hashtag, location, department, status, severity, authenticity } = filters;

  let results = [...grievanceStore];

  // Filter: hashtag (partial match across hashtags array + post_text)
  if (hashtag && hashtag.trim()) {
    const q = hashtag.trim().toLowerCase();
    results = results.filter(g =>
      (g.hashtags || []).some(h => h.toLowerCase().includes(q)) ||
      g.post_text.toLowerCase().includes(q)
    );
  }

  // Filter: location (partial match)
  if (location && location.trim()) {
    const q = location.trim().toLowerCase();
    results = results.filter(g =>
      g.location_tagged?.toLowerCase().includes(q) ||
      g.post_text?.toLowerCase().includes(q)
    );
  }

  // Filter: department
  if (department && department.trim()) {
    const q = department.trim().toLowerCase();
    results = results.filter(g => g.department?.toLowerCase().includes(q));
  }

  // Filter: status
  if (status && status.trim() && status !== 'All') {
    results = results.filter(g => g.status === status);
  }

  // Filter: severity (minimum threshold)
  if (severity && !isNaN(severity)) {
    results = results.filter(g => g.severity_score >= parseInt(severity));
  }

  // Filter: authenticity
  if (authenticity === 'genuine') {
    results = results.filter(g => g.authenticity_flag === 'Likely Genuine Grievance');
  } else if (authenticity === 'suspicious') {
    results = results.filter(g => g.authenticity_flag !== 'Likely Genuine Grievance');
  }

  return results;
}

// ─── Stats Calculator ─────────────────────────────────────────────────────────

function calcStats(records) {
  const clusters = getMasterTickets(records);
  const duplicatesCount = clusters.reduce((sum, c) => sum + c.member_count, 0);

  return {
    total: records.length,
    reference_records: records.filter(record => record.is_reference_record).length,
    critical: records.filter(g => g.severity_score >= 8).length,
    duplicates_clustered: duplicatesCount,
    cluster_count: clusters.length,
    genuine: records.filter(g => g.authenticity_flag === 'Likely Genuine Grievance').length,
    suspicious: records.filter(g => g.authenticity_flag !== 'Likely Genuine Grievance').length,
    by_department: Object.entries(
      records.reduce((acc, g) => {
        acc[g.department] = (acc[g.department] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, count]) => ({ name, count })),
    by_category: Object.entries(
      records.reduce((acc, g) => {
        acc[g.category] = (acc[g.category] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, count]) => ({ name, count })),
    by_status: Object.entries(
      records.reduce((acc, g) => {
        acc[g.status] = (acc[g.status] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, count]) => ({ name, count })),
    analysis_mode: process.env.GEMINI_API_KEY ? 'Gemini API configured' : 'Local heuristic mode',
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

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
  const record = grievanceStore.find(g => g.id === req.params.id);
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

  const idx = grievanceStore.findIndex(g => g.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Grievance not found' });

  grievanceStore[idx] = { ...grievanceStore[idx], status, updated_at: new Date().toISOString() };
  res.json({ success: true, record: grievanceStore[idx] });
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

  const idx = grievanceStore.findIndex(g => g.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Grievance not found' });

  const timestamp = new Date().toISOString();
  const auditEntry = {
    action: 'ACKNOWLEDGMENT_RECORDED',
    timestamp,
    by: 'Operator',
    note: 'Acknowledgment saved to the temporary in-memory store; no message was sent externally.',
  };
  grievanceStore[idx] = {
    ...grievanceStore[idx],
    acknowledgment: { message: message.trim(), recorded_at: timestamp, delivery: 'not-sent' },
    audit_log: [...(grievanceStore[idx].audit_log || []), auditEntry],
  };

  res.json({ success: true, record: grievanceStore[idx], delivery: 'not-sent' });
});

// POST /api/analyze — Gemini AI analysis pipeline
router.post('/analyze', async (req, res) => {
  const { post_text, image_ocr_text, grievance_id } = req.body;

  if (!post_text) return res.status(400).json({ error: 'post_text is required' });

  try {
    const analysis = await analyzePost(post_text, image_ocr_text || '');

    // If a grievance_id is provided, update the in-memory record
    if (grievance_id) {
      const idx = grievanceStore.findIndex(g => g.id === grievance_id);
      if (idx !== -1) {
        grievanceStore[idx] = {
          ...grievanceStore[idx],
          department: analysis.department,
          category: analysis.category,
          severity_score: analysis.severity_score,
          authenticity_risk_score: analysis.authenticity_risk_score,
          authenticity_flag: analysis.authenticity_flag,
          ai_summary: analysis.summary,
          analysis_mode: analysis.analysis_mode,
          ai_analyzed_at: new Date().toISOString(),
        };
      }
    }

    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clusters — master ticket summaries
router.get('/clusters', (req, res) => {
  try {
    const masters = getMasterTickets(grievanceStore);
    res.json({ count: masters.length, data: masters });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats — dashboard analytics
router.get('/stats', (req, res) => {
  try {
    const all = fetchGrievances({});
    res.json(calcStats(all));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/grievances/import', async (req, res) => {
  const { source, source_id, source_url, author, published_at, post_text } = req.body;
  if (!['Google News', 'Reddit'].includes(source)) {
    return res.status(400).json({ error: 'source must be Google News or Reddit.' });
  }
  if (typeof post_text !== 'string' || !post_text.trim() || post_text.length > 4000) {
    return res.status(400).json({ error: 'post_text must contain 1 to 4000 characters.' });
  }
  if (typeof source_url !== 'string') {
    return res.status(400).json({ error: 'source_url is required.' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(source_url);
  } catch {
    return res.status(400).json({ error: 'source_url must be a valid URL.' });
  }
  const allowedHosts = source === 'Reddit'
    ? ['reddit.com', 'www.reddit.com']
    : ['news.google.com'];
  if (parsedUrl.protocol !== 'https:' || !allowedHosts.includes(parsedUrl.hostname)) {
    return res.status(400).json({ error: 'source_url must be an HTTPS link from the selected source.' });
  }

  const existing = grievanceStore.find(record => record.source_url === parsedUrl.toString());
  if (existing) {
    return res.json({ success: true, duplicate: true, record: existing });
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
      location_tagged: analysis.extracted_location || 'Unspecified',
      coordinates: null,
      hashtags: [...new Set(post_text.match(/#[\p{L}\p{N}_]+/gu) || [])],
      department: analysis.department,
      category: analysis.category,
      severity_score: analysis.severity_score,
      authenticity_risk_score: analysis.authenticity_risk_score,
      authenticity_flag: analysis.authenticity_flag,
      status: 'Received',
      duplicate_cluster_id: null,
      ai_summary: analysis.summary,
      analysis_mode: analysis.analysis_mode,
      source_id: typeof source_id === 'string' ? source_id.slice(0, 200) : null,
      source_url: parsedUrl.toString(),
      imported_at: new Date().toISOString(),
    };

    grievanceStore = clusterGrievances([...grievanceStore, record]);
    const savedRecord = grievanceStore.find(item => item.id === id);
    res.status(201).json({ success: true, duplicate: false, record: savedRecord, analysis });
  } catch (error) {
    res.status(502).json({ error: `Could not analyze this source item: ${error.message}` });
  }
});

// POST /api/sample-reports — analyze and add a clearly labeled sample post
router.post('/sample-reports', async (req, res) => {
  const { post_text, platform, author_handle, location_tagged, coordinates, hashtags } = req.body;
  if (typeof post_text !== 'string' || !post_text.trim()) {
    return res.status(400).json({ error: 'post_text is required' });
  }
  if (post_text.length > 2000) {
    return res.status(400).json({ error: 'post_text must be 2000 characters or fewer' });
  }
  if (coordinates && (
    !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng) ||
    coordinates.lat < 24 || coordinates.lat > 28.5 ||
    coordinates.lng < 83 || coordinates.lng > 89.5
  )) {
    return res.status(400).json({ error: 'coordinates must be valid coordinates within Bihar' });
  }
  if (hashtags !== undefined && (!Array.isArray(hashtags) || hashtags.some(tag => typeof tag !== 'string'))) {
    return res.status(400).json({ error: 'hashtags must be an array of strings' });
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
      coordinates: coordinates || null,
      hashtags: hashtags || [],
      department: analysis.department,
      category: analysis.category,
      severity_score: analysis.severity_score,
      authenticity_risk_score: analysis.authenticity_risk_score,
      authenticity_flag: analysis.authenticity_flag,
      status: 'Received',
      duplicate_cluster_id: null,
      ai_summary: analysis.summary,
      analysis_mode: analysis.analysis_mode,
      is_simulated: true,
    };

    grievanceStore = clusterGrievances([...grievanceStore, record]);
    const savedRecord = grievanceStore.find(g => g.id === record.id);
    res.status(201).json({ success: true, record: savedRecord, analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/official-response — generate official Bihar Govt response
router.post('/official-response', async (req, res) => {
  const { grievance_id } = req.body;
  if (!grievance_id) return res.status(400).json({ error: 'grievance_id is required' });

  const grievance = grievanceStore.find(g => g.id === grievance_id);
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
  const idx = grievanceStore.findIndex(g => g.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Grievance not found' });

  const auditEntry = {
    action: 'ESCALATED_TO_DM',
    timestamp: new Date().toISOString(),
    by: 'System — SLA Auto-Escalation',
    note: 'Escalated to District Nodal Officer / DM due to SLA breach',
  };

  grievanceStore[idx] = {
    ...grievanceStore[idx],
    status: 'Escalated to DM',
    escalated_at: new Date().toISOString(),
    audit_log: [...(grievanceStore[idx].audit_log || []), auditEntry],
  };

  res.json({ success: true, record: grievanceStore[idx] });
});

module.exports = router;
