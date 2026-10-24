import { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ResolutionModal from './components/ResolutionModal';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import OSINTSearch from './pages/OSINTSearch';
import ClusteringEngine from './pages/ClusteringEngine';
import AIVerification from './pages/AIVerification';
import ResolutionPortal from './pages/ResolutionPortal';
import { useGrievances } from './hooks/useGrievances';
import { Bell, X, ExternalLink, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function App() {
  const [activePage, setActivePage]     = useState('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [pollingRealtime, setPollingRealtime] = useState(false);

  const {
    filters, updateFilter, resetFilters,
    grievances, stats, clusters,
    loading, error,
    selectedGrievance, setSelectedGrievance,
    updateGrievanceStatus, escalateGrievance, addSampleReport, importPublicSourceItem, reanalyzeGrievance,
    getClusterSiblings,
    isSocketConnected,
    realtimeNotification,
    clearNotification,
    triggerRealtimePoll,
  } = useGrievances();
  const [simulatingPost, setSimulatingPost] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Auto-dismiss real-time toast after 10s
  useEffect(() => {
    if (realtimeNotification) {
      const timer = setTimeout(() => {
        clearNotification();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [realtimeNotification, clearNotification]);

  const handlePollRealtime = useCallback(async () => {
    setPollingRealtime(true);
    try {
      await triggerRealtimePoll();
      setActionNotice({
        type: 'success',
        text: 'Live public feeds scanned successfully across Bihar districts.',
      });
    } catch (e) {
      setActionNotice({ type: 'error', text: `Feed scan failed: ${e.message}` });
    } finally {
      setPollingRealtime(false);
    }
  }, [triggerRealtimePoll]);

  const handleSimulatePost = useCallback(async () => {
    setSimulatingPost(true);
    setActionNotice(null);
    try {
      const result = await addSampleReport({
        post_text: 'Transformer near Kankarbagh is sparking with exposed live wires; residents face electric shock risk. BSPHCL please send a repair crew urgently. #BSPHCL #Kankarbagh #Patna',
        platform: 'Sample Entry',
        author_handle: '@sample_report',
        location_tagged: 'Kankarbagh, Patna',
        coordinates: { lat: 25.5941, lng: 85.1456 },
        hashtags: ['#BSPHCL', '#Kankarbagh', '#Patna'],
      });
      setGlobalSearch('');
      setActivePage('dashboard');
      setActionNotice({
        type: 'success',
        text: `Sample report added · ${result.record.department} · ${result.record.duplicate_cluster_id ? 'matched an existing cluster' : 'new report'}`,
        mode: result.analysis.analysis_mode,
      });
    } catch (e) {
      setActionNotice({ type: 'error', text: `Could not add sample report: ${e.message}` });
    } finally {
      setSimulatingPost(false);
    }
  }, [addSampleReport]);

  const handleImportSourceItem = useCallback(async (item) => {
    const result = await importPublicSourceItem(item);
    setActionNotice({
      type: 'success',
      text: result.duplicate
        ? 'This source item is already in the grievance records.'
        : `Source item analyzed and added · ${result.record.department}`,
      mode: result.record.analysis_mode,
    });
    return result;
  }, [importPublicSourceItem]);

  const handleGlobalSearch = useCallback((val) => {
    setGlobalSearch(val);
    updateFilter('hashtag', val);
    if (val && activePage !== 'osint') setActivePage('osint');
  }, [activePage, updateFilter]);

  const handleNavigate = useCallback((page) => {
    setActivePage(page);
  }, []);

  const handleInspectIncoming = useCallback((id) => {
    const target = grievances.find(g => g.id === id);
    if (target) {
      setSelectedGrievance(target);
      clearNotification();
    }
  }, [grievances, setSelectedGrievance, clearNotification]);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <ExecutiveDashboard grievances={grievances} stats={stats} clusters={clusters} onSelectGrievance={setSelectedGrievance} />;
      case 'osint':
        return <OSINTSearch filters={filters} onFilterChange={updateFilter} onReset={resetFilters} grievances={grievances} loading={loading} onSelectGrievance={setSelectedGrievance} onImportSourceItem={handleImportSourceItem} />;
      case 'clusters':
        return <ClusteringEngine clusters={clusters} grievances={grievances} onSelectGrievance={setSelectedGrievance} />;
      case 'ai':
        return <AIVerification grievances={grievances} onReanalyze={reanalyzeGrievance} />;
      case 'resolution':
        return <ResolutionPortal grievances={grievances} onUpdateStatus={updateGrievanceStatus} onEscalate={escalateGrievance} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ── Fixed Left Sidebar ── */}
      <Sidebar active={activePage} onNavigate={handleNavigate} analysisMode={stats?.analysis_mode} />

      {/* ── Right: Main Content Column ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* ── Top Header Bar ── */}
        <Header
          activePage={activePage}
          stats={stats}
          globalSearch={globalSearch}
          onGlobalSearch={handleGlobalSearch}
          onSimulatePost={handleSimulatePost}
          simulatingPost={simulatingPost}
          isSocketConnected={isSocketConnected}
          onPollRealtime={handlePollRealtime}
          pollingRealtime={pollingRealtime}
        />

        {actionNotice && (
          <div role="status" className={`flex-shrink-0 px-6 py-2 flex items-center justify-between gap-3 text-sm border-b ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <span>{actionNotice.text}{actionNotice.mode ? ` · ${actionNotice.mode === 'gemini' ? 'Gemini analysis' : 'local heuristic analysis'}` : ''}</span>
            <button type="button" className="font-semibold hover:underline" onClick={() => setActionNotice(null)}>Dismiss</button>
          </div>
        )}

        {/* ── Error Banner ── */}
        {error && (
          <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-amber-700 text-sm">
            <span>⚠</span>
            <span>Backend issue: {error} — data could not be refreshed</span>
          </div>
        )}

        {/* ── Main Canvas ── */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {renderPage()}
        </main>
      </div>

      {/* ── Real-Time Streaming Toast Notification ── */}
      {realtimeNotification && (
        <aside
          aria-label="Real-time grievance alert"
          className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-white rounded-xl shadow-2xl border-2 border-blue-500/20 p-4 animate-in slide-in-from-bottom-5 transition-all"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                Live Public Report Ingested
              </span>
            </div>
            <button
              onClick={clearNotification}
              className="text-slate-400 hover:text-slate-600 p-1"
              title="Close notification"
            >
              <X size={14} />
            </button>
          </div>

          <div className="mt-2.5">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {realtimeNotification.department}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                📍 {realtimeNotification.location}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                realtimeNotification.severity >= 8
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                Severity: {realtimeNotification.severity}/10
              </span>
            </div>
            <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
              "{realtimeNotification.text}"
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              Source: {realtimeNotification.platform} · {realtimeNotification.timestamp}
            </span>
            <button
              onClick={() => handleInspectIncoming(realtimeNotification.id)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
            >
              Inspect Ticket <ExternalLink size={12} />
            </button>
          </div>
        </aside>
      )}

      {/* ── Resolution Modal ── */}
      {selectedGrievance && (
        <ResolutionModal
          grievance={selectedGrievance}
          clusterSiblings={getClusterSiblings(selectedGrievance)}
          onClose={() => setSelectedGrievance(null)}
          onStatusUpdate={updateGrievanceStatus}
          onReanalyze={reanalyzeGrievance}
        />
      )}
    </div>
  );
}
