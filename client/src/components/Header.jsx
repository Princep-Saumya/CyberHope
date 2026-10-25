import { Search, AlertTriangle, Layers, BarChart2, Radio, Loader2, Wifi, RefreshCw } from 'lucide-react';

const PAGE_TITLES = {
  dashboard:  'Executive Dashboard',
  osint:      'OSINT Intelligence Engine & Search',
  clusters:   'Duplicate Cluster Detection',
  ai:         'AI Verification Workbench',
  resolution: 'Resolution Portal',
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
  const criticalCount   = stats?.critical ?? 0;
  const clusterCount    = stats?.cluster_count ?? 0;
  const totalPosts      = stats?.total ?? 0;
  const realtimeIngested = stats?.realtime_ingested ?? 0;

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 flex-shrink-0">

      {/* Left: Page Title & Realtime Badge */}
      <div className="flex-shrink-0 min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-base font-bold text-slate-900 truncate">
            {PAGE_TITLES[activePage] || 'Dashboard'}
          </h1>
          {/* Live WebSocket status pill */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              isSocketConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
            title={isSocketConnected ? 'Live WebSocket streaming active' : 'Connecting to live stream...'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSocketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {isSocketConnected ? 'LIVE FEED ACTIVE' : 'CONNECTING'}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">Bihar Cyber Cell · Real-Time Intelligence Workstation</p>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-sm hidden md:block">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search hashtags, districts, complaints..."
            value={globalSearch}
            onChange={e => onGlobalSearch(e.target.value)}
            className="bg-slate-100 border border-slate-200 text-slate-800 placeholder-slate-400 text-sm rounded-lg pl-9 pr-4 py-2 w-full focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 transition-all"
          />
        </div>
      </div>

      {/* Right: Live KPI Pills & Stream Actions */}
      <div className="flex items-center justify-end gap-2 flex-shrink-0 flex-wrap">

        {/* Scan Real-Time Feeds Button */}
        <button
          type="button"
          onClick={onPollRealtime}
          disabled={pollDisabled}
          className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          title="Query live Bihar public feeds now"
        >
          <RefreshCw size={12} className={pollingRealtime ? 'animate-spin text-blue-600' : 'text-slate-500'} />
          <span className="hidden lg:inline">{pollingRealtime ? 'Scanning Feeds…' : 'Poll Real-Time Feed'}</span>
        </button>

        {/* Live Counters */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-zinc-700 bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-full">
          <BarChart2 size={12} className="text-zinc-500" />
          <span className="text-slate-800 font-bold font-mono">{totalPosts}</span>
          <span className="text-zinc-600">total</span>
        </div>

        {realtimeIngested > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <Wifi size={12} className="text-emerald-500" />
            <span className="font-bold font-mono">{realtimeIngested}</span>
            <span className="text-emerald-600">live</span>
          </div>
        )}

        <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full">
          <Layers size={12} className="text-indigo-500" />
          <span className="font-bold font-mono">{clusterCount}</span>
          <span className="text-indigo-500">clusters</span>
        </div>

        {criticalCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-full">
            <AlertTriangle size={12} className="text-rose-500 animate-pulse" />
            <span className="font-bold font-mono">{criticalCount}</span>
            <span className="text-rose-600">critical</span>
          </div>
        )}
      </div>
    </header>
  );
}
