/**
 * GrievancePulse AI — Central Store Service
 * In-memory state manager with seed persistence & clustering synchronization.
 */

const path = require('path');
const { clusterGrievances, getMasterTickets } = require('../utils/clustering');

const SEED_PATH = path.join(__dirname, '../data/seed_grievances.json');
let grievanceStore = [];
let isInitialized = false;

function initStore() {
  if (isInitialized) return grievanceStore;
  grievanceStore = [];
  isInitialized = true;
  console.log(`✅ Memory store initialized (Zero demo data. Ready for 100% real-time data)`);
  return grievanceStore;
}

function clearStore() {
  grievanceStore = [];
  console.log('🧹 Memory store cleared to 0 records.');
  return grievanceStore;
}

initStore();

function getStore() {
  return grievanceStore;
}

function getGrievance(id) {
  return grievanceStore.find(g => g.id === id);
}

function fetchGrievances(filters = {}) {
  const { hashtag, location, department, status, severity, authenticity, sentiment } = filters;
  let results = [...grievanceStore];

  if (hashtag && hashtag.trim()) {
    const q = hashtag.trim().toLowerCase();
    results = results.filter(g =>
      (g.hashtags || []).some(h => h.toLowerCase().includes(q)) ||
      (g.post_text && g.post_text.toLowerCase().includes(q))
    );
  }

  if (location && location.trim()) {
    const q = location.trim().toLowerCase();
    results = results.filter(g =>
      (g.location_tagged && g.location_tagged.toLowerCase().includes(q)) ||
      (g.post_text && g.post_text.toLowerCase().includes(q))
    );
  }

  if (department && department.trim()) {
    const q = department.trim().toLowerCase();
    results = results.filter(g => g.department && g.department.toLowerCase().includes(q));
  }

  if (status && status.trim() && status !== 'All') {
    results = results.filter(g => g.status === status);
  }

  if (severity && !isNaN(severity)) {
    results = results.filter(g => g.severity_score >= parseInt(severity, 10));
  }

  if (authenticity === 'genuine') {
    results = results.filter(g => g.authenticity_flag === 'Likely Genuine Grievance');
  } else if (authenticity === 'suspicious') {
    results = results.filter(g => g.authenticity_flag !== 'Likely Genuine Grievance');
  }

  if (sentiment && sentiment.trim() && sentiment !== 'All') {
    results = results.filter(g => g.sentiment_label === sentiment);
  }

  return results;
}

function addGrievance(newRecord) {
  // Check if identical source URL or ID exists
  const existing = grievanceStore.find(
    g => (g.source_url && g.source_url === newRecord.source_url) || g.id === newRecord.id
  );
  if (existing) {
    return { record: existing, duplicate: true };
  }

  // Prepend to list and re-cluster
  const updatedList = [newRecord, ...grievanceStore];
  grievanceStore = clusterGrievances(updatedList);

  const savedRecord = grievanceStore.find(g => g.id === newRecord.id);
  return { record: savedRecord || newRecord, duplicate: false };
}

function updateGrievanceStatus(id, status) {
  const idx = grievanceStore.findIndex(g => g.id === id);
  if (idx === -1) return null;
  grievanceStore[idx] = {
    ...grievanceStore[idx],
    status,
    updated_at: new Date().toISOString(),
  };
  return grievanceStore[idx];
}

function recordAcknowledgment(id, message) {
  const idx = grievanceStore.findIndex(g => g.id === id);
  if (idx === -1) return null;

  const timestamp = new Date().toISOString();
  const auditEntry = {
    action: 'ACKNOWLEDGMENT_RECORDED',
    timestamp,
    by: 'Operator',
    note: 'Official acknowledgment saved; ready for citizen dispatch.',
  };

  grievanceStore[idx] = {
    ...grievanceStore[idx],
    acknowledgment: { message: message.trim(), recorded_at: timestamp, delivery: 'recorded' },
    audit_log: [...(grievanceStore[idx].audit_log || []), auditEntry],
  };

  return grievanceStore[idx];
}

