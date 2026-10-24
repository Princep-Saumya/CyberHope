import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { api } from '../services/api';

const DEBOUNCE_MS = 400;

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [realtimeNotification, setRealtimeNotification] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [pollingStatus, setPollingStatus] = useState(null);

  const debounceTimer = useRef(null);
  const socketRef = useRef(null);

  const loadStats = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([api.getStats(), api.getClusters()]);
      setStats(s);
      setClusters(c.data || []);
    } catch (e) {
      console.error('Failed to load stats/clusters:', e);
    }
  }, []);

  const loadGrievances = useCallback(async (activeFilters) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getGrievances(activeFilters);
      setGrievances(result.data || []);
    } catch (e) {
      setError(e.message);
      setGrievances([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced filter effect
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      loadGrievances(filters);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceTimer.current);
  }, [filters, loadGrievances]);

  // Load initial stats & clusters
  useEffect(() => {
    loadStats();
    api.getRealTimeStatus().then(setPollingStatus).catch(() => {});
  }, [loadStats]);

  // ─── WebSocket Live Ingestion Connection ────────────────────────────────────
  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    socket.on('new_grievance', (payload) => {
      const { record, stats: newStats } = payload;
      if (!record) return;

      // Prepend to grievances list if not duplicate
      setGrievances((prev) => {
        if (prev.some((g) => g.id === record.id)) return prev;
        return [record, ...prev];
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

      // Reload clusters asynchronously
      api.getClusters().then((c) => setClusters(c.data || [])).catch(() => {});
    });

    return () => {
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
    setError(null);
    return result;
  }, []);

  const importPublicSourceItem = useCallback(
    async (item) => {
      const result = await api.importPublicSourceItem(item);
      const [list, nextStats, nextClusters] = await Promise.all([
        api.getGrievances(filters),
        api.getStats(),
        api.getClusters(),
      ]);
      setGrievances(list.data || []);
      setStats(nextStats);
      setClusters(nextClusters.data || []);
      setError(null);
      return result;
    },
    [filters]
  );

  const reanalyzeGrievance = useCallback(
    async (grievance) => {
      const result = await api.analyzePost(grievance.post_text, grievance.image_ocr_text, grievance.id);
      if (result.analysis) {
        const updated = {
          ...grievance,
          department: result.analysis.department,
          category: result.analysis.category,
          severity_score: result.analysis.severity_score,
          priority_score: result.analysis.priority_score,
          authenticity_risk_score: result.analysis.authenticity_risk_score,
          authenticity_flag: result.analysis.authenticity_flag,
          sentiment_score: result.analysis.sentiment_score,
          sentiment_label: result.analysis.sentiment_label,
          ai_summary: result.analysis.summary,
          analysis_mode: result.analysis.analysis_mode,
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

  const getClusterSiblings = useCallback(
    (grievance) => {
      if (!grievance?.duplicate_cluster_id) return [];
      return grievances.filter(
        (g) => g.duplicate_cluster_id === grievance.duplicate_cluster_id && g.id !== grievance.id
      );
    },
    [grievances]
  );

  return {
    filters,
    updateFilter,
    resetFilters,
    grievances,
    stats,
    clusters,
    loading,
    error,
    selectedGrievance,
    setSelectedGrievance,
    updateGrievanceStatus,
    escalateGrievance,
    addSampleReport,
    importPublicSourceItem,
    reanalyzeGrievance,
    getClusterSiblings,
    // Real-Time Stream hooks
    isSocketConnected,
    realtimeNotification,
    clearNotification,
    triggerRealtimePoll,
    pollingStatus,
  };
}
