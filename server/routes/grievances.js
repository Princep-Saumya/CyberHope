/**
 * GrievancePulse AI — Grievances Router
 * Handles all /api/* endpoints with in-memory store + seed fallback.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { analyzePost, generateOfficialResponse } = require('../services/geminiService');
const { clusterGrievances, getMasterTickets } = require('../utils/clustering');

// ─── In-Memory Store (initialized from seed) ─────────────────────────────────

const SEED_PATH = path.join(__dirname, '../data/seed_grievances.json');
let grievanceStore = [];

function initStore() {
  try {
    const raw = require(SEED_PATH);
    // Apply clustering to seed data (preserves existing cluster IDs)
    grievanceStore = clusterGrievances(raw);
    console.log(`✅ Loaded ${grievanceStore.length} seed grievances into memory store`);
  } catch (err) {
    console.error('❌ Failed to load seed data:', err.message);
    grievanceStore = [];
  }
}

initStore();

// ─── Hybrid Fetch with Fallback ───────────────────────────────────────────────

const MIN_RESULT_COUNT = 10;
const TARGET_RESULT_COUNT = 15;

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

  // Hybrid fallback: if results < MIN, pad with unfiltered seed records
  if (results.length < MIN_RESULT_COUNT) {
    const existingIds = new Set(results.map(r => r.id));
    const extras = grievanceStore
      .filter(g => !existingIds.has(g.id))
      .slice(0, TARGET_RESULT_COUNT - results.length);
    results = [...results, ...extras];
  }

  return results;
}

// ─── Stats Calculator ─────────────────────────────────────────────────────────

function calcStats(records) {
  const clusters = getMasterTickets(records);
  const duplicatesCount = clusters.reduce((sum, c) => sum + c.member_count, 0);

  return {
    total: records.length,
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
