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
} from 'lucide-react';
import JanSunoLogo from './JanSunoLogo';

const NAV_GROUPS = [
  {
    title: 'Main Monitoring',
    items: [
      {
        id: 'dashboard',
        label: 'State Dashboard',
        icon: LayoutDashboard,
        badgeKey: null,
        description: 'Statewide overview & metrics',
      },
      {
        id: 'osint',
        label: 'Live Citizen Feeds',
        icon: Radio,
        badgeKey: 'live',
        description: 'Reddit, YouTube & public feeds',
      },
    ],
  },
  {
    title: 'Review & Fact Check',
    items: [
      {
        id: 'clusters',
        label: 'Similar Complaints',
        icon: Layers,
        badgeKey: 'clusters',
        description: 'Duplicate stories merged',
      },
      {
        id: 'ai',
        label: 'AI Verification',
        icon: Sparkles,
        badgeKey: 'ai',
        description: 'Review fake vs genuine reports',
      },
    ],
  },
  {
    title: 'Action & Solution',
    items: [
      {
        id: 'resolution',
        label: 'Department Dispatch',
        icon: FileCheck,
        badgeKey: 'resolution',
        description: 'Assign tasks to ground teams',
      },
    ],
  },
];

export default function Sidebar({ active, onNavigate, analysisMode, stats }) {
  const realtimeCount = stats?.realtime_ingested ?? 0;
  const clusterCount  = stats?.cluster_count ?? 0;
  const unverifiedCount = stats?.unverified ?? 0;
  const criticalCount = stats?.critical ?? 0;

  // Format analysis engine into plain, easy to understand text
  const getPlainEngineText = (mode) => {
    if (!mode) return 'AI Engine: Active';
    if (mode === 'heuristic-fallback') return 'Local Fast Scanner (Active)';
    if (mode.includes('grok')) return 'xAI Grok Engine (Active)';
    if (mode.includes('groq')) return 'Groq LPU Engine (Active)';
    if (mode.includes('gemini')) return 'Gemini Flash AI (Active)';
    return `${mode} (Active)`;
  };

  const renderBadge = (key, isActive) => {
    if (!key) return null;

    if (key === 'live') {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${
            isActive
              ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/50 shadow-xs'
              : 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60'
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
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border transition-colors ${
            isActive
              ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/50'
              : 'bg-indigo-950/70 text-indigo-300 border-indigo-800/60'
          }`}
          title={`${clusterCount} active duplicate story groups detected`}
        >
          {clusterCount} groups
        </span>
      );
    }

    if (key === 'ai') {
      if (unverifiedCount === 0) return null;
      return (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border transition-all ${
            isActive
              ? 'bg-amber-400/25 text-amber-200 border-amber-400/50 shadow-sm'
              : 'bg-amber-950/70 text-amber-300 border-amber-800/70 animate-glow-amber'
          }`}
          title={`${unverifiedCount} reports waiting for human officer verification`}
        >
          {unverifiedCount} pending
        </span>
      );
    }

    if (key === 'resolution') {
      if (criticalCount === 0) return null;
      return (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border transition-all ${
            isActive
              ? 'bg-rose-500/30 text-rose-200 border-rose-400/50'
              : 'bg-rose-950/80 text-rose-300 border-rose-800/70 animate-glow-rose'
          }`}
          title={`${criticalCount} high-severity civic emergencies requiring immediate dispatch`}
        >
          {criticalCount} urgent
        </span>
      );
    }

    return null;
  };

  return (
    <aside className="w-72 min-w-[288px] bg-[#0c1017] text-slate-300 min-h-screen flex flex-col justify-between border-r border-slate-800/80 flex-shrink-0 select-none shadow-2xl z-20">

      {/* ── Brand Header ── */}
      <div>
        <div className="px-6 py-5 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/70 to-transparent">
          <div className="flex items-center gap-3.5">
            <div className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 shadow-inner flex-shrink-0">
              <JanSunoLogo className="w-8 h-8 flex-shrink-0 transition-transform duration-300 hover:scale-105" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center">
                <span className="animate-radar-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black text-white tracking-tight leading-none">JanSuno</span>
                <span className="text-lg font-black text-amber-400 leading-none">AI</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 font-medium tracking-wide truncate">
                Govt. of Bihar · Cyber Cell
              </p>
            </div>
          </div>
        </div>

        {/* ── Grouped Navigation with Comfortable Font Size ── */}
        <nav className="px-3.5 py-4 space-y-5 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
                <span>{group.title}</span>
              </div>
              {group.items.map(({ id, label, icon: Icon, badgeKey, description }) => {
                const isActive = active === id;
                return (
                  <button
                    key={id}
                    onClick={() => onNavigate(id)}
                    className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer w-full text-left ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600/25 via-indigo-600/15 to-transparent text-white border-l-3 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.18)]'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/70 active:scale-[0.99]'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                      isActive
                        ? 'bg-amber-400/20 text-amber-300'
                        : 'text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800/60'
                    }`}>
                      <Icon size={18} className="flex-shrink-0" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold tracking-tight text-white group-hover:translate-x-0.5 transition-transform duration-150">
                        {label}
                      </div>
                      <div className="text-xs text-slate-400 truncate leading-tight mt-0.5">
                        {description}
                      </div>
                    </div>
                    {renderBadge(badgeKey, isActive)}
                    {isActive && <ChevronRight size={14} className="text-amber-400/80 flex-shrink-0 animate-pulse ml-1" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* ── Sidebar Footer: Legible Engine Status & Officer Session ── */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/80 flex flex-col gap-2.5">
        {/* Active AI Triage Engine status */}
        <div className="flex items-center justify-between text-xs font-medium text-slate-200 bg-slate-900/90 border border-slate-800 px-3 py-2 rounded-xl">
          <div className="flex items-center gap-2 truncate">
            <Cpu size={14} className="text-emerald-400 flex-shrink-0" />
            <span className="truncate text-slate-300 font-medium">
              {getPlainEngineText(analysisMode)}
            </span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" title="Online" />
        </div>

        {/* Officer Profile Card */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-200">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 text-sm font-black shadow-md flex-shrink-0">
            P
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white leading-tight truncate">
              DSP Cyber Cell Patna
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-0.5">
              <ShieldCheck size={12} className="text-emerald-400 flex-shrink-0" />
              <span className="truncate">Authorized Officer</span>
            </div>
          </div>
          <Lock size={14} className="text-slate-400 flex-shrink-0" title="Secured Session" />
        </div>
      </div>
    </aside>
  );
}
