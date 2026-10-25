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
    title: 'Executive Dashboard',
    category: 'Surveillance & Metrics',
    subtext: 'High-level statewide grievance surveillance and sentiment monitoring',
  },
  osint: {
    title: 'OSINT Intelligence & Search',
    category: 'Public Ingestion',
    subtext: 'Direct keyword, hashtag, and district scanning across Bihar',
  },
  clusters: {
    title: 'Duplicate Cluster Detection',
    category: 'Cross-Source Triangulation',
    subtext: 'Cross-platform narrative coordination & viral post clustering',
  },
  ai: {
    title: 'AI Verification Workbench',
    category: 'Forensic Review',
    subtext: 'Deep LLM multimodal analysis & human-in-the-loop validation',
  },
  resolution: {
    title: 'Resolution Portal',
    category: 'Department Dispatch',
    subtext: 'Official task routing and inter-departmental action tracking',
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
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)] z-10 sticky top-0">

      {/* ── Left: Breadcrumb & Title & Live Status ── */}
      <div className="flex-shrink-0 min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
          <span>Bihar Cyber Cell</span>
          <ChevronRight size={10} className="text-slate-400" />
          <span className="text-slate-700">{pageMeta.category}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight truncate">
            {pageMeta.title}
          </h1>

          {/* Live Socket Streaming Badge with Concentric Radar Wave */}
          <span
            className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
              isSocketConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                : 'bg-amber-50 text-amber-700 border-amber-300'
            }`}
            title={isSocketConnected ? 'Real-time WebSocket feed listener is connected' : 'Connecting to live telemetry socket...'}
          >
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              {isSocketConnected && (
                <span className="animate-radar-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isSocketConnected ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-amber-500'}`}></span>
            </span>
            <span>{isSocketConnected ? 'LIVE FEED ACTIVE' : 'CONNECTING'}</span>
          </span>
        </div>
      </div>

      {/* ── Center: Search Bar with Keyboard Shortcut ── */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative group">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search hashtags, districts, complaints... (e.g. #Patna)"
            value={globalSearch}
            onChange={e => onGlobalSearch(e.target.value)}
            className="bg-slate-100/80 hover:bg-slate-100 border border-slate-200/90 text-slate-800 placeholder-slate-400 text-xs rounded-xl pl-9 pr-14 py-2 w-full focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all shadow-inner"
          />
          {globalSearch ? (
            <button
              onClick={() => onGlobalSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-200 transition-colors"
              title="Clear search"
            >
              <X size={13} />
            </button>
          ) : (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-slate-500 border border-slate-300 shadow-xs">
                ⌘K
              </kbd>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Live KPI Pills, Stream Actions, & Officer Avatar ── */}
      <div className="flex items-center justify-end gap-2.5 flex-shrink-0 flex-wrap">

        {/* Scan Real-Time Feeds Button */}
        <button
          type="button"
          onClick={onPollRealtime}
          disabled={pollDisabled}
          className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 text-slate-700 hover:text-slate-900 text-xs font-bold shadow-xs transition-all disabled:opacity-50"
          title="Query live Bihar public feeds (YouTube & Google News) now"
        >
          <RefreshCw size={13} className={pollingRealtime ? 'animate-spin text-blue-600' : 'text-slate-500'} />
          <span className="hidden lg:inline">{pollingRealtime ? 'Scanning Feeds…' : 'Poll Live Feeds'}</span>
        </button>

        {/* Live Counters */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100/80 border border-slate-200/80 px-2.5 py-1.5 rounded-xl hover:border-slate-300 transition-colors">
          <Database size={13} className="text-slate-500" />
          <span className="text-slate-900 font-extrabold font-mono">{totalPosts}</span>
          <span className="text-slate-500">records</span>
        </div>

        {realtimeIngested > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2.5 py-1.5 rounded-xl animate-glow-cyan">
            <Wifi size={13} className="text-cyan-600" />
            <span className="font-extrabold font-mono text-cyan-900">{realtimeIngested}</span>
            <span className="text-cyan-700">live</span>
          </div>
        )}

        {clusterCount > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-xl hover:shadow-xs transition-shadow">
            <Layers size={13} className="text-indigo-600" />
            <span className="font-extrabold font-mono text-indigo-900">{clusterCount}</span>
            <span className="text-indigo-700">clusters</span>
          </div>
        )}

        {criticalCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 bg-rose-50 border border-rose-300 px-2.5 py-1.5 rounded-xl shadow-xs animate-glow-rose">
            <AlertTriangle size={13} className="text-rose-600 animate-pulse" />
            <span className="font-extrabold font-mono text-rose-900">{criticalCount}</span>
            <span className="text-rose-700">critical</span>
          </div>
        )}

        {/* Officer Active Session Chip */}
        <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-slate-200/90">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-extrabold text-xs shadow-sm">
            P
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-slate-800 leading-tight">DSP Patna</div>
            <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 leading-none mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Active
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
