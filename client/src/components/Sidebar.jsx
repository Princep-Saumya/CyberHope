import {
  LayoutDashboard,
  Radio,
  Layers,
  Sparkles,
  FileCheck,
  Shield,
  Cpu,
  ChevronRight,
  ShieldCheck,
  Lock,
  Search,
} from 'lucide-react';
import JanSunoLogo from './JanSunoLogo';

const NAV_GROUPS = [
  {
    title: 'Command & Surveillance',
    items: [
      { id: 'dashboard',   label: 'Executive Dashboard',  icon: LayoutDashboard, badgeKey: null },
      { id: 'osint',       label: 'OSINT Live Feeds',     icon: Radio,            badgeKey: 'live' },
    ],
  },
  {
    title: 'Forensic Investigation',
    items: [
      { id: 'clusters',    label: 'Duplicate Clusters',   icon: Layers,          badgeKey: 'clusters' },
      { id: 'ai',          label: 'AI Verification',      icon: Sparkles,        badgeKey: 'ai' },
    ],
  },
  {
    title: 'Action & Governance',
    items: [
      { id: 'resolution',  label: 'Resolution Portal',    icon: FileCheck,       badgeKey: 'resolution' },
    ],
  },
];

export default function Sidebar({ active, onNavigate, analysisMode, stats }) {
  const realtimeCount = stats?.realtime_ingested ?? 0;
  const clusterCount  = stats?.cluster_count ?? 0;
  const unverifiedCount = stats?.unverified ?? 0;
  const criticalCount = stats?.critical ?? 0;

  const renderBadge = (key, isActive) => {
    if (!key) return null;

    if (key === 'live') {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
            isActive
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs'
              : 'bg-cyan-950/60 text-cyan-400 border-cyan-800/50'
          }`}
          title={`${realtimeCount} live real-time reports ingested`}
        >
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span className="animate-radar-pulse absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
          </span>
          <span>{realtimeCount > 0 ? `${realtimeCount} Live` : 'Live'}</span>
        </span>
      );
    }

    if (key === 'clusters') {
      if (clusterCount === 0) return null;
      return (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border transition-colors ${
            isActive
              ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/40'
              : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/50'
          }`}
          title={`${clusterCount} active duplicate story clusters detected`}
        >
          {clusterCount}
        </span>
      );
    }

    if (key === 'ai') {
      if (unverifiedCount === 0) return null;
      return (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border transition-all ${
            isActive
              ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-sm'
              : 'bg-amber-950/60 text-amber-400 border-amber-800/60 animate-glow-amber'
          }`}
          title={`${unverifiedCount} reports pending human verification review`}
        >
          {unverifiedCount} pending
        </span>
      );
    }

    if (key === 'resolution') {
      if (criticalCount === 0) return null;
      return (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border transition-all ${
            isActive
              ? 'bg-rose-500/25 text-rose-200 border-rose-400/40'
              : 'bg-rose-950/70 text-rose-300 border-rose-800/60 animate-glow-rose'
          }`}
          title={`${criticalCount} high-severity civic emergencies requiring dispatch`}
        >
          {criticalCount} critical
        </span>
      );
    }

    return null;
  };

  return (
    <aside className="w-64 min-w-[256px] bg-[#0c1017] text-slate-300 min-h-screen flex flex-col justify-between border-r border-slate-800/80 flex-shrink-0 select-none shadow-2xl z-20">

      {/* ── Brand Header ── */}
      <div>
        <div className="px-5 py-4 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/60 to-transparent">
          <div className="flex items-center gap-3">
            <div className="relative p-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-inner flex-shrink-0 group-hover:border-slate-700 transition-colors">
              <JanSunoLogo className="w-7 h-7 flex-shrink-0 transition-transform duration-300 hover:scale-110" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-radar-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-white tracking-tight leading-none">JanSuno</span>
                <span className="text-base font-black text-amber-400 leading-none">AI</span>
                <span className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium tracking-wide truncate">
                Govt. of Bihar · Cyber Cell
              </p>
            </div>
          </div>
        </div>

        {/* ── Grouped Navigation ── */}
        <nav className="px-3 py-3 space-y-4 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5 flex items-center justify-between">
                <span>{group.title}</span>
              </div>
              {group.items.map(({ id, label, icon: Icon, badgeKey }) => {
                const isActive = active === id;
                return (
                  <button
                    key={id}
                    onClick={() => onNavigate(id)}
                    className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer w-full text-left ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600/25 via-indigo-600/15 to-transparent text-white border-l-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.18)]'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 active:scale-[0.99]'
                    }`}
                  >
                    <div className={`p-1 rounded-lg transition-transform duration-200 group-hover:scale-110 ${
                      isActive
                        ? 'bg-amber-400/15 text-amber-400'
                        : 'text-slate-500 group-hover:text-slate-300 group-hover:bg-slate-800/50'
                    }`}>
                      <Icon size={15} className="flex-shrink-0" />
                    </div>
                    <span className="flex-1 truncate tracking-tight group-hover:translate-x-0.5 transition-transform duration-150">{label}</span>
                    {renderBadge(badgeKey, isActive)}
                    {isActive && <ChevronRight size={12} className="text-amber-400/80 flex-shrink-0 animate-pulse" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* ── Sidebar Footer: Engine & Officer Session ── */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 flex flex-col gap-2">
        {/* Active AI Triage Engine status */}
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-300 bg-slate-900/80 border border-slate-800/80 px-2.5 py-1.5 rounded-lg">
          <div className="flex items-center gap-1.5 truncate">
            <Cpu size={12} className="text-emerald-400 flex-shrink-0" />
            <span className="truncate text-slate-400 font-mono text-[10px]">
              {analysisMode ? `${analysisMode}` : 'AI Engine: Active'}
            </span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" title="Online" />
        </div>

        {/* Officer Profile Card */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800/60 text-slate-300">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 text-xs font-black shadow-md flex-shrink-0">
            P
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-200 leading-tight truncate">
              DSP Cyber Cell Patna
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
              <ShieldCheck size={10} className="text-emerald-400 flex-shrink-0" />
              <span className="truncate">Level-3 Audit Clearance</span>
            </div>
          </div>
          <Lock size={12} className="text-slate-400 flex-shrink-0" title="Secured Session" />
        </div>
      </div>
    </aside>
  );
}
