import { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import ResolutionModal from './components/ResolutionModal';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import OSINTSearch from './pages/OSINTSearch';
import ClusteringEngine from './pages/ClusteringEngine';
import AIVerification from './pages/AIVerification';
import ResolutionPortal from './pages/ResolutionPortal';
import { useGrievances } from './hooks/useGrievances';
import { useAuth } from './context/AuthContext';
import { X, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center text-sm font-medium text-slate-600">
        Checking your session…
      </main>
    );
  }

  if (!isAuthenticated) return <LoginPage />;
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const { demoMode, demoProfile, signOut } = useAuth();
  const [activePage, setActivePage]     = useState('dashboard');
  const [selectedVerificationId, setSelectedVerificationId] = useState(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [pollingRealtime, setPollingRealtime] = useState(false);
  const [pollCooldown, setPollCooldown] = useState(false);
  const [simulationCooldown, setSimulationCooldown] = useState(false);
  const pollLock = useRef(false);
  const simulationLock = useRef(false);
  const feedScrollPending = useRef(false);
  const cooldownTimers = useRef({ poll: null, simulation: null, highlight: null });

  const {
    filters, updateFilter, resetFilters,
    grievances, stats, clusters, unlocatedRecords, excludedNonCivicCount,
    loading, error,
    selectedGrievance, setSelectedGrievance,
    updateGrievanceStatus, assignGrievanceLocation, escalateGrievance, verifyGrievance, approveGrievanceForDispatch, reanalyzeAllGrievances, addSampleReport, importPublicSourceItem, reanalyzeGrievance,
    getClusterSiblings,
    socketStatus,
    realtimeNotification,
    clearNotification,
    triggerRealtimePoll,
    batchAuditProgress,
  } = useGrievances();
  const [simulatingPost, setSimulatingPost] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [highlightedReportId, setHighlightedReportId] = useState(null);
  const [feedScrollRequest, setFeedScrollRequest] = useState(0);

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

  useEffect(() => {
    if (!feedScrollPending.current || activePage !== 'osint' || !highlightedReportId) return undefined;
    const frame = requestAnimationFrame(() => {
      const target = [...document.querySelectorAll('[data-report-id]')]
        .find(element => element.dataset.reportId === highlightedReportId);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      feedScrollPending.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [activePage, feedScrollRequest, highlightedReportId, grievances]);

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
      const result = await triggerRealtimePoll();
      const scan = result.status?.last_poll;
      setActionNotice({
        type: scan?.ingested ? 'success' : 'info',
        text: scan
          ? `Hashtag scan ${scan.query}: found ${scan.found}, added ${scan.ingested}, already recorded ${scan.duplicates}${scan.demo_items_skipped ? `, ignored ${scan.demo_items_skipped} demo examples` : ''}.`
          : 'Scan completed, but no scan summary was returned.',
      });
    } catch (e) {
      setActionNotice({ type: 'error', text: `Feed scan failed: ${e.message}` });
    } finally {
      setPollingRealtime(false);
      pollLock.current = false;
    }
  }, [triggerRealtimePoll]);

  const handleShowInFeed = useCallback((record) => {
    if (!record?.id) return;
    resetFilters();
    setGlobalSearch('');
    setSelectedGrievance(null);
    setActivePage('osint');
    setHighlightedReportId(record.id);
    feedScrollPending.current = true;
    setFeedScrollRequest(request => request + 1);
    clearTimeout(cooldownTimers.current.highlight);
    cooldownTimers.current.highlight = setTimeout(() => setHighlightedReportId(null), 3000);
    setActionNotice(null);
  }, [resetFilters, setSelectedGrievance]);

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
      handleShowInFeed(result.record);
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
  }, [addSampleReport, handleShowInFeed]);

  const handleImportSourceItem = useCallback(async (item) => {
    const result = await importPublicSourceItem(item);
    if (result.duplicate) {
      setActionNotice({ type: 'info', text: 'This source item is already in the grievance records.' });
    } else {
      handleShowInFeed(result.record);
      setActionNotice({
        type: 'success',
        title: 'Report added',
        text: `Source item analyzed and added · ${result.record.department}`,
        mode: result.record.analysis_mode,
        ticket: result.record,
      });
    }
    return result;
  }, [handleShowInFeed, importPublicSourceItem]);

  const handleAddDemoSample = useCallback(async (item) => {
    const hashtags = [...new Set((item.text?.match(/#[\p{L}\p{N}_]+/gu) || []))];
    const result = await addSampleReport({
      post_text: item.text || item.title,
      platform: 'Sample Entry',
      author_handle: item.author || '@curated_sample',
      hashtags,
    });
    handleShowInFeed(result.record);
    setActionNotice({
      type: 'success',
      title: 'Sample report added',
      text: result.record.post_text,
      mode: result.analysis.analysis_mode,
      ticket: result.record,
    });
    return result;
  }, [addSampleReport, handleShowInFeed]);

  const handleGlobalSearch = useCallback((val) => {
    setGlobalSearch(val);
    updateFilter('hashtag', val);
    if (val && activePage !== 'osint') setActivePage('osint');
  }, [activePage, updateFilter]);

  const handleResetFilters = useCallback(() => {
    resetFilters();
    setGlobalSearch('');
  }, [resetFilters]);

  const handleNavigate = useCallback((page) => {
    setActivePage(page);
  }, []);

  const handleOpenAIReview = useCallback((grievance) => {
    setSelectedVerificationId(grievance.id);
    setSelectedGrievance(null);
    setActivePage('ai');
  }, [setSelectedGrievance]);

  const handleInspectIncoming = useCallback((id) => {
    const target = grievances.find(g => g.id === id);
    if (target) {
      setSelectedGrievance(target);
      clearNotification();
    }
  }, [grievances, setSelectedGrievance, clearNotification]);

  const handleViewActionTicket = useCallback(() => {
    if (!actionNotice?.ticket) return;
    handleShowInFeed(actionNotice.ticket);
  }, [actionNotice, handleShowInFeed]);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <ExecutiveDashboard grievances={grievances} stats={stats} clusters={clusters} onSelectGrievance={setSelectedGrievance} highlightedReportId={highlightedReportId} />;
      case 'osint':
        return <OSINTSearch filters={filters} onFilterChange={updateFilter} onReset={handleResetFilters} grievances={grievances} loading={loading} highlightedReportId={highlightedReportId} onSelectGrievance={setSelectedGrievance} onImportSourceItem={handleImportSourceItem} onAddDemoSample={handleAddDemoSample} />;
      case 'clusters':
        return <ClusteringEngine clusters={clusters} unlocatedRecords={unlocatedRecords} totalRecords={stats?.total ?? grievances.length} excludedNonCivicCount={excludedNonCivicCount} onSelectGrievance={setSelectedGrievance} onAssignLocation={assignGrievanceLocation} />;
      case 'ai':
        return (
          <AIVerification
            grievances={grievances}
            selectedGrievanceId={selectedVerificationId}
            onReanalyze={reanalyzeGrievance}
            onVerify={verifyGrievance}
            onApproveForDispatch={approveGrievanceForDispatch}
            onReanalyzeAll={reanalyzeAllGrievances}
            batchAuditProgress={batchAuditProgress}
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
      <Sidebar active={activePage} onNavigate={handleNavigate} analysisMode={stats?.analysis_mode} stats={stats} />

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
          socketStatus={socketStatus}
          onPollRealtime={handlePollRealtime}
          pollingRealtime={pollingRealtime}
          pollDisabled={pollingRealtime || pollCooldown}
          userEmail={demoProfile?.email}
          demoMode={demoMode}
          demoProfile={demoProfile}
          onSignOut={signOut}
          selectedDepartment={filters.department}
          onDepartmentChange={(department) => updateFilter('department', department)}
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
            actionNotice.type === 'error' ? 'border-rose-200 text-rose-800' :
              actionNotice.type === 'info' ? 'border-amber-200 text-amber-800' : 'border-emerald-200 text-emerald-800'
          }`}
        >
          {actionNotice.type === 'error' ? <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-rose-600" />
            : actionNotice.type === 'info' ? <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
              : <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-emerald-600" />}
          <div className="min-w-0 flex-1 text-sm">
            {actionNotice.title && <p className="font-semibold">{actionNotice.title}</p>}
            <p className={`${actionNotice.title ? 'mt-1 line-clamp-2' : ''}`}>
              {actionNotice.title ? `“${actionNotice.text}”` : actionNotice.text}
              {actionNotice.mode ? ` · ${actionNotice.mode.startsWith('grok:') ? 'xAI Grok text triage' : actionNotice.mode.startsWith('groq:') ? 'Groq text triage' : actionNotice.mode.startsWith('gemini') ? 'Gemini fallback triage' : 'local heuristic analysis'}` : ''}
            </p>
            {actionNotice.ticket ? (
              <button type="button" onClick={handleViewActionTicket} className="mt-2 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline">
                View in Feed
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
          className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-blue-500/30 p-4.5 animate-modal-spring transition-all hover:shadow-blue-500/10"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3 items-center justify-center">
                <span className="animate-radar-pulse absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-xs shadow-rose-500/50"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                Live Public Report Ingested
              </span>
            </div>
            <button
              onClick={clearNotification}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
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
          onOpenAIReview={handleOpenAIReview}
        />
      )}
    </div>
  );
}
