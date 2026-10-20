import { Search, LayoutDashboard, Layers, ShieldCheck, FileText, Sparkles, MapPin, AlertTriangle, Cpu, Shield, Zap } from 'lucide-react';

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',         icon: LayoutDashboard, color: 'text-sky-400' },
  { id: 'osint',      label: 'OSINT Search',       icon: Search,          color: 'text-cyan-400' },
  { id: 'clusters',   label: 'Clusters',           icon: Layers,          color: 'text-indigo-400' },
  { id: 'ai',         label: 'AI Verification',    icon: Sparkles,        color: 'text-amber-400' },
  { id: 'resolution', label: 'Resolution',         icon: FileText,        color: 'text-emerald-400' },
];

export default function Navbar({ active, onNavigate, stats, globalSearch, onGlobalSearch }) {
  const criticalCount = stats?.critical ?? 0;
  const overdueCount  = stats
    ? stats.by_status?.find(s => s.name === 'Received')?.count ?? 0
    : 0;

  return (
    <header className="flex-shrink-0 bg-slate-900 border-b border-slate-700/60 px-4 shadow-xl shadow-black/20">
      {/* Top strip: logo + search + badges */}
      <div className="flex items-center gap-4 h-14 border-b border-slate-800">
        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Shield size={16} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold text-slate-100 leading-tight tracking-wide">GrievancePulse AI</div>
            <div className="text-xs text-slate-500 leading-tight">Bihar · PS-04 · 2026</div>
          </div>
        </div>

        <div className="w-px h-6 bg-slate-700 flex-shrink-0" />

        {/* Global search */}
        <div className="flex-1 relative max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search hashtags, districts, complaints..."
            value={globalSearch}
            onChange={e => onGlobalSearch(e.target.value)}
            className="input-field pl-8 py-1.5 text-sm h-8"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          {/* Live indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </div>

          {/* Critical alert badge */}
          {criticalCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2.5 py-1 rounded-full">
              <AlertTriangle size={11} className="animate-pulse" />
              {criticalCount} Critical
            </div>
          )}

          {/* Gemini badge */}
          <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
            <Sparkles size={11} />
            Gemini 1.5 Flash
          </div>

          {/* Officer badge */}
          <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-slate-700">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              A
            </div>
            <div className="hidden xl:block">
              <div className="text-xs font-semibold text-slate-200 leading-tight">Admin Officer</div>
              <div className="text-xs text-slate-500 leading-tight">Bihar Cyber Cell</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation tab row */}
      <div className="flex items-center gap-1 h-11 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon, color }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`nav-tab flex-shrink-0 ${isActive ? 'nav-tab-active' : 'nav-tab-idle'}`}
            >
              <Icon size={14} className={isActive ? 'text-white' : color} />
              <span>{label}</span>
              {/* Live dot on OSINT */}
              {id === 'osint' && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ml-0.5" />
              )}
              {/* Alert dot on Resolution if there are critical items */}
              {id === 'resolution' && criticalCount > 0 && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse ml-0.5" />
              )}
            </button>
          );
        })}

        {/* Stats strip on far right */}
        <div className="ml-auto hidden md:flex items-center gap-4 pr-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <MapPin size={11} className="text-emerald-400" />
            <span className="text-slate-300 font-mono font-bold">{stats?.total ?? '—'}</span> posts
          </span>
          <span className="flex items-center gap-1">
            <Layers size={11} className="text-indigo-400" />
            <span className="text-slate-300 font-mono font-bold">{stats?.cluster_count ?? '—'}</span> clusters
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle size={11} className="text-rose-400" />
            <span className="text-rose-400 font-mono font-bold">{criticalCount}</span> critical
          </span>
        </div>
      </div>
    </header>
  );
}
