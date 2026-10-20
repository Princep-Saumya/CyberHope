import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { AlertTriangle, TrendingUp, GitMerge, CheckCircle2, MapPin } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const BIHAR_CENTER = [25.35, 85.5];
const BIHAR_ZOOM   = 7;

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

const SEVERITY_COLOR = s => s >= 9 ? '#e11d48' : s >= 7 ? '#d97706' : s >= 5 ? '#2563eb' : '#059669';
const CATEGORY_COLORS = ['#3b82f6','#f59e0b','#ef4444','#10b981','#8b5cf6','#06b6d4','#f97316','#ec4899'];

function KpiCard({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <div className="kpi-card transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg + '18' }}>
          <Icon size={16} style={{ color: bg }} />
        </div>
      </div>
      <div className="text-3xl font-bold font-mono text-slate-900" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function AlertRow({ g, onSelect }) {
  const color = SEVERITY_COLOR(g.severity_score);
  const isSusp = g.authenticity_flag !== 'Likely Genuine Grievance';
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100 last:border-0"
      onClick={() => onSelect(g)}
    >
      <span className="relative flex-shrink-0 mt-1.5">
        <span className="block w-2 h-2 rounded-full" style={{ background: color }} />
        {g.severity_score >= 9 && <span className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ background: color }} />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-800 truncate">{g.category}</div>
        <div className="text-xs text-slate-500 truncate">{g.location_tagged} · {g.author_handle}</div>
        <div className="flex gap-1.5 mt-1 flex-wrap">
          {(g.hashtags || []).slice(0, 3).map(h => (
            <span key={h} className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-mono">{h}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: color }}>
          {g.severity_score}/10
        </span>
        {isSusp && <span className="text-xs text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded-full">⚠ Fake</span>}
      </div>
    </div>
  );
}

export default function ExecutiveDashboard({ grievances, stats, clusters, onSelectGrievance }) {
  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
    return () => clearTimeout(t);
  }, []);

  const topAlerts = [...grievances].sort((a, b) => b.severity_score - a.severity_score).slice(0, 5);
  const genuinePct = stats ? Math.round((stats.genuine / stats.total) * 100) : 0;

  const pieData = (stats?.by_category || []).map((c, i) => ({
    name: c.name.split('/')[0].trim().split(' ').slice(0, 3).join(' '),
    value: c.count,
    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  const clusterMap = {};
  for (const g of grievances) {
    const key = g.duplicate_cluster_id || g.id;
    if (!clusterMap[key]) clusterMap[key] = [];
    clusterMap[key].push(g);
  }
  const mapGroups = Object.values(clusterMap);

  return (
    <div className="flex flex-col gap-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={TrendingUp}    label="OSINT Monitored"    value={stats?.total ?? '—'}
          sub="Total posts analysed" color="#2563eb" bg="#3b82f6" />
        <KpiCard icon={GitMerge}      label="Active Clusters"    value={stats?.cluster_count ?? '—'}
          sub={`${stats?.duplicates_clustered ?? 0} posts merged`} color="#7c3aed" bg="#8b5cf6" />
        <KpiCard icon={AlertTriangle} label="Critical Incidents" value={stats?.critical ?? '—'}
          sub="Severity ≥ 8" color="#e11d48" bg="#ef4444" />
        <KpiCard icon={CheckCircle2}  label="Genuine Ratio"      value={`${genuinePct}%`}
          sub={`${stats?.suspicious ?? 0} suspicious flagged`} color="#059669" bg="#10b981" />
      </div>

      {/* Map + alerts + pie */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Map */}
        <div className="xl:col-span-3 card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="section-title flex items-center gap-2">
                <MapPin size={14} className="text-emerald-600" />Bihar Grievance Hotspot Map
              </div>
              <div className="section-sub mt-0.5">Click any marker to open complaint detail</div>
            </div>
            <div className="flex gap-3 flex-wrap">
              {[['#e11d48','Critical'],['#d97706','High'],['#2563eb','Medium'],['#7c3aed','Suspicious']].map(([c,l])=>(
                <span key={l} className="flex items-center gap-1 text-xs text-slate-500">
                  <span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}
                </span>
              ))}
            </div>
          </div>
          <div className="h-[420px] min-h-[350px] w-full rounded-xl overflow-hidden border border-slate-200">
            <MapContainer center={BIHAR_CENTER} zoom={BIHAR_ZOOM} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
              <MapResizer />
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>' />
              {mapGroups.map((group, idx) => {
                const rep   = group[0];
                const susp  = group.some(g => g.authenticity_flag !== 'Likely Genuine Grievance');
                const maxS  = Math.max(...group.map(g => g.severity_score));
                const color = susp ? '#7c3aed' : SEVERITY_COLOR(maxS);
                return (
                  <CircleMarker key={idx} center={[rep.coordinates.lat, rep.coordinates.lng]}
                    radius={Math.max(8, 5 + group.length * 3)}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.72, weight: 2 }}
                    eventHandlers={{ click: () => onSelectGrievance(rep) }}
                  >
                    <Popup>
                      <div style={{ minWidth: 175, fontFamily: 'Inter,system-ui' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#1e293b' }}>
                          📍 {group.length > 1 ? `${group.length} Reports Merged` : 'Single Report'}
                        </div>
                        <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, marginBottom: 3 }}>{rep.location_tagged}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{rep.post_text?.slice(0, 75)}...</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span style={{ background: color, color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{maxS}/10</span>
                          {susp && <span style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>⚠ Suspicious</span>}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Critical alerts */}
        <div className="xl:col-span-1 card p-4 flex flex-col">
          <div className="section-title flex items-center gap-2 mb-1">
            <AlertTriangle size={13} className="text-rose-500" />🚨 Critical Alerts
          </div>
          <div className="section-sub mb-3">Top 5 urgent incidents</div>
          <div className="flex-1 overflow-y-auto">
            {topAlerts.map(g => <AlertRow key={g.id} g={g} onSelect={onSelectGrievance} />)}
          </div>
        </div>

        {/* Pie chart */}
        <div className="xl:col-span-1 card p-4 flex flex-col">
          <div className="section-title mb-1">Category Breakdown</div>
          <div className="section-sub mb-2">By incident type</div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={72} innerRadius={36} dataKey="value" strokeWidth={0}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 }}
                  itemStyle={{ color: '#1e293b' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1.5 mt-2">
            {pieData.slice(0, 5).map(d => (
              <div key={d.name} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                <span className="flex-1 truncate">{d.name}</span>
                <span className="font-mono font-bold text-slate-800">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status pipeline strip */}
      {stats?.by_status && (
        <div className="card p-4">
          <div className="section-title mb-3">Resolution Pipeline</div>
          <div className="flex gap-3 flex-wrap">
            {stats.by_status.map(({ name, count }) => {
              const cfg = {
                Received:              { bg: '#f8fafc', text: '#64748b', dot: '#94a3b8', border: '#e2e8f0' },
                Assigned:              { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', border: '#bfdbfe' },
                'Under Investigation': { bg: '#fffbeb', text: '#b45309', dot: '#f59e0b', border: '#fde68a' },
                Resolved:              { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', border: '#bbf7d0' },
                Closed:                { bg: '#f8fafc', text: '#94a3b8', dot: '#cbd5e1', border: '#e2e8f0' },
              }[name] || { bg: '#f8fafc', text: '#64748b', dot: '#94a3b8', border: '#e2e8f0' };
              return (
                <div key={name} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border"
                  style={{ background: cfg.bg, borderColor: cfg.border }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                  <span className="text-sm font-medium" style={{ color: cfg.text }}>{name}</span>
                  <span className="text-xl font-bold font-mono" style={{ color: cfg.text }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
