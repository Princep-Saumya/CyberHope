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
  getGrievances: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const qs = params.toString();
    return request(`/grievances${qs ? `?${qs}` : ''}`);
  },

  // GET /api/grievances/:id
  getGrievance: (id) => request(`/grievances/${id}`),

  // PATCH /api/grievances/:id/status
  updateStatus: (id, status) =>
    request(`/grievances/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
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

  searchPublicSource: (source, query) => {
    const params = new URLSearchParams({ source, q: query });
    return request(`/sources/search?${params}`);
  },

  importPublicSourceItem: (item) =>
    request('/grievances/import', {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  // GET /api/clusters
  getClusters: () => request('/clusters'),

  // GET /api/stats
  getStats: () => request('/stats'),

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

  // Real-Time Poller Endpoints
  getRealTimeStatus: () => request('/realtime/status'),
  triggerPollNow: () => request('/realtime/poll-now', { method: 'POST' }),
};
