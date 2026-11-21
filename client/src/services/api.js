/**
 * API service layer — all fetch wrappers for the backend.
 */

const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // GET /api/grievances with filters
  getGrievances: (filters = {}, options = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const qs = params.toString();
    return request(`/grievances${qs ? `?${qs}` : ''}`, options);
  },

  getQuickFilterCounts: (options = {}) => request('/grievances/quick-filter-counts', options),

  // GET /api/grievances/:id
  getGrievance: (id) => request(`/grievances/${id}`),

  // PATCH /api/grievances/:id/status
  updateStatus: (id, status) =>
    request(`/grievances/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // PATCH /api/grievances/:id/location — manual district / landmark review
  assignLocation: (id, district, landmark) =>
    request(`/grievances/${id}/location`, {
      method: 'PATCH',
      body: JSON.stringify({ district, landmark }),
    }),

  // POST /api/grievances/:id/acknowledgment — save a local record, not an outbound message
  recordAcknowledgment: (id, message) =>
    request(`/grievances/${id}/acknowledgment`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  // POST /api/analyze
  analyzePost: (postText, imageOcrText = '', grievanceId = null, image = null) =>
    request('/analyze', {
      method: 'POST',
      body: JSON.stringify({
        post_text: postText,
        image_ocr_text: imageOcrText,
        grievance_id: grievanceId,
        ...(image ? { image_data: image.base64, image_mime_type: image.mimeType } : {}),
      }),
    }),

  // POST /api/sample-reports
  addSampleReport: (post) =>
    request('/sample-reports', {
      method: 'POST',
      body: JSON.stringify(post),
    }),

  getPublicSourceStatus: () => request('/sources/status'),
  getOsintTaxonomy: () => request('/sources/taxonomy'),

  searchPublicSource: (source, query, sectorId = '', options = {}) => {
    const params = new URLSearchParams({ source, q: query });
    if (sectorId) params.set('sector', sectorId);
    return request(`/sources/search?${params}`, options);
  },

  importPublicSourceItem: (item) =>
    request('/grievances/import', {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  // GET /api/clusters
  getClusters: (options = {}) => request('/clusters', options),

  // GET /api/stats
  getStats: (options = {}) => request('/stats', options),

  // GET /api/health
  health: () => request('/health'),

  // POST /api/official-response
  generateOfficialResponse: (grievanceId) =>
    request('/official-response', {
      method: 'POST',
      body: JSON.stringify({ grievance_id: grievanceId }),
    }),

  // PATCH /api/grievances/:id/escalate
  escalateGrievance: (id) =>
    request(`/grievances/${id}/escalate`, { method: 'PATCH' }),

  // POST /api/grievances/:id/verify — human-in-the-loop verification
  verifyGrievance: (id, { verdict, notes, officer_id }) =>
    request(`/grievances/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ verdict, notes, officer_id }),
    }),

  approveGrievanceForDispatch: (id, { notes, officer_id }) =>
    request(`/grievances/${id}/dispatch-approval`, {
      method: 'POST',
      body: JSON.stringify({ notes, officer_id }),
    }),

  // POST /api/realtime/reanalyze-all — start a bounded background AI re-analysis job
  reanalyzeAllGrievances: () =>
    request('/realtime/reanalyze-all', { method: 'POST' }),
  getReanalysisJob: (jobId) =>
    request(`/realtime/reanalyze-all/${encodeURIComponent(jobId)}`),

  // Real-Time Poller Endpoints
  getRealTimeStatus: () => request('/realtime/status'),
  triggerPollNow: () => request('/realtime/poll-now', { method: 'POST' }),
};
