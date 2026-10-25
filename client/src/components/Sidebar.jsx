import { LayoutDashboard, Search, Layers, Sparkles, FileCheck, Shield } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Executive Dashboard',  icon: LayoutDashboard },
  { id: 'osint',       label: 'OSINT Search',          icon: Search          },
  { id: 'clusters',    label: 'Duplicate Clusters',    icon: Layers          },
  { id: 'ai',          label: 'AI Verification',       icon: Sparkles        },
  { id: 'resolution',  label: 'Resolution Portal',     icon: FileCheck       },
];

export default function Sidebar({ active, onNavigate, analysisMode }) {
  return (
    <aside className="w-64 min-w-[256px] bg-slate-900 text-white min-h-screen flex flex-col justify-between border-r border-slate-800 flex-shrink-0">

      {/* ── Brand Header ── */}
      <div>
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 flex-shrink-0">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight tracking-wide">GrievancePulse AI</div>
              <div className="mt-0.5">
                <span className="text-xs font-semibold bg-blue-600/20 text-blue-400 border border-blue-600/30 px-2 py-0.5 rounded-full">
                  Bihar · PS-04
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="px-3 py-4 flex flex-col gap-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-3 mb-2">Navigation</div>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`nav-sidebar-item ${isActive ? 'nav-sidebar-active' : 'nav-sidebar-idle'}`}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {id === 'osint' && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Sidebar Footer ── */}
      <div className="px-4 py-4 border-t border-slate-800 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          {analysisMode || 'Checking analysis mode'}
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg">
          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">A</div>
          Admin Mode
        </div>
      </div>
    </aside>
  );
}
