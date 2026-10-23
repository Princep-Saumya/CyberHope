import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

const DEBOUNCE_MS = 400;

const DEFAULT_FILTERS = {
  hashtag: '',
  location: '',
  department: '',
  status: '',
  severity: '',
  authenticity: '',
};

export function useGrievances() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [grievances, setGrievances] = useState([]);
  const [stats, setStats] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const debounceTimer = useRef(null);

  const loadStats = useCallback(async () => {
    const [s, c] = await Promise.all([api.getStats(), api.getClusters()]);
    setStats(s);
    setClusters(c.data || []);
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

  // Load stats once on mount
  useEffect(() => {
    loadStats().catch(e => setError(e.message));
  }, [loadStats]);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const updateGrievanceStatus = useCallback(async (id, status) => {
    const result = await api.updateStatus(id, status);
    setGrievances(prev => prev.flatMap(g => {
      if (g.id !== id) return [g];
      if (filters.status && filters.status !== 'All' && filters.status !== status) return [];
      return [result.record];
    }));
    if (selectedGrievance?.id === id) {
      setSelectedGrievance(result.record);
    }
    loadStats().catch(e => setError(e.message));
    return result.record;
  }, [selectedGrievance, loadStats, filters.status]);

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

  const importPublicSourceItem = useCallback(async (item) => {
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
  }, [filters]);

  const reanalyzeGrievance = useCallback(async (grievance) => {
    const result = await api.analyzePost(grievance.post_text, grievance.image_ocr_text, grievance.id);
    if (result.analysis) {
      const updated = {
        ...grievance,
        department: result.analysis.department,
        category: result.analysis.category,
        severity_score: result.analysis.severity_score,
        authenticity_risk_score: result.analysis.authenticity_risk_score,
        authenticity_flag: result.analysis.authenticity_flag,
        ai_summary: result.analysis.summary,
        analysis_mode: result.analysis.analysis_mode,
      };
      setGrievances(prev => prev.map(g => g.id === grievance.id ? updated : g));
      setSelectedGrievance(prev => prev?.id === grievance.id ? updated : prev);
      loadStats().catch(e => setError(e.message));
    }
    return result;
  }, [loadStats]);

  const escalateGrievance = useCallback(async (id) => {
    const result = await api.escalateGrievance(id);
    setGrievances(prev => prev.map(g => g.id === id ? result.record : g));
    setSelectedGrievance(prev => prev?.id === id ? result.record : prev);
    loadStats().catch(e => setError(e.message));
    return result;
  }, [loadStats]);

  // Cluster siblings for a given grievance
  const getClusterSiblings = useCallback((grievance) => {
    if (!grievance?.duplicate_cluster_id) return [];
    return grievances.filter(
      g => g.duplicate_cluster_id === grievance.duplicate_cluster_id && g.id !== grievance.id
    );
  }, [grievances]);

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
  };
}
