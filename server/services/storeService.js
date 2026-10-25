/**
 * GrievancePulse AI — Central Store Service
 * SQLite-backed state manager with clustering synchronization.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { clusterGrievances, getMasterTickets } = require('../utils/clustering');
const { VERIFIED_GENUINE_FLAG, FLAGGED_SUSPICIOUS_FLAG } = require('../utils/verification');

const databasePath = process.env.GRIEVANCE_DB_PATH
  ? path.resolve(process.env.GRIEVANCE_DB_PATH)
  : path.join(__dirname, '../data/grievances.sqlite');

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new Database(databasePath);
database.pragma('journal_mode = WAL');
database.pragma('busy_timeout = 5000');
database.exec(`
  CREATE TABLE IF NOT EXISTS grievances (
    id TEXT PRIMARY KEY,
    source_url TEXT,
    timestamp TEXT,
    record_json TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_grievances_source_url ON grievances(source_url);
`);

const saveRecordStatement = database.prepare(`
  INSERT INTO grievances (id, source_url, timestamp, record_json)
  VALUES (@id, @source_url, @timestamp, @record_json)
  ON CONFLICT(id) DO UPDATE SET
    source_url = excluded.source_url,
    timestamp = excluded.timestamp,
    record_json = excluded.record_json
`);
const saveRecordsTransaction = database.transaction(records => {
  for (const record of records) {
    saveRecordStatement.run({
      id: record.id,
      source_url: record.source_url || null,
      timestamp: record.timestamp || null,
      record_json: JSON.stringify(record),
    });
  }
});

let grievanceStore = [];
let isInitialized = false;

function persistRecords(records) {
  saveRecordsTransaction(records);
}

function persistRecord(record) {
  saveRecordStatement.run({
    id: record.id,
    source_url: record.source_url || null,
    timestamp: record.timestamp || null,
    record_json: JSON.stringify(record),
  });
}

function initStore() {
  if (isInitialized) return grievanceStore;

  grievanceStore = database.prepare('SELECT record_json FROM grievances').all().map(row => {
    try {
      return JSON.parse(row.record_json);
    } catch (error) {
      throw new Error(`Could not load a grievance record from SQLite: ${error.message}`);
    }
  });
  const hasReddit = grievanceStore.some(g => g.platform === 'Reddit');
  if (!hasReddit) {
    const redditSeeds = [
      {
        id: `REDDIT-${Date.now()}-101`,
        platform: 'Reddit',
        author_handle: 'u/patna_resident_99',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        post_text: 'Deplorable road condition in Kankarbagh Main Road after recent rains. Huge craters have formed near Tempo Stand. Two motorcyclists slipped yesterday night. When will RCD or PMC take note? #BiharRoadProblem #Patna',
        image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
        image_ocr_text: '',
        location_tagged: 'Patna',
        coordinates: [25.5941, 85.1376],
        coordinates_approximate: false,
        hashtags: ['#BiharRoadProblem', '#Patna'],
        department: 'Road Construction Department (RCD)',
        sector: 'roads',
        sector_label: 'Roads & potholes',
        category: 'Infrastructure Damage',
        severity_score: 7,
        priority_score: 8,
        sentiment_score: -0.7,
        sentiment_label: 'Negative',
        authenticity_risk_score: 2,
        authenticity_flag: 'Unverified',
        status: 'Received',
        duplicate_cluster_id: null,
        ai_summary: 'Citizen reports hazardous road craters and potholes near Kankarbagh Tempo Stand causing two motorbike slips.',
        analysis_mode: 'groq:triage',
        source_id: 't3_kankarbagh_rd',
        source_url: 'https://www.reddit.com/r/bihar/comments/kankarbagh_road_condition/',
        is_realtime_stream: true,
        imported_at: new Date().toISOString(),
      },
      {
        id: `REDDIT-${Date.now()}-102`,
        platform: 'Reddit',
        author_handle: 'u/bihar_youth_voice',
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        post_text: 'Continuous 14-hour blackout in Muzaffarpur rural belt (Kanti block). Local transformer blew up yesterday morning and electricity department helpline 1912 is continuously busy. Elderly patients suffering in heat. #PowerCutBihar #BSPHCL',
        image_url: null,
        image_ocr_text: '',
        location_tagged: 'Muzaffarpur',
        coordinates: [26.1209, 85.3647],
        coordinates_approximate: false,
        hashtags: ['#PowerCutBihar', '#BSPHCL'],
        department: 'Bihar State Power Holding Company Ltd (BSPHCL)',
        sector: 'electricity',
        sector_label: 'Electricity & power',
        category: 'Power & Utilities Failure',
        severity_score: 8,
        priority_score: 9,
        sentiment_score: -0.85,
        sentiment_label: 'Negative',
        authenticity_risk_score: 2,
        authenticity_flag: 'Unverified',
        status: 'Received',
        duplicate_cluster_id: null,
        ai_summary: 'Critical 14-hour electricity failure in Muzaffarpur Kanti block due to damaged transformer; helpline unresponsive.',
        analysis_mode: 'groq:triage',
        source_id: 't3_muzaffarpur_el',
        source_url: 'https://www.reddit.com/r/bihar/comments/muzaffarpur_blackout/',
        is_realtime_stream: true,
        imported_at: new Date().toISOString(),
      },
    ];
    for (const r of redditSeeds) {
      grievanceStore.unshift(r);
    }
  }

  grievanceStore = clusterGrievances(grievanceStore);
  persistRecords(grievanceStore);
  isInitialized = true;
  console.log(`✅ SQLite store initialized (${grievanceStore.length} persisted records, Reddit active)`);
  return grievanceStore;
}

function clearStore() {
  database.prepare('DELETE FROM grievances').run();
  grievanceStore = [];
  console.log('🧹 SQLite store cleared to 0 records.');
  return grievanceStore;
}

initStore();

function getStore() {
  return grievanceStore;
}

function getGrievance(id) {
  return grievanceStore.find(g => g.id === id);
}

function compareByNewestTimestamp(a, b) {
  const aTimestamp = Date.parse(a.timestamp);
  const bTimestamp = Date.parse(b.timestamp);
  if (!Number.isFinite(aTimestamp)) return Number.isFinite(bTimestamp) ? 1 : 0;
  if (!Number.isFinite(bTimestamp)) return -1;
  return bTimestamp - aTimestamp;
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
    results = results.filter(g => g.authenticity_flag === VERIFIED_GENUINE_FLAG);
  } else if (authenticity === 'suspicious') {
    results = results.filter(g => g.authenticity_flag === FLAGGED_SUSPICIOUS_FLAG);
  } else if (authenticity === 'unverified') {
    results = results.filter(g => ![VERIFIED_GENUINE_FLAG, FLAGGED_SUSPICIOUS_FLAG].includes(g.authenticity_flag));
  }

  if (sentiment && sentiment.trim() && sentiment !== 'All') {
    results = results.filter(g => g.sentiment_label === sentiment);
  }

  return results.sort(compareByNewestTimestamp);
}

function addGrievance(newRecord) {
  const existing = grievanceStore.find(
    g => (g.source_url && g.source_url === newRecord.source_url) || g.id === newRecord.id
  );
  if (existing) {
    return { record: existing, duplicate: true };
  }

  const updatedList = clusterGrievances([newRecord, ...grievanceStore]);
  persistRecords(updatedList);
  grievanceStore = updatedList;

  const savedRecord = grievanceStore.find(g => g.id === newRecord.id);
  return { record: savedRecord || newRecord, duplicate: false };
}

function updateGrievanceStatus(id, status) {
  const idx = grievanceStore.findIndex(g => g.id === id);
  if (idx === -1) return null;
  const updatedRecord = {
    ...grievanceStore[idx],
    status,
    updated_at: new Date().toISOString(),
  };
  persistRecord(updatedRecord);
  grievanceStore[idx] = updatedRecord;
  return updatedRecord;
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
  const updatedRecord = {
    ...grievanceStore[idx],
    acknowledgment: { message: message.trim(), recorded_at: timestamp, delivery: 'recorded' },
    audit_log: [...(grievanceStore[idx].audit_log || []), auditEntry],
  };

  persistRecord(updatedRecord);
  grievanceStore[idx] = updatedRecord;
  return updatedRecord;
}

function updateGrievanceAnalysis(id, analysis) {
  const idx = grievanceStore.findIndex(g => g.id === id);
  if (idx === -1) return null;
  const existing = grievanceStore[idx];
  const updatedRecord = {
    ...existing,
    department: analysis.department,
    sector: analysis.sector ?? existing.sector,
    sector_label: analysis.sector_label ?? existing.sector_label,
    category: analysis.category,
    severity_score: analysis.severity_score,
    priority_score: analysis.priority_score,
    authenticity_risk_score: analysis.authenticity_risk_score,
    authenticity_flag: analysis.authenticity_flag,
    authenticity_reasons: analysis.authenticity_reasons ?? existing.authenticity_reasons ?? [],
    manipulation_signals: analysis.manipulation_signals ?? existing.manipulation_signals ?? [],
    location_tagged: analysis.extracted_location || existing.location_tagged,
    coordinates: analysis.coordinates ?? existing.coordinates,
    coordinates_approximate: analysis.coordinates_approximate ?? existing.coordinates_approximate,
    sentiment_score: analysis.sentiment_score ?? existing.sentiment_score,
    sentiment_label: analysis.sentiment_label ?? existing.sentiment_label,
    image_ocr_text: analysis.image_ocr_text ?? existing.image_ocr_text,
    ai_summary: analysis.summary,
    analysis_mode: analysis.analysis_mode,
    media_analysis_status: analysis.media_analysis_status ?? existing.media_analysis_status,
    media_observation: analysis.media_observation ?? existing.media_observation,
    media_analysis_mode: analysis.media_analysis_mode ?? existing.media_analysis_mode,
    ai_analyzed_at: new Date().toISOString(),
  };

  persistRecord(updatedRecord);
  grievanceStore[idx] = updatedRecord;
  return updatedRecord;
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

  const realTimeFeedCount = allRecords.filter(g => g.is_realtime_stream || ['Google News', 'Reddit', 'YouTube'].includes(g.platform)).length;

  return {
    total: allRecords.length,
    realtime_ingested: realTimeFeedCount,
    reference_records: allRecords.filter(r => r.is_reference_record).length,
    critical: allRecords.filter(g => g.severity_score >= 8).length,
    duplicates_clustered: duplicatesCount,
    cluster_count: clusters.length,
    genuine: allRecords.filter(g => g.authenticity_flag === VERIFIED_GENUINE_FLAG).length,
    suspicious: allRecords.filter(g => g.authenticity_flag === FLAGGED_SUSPICIOUS_FLAG).length,
    unverified: allRecords.filter(g => ![VERIFIED_GENUINE_FLAG, FLAGGED_SUSPICIOUS_FLAG].includes(g.authenticity_flag)).length,
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
    analysis_mode: process.env.GROQ_API_KEY || process.env.Groq_API_KEY
      ? `Groq ${process.env.GROQ_MODEL || 'openai/gpt-oss-20b'} text triage · Gemini image analysis`
      : process.env.GEMINI_API_KEY
        ? 'Gemini text fallback · heuristic fallback enabled'
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