function updateGrievanceAnalysis(id, analysis) {
  const idx = grievanceStore.findIndex(g => g.id === id);
  if (idx === -1) return null;

  grievanceStore[idx] = {
    ...grievanceStore[idx],
    department: analysis.department,
    category: analysis.category,
    severity_score: analysis.severity_score,
    authenticity_risk_score: analysis.authenticity_risk_score,
    authenticity_flag: analysis.authenticity_flag,
    authenticity_reasons: analysis.authenticity_reasons || grievanceStore[idx].authenticity_reasons || [],
    manipulation_signals: analysis.manipulation_signals || grievanceStore[idx].manipulation_signals || [],
    sentiment_score: analysis.sentiment_score ?? grievanceStore[idx].sentiment_score,
    sentiment_label: analysis.sentiment_label ?? grievanceStore[idx].sentiment_label,
    ai_summary: analysis.summary,
    analysis_mode: analysis.analysis_mode,
    ai_analyzed_at: new Date().toISOString(),
  };

  return grievanceStore[idx];
}

function recordVerification(id, { verdict, notes = '', officer_id = 'CyberCell_Officer_01' }) {
  const idx = grievanceStore.findIndex(g => g.id === id);
  if (idx === -1) return null;

  const timestamp = new Date().toISOString();
  const current = grievanceStore[idx];

  let newFlag = current.authenticity_flag;
  let newRisk = current.authenticity_risk_score;

  if (verdict === 'Verified Genuine') {
    newFlag = 'Likely Genuine Grievance';
    newRisk = Math.min(newRisk || 15, 20);
  } else if (verdict === 'Confirmed Fake') {
    newFlag = 'Suspicious Defamation / Fake Campaign';
    newRisk = Math.max(newRisk || 85, 90);
  } else if (verdict === 'Under Field Investigation') {
    newFlag = 'Under Cyber Cell Review';
  }

  const auditEntry = {
    action: 'officer_verification',
    verdict,
    notes: notes.trim(),
    officer_id,
    timestamp,
  };

  grievanceStore[idx] = {
    ...current,
    authenticity_flag: newFlag,
    authenticity_risk_score: newRisk,
    officer_verdict: verdict,
    officer_notes: notes.trim(),
    verified_at: timestamp,
    verified_by: officer_id,
    audit_log: [...(current.audit_log || []), auditEntry],
  };

  return grievanceStore[idx];
}

function calcStats(records) {
  const allRecords = records || grievanceStore;
  const clusters = getMasterTickets(allRecords);
  const duplicatesCount = clusters.reduce((sum, c) => sum + (c.member_count || 1), 0);

  const realTimeFeedCount = allRecords.filter(g => g.is_realtime_stream || g.platform === 'Google News' || g.platform === 'Reddit').length;

  return {
    total: allRecords.length,
    realtime_ingested: realTimeFeedCount,
    reference_records: allRecords.filter(r => r.is_reference_record).length,
    critical: allRecords.filter(g => g.severity_score >= 8).length,
    duplicates_clustered: duplicatesCount,
    cluster_count: clusters.length,
    genuine: allRecords.filter(g => g.authenticity_flag === 'Likely Genuine Grievance').length,
    suspicious: allRecords.filter(g => g.authenticity_flag !== 'Likely Genuine Grievance').length,
    sentiment_breakdown: {
      critical_outrage: allRecords.filter(g => (g.sentiment_score ?? 0) <= -0.7).length,
      distressed: allRecords.filter(g => (g.sentiment_score ?? 0) > -0.7 && (g.sentiment_score ?? 0) <= -0.3).length,
      moderate: allRecords.filter(g => (g.sentiment_score ?? 0) > -0.3 && (g.sentiment_score ?? 0) < 0.2).length,
      positive: allRecords.filter(g => (g.sentiment_score ?? 0) >= 0.2).length,
    },
    by_department: Object.entries(
      allRecords.reduce((acc, g) => {
        if (g.department) acc[g.department] = (acc[g.department] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, count]) => ({ name, count })),
    by_category: Object.entries(
      allRecords.reduce((acc, g) => {
        if (g.category) acc[g.category] = (acc[g.category] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, count]) => ({ name, count })),
    by_status: Object.entries(
      allRecords.reduce((acc, g) => {
        if (g.status) acc[g.status] = (acc[g.status] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, count]) => ({ name, count })),
    analysis_mode: process.env.GEMINI_API_KEY
      ? `Gemini AI Active (${(process.env.GEMINI_MODEL || 'gemini-3.5-flash').replace('models/', '')})`
      : 'Heuristic Engine (Offline Active)',
  };
}

module.exports = {
  initStore,
  clearStore,
  getStore,
  getGrievance,
  fetchGrievances,
  addGrievance,
  updateGrievanceStatus,
  recordAcknowledgment,
  updateGrievanceAnalysis,
  recordVerification,
  calcStats,
};
