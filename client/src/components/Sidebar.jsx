import { LayoutDashboard, Search, Layers, Sparkles, FileCheck } from 'lucide-react';
import JanSunoLogo from './JanSunoLogo';

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Executive Dashboard',  icon: LayoutDashboard },
  { id: 'osint',       label: 'OSINT Search',          icon: Search          },
  { id: 'clusters',    label: 'Duplicate Clusters',    icon: Layers          },
  { id: 'ai',          label: 'AI Verification',       icon: Sparkles        },
  { id: 'resolution',  label: 'Resolution Portal',     icon: FileCheck       },
];

export default function Sidebar({ active, onNavigate, analysisMode }) {
  return (
    <aside className="w-64 min-w-[256px] bg-zinc-950 text-zinc-300 min-h-screen flex flex-col justify-between border-r border-zinc-800 flex-shrink-0">

      {/* ── Brand Header ── */}
      <div>
        <div className="px-5 py-5 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <JanSunoLogo className="w-9 h-9 flex-shrink-0" />
            <div>
              <div className="text-base font-extrabold text-zinc-100 leading-tight tracking-tight">JanSuno <span className="text-amber-500">AI</span></div>
            </div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="px-3 py-4 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-3 mb-2">Intelligence Navigation</div>
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
      <div className="px-4 py-4 border-t border-zinc-800 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          {analysisMode || 'Checking analysis mode'}
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg">
          <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-zinc-950 text-xs font-bold flex-shrink-0">A</div>
          Admin Mode
        </div>
      </div>
    </aside>
  );
}
