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
    updateGrievanceStatus, reanalyzeGrievance,
    getClusterSiblings,
  } = useGrievances();

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
        return <OSINTSearch filters={filters} onFilterChange={updateFilter} onReset={resetFilters} grievances={grievances} loading={loading} onSelectGrievance={setSelectedGrievance} />;
      case 'clusters':
        return <ClusteringEngine clusters={clusters} grievances={grievances} onSelectGrievance={setSelectedGrievance} />;
      case 'ai':
        return <AIVerification grievances={grievances} />;
      case 'resolution':
        return <ResolutionPortal grievances={grievances} onUpdateStatus={updateGrievanceStatus} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ── Fixed Left Sidebar ── */}
      <Sidebar active={activePage} onNavigate={handleNavigate} />

      {/* ── Right: Main Content Column ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* ── Top Header Bar ── */}
        <Header
          activePage={activePage}
          stats={stats}
          globalSearch={globalSearch}
          onGlobalSearch={handleGlobalSearch}
        />

        {/* ── Error Banner ── */}
        {error && (
          <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-amber-700 text-sm">
            <span>⚠</span>
            <span>Backend issue: {error} — showing cached seed data</span>
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
