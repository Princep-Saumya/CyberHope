import { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ResolutionModal from './components/ResolutionModal';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import OSINTSearch from './pages/OSINTSearch';
import ClusteringEngine from './pages/ClusteringEngine';
import AIVerification from './pages/AIVerification';
import ResolutionPortal from './pages/ResolutionPortal';
import { useGrievances } from './hooks/useGrievances';
import { X, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activePage, setActivePage]     = useState('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [pollingRealtime, setPollingRealtime] = useState(false);
  const [pollCooldown, setPollCooldown] = useState(false);
  const [simulationCooldown, setSimulationCooldown] = useState(false);
  const pollLock = useRef(false);
  const simulationLock = useRef(false);
  const cooldownTimers = useRef({ poll: null, simulation: null, highlight: null });

  const {
    filters, updateFilter, resetFilters,
    grievances, stats, clusters,
    loading, error,
    selectedGrievance, setSelectedGrievance,
    updateGrievanceStatus, escalateGrievance, verifyGrievance, reanalyzeAllGrievances, addSampleReport, importPublicSourceItem, reanalyzeGrievance,
    getClusterSiblings,
    isSocketConnected,
    realtimeNotification,
    clearNotification,
    triggerRealtimePoll,
  } = useGrievances();
  const [simulatingPost, setSimulatingPost] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [highlightedReportId, setHighlightedReportId] = useState(null);

  useEffect(() => () => {
    clearTimeout(cooldownTimers.current.poll);
    clearTimeout(cooldownTimers.current.simulation);
    clearTimeout(cooldownTimers.current.highlight);
  }, []);

  useEffect(() => {
    if (!actionNotice) return undefined;
    const timer = setTimeout(() => setActionNotice(null), 7000);
    return () => clearTimeout(timer);
  }, [actionNotice]);

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
    if (pollLock.current) return;
    pollLock.current = true;
    setPollingRealtime(true);
    setPollCooldown(true);
    cooldownTimers.current.poll = setTimeout(() => setPollCooldown(false), 6000);
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
      pollLock.current = false;
    }
  }, [triggerRealtimePoll]);

  const handleSimulatePost = useCallback(async () => {
    if (simulationLock.current) return;
    simulationLock.current = true;
    setSimulatingPost(true);
    setSimulationCooldown(true);
    cooldownTimers.current.simulation = setTimeout(() => setSimulationCooldown(false), 5000);
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
      setHighlightedReportId(result.record.id);
      clearTimeout(cooldownTimers.current.highlight);
      cooldownTimers.current.highlight = setTimeout(() => setHighlightedReportId(null), 5000);
      setGlobalSearch('');
      setActivePage('dashboard');
      setActionNotice({
        type: 'success',
        title: 'New simulated grievance added',
        text: result.record.post_text,
        ticket: result.record,
        mode: result.analysis.analysis_mode,
      });
    } catch (e) {
      setActionNotice({ type: 'error', text: `Could not add sample report: ${e.message}` });
    } finally {
      setSimulatingPost(false);
      simulationLock.current = false;
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

  const handleViewActionTicket = useCallback(() => {
    if (!actionNotice?.ticket) return;
    setSelectedGrievance(actionNotice.ticket);
    setActionNotice(null);
  }, [actionNotice, setSelectedGrievance]);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <ExecutiveDashboard grievances={grievances} stats={stats} clusters={clusters} onSelectGrievance={setSelectedGrievance} highlightedReportId={highlightedReportId} />;
      case 'osint':
        return <OSINTSearch filters={filters} onFilterChange={updateFilter} onReset={resetFilters} grievances={grievances} loading={loading} onSelectGrievance={setSelectedGrievance} onImportSourceItem={handleImportSourceItem} />;
      case 'clusters':
        return <ClusteringEngine clusters={clusters} grievances={grievances} onSelectGrievance={setSelectedGrievance} />;
      case 'ai':
        return (
          <AIVerification
            grievances={grievances}
            onReanalyze={reanalyzeGrievance}
            onVerify={verifyGrievance}
            onReanalyzeAll={reanalyzeAllGrievances}
          />
        );
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
          simulateDisabled={simulatingPost || simulationCooldown}
          isSocketConnected={isSocketConnected}
          onPollRealtime={handlePollRealtime}
          pollingRealtime={pollingRealtime}
          pollDisabled={pollingRealtime || pollCooldown}
        />

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

      {actionNotice && (
        <aside
          role={actionNotice.type === 'error' ? 'alert' : 'status'}
          aria-live={actionNotice.type === 'error' ? 'assertive' : 'polite'}
          className={`fixed ${realtimeNotification ? 'bottom-64' : 'bottom-6'} right-6 z-50 flex w-[calc(100vw-3rem)] max-w-md items-start gap-3 rounded-xl border bg-white p-4 shadow-2xl ${
            actionNotice.type === 'error' ? 'border-rose-200 text-rose-800' : 'border-emerald-200 text-emerald-800'
          }`}
        >
          {actionNotice.type === 'error' ? <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-rose-600" /> : <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-emerald-600" />}
          <div className="min-w-0 flex-1 text-sm">
            {actionNotice.title && <p className="font-semibold">{actionNotice.title}</p>}
            <p className={`${actionNotice.title ? 'mt-1 line-clamp-2' : ''}`}>
              {actionNotice.title ? `“${actionNotice.text}”` : actionNotice.text}
              {actionNotice.mode ? ` · ${actionNotice.mode.startsWith('groq:') ? 'Groq text triage' : actionNotice.mode.startsWith('gemini') ? 'Gemini fallback triage' : 'local heuristic analysis'}` : ''}
            </p>
            {actionNotice.ticket ? (
              <button type="button" onClick={handleViewActionTicket} className="mt-2 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline">
                View Ticket
              </button>
            ) : <p className="mt-1 text-xs opacity-75">This notice closes automatically.</p>}
          </div>
          <button type="button" aria-label="Dismiss notification" className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800" onClick={() => setActionNotice(null)}>
            <X size={14} />
          </button>
        </aside>
      )}

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
