const crypto = require('crypto');
const { analyzePost } = require('./geminiService');
const { getStore, updateGrievanceAnalysis, calcStats } = require('./storeService');

const jobs = new Map();
const MAX_RETAINED_JOBS = 20;
let activeJobId = null;

function publicJob(job) {
  const { id, status, total, completed, reanalyzed_count, failed_count, created_at, updated_at, finished_at } = job;
  return { id, status, total, completed, reanalyzed_count, failed_count, created_at, updated_at, finished_at };
}

function pruneJobs() {
  if (jobs.size <= MAX_RETAINED_JOBS) return;
  for (const [id, job] of jobs) {
    if (jobs.size <= MAX_RETAINED_JOBS) break;
    if (job.status === 'completed' || job.status === 'failed') jobs.delete(id);
  }
}

function startReanalysisJob(io) {
  if (activeJobId) {
    const error = new Error('A batch re-analysis job is already running.');
    error.status = 409;
    throw error;
  }

  const records = [...getStore()];
  const now = new Date().toISOString();
  const job = {
    id: crypto.randomUUID(),
    status: 'queued',
    total: records.length,
    completed: 0,
    reanalyzed_count: 0,
    failed_count: 0,
    created_at: now,
    updated_at: now,
    finished_at: null,
  };
  jobs.set(job.id, job);
  activeJobId = job.id;
  pruneJobs();

  setImmediate(async () => {
    job.status = 'running';
    job.updated_at = new Date().toISOString();
    try {
      for (const record of records) {
        try {
          const analysis = await analyzePost(record.post_text, record.image_ocr_text || '');
          if (updateGrievanceAnalysis(record.id, analysis)) {
            job.reanalyzed_count += 1;
          } else {
            job.failed_count += 1;
          }
        } catch (error) {
          job.failed_count += 1;
          console.warn(`[BatchAudit] Failed for ${record.id}:`, error.message);
        } finally {
          job.completed += 1;
          job.updated_at = new Date().toISOString();
        }
      }
      job.status = 'completed';
    } catch (error) {
      job.status = 'failed';
      console.error('[BatchAudit] Job failed:', error.message);
    } finally {
      job.finished_at = new Date().toISOString();
      job.updated_at = job.finished_at;
      activeJobId = null;
      if (io) io.emit('stats_updated', { stats: calcStats() });
    }
  });

  return publicJob(job);
}

function getReanalysisJob(id) {
  const job = jobs.get(id);
  return job ? publicJob(job) : null;
}

module.exports = { startReanalysisJob, getReanalysisJob };
