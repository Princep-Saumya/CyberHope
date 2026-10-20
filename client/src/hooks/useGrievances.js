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
    try {
      const s = await api.getStats();
      setStats(s);
      const c = await api.getClusters();
      setClusters(c.data || []);
    } catch (e) {
      console.warn('Stats load failed:', e.message);
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

  // Load stats once on mount
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const updateGrievanceStatus = useCallback(async (id, status) => {
    try {
      const result = await api.updateStatus(id, status);
      setGrievances(prev => prev.map(g => g.id === id ? result.record : g));
      if (selectedGrievance?.id === id) {
        setSelectedGrievance(result.record);
      }
      loadStats();
      return result.record;
    } catch (e) {
      throw e;
    }
  }, [selectedGrievance, loadStats]);

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
      };
      setGrievances(prev => prev.map(g => g.id === grievance.id ? updated : g));
      setSelectedGrievance(updated);
    }
    return result;
  }, []);

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
    reanalyzeGrievance,
    getClusterSiblings,
  };
}
