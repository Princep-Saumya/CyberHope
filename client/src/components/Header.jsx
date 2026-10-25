import { useEffect, useRef } from 'react';
import {
  Search,
  AlertTriangle,
  RefreshCw,
  X,
} from 'lucide-react';

const PAGE_TITLES = {
  dashboard:  'State Dashboard',
  osint:      'Live Citizen Feeds',
  clusters:   'Similar Complaints',
  ai:         'AI Verification',
  resolution: 'Department Dispatch',
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
  const criticalCount = stats?.critical ?? 0;

  const pageTitle = PAGE_TITLES[activePage] || 'Dashboard';

  // Keyboard shortcut listener: Cmd+K, Ctrl+K or '/' to focus search
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
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-7 py-3 flex items-center justify-between gap-6 flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)] sticky top-0 z-10">

      {/* ── Left: Clean Page Title & Live Feed Status ── */}
      <div className="flex items-center gap-3 shrink-0">
        <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
          {pageTitle}
        </h1>

        <span className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* Live Socket Streaming Badge with Concentric Radar Wave */}
        <span
          className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${
            isSocketConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200/90 shadow-2xs'
              : 'bg-amber-50 text-amber-800 border-amber-200/90'
          }`}
          title={isSocketConnected ? 'Real-time WebSocket feed listener is connected' : 'Connecting to live telemetry socket...'}
        >
          <span className="relative flex h-2 w-2 items-center justify-center">
            {isSocketConnected && (
              <span className="animate-radar-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isSocketConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          <span className="text-[11px] font-bold">{isSocketConnected ? 'Live Feed' : 'Connecting...'}</span>
        </span>
      </div>

      {/* ── Center: Spacious Global Search Bar ── */}
      <div className="flex-1 max-w-lg hidden md:block">
        <div className="relative group">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search complaints, districts, hashtags... (e.g. #Patna)"
            value={globalSearch}
            onChange={e => onGlobalSearch(e.target.value)}
            className="bg-slate-100/80 hover:bg-slate-100/95 focus:bg-white border border-slate-200/90 text-slate-900 placeholder-slate-400 text-xs font-medium rounded-xl pl-9 pr-12 py-2 w-full focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:shadow-[0_0_15px_rgba(59,130,246,0.12)] transition-all shadow-inner"
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
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-slate-400 border border-slate-200 shadow-2xs">
                ⌘K
              </kbd>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Scan Action, Urgent Alert (if any), & Officer Profile ── */}
      <div className="flex items-center gap-3 shrink-0">

        {/* Scan Real-Time Feeds Button */}
        <button
          type="button"
          onClick={onPollRealtime}
          disabled={pollDisabled}
          className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 hover:shadow-xs active:scale-95 text-slate-700 hover:text-slate-900 text-xs font-bold shadow-2xs transition-all disabled:opacity-50"
          title="Query live Bihar public feeds (YouTube & Google News) now"
        >
          <RefreshCw size={13} className={pollingRealtime ? 'animate-spin text-blue-600' : 'text-slate-500'} />
          <span className="hidden sm:inline">{pollingRealtime ? 'Scanning…' : 'Scan Live Feeds'}</span>
        </button>

        {/* Urgent Emergencies Badge (Only visible when critical issues exist) */}
        {criticalCount > 0 && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-rose-800 bg-rose-50 border border-rose-300 shadow-2xs animate-glow-rose"
            title={`${criticalCount} high-severity civic emergencies require immediate attention`}
          >
            <AlertTriangle size={13} className="text-rose-600 animate-pulse" />
            <span className="font-mono">{criticalCount}</span>
            <span className="hidden lg:inline text-rose-700">Urgent</span>
          </span>
        )}

        {/* Officer Active Session Chip */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-amber-400 font-black text-xs shadow-2xs shrink-0">
            P
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-800 leading-tight">DSP Patna</div>
            <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 leading-none mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
