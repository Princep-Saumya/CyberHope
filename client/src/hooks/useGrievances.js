import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { api } from '../services/api';

const DEBOUNCE_MS = 400;
const FEED_REQUEST_TIMEOUT_MS = 5000;
const DASHBOARD_REQUEST_TIMEOUT_MS = 5000;

function sortByNewestTimestamp(records) {
  return [...records].sort((a, b) => {
    const aTimestamp = Date.parse(a.created_at || a.imported_at || a.timestamp);
    const bTimestamp = Date.parse(b.created_at || b.imported_at || b.timestamp);
    if (!Number.isFinite(aTimestamp)) return Number.isFinite(bTimestamp) ? 1 : 0;
    if (!Number.isFinite(bTimestamp)) return -1;
    return bTimestamp - aTimestamp;
  });
}

const DEFAULT_FILTERS = {
  hashtag: '',
  location: '',
  department: '',
  status: '',
  severity: '',
  authenticity: '',
  sentiment: '',
};

export function useGrievances() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [grievances, setGrievances] = useState([]);
  const [stats, setStats] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [unlocatedRecords, setUnlocatedRecords] = useState([]);
  const [excludedNonCivicCount, setExcludedNonCivicCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [realtimeNotification, setRealtimeNotification] = useState(null);
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [pollingStatus, setPollingStatus] = useState(null);
  const [batchAuditProgress, setBatchAuditProgress] = useState(null);

  const debounceTimer = useRef(null);
  const socketRef = useRef(null);
  const clustersRefreshTimer = useRef(null);

  const loadStats = useCallback(async (signal) => {
    try {
      const [s, c] = await Promise.all([
        api.getStats({ signal }),
        api.getClusters({ signal }),
      ]);
      if (signal?.aborted) return;
      setStats(s);
      setClusters(c.data || []);
      setUnlocatedRecords(c.unlocated_records || []);
      setExcludedNonCivicCount(c.excluded_non_civic_count || 0);
    } catch (e) {
      if (!signal?.aborted) console.error('Failed to load stats/clusters:', e);
    }
  }, []);

  const loadGrievances = useCallback(async (activeFilters, signal) => {
    setLoading(true);
    setError(null);
    const requestController = new AbortController();
    const abortForUnmount = () => requestController.abort(signal?.reason);
    signal?.addEventListener('abort', abortForUnmount, { once: true });
    const timeoutId = setTimeout(
      () => requestController.abort(new DOMException('Grievance feed request timed out.', 'TimeoutError')),
      FEED_REQUEST_TIMEOUT_MS,
    );
    try {
      const result = await api.getGrievances(activeFilters, { signal: requestController.signal });
      if (signal?.aborted || requestController.signal.aborted) return;
      setGrievances(sortByNewestTimestamp(result.data || []));
    } catch (e) {
      if (signal?.aborted) return;
      if (requestController.signal.aborted) {
        setError('Loading reports timed out after 5 seconds. Please retry.');
        setGrievances([]);
        return;
      }
      setError(e.message);
      setGrievances([]);
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abortForUnmount);
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  // Debounced filter effect
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const controller = new AbortController();
    debounceTimer.current = setTimeout(() => {
      loadGrievances(filters, controller.signal);
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(debounceTimer.current);
      controller.abort();
    };
  }, [filters, loadGrievances]);

  // Load initial stats & clusters
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(new DOMException('Dashboard data request timed out.', 'TimeoutError')),
      DASHBOARD_REQUEST_TIMEOUT_MS,
    );
    loadStats(controller.signal).finally(() => clearTimeout(timeoutId));
    api.getRealTimeStatus().then(setPollingStatus).catch(() => {});
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loadStats]);

  // ─── WebSocket Live Ingestion Connection ────────────────────────────────────
  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketStatus('connected');
    });

    socket.on('disconnect', () => {
      setSocketStatus('reconnecting');
    });

    socket.on('connect_error', () => {
      setSocketStatus('reconnecting');
    });

    socket.on('stats_updated', ({ stats: updatedStats }) => {
      if (updatedStats) setStats(updatedStats);
    });

    socket.on('location_assigned', ({ record, stats: updatedStats }) => {
      if (updatedStats) setStats(updatedStats);
      if (record) {
        setGrievances(prev => prev.map(item => item.id === record.id ? record : item));
        setSelectedGrievance(prev => prev?.id === record.id ? record : prev);
      }
      clearTimeout(clustersRefreshTimer.current);
      clustersRefreshTimer.current = setTimeout(() => {
        api.getClusters().then(result => {
          setClusters(result.data || []);
          setUnlocatedRecords(result.unlocated_records || []);
          setExcludedNonCivicCount(result.excluded_non_civic_count || 0);
        }).catch(error => {
          console.error('Failed to refresh clusters after location assignment:', error);
        });
      }, 100);
    });

    socket.on('grievance_dispatch_approved', ({ record, stats: updatedStats }) => {
      if (updatedStats) setStats(updatedStats);
      if (record) {
        setGrievances(prev => prev.map(item => item.id === record.id ? record : item));
        setSelectedGrievance(prev => prev?.id === record.id ? record : prev);
      }
    });

    socket.on('new_grievance', (payload) => {
      const { record, stats: newStats } = payload;
      if (!record) return;

      // Prepend to grievances list if not duplicate
      setGrievances((prev) => {
        if (prev.some((g) => g.id === record.id)) return prev;
        return sortByNewestTimestamp([...prev, record]);
      });

      if (newStats) setStats(newStats);

      // Trigger pop-up alert
      setRealtimeNotification({
        id: record.id,
        department: record.department,
        location: record.location_tagged,
        severity: record.severity_score,
        platform: record.platform,
        text: record.post_text,
        timestamp: new Date().toLocaleTimeString(),
      });

      // Coalesce bursts of live events into one cluster refresh.
      clearTimeout(clustersRefreshTimer.current);
      clustersRefreshTimer.current = setTimeout(() => {
        api.getClusters().then((c) => {
          setClusters(c.data || []);
          setUnlocatedRecords(c.unlocated_records || []);
          setExcludedNonCivicCount(c.excluded_non_civic_count || 0);
        }).catch(() => {});
      }, 500);
    });

    return () => {
      clearTimeout(clustersRefreshTimer.current);
      socket.disconnect();
    };
  }, []);

  const clearNotification = useCallback(() => {
    setRealtimeNotification(null);
  }, []);

  const triggerRealtimePoll = useCallback(async () => {
    try {
      const res = await api.triggerPollNow();
      setPollingStatus(res.status);
      return res;
    } catch (e) {
      console.error('Trigger poll error:', e);
      throw e;
    }
  }, []);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const getClusterSiblings = useCallback((grievance) => {
    if (!grievance?.duplicate_cluster_id) return [];
    return grievances.filter((record) =>
      record.id !== grievance.id
      && record.duplicate_cluster_id === grievance.duplicate_cluster_id
    );
  }, [grievances]);

  const updateGrievanceStatus = useCallback(
    async (id, status) => {
      const result = await api.updateStatus(id, status);
      setGrievances((prev) =>
        prev.flatMap((g) => {
          if (g.id !== id) return [g];
          if (filters.status && filters.status !== 'All' && filters.status !== status) return [];
          return [result.record];
        })
      );
      if (selectedGrievance?.id === id) {
        setSelectedGrievance(result.record);
      }
      loadStats();
      return result.record;
    },
    [selectedGrievance, loadStats, filters.status]
  );

  const assignGrievanceLocation = useCallback(async (id, district, landmark) => {
    const result = await api.assignLocation(id, district, landmark);
    const [nextStats, nextClusters] = await Promise.all([api.getStats(), api.getClusters()]);
    setGrievances(prev => prev.map(record => record.id === id ? result.record : record));
    setSelectedGrievance(prev => prev?.id === id ? result.record : prev);
    setStats(nextStats);
    setClusters(nextClusters.data || []);
    setUnlocatedRecords(nextClusters.unlocated_records || []);
    setExcludedNonCivicCount(nextClusters.excluded_non_civic_count || 0);
    return result.record;
  }, []);

  const addSampleReport = useCallback(async (post) => {
    const result = await api.addSampleReport(post);
    const [list, nextStats, nextClusters] = await Promise.all([
      api.getGrievances(DEFAULT_FILTERS),
      api.getStats(),
      api.getClusters(),
    ]);
    setFilters(DEFAULT_FILTERS);
    setGrievances(list.data || []);
    setStats(nextStats);
    setClusters(nextClusters.data || []);
    setUnlocatedRecords(nextClusters.unlocated_records || []);
    setExcludedNonCivicCount(nextClusters.excluded_non_civic_count || 0);
    setError(null);
    return result;
  }, []);

  const importPublicSourceItem = useCallback(
    async (item) => {
      const result = await api.importPublicSourceItem(item);
      const [list, nextStats, nextClusters] = await Promise.all([
        api.getGrievances(DEFAULT_FILTERS),
        api.getStats(),
        api.getClusters(),
      ]);
      setFilters(DEFAULT_FILTERS);
      setGrievances(sortByNewestTimestamp(list.data || []));
      setStats(nextStats);
      setClusters(nextClusters.data || []);
      setUnlocatedRecords(nextClusters.unlocated_records || []);
      setExcludedNonCivicCount(nextClusters.excluded_non_civic_count || 0);
      setError(null);
      return result;
    },
    []
  );

  const reanalyzeGrievance = useCallback(
    async (grievance, { image = null, imageOcrText = grievance.image_ocr_text } = {}) => {
      const result = await api.analyzePost(grievance.post_text, imageOcrText, grievance.id, image);
      if (result.analysis) {
        const updated = {
          ...grievance,
          department: result.analysis.department,
          category: result.analysis.category,
          severity_score: result.analysis.severity_score,
          priority_score: result.analysis.priority_score,
          location_tagged: result.analysis.extracted_location || grievance.location_tagged,
          coordinates: result.analysis.coordinates ?? grievance.coordinates,
          coordinates_approximate: result.analysis.coordinates_approximate ?? grievance.coordinates_approximate,
          authenticity_risk_score: result.analysis.authenticity_risk_score,
          authenticity_flag: result.analysis.authenticity_flag,
          sentiment_score: result.analysis.sentiment_score,
          sentiment_label: result.analysis.sentiment_label,
          ai_summary: result.analysis.summary,
          analysis_mode: result.analysis.analysis_mode,
          media_analysis_status: result.analysis.media_analysis_status ?? grievance.media_analysis_status,
          media_observation: result.analysis.media_observation ?? grievance.media_observation,
          media_analysis_mode: result.analysis.media_analysis_mode ?? grievance.media_analysis_mode,
          image_ocr_text: result.analysis.image_ocr_text ?? imageOcrText,
        };
        setGrievances((prev) => prev.map((g) => (g.id === grievance.id ? updated : g)));
        setSelectedGrievance((prev) => (prev?.id === grievance.id ? updated : prev));
        loadStats();
      }
      return result;
    },
    [loadStats]
  );

  const escalateGrievance = useCallback(
    async (id) => {
      const result = await api.escalateGrievance(id);
      setGrievances((prev) => prev.map((g) => (g.id === id ? result.record : g)));
      setSelectedGrievance((prev) => (prev?.id === id ? result.record : prev));
      loadStats();
      return result;
    },
    [loadStats]
  );

  const verifyGrievance = useCallback(
    async (id, payload) => {
      const result = await api.verifyGrievance(id, payload);
      if (result.record) {
        setGrievances((prev) => prev.map((g) => (g.id === id ? result.record : g)));
        setSelectedGrievance((prev) => (prev?.id === id ? result.record : prev));
        loadStats();
      }
      return result;
    },
    [loadStats]
  );

  const approveGrievanceForDispatch = useCallback(
    async (id, payload) => {
      const result = await api.approveGrievanceForDispatch(id, payload);
      if (result.record) {
        setGrievances(prev => prev.map(grievance => grievance.id === id ? result.record : grievance));
        setSelectedGrievance(prev => prev?.id === id ? result.record : prev);
        await loadStats();
      }
      return result;
    },
    [loadStats]
  );

  const reanalyzeAllGrievances = useCallback(
    async () => {
      const { job: startedJob } = await api.reanalyzeAllGrievances();
      let job = startedJob;
      setBatchAuditProgress(job);
      while (job.status === 'queued' || job.status === 'running') {
        await new Promise(resolve => setTimeout(resolve, 2500));
        ({ job } = await api.getReanalysisJob(job.id));
        setBatchAuditProgress(job);
      }
      if (job.status !== 'completed') {
        throw new Error('The batch re-analysis job did not complete successfully.');
      }
      await loadGrievances(filters);
      await loadStats();
      return job;
    },
    [filters, loadGrievances, loadStats]
  );

  return {
    filters,
    updateFilter,
    resetFilters,
    grievances,
    stats,
    clusters,
    unlocatedRecords,
    excludedNonCivicCount,
    loading,
    error,
    selectedGrievance,
    setSelectedGrievance,
    updateGrievanceStatus,
    assignGrievanceLocation,
    escalateGrievance,
    verifyGrievance,
    approveGrievanceForDispatch,
    reanalyzeAllGrievances,
    addSampleReport,
    importPublicSourceItem,
    reanalyzeGrievance,
    getClusterSiblings,
    // Real-Time Stream hooks
    socketStatus,
    realtimeNotification,
    clearNotification,
    triggerRealtimePoll,
    pollingStatus,
    batchAuditProgress,
  };
}
