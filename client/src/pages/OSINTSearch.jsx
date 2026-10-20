import { useState, useMemo } from 'react';
import { Search, MapPin, Building2, Shield, RotateCcw, Hash, LayoutGrid, List, AlertTriangle, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from '../utils/dateUtils';

const DEPARTMENTS = [
  '', 'Road Construction Department (RCD)',
  'Bihar State Power Holding Company Ltd (BSPHCL)',
  'Public Health Department (PHD)', 'Cyber Cell / Bihar Police',
  'Water Resources Department (WRD)', 'General Administration',
];
const LOCATIONS   = ['', 'Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Nalanda'];
const PLATFORMS   = { 'X (Twitter)': '𝕏', Facebook: 'f', Instagram: '◉', 'WhatsApp (Screenshot)': '💬' };

const SEVERITY_CFG = s =>
  s >= 9 ? { cls: 'severity-critical', dot: '#e11d48', label: `CRITICAL ${s}` } :
  s >= 7 ? { cls: 'severity-high',     dot: '#d97706', label: `HIGH ${s}` }     :
  s >= 5 ? { cls: 'severity-medium',   dot: '#2563eb', label: `MED ${s}` }      :
           { cls: 'severity-low',      dot: '#059669', label: `LOW ${s}` };

const STATUS_CLS = {
  Received:              'text-slate-600 bg-slate-100 border-slate-200',
  Assigned:              'text-blue-700 bg-blue-50 border-blue-200',
  'Under Investigation': 'text-amber-700 bg-amber-50 border-amber-200',
  Resolved:              'text-emerald-700 bg-emerald-50 border-emerald-200',
  Closed:                'text-slate-500 bg-slate-50 border-slate-200',
};

function GrievanceRow({ g, onSelect, clusterCount }) {
  const sv = SEVERITY_CFG(g.severity_score);
  const isSusp = g.authenticity_flag !== 'Likely Genuine Grievance';
  const statusCls = STATUS_CLS[g.status] || STATUS_CLS.Received;
  return (
    <tr className="table-row-hover border-b border-slate-100 last:border-0" onClick={() => onSelect(g)}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{PLATFORMS[g.platform] || '◎'}</span>
          <div>
            <div className="text-sm font-semibold text-slate-800">{g.author_handle}</div>
            <div className="text-xs text-slate-400 font-mono">{g.platform.split(' ')[0]}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 max-w-xs">
        <p className="text-sm text-slate-700 line-clamp-2">{g.post_text}</p>
        <div className="flex gap-1 mt-1 flex-wrap">
          {(g.hashtags || []).slice(0, 3).map(h => (
            <span key={h} className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-1.5 rounded font-mono">{h}</span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-slate-800">{g.location_tagged}</div>
        <div className="text-xs text-slate-500">{g.department?.split('(')[0]?.trim()}</div>
      </td>
      <td className="px-4 py-3">
        <span className={`badge border ${sv.cls}`}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sv.dot }} />
          {sv.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className={`badge border ${isSusp ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
            {isSusp ? <AlertTriangle size={9}/> : <CheckCircle2 size={9}/>}
            {isSusp ? `Risk ${g.authenticity_risk_score}%` : `Auth ${100 - g.authenticity_risk_score}%`}
          </span>
          {clusterCount > 1 && (
            <span className="badge bg-indigo-100 text-indigo-800 border border-indigo-200">
              <Copy size={9}/>{clusterCount} merged
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`badge text-xs border ${statusCls}`}>{g.status}</span>
      </td>
      <td className="px-4 py-3">
        <button className="btn-ghost text-xs py-1 px-2 text-blue-600">
          <ExternalLink size={11}/> View
        </button>
      </td>
    </tr>
  );
}

function GrievanceCard({ g, onSelect, clusterCount }) {
  const sv = SEVERITY_CFG(g.severity_score);
  const isSusp = g.authenticity_flag !== 'Likely Genuine Grievance';
  return (
    <div className="card-hover p-4" onClick={() => onSelect(g)}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{PLATFORMS[g.platform] || '◎'}</span>
          <span className="text-sm font-semibold text-slate-800">{g.author_handle}</span>
          <span className="text-xs text-slate-400">{formatDistanceToNow(g.timestamp)}</span>
        </div>
        <span className={`badge border flex-shrink-0 ${sv.cls}`}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sv.dot }} />
          {sv.label}
        </span>
      </div>
      <p className="text-sm text-slate-700 line-clamp-2 mb-2">{g.post_text}</p>
      <div className="flex gap-1 flex-wrap mb-2">
        {(g.hashtags||[]).slice(0,4).map(h => (
          <span key={h} className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-mono">{h}</span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
        <span className="flex items-center gap-1"><MapPin size={10} className="text-emerald-600"/>{g.location_tagged}</span>
        <div className="flex gap-1.5">
          {isSusp && <span className="badge bg-purple-100 text-purple-800 border border-purple-200">⚠ Suspicious</span>}
          {clusterCount > 1 && <span className="badge bg-indigo-100 text-indigo-800 border border-indigo-200"><Copy size={9}/>{clusterCount}</span>}
        </div>
      </div>
    </div>
  );
}

export default function OSINTSearch({ filters, onFilterChange, onReset, grievances, loading, onSelectGrievance }) {
  const [viewMode, setViewMode] = useState('table');

  const clusterCounts = useMemo(() => {
    const m = {};
    for (const g of grievances) {
      if (g.duplicate_cluster_id) m[g.duplicate_cluster_id] = (m[g.duplicate_cluster_id] || 0) + 1;
    }
    return m;
  }, [grievances]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Search size={14} className="text-blue-500" />
          <span className="text-sm font-bold text-slate-800">Multi-Parameter OSINT Filter</span>
          {loading && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />Scanning...
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="relative">
            <Hash size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="#BPSC, #RCD_Bihar, #PatnaFloods"
              value={filters.hashtag} onChange={e => onFilterChange('hashtag', e.target.value)}
              className="input-field pl-8" />
          </div>
          <div className="relative">
            <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select value={filters.location} onChange={e => onFilterChange('location', e.target.value)}
              className="select-field w-full pl-8">
              {LOCATIONS.map(l => <option key={l} value={l}>{l || 'All Districts'}</option>)}
            </select>
          </div>
          <div className="relative">
            <Building2 size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select value={filters.department} onChange={e => onFilterChange('department', e.target.value)}
              className="select-field w-full pl-8">
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d || 'All Departments'}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Shield size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select value={filters.authenticity} onChange={e => onFilterChange('authenticity', e.target.value)}
                className="select-field w-full pl-8">
                <option value="">All Posts</option>
                <option value="genuine">✅ Genuine Only</option>
                <option value="suspicious">⚠️ Suspicious Only</option>
              </select>
            </div>
            <button onClick={onReset} className="btn-secondary px-3 flex-shrink-0"><RotateCcw size={13}/></button>
          </div>
        </div>

        {/* Quick chips */}
        <div className="flex gap-2 mt-3 flex-wrap items-center">
          <span className="text-xs text-slate-500 font-medium">Quick:</span>
          {['#BPSC','#PatnaFloods','#RCD_Bihar','#PowerOutage','#WaterCrisis'].map(tag => (
            <button key={tag}
              onClick={() => onFilterChange('hashtag', filters.hashtag === tag ? '' : tag)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all font-mono ${
                filters.hashtag === tag
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 bg-white'
              }`}>{tag}</button>
          ))}
          <button onClick={() => onFilterChange('severity', filters.severity === '8' ? '' : '8')}
            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
              filters.severity === '8' ? 'bg-rose-600 border-rose-600 text-white' : 'border-slate-300 text-slate-600 hover:border-rose-400 hover:text-rose-600 bg-white'
            }`}>🔴 Critical Only</button>
        </div>
      </div>

      {/* Result header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          Showing <span className="text-slate-900 font-bold">{grievances.length}</span> grievances
          {Object.keys(clusterCounts).length > 0 && (
            <span className="ml-2 text-indigo-600 text-xs">· {Object.keys(clusterCounts).length} active clusters</span>
          )}
        </div>
        <div className="flex gap-1">
          {[['table', List], ['grid', LayoutGrid]].map(([mode, Icon]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`p-1.5 rounded-lg border transition-all ${viewMode === mode ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-400 hover:text-slate-700 bg-white'}`}>
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {/* Data */}
      {loading ? (
        <div className="card p-6 flex flex-col gap-3">
          {Array.from({length: 5}).map((_,i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : grievances.length === 0 ? (
        <div className="card p-12 flex flex-col items-center text-center">
          <Search size={36} className="text-slate-300 mb-3" />
          <div className="text-slate-500 font-medium">No matching grievances</div>
          <div className="text-slate-400 text-sm mt-1">Seed fallback will pad results automatically</div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Source','Post Content','Location / Dept','Severity','Authenticity','Status','Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grievances.map(g => (
                  <GrievanceRow key={g.id} g={g} onSelect={onSelectGrievance}
                    clusterCount={clusterCounts[g.duplicate_cluster_id] || 0} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {grievances.map(g => (
            <GrievanceCard key={g.id} g={g} onSelect={onSelectGrievance}
              clusterCount={clusterCounts[g.duplicate_cluster_id] || 0} />
          ))}
        </div>
      )}
    </div>
  );
}
