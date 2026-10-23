import { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ResolutionModal from './components/ResolutionModal';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import OSINTSearch from './pages/OSINTSearch';
import ClusteringEngine from './pages/ClusteringEngine';
import AIVerification from './pages/AIVerification';
import ResolutionPortal from './pages/ResolutionPortal';
import { useGrievances } from './hooks/useGrievances';

export default function App() {
  const [activePage, setActivePage]     = useState('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');

  const {
    filters, updateFilter, resetFilters,
    grievances, stats, clusters,
    loading, error,
    selectedGrievance, setSelectedGrievance,
    updateGrievanceStatus, escalateGrievance, addSampleReport, importPublicSourceItem, reanalyzeGrievance,
    getClusterSiblings,
  } = useGrievances();
  const [simulatingPost, setSimulatingPost] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

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
