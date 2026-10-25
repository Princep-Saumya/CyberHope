import { useState, useEffect, useRef } from 'react';
import {
  Search,
  AlertTriangle,
  Layers,
  Database,
  Wifi,
  RefreshCw,
  X,
  ShieldCheck,
  Radio,
  ChevronRight,
} from 'lucide-react';

const PAGE_METADATA = {
  dashboard: {
    title: 'Statewide Complaint Dashboard',
    category: 'State Overview',
    subtext: 'Real-time public grievance monitoring across Bihar districts',
  },
  osint: {
    title: 'Live Citizen Feeds & Search',
    category: 'Public Ingestion',
    subtext: 'Direct search of citizen complaints from YouTube and Google News',
  },
  clusters: {
    title: 'Similar Complaint Groups',
    category: 'Duplicate Detection',
    subtext: 'Automatically grouped citizen complaints covering the same issue',
  },
  ai: {
    title: 'AI Verification & Fact-Check Workbench',
    category: 'Officer Review Desk',
    subtext: 'Review AI authenticity flags and authorize official verdicts',
  },
  resolution: {
    title: 'Department Dispatch & Action Portal',
    category: 'Ground Resolution',
    subtext: 'Assign genuine complaints to government departments and track repairs',
  },
};

export default function Header({
  activePage,
  stats,
  globalSearch,
  onGlobalSearch,
  onSimulatePost,
  simulatingPost,
  simulateDisabled,
  isSocketConnected,
  onPollRealtime,
  pollingRealtime,
  pollDisabled,
}) {
  const searchInputRef = useRef(null);
  const criticalCount    = stats?.critical ?? 0;
  const clusterCount     = stats?.cluster_count ?? 0;
  const totalPosts       = stats?.total ?? 0;
  const realtimeIngested = stats?.realtime_ingested ?? 0;

  const pageMeta = PAGE_METADATA[activePage] || {
    title: 'Intelligence Workstation',
    category: 'Cyber Cell',
    subtext: 'Bihar Cyber Crime & Disinformation Monitoring Unit',
  };

  // Keyboard shortcut listener: Cmd+K or Ctrl+K or '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        if (!['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-6 py-3.5 flex items-center justify-between gap-5 flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)] z-10 sticky top-0">

      {/* ── Left: Breadcrumb, Main Title & Live Streaming Status ── */}
      <div className="flex-shrink-0 min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
          <span>Bihar Cyber Cell</span>
          <ChevronRight size={12} className="text-slate-400" />
          <span className="text-slate-800 font-bold">{pageMeta.category}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-black text-slate-900 tracking-tight truncate">
            {pageMeta.title}
          </h1>

          {/* Live Socket Streaming Badge with Concentric Radar Wave */}
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
              isSocketConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
            title={isSocketConnected ? 'Real-time WebSocket feed listener is connected' : 'Connecting to live telemetry socket...'}
          >
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              {isSocketConnected && (
                <span className="animate-radar-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isSocketConnected ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-amber-500'}`}></span>
            </span>
            <span>{isSocketConnected ? 'LIVE FEED ACTIVE' : 'CONNECTING...'}</span>
          </span>
        </div>
      </div>

      {/* ── Center: Comfortable, Legible Global Search Bar ── */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative group">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search complaints, districts (e.g. Patna), hashtags..."
            value={globalSearch}
            onChange={e => onGlobalSearch(e.target.value)}
            className="bg-slate-100/90 hover:bg-slate-100 border border-slate-200/90 text-slate-900 placeholder-slate-400 text-sm font-medium rounded-xl pl-10 pr-14 py-2.5 w-full focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all shadow-inner"
          />
          {globalSearch ? (
            <button
              onClick={() => onGlobalSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors"
              title="Clear search"
            >
              <X size={15} />
            </button>
          ) : (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
              <kbd className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-white text-slate-500 border border-slate-300 shadow-xs">
                ⌘K
              </kbd>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Live KPI Badges, Stream Action, & Officer Avatar ── */}
      <div className="flex items-center justify-end gap-3 flex-shrink-0 flex-wrap">

        {/* Scan Real-Time Feeds Button */}
        <button
          type="button"
          onClick={onPollRealtime}
          disabled={pollDisabled}
          className="inline-flex items-center gap-2 py-2 px-3.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 text-slate-800 text-xs font-bold shadow-xs transition-all disabled:opacity-50"
          title="Query live Bihar public feeds (YouTube & Google News) now"
        >
          <RefreshCw size={14} className={pollingRealtime ? 'animate-spin text-blue-600' : 'text-slate-600'} />
          <span className="hidden lg:inline">{pollingRealtime ? 'Scanning Feeds…' : 'Scan Live Feeds'}</span>
        </button>

        {/* Live Counters with Readable Labels and Proper Font Size */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100/90 border border-slate-200 px-3 py-1.5 rounded-xl hover:border-slate-300 transition-colors">
          <Database size={14} className="text-slate-500" />
          <span className="text-slate-900 font-extrabold font-mono text-sm">{totalPosts}</span>
          <span className="text-slate-600">Total</span>
        </div>

        {realtimeIngested > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-cyan-900 bg-cyan-50 border border-cyan-200 px-3 py-1.5 rounded-xl animate-glow-cyan">
            <Wifi size={14} className="text-cyan-600" />
            <span className="font-extrabold font-mono text-cyan-950 text-sm">{realtimeIngested}</span>
            <span className="text-cyan-800">Live</span>
          </div>
        )}

        {clusterCount > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-indigo-900 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl hover:shadow-xs transition-shadow">
            <Layers size={14} className="text-indigo-600" />
            <span className="font-extrabold font-mono text-indigo-950 text-sm">{clusterCount}</span>
            <span className="text-indigo-800">Groups</span>
          </div>
        )}

        {criticalCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 bg-rose-50 border border-rose-300 px-3 py-1.5 rounded-xl shadow-xs animate-glow-rose">
            <AlertTriangle size={14} className="text-rose-600 animate-pulse" />
            <span className="font-extrabold font-mono text-rose-950 text-sm">{criticalCount}</span>
            <span className="text-rose-800">Urgent</span>
          </div>
        )}

        {/* Officer Active Session Chip */}
        <div className="hidden xl:flex items-center gap-2.5 pl-3 border-l border-slate-200/90">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-black text-xs shadow-sm">
            P
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-slate-900 leading-tight">DSP Patna</div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 leading-none mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Active Officer
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
