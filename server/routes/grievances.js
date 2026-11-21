/**
 * GrievancePulse AI — Grievances Router
 * Handles all /api/* endpoints with central store service.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { analyzePost, generateOfficialResponse } = require('../services/geminiService');
const { getMasterTickets, hasUsableLocation } = require('../utils/clustering');
const { getBiharDistricts } = require('../utils/biharGeoResolver');
const {
  getStore,
  getGrievance,
  findDuplicateGrievance,
  fetchGrievances,
  clearStore,
  addGrievance,
  updateGrievanceStatus,
  assignGrievanceLocation,
  recordAcknowledgment,
  updateGrievanceAnalysis,
  recordVerification,
  calcStats,
} = require('../services/storeService');
const { getPollerStatus, triggerManualPoll } = require('../services/realTimePoller');
const { startReanalysisJob, getReanalysisJob } = require('../services/reanalysisJobService');
const { createRateLimit } = require('../middleware/rateLimit');

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const aiRequestLimit = createRateLimit({ windowMs: 60 * 1000, max: 12 });
const feedPollLimit = createRateLimit({ windowMs: 60 * 1000, max: 5 });

function getImagePayload(imageData, imageMimeType) {
  if (imageData === undefined && imageMimeType === undefined) return null;
  if (typeof imageData !== 'string' || typeof imageMimeType !== 'string' || !ALLOWED_IMAGE_MIME_TYPES.has(imageMimeType)) {
    const error = new Error('Upload an image in JPEG, PNG, or WebP format.');
    error.status = 400;
    throw error;
  }
  if (!imageData || imageData.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 4 || imageData.length % 4 !== 0
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(imageData)) {
    const error = new Error('Image data must be valid base64 and no larger than 4 MB.');
    error.status = 400;
    throw error;
  }
  const bytes = Buffer.from(imageData, 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64') !== imageData) {
    const error = new Error('Image data must be valid base64 and no larger than 4 MB.');
    error.status = 400;
    throw error;
  }
  const isJpeg = imageMimeType === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = imageMimeType === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isWebp = imageMimeType === 'image/webp'
    && bytes.length >= 12
    && bytes.toString('ascii', 0, 4) === 'RIFF'
    && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!isJpeg && !isPng && !isWebp) {
    const error = new Error('Image content does not match its JPEG, PNG, or WebP type.');
    error.status = 400;
    throw error;
  }
  return { base64: imageData, mimeType: imageMimeType };
}

// ─── Real-Time Stream Status & Trigger ────────────────────────────────────────

router.get('/realtime/status', (_req, res) => {
  res.json(getPollerStatus());
});

router.post('/realtime/poll-now', feedPollLimit, async (_req, res) => {
  try {
    const status = await triggerManualPoll();
    res.json({ success: true, message: 'Poll cycle triggered', status });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/realtime/clear', (req, res) => {
  clearStore();
  if (req.io) {
    req.io.emit('store_cleared', { stats: calcStats() });
  }
  res.json({ success: true, message: 'All demo and existing records deleted. Store is completely clean.' });
});

router.post('/realtime/reanalyze-all', aiRequestLimit, (req, res) => {
  try {
    const job = startReanalysisJob(req.io);
    res.status(202).json({ success: true, job });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/realtime/reanalyze-all/:jobId', (req, res) => {
  const job = getReanalysisJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Batch re-analysis job not found.' });
  res.json({ job });
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

router.patch('/grievances/:id/location', (req, res) => {
  const { district, landmark = '' } = req.body || {};
  const validDistricts = getBiharDistricts();
  if (typeof district !== 'string' || !validDistricts.includes(district)) {
    return res.status(400).json({ error: `district must be one of the 38 Bihar districts.` });
  }
  if (typeof landmark !== 'string' || landmark.trim().length > 120) {
    return res.status(400).json({ error: 'landmark must be 120 characters or fewer.' });
  }

  const updated = assignGrievanceLocation(req.params.id, district, landmark.trim());
  if (!updated) return res.status(404).json({ error: 'Grievance not found' });
  if (req.io) {
    req.io.emit('location_assigned', { record: updated, stats: calcStats() });
  }
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

// POST /api/analyze — Groq text triage with Gemini fallback and optional Gemini image analysis
router.post('/analyze', aiRequestLimit, async (req, res) => {
  const { post_text, image_ocr_text, image_data, image_mime_type, grievance_id } = req.body;

  if (typeof post_text !== 'string' || !post_text.trim() || post_text.length > 4000) {
    return res.status(400).json({ error: 'post_text must contain 1 to 4000 characters.' });
  }
  if (image_ocr_text !== undefined && (typeof image_ocr_text !== 'string' || image_ocr_text.length > 2000)) {
    return res.status(400).json({ error: 'image_ocr_text must be a string of at most 2000 characters.' });
  }

  try {
    const image = getImagePayload(image_data, image_mime_type);
    const analysis = await analyzePost(post_text.trim(), image_ocr_text || '', { image });

    if (grievance_id) {
      updateGrievanceAnalysis(grievance_id, analysis);
    }

    res.json({ success: true, analysis });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/clusters — master ticket summaries
router.get('/clusters', (_req, res) => {
  try {
    const records = getStore();
    const recordsById = new Map(records.map(record => [record.id, record]));
    const masters = getMasterTickets(records).map(cluster => ({
      ...cluster,
      members: cluster.member_ids
        .map(id => recordsById.get(id))
        .filter(Boolean),
    }));
    const unlocatedRecords = records
      .filter(record => !record.is_reference_record && !record.is_demo
        && record.is_civic_relevant !== false && !hasUsableLocation(record))
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    const excludedNonCivicCount = records
      .filter(record => !record.is_reference_record && !record.is_demo
        && record.is_civic_relevant === false).length;
    res.json({
      count: masters.length,
      data: masters,
      excluded_non_civic_count: excludedNonCivicCount,
      unlocated_count: unlocatedRecords.length,
      unlocated_records: unlocatedRecords,
    });
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
router.post('/grievances/import', aiRequestLimit, async (req, res) => {
  const {
    source,
    source_id,
    source_url,
    author,
    published_at,
    post_text,
    image_url,
    thumbnail_url,
    image_data,
    image_mime_type,
    is_demo,
  } = req.body;
  if (is_demo === true) {
    return res.status(400).json({ error: 'Curated demo examples cannot be imported as live reports.' });
  }
  if (!['Google News', 'Reddit', 'YouTube', 'Public Forum'].includes(source)) {
    return res.status(400).json({ error: 'Invalid source provider.' });
  }
  if (typeof post_text !== 'string' || !post_text.trim() || post_text.length > 4000) {
    return res.status(400).json({ error: 'post_text must contain 1 to 4000 characters.' });
  }
  if (typeof source_url !== 'string') {
    return res.status(400).json({ error: 'source_url is required.' });
  }

  const duplicate = findDuplicateGrievance({
    source_url,
    source_id: typeof source_id === 'string' ? source_id : null,
    platform: source,
  });
  if (duplicate) {
    return res.json({ success: true, duplicate: true, record: duplicate });
  }

  try {
    const image = getImagePayload(image_data, image_mime_type);
    const analysis = await analyzePost(post_text.trim(), '', { image });
    const id = `EXT-${crypto.randomUUID()}`;
    const record = {
      id,
      platform: source,
      author_handle: typeof author === 'string' && author.trim() ? author.slice(0, 100) : source,
      timestamp: typeof published_at === 'string' && Number.isFinite(Date.parse(published_at))
        ? new Date(published_at).toISOString()
        : new Date().toISOString(),
      post_text: post_text.trim(),
      image_url: image_url || thumbnail_url || null,
      image_ocr_text: '',
      location_tagged: analysis.extracted_location || 'Bihar',
      coordinates: analysis.coordinates,
      coordinates_approximate: analysis.coordinates_approximate,
      hashtags: [...new Set(post_text.match(/#[\p{L}\p{N}_]+/gu) || [])],
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
      media_analysis_status: analysis.media_analysis_status || null,
      media_observation: analysis.media_observation || null,
      source_id: typeof source_id === 'string' ? source_id.slice(0, 200) : null,
      source_url,
      imported_at: new Date().toISOString(),
    };

    const { record: savedRecord, duplicate } = addGrievance(record);
    res.status(201).json({ success: true, duplicate, record: savedRecord, analysis });
  } catch (error) {
    res.status(error.status || 502).json({ error: `Could not analyze this source item: ${error.message}` });
  }
});

// POST /api/sample-reports — analyze and add a simulated or test report
router.post('/sample-reports', aiRequestLimit, async (req, res) => {
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
      coordinates_approximate: analysis.coordinates_approximate,
      hashtags: hashtags || [],
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
router.post('/official-response', aiRequestLimit, async (req, res) => {
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

// POST /api/grievances/:id/verify — officer human-in-the-loop verification verdict
router.post('/grievances/:id/verify', (req, res) => {
  const { verdict, notes, officer_id } = req.body;
  const validVerdicts = ['Verified Genuine', 'Confirmed Fake', 'Under Field Investigation'];
  if (!validVerdicts.includes(verdict)) {
    return res.status(400).json({ error: `verdict must be one of: ${validVerdicts.join(', ')}` });
  }
  if (notes !== undefined && (typeof notes !== 'string' || notes.length > 2000)) {
    return res.status(400).json({ error: 'notes must be a string of at most 2000 characters.' });
  }
  if (officer_id !== undefined && (typeof officer_id !== 'string' || officer_id.length > 100)) {
    return res.status(400).json({ error: 'officer_id must be a string of at most 100 characters.' });
  }

  const record = recordVerification(req.params.id, { verdict, notes: notes || '', officer_id });
  if (!record) return res.status(404).json({ error: 'Grievance not found' });

  if (req.io) {
    req.io.emit('grievance_verified', { record, stats: calcStats() });
  }

  res.json({ success: true, record });
});

module.exports = router;
