import { Search, AlertTriangle, Layers, BarChart2, Radio, Loader2 } from 'lucide-react';

const PAGE_TITLES = {
  dashboard:  'Executive Dashboard',
  osint:      'OSINT Intelligence Engine & Search',
  clusters:   'Duplicate Cluster Detection',
  ai:         'AI Verification Workbench',
  resolution: 'Resolution Portal',
};

export default function Header({ activePage, stats, globalSearch, onGlobalSearch, onSimulatePost, simulatingPost }) {
  const criticalCount  = stats?.critical ?? 0;
  const clusterCount   = stats?.cluster_count ?? 0;
  const totalPosts     = stats?.total ?? 0;

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0">

      {/* Left: Page Title */}
      <div className="flex-shrink-0 min-w-0">
        <h1 className="text-base font-bold text-slate-900 truncate">
          {PAGE_TITLES[activePage] || 'Dashboard'}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">Bihar Cyber Cell · Admin Mode</p>
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

      {/* Right: Live KPI Pills */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button type="button" onClick={onSimulatePost} disabled={simulatingPost}
          className="btn-primary whitespace-nowrap disabled:opacity-60 disabled:cursor-wait">
          {simulatingPost ? <Loader2 size={14} className="animate-spin" /> : <Radio size={14} />}
          <span className="hidden lg:inline">{simulatingPost ? 'Analyzing…' : 'Add Sample Report'}</span>
          <span className="lg:hidden">{simulatingPost ? 'Adding…' : 'Add Sample'}</span>
        </button>
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
          <BarChart2 size={12} className="text-blue-500" />
          <span className="text-slate-800 font-bold font-mono">{totalPosts}</span>
          <span className="text-slate-500">reports</span>
        </div>

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
