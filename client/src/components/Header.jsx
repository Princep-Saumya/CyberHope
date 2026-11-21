import { useEffect, useRef, useState } from 'react';
import {
  Search,
  AlertTriangle,
  RefreshCw,
  X,
  LogOut,
  ChevronDown,
  Building2,
  Check,
  UserRound,
} from 'lucide-react';

const DEPARTMENTS = [
  { value: '', name: 'All Departments', region: 'Bihar' },
  { value: 'Road Construction Department (RCD)', name: 'Road Construction', region: 'Bihar' },
  { value: 'Bihar State Power Holding Company Ltd (BSPHCL)', name: 'Power & Electricity', region: 'Bihar' },
  { value: 'Public Health Department (PHD)', name: 'Public Health', region: 'Bihar' },
  { value: 'Cyber Cell / Bihar Police', name: 'DSP Cyber Cell', region: 'Patna HQ' },
  { value: 'Water Resources Department (WRD)', name: 'Water Resources', region: 'Bihar' },
  { value: 'General Administration', name: 'General Administration', region: 'Bihar' },
  { value: 'Special Task Force', name: 'Special Task Force (STF)', region: 'Statewide' },
  { value: 'Law & Order', name: 'Law & Order Division', region: 'Bihar' },
  { value: 'Economic Offence', name: 'Economic Offence Unit', region: 'Bihar' },
];

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
  socketStatus,
  onPollRealtime,
  pollingRealtime,
  pollDisabled,
  userEmail,
  demoMode,
  demoProfile,
  onSignOut,
  selectedDepartment,
  onDepartmentChange,
}) {
  const searchInputRef = useRef(null);
  const profileMenuRef = useRef(null);
  const criticalCount = stats?.critical ?? 0;
  const [signOutError, setSignOutError] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const pageTitle = PAGE_TITLES[activePage] || 'Dashboard';
  const currentDepartment = DEPARTMENTS.find(department => department.value === selectedDepartment) || DEPARTMENTS[0];

  async function handleSignOut() {
    setSignOutError('');
    setIsSigningOut(true);
    try {
      const error = await onSignOut();
      if (error) setSignOutError(error);
    } catch (error) {
      console.error('Unable to sign out', error);
      setSignOutError('Unable to sign out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  }

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setProfileMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

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
    <header className="sticky top-0 z-40 flex-shrink-0 border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-extrabold tracking-tight text-slate-900 sm:text-base">{pageTitle}</h1>
            <span
              className={`mt-0.5 inline-flex items-center gap-1.5 text-[10px] font-semibold ${
                socketStatus === 'connected' ? 'text-emerald-700' : 'text-amber-700'
              }`}
              title={socketStatus === 'connected'
                ? 'Real-time WebSocket feed listener is connected'
                : socketStatus === 'reconnecting'
                  ? 'Real-time feed is reconnecting; initial reports load independently.'
                  : 'Connecting to live telemetry socket...'}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${socketStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {socketStatus === 'connected'
                ? 'Live feed connected'
                : socketStatus === 'reconnecting'
                  ? 'Live feed reconnecting'
                  : 'Connecting to live feed'}
            </span>
          </div>
        </div>

        <div className="hidden min-w-0 max-w-xl flex-1 lg:block">
          <div className="group relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search complaints, districts, hashtags..."
              value={globalSearch}
              onChange={event => onGlobalSearch(event.target.value)}
              className="w-full rounded-xl border border-slate-200/90 bg-slate-100/80 py-2 pl-9 pr-10 text-xs font-medium text-slate-900 shadow-inner transition-all placeholder:text-slate-400 hover:bg-slate-100/95 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
            {globalSearch ? (
              <button
                type="button"
                onClick={() => onGlobalSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-400">
                Ctrl K
              </kbd>
            )}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onPollRealtime}
            disabled={pollDisabled}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:px-3"
            title="Query live Bihar public feeds (Reddit, YouTube & Google News) now"
          >
            <RefreshCw size={13} className={pollingRealtime ? 'animate-spin text-blue-600' : 'text-slate-500'} />
            <span className="hidden xl:inline">{pollingRealtime ? 'Scanning…' : 'Scan live feeds'}</span>
          </button>

          {criticalCount > 0 && (
            <span
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2 py-2 text-xs font-bold text-rose-800 sm:px-2.5"
              title={`${criticalCount} high-severity civic emergencies require immediate attention`}
            >
              <AlertTriangle size={13} className="text-rose-600" />
              <span className="font-mono">{criticalCount}</span>
              <span className="hidden xl:inline">Urgent</span>
            </span>
          )}

          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen(open => !open)}
              aria-haspopup="dialog"
              aria-expanded={profileMenuOpen}
              aria-label="Open profile, department, and sign-out menu"
              className="inline-flex max-w-52 items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 sm:gap-2.5 sm:px-2.5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-amber-400">
                <UserRound size={16} />
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block max-w-32 truncate text-xs font-semibold text-slate-800">
                  {demoMode ? demoProfile?.name || 'Demo profile' : userEmail || 'My account'}
                </span>
                <span className="block max-w-32 truncate text-[10px] text-slate-500">
                  {currentDepartment.name}
                </span>
              </span>
              {demoMode && <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-800 md:inline">Demo</span>}
              <ChevronDown size={14} className={`shrink-0 text-slate-500 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileMenuOpen && (
              <section
                role="dialog"
                aria-label="Profile and department menu"
                className="absolute right-0 z-50 mt-2 max-h-[min(75vh,38rem)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl"
              >
                <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {demoMode ? demoProfile?.name || 'Demo profile' : userEmail || 'Signed-in user'}
                  </p>
                  {demoMode && <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">{demoProfile?.role || 'Sample role'} · Demo only</p>}
                  {!demoMode && <p className="mt-0.5 break-all text-xs text-slate-500">{userEmail}</p>}
                </div>

                <div className="border-b border-slate-100 py-2">
                  <div className="flex items-center gap-2 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <Building2 size={13} />
                    Department filter
                  </div>
                  {DEPARTMENTS.map(department => {
                    const isSelected = department.value === selectedDepartment;
                    return (
                      <button
                        key={department.value || 'all'}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          onDepartmentChange(department.value);
                          setProfileMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition hover:bg-slate-50 ${
                          isSelected ? 'bg-blue-50/70 text-blue-800' : 'text-slate-700'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold">{department.name}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-slate-500">{department.region}</span>
                        </span>
                        {isSelected && <Check size={14} className="shrink-0 text-blue-700" />}
                      </button>
                    );
                  })}
                </div>

                {signOutError && (
                  <p role="alert" className="mx-3 mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    {signOutError}
                  </p>
                )}
                <div className="p-2">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-wait disabled:opacity-60"
                  >
                    <LogOut size={15} />
                    {isSigningOut ? 'Signing out…' : 'Sign out of JanSuno AI'}
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
