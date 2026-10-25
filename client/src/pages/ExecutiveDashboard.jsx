import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { AlertTriangle, TrendingUp, GitMerge, CheckCircle2, MapPin } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { isFlaggedSuspicious, isUnverified } from '../utils/verification';

const BIHAR_CENTER = [25.35, 85.5];
const BIHAR_ZOOM   = 7;

function compareByNewestTimestamp(a, b) {
  const aTimestamp = Date.parse(a.timestamp);
  const bTimestamp = Date.parse(b.timestamp);
  if (!Number.isFinite(aTimestamp)) return Number.isFinite(bTimestamp) ? 1 : 0;
  if (!Number.isFinite(bTimestamp)) return -1;
  return bTimestamp - aTimestamp;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function MapIncidentLayer({ grievances, highlightedReportId, onSelectGrievance }) {
  const map = useMap();
  const clusterLayer = useRef(null);
  const markerById = useRef(new Map());

  useEffect(() => {
    const clusters = L.markerClusterGroup({
      maxClusterRadius: 48,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: cluster => L.divIcon({
        html: `<span>${cluster.getChildCount()}</span>`,
        className: 'grievance-marker-cluster',
        iconSize: L.point(42, 42),
      }),
    });
    const markers = new Map();

    grievances.forEach(grievance => {
      const coordinates = grievance.coordinates;
      if (!Number.isFinite(coordinates?.lat) || !Number.isFinite(coordinates?.lng)) return;

      const isSuspicious = isFlaggedSuspicious(grievance.authenticity_flag);
      const unverified = isUnverified(grievance.authenticity_flag);
      const isResolved = grievance.status === 'Resolved' || grievance.status === 'Closed';
      const severity = Number(grievance.severity_score) || 0;
      const color = isResolved ? '#16a34a' : isSuspicious ? '#be123c' : unverified ? '#f59e0b'
        : severity >= 8 ? '#dc2626' : severity >= 6 ? '#f97316' : '#2563eb';
      const marker = L.marker([coordinates.lat, coordinates.lng], {
        icon: L.divIcon({
          html: `<span class="grievance-pin-dot" style="--pin-color:${color}"></span>`,
          className: 'grievance-map-pin',
          iconSize: L.point(20, 20),
          iconAnchor: [10, 10],
        }),
      });

      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = grievance.category || 'Public grievance';
      popup.append(title);

      const location = document.createElement('div');
      location.textContent = grievance.location_tagged || 'Location unverified';
      popup.append(location);

      const detail = document.createElement('div');
      detail.textContent = `Severity ${severity}/10 · ${grievance.status || 'Received'}`;
      popup.append(detail);

      const trust = document.createElement('div');
      trust.textContent = isSuspicious ? 'Flagged after review' : isUnverified(grievance.authenticity_flag) ? 'Unverified · Human review required' : grievance.authenticity_flag;
      popup.append(trust);

      marker.bindPopup(popup);
      marker.on('click', () => onSelectGrievance(grievance));
      markers.set(grievance.id, marker);
      clusters.addLayer(marker);
    });

    markerById.current = markers;
    clusterLayer.current = clusters;
    map.addLayer(clusters);

    return () => {
      map.removeLayer(clusters);
      markerById.current = new Map();
      clusterLayer.current = null;
    };
  }, [grievances, map, onSelectGrievance]);

  useEffect(() => {
    if (!highlightedReportId) return;
    const marker = markerById.current.get(highlightedReportId);
    if (!marker || !clusterLayer.current) return;

    const coordinates = marker.getLatLng();
    const targetZoom = Math.max(map.getZoom(), 10);
    const reveal = () => clusterLayer.current?.zoomToShowLayer(marker, () => {
      marker.getElement()?.classList.add('new-report-marker');
      marker.openPopup();
    });
    map.once('moveend', reveal);
    map.flyTo(coordinates, targetZoom, { duration: 0.8 });
  }, [highlightedReportId, map]);

  return null;
}

const SEVERITY_COLOR = s => s >= 8 ? '#dc2626' : s >= 6 ? '#f97316' : s >= 4 ? '#eab308' : '#059669';
const CATEGORY_COLORS = ['#3b82f6','#f59e0b','#ef4444','#10b981','#8b5cf6','#06b6d4','#f97316','#ec4899'];

function KpiCard({ icon: Icon, label, value, sub, color, bg, accent, highlightKey }) {
  const highlighted = Boolean(highlightKey);
  return (
    <div key={label} className={`kpi-card border-t-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${highlighted ? 'ring-2 ring-blue-500 animate-[pulse_1.5s_ease-in-out_1]' : ''}`} style={{ borderTopColor: accent }}>
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

function AlertRow({ g, onSelect, highlighted }) {
  const color = SEVERITY_COLOR(g.severity_score);
  const severityClass = g.severity_score >= 8
    ? 'bg-rose-100 text-rose-800 border-rose-200'
    : g.severity_score >= 6
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-emerald-100 text-emerald-800 border-emerald-200';
  const isSusp = isFlaggedSuspicious(g.authenticity_flag);
  const unverified = isUnverified(g.authenticity_flag);
  return (
    <div
      className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all border ${
        highlighted ? 'bg-blue-50/80 border-blue-600 border-l-4 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }`}
      onClick={() => onSelect(g)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: color }} />
          <div className="text-xs font-semibold text-slate-900 truncate">{g.category}</div>
        </div>
        <div className="mt-0.5 text-[11px] text-slate-600 truncate">{g.location_tagged} · {g.author_handle}</div>
        <div className="flex gap-1 mt-1 flex-wrap">
          {(g.hashtags || []).slice(0, 3).map(h => (
            <span key={h} className="text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-mono">{h}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${severityClass}`}>
          {g.severity_score}/10
        </span>
        {isSusp && <span className="text-[10px] text-purple-800 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full">⚠ Flagged</span>}
        {unverified && <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">Unverified</span>}
      </div>
    </div>
  );
}

export default function ExecutiveDashboard({ grievances, stats, clusters, onSelectGrievance, highlightedReportId }) {
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
    return () => clearTimeout(t);
  }, []);

  const highlightedReport = grievances.find(g => g.id === highlightedReportId);
  const topAlerts = [
    ...(highlightedReport ? [highlightedReport] : []),
    ...grievances.filter(g => g.id !== highlightedReportId).sort(compareByNewestTimestamp),
  ].slice(0, 5);
  const pieData = (stats?.by_category || []).map((c, i) => ({
    name: c.name.split('/')[0].trim().split(' ').slice(0, 3).join(' '),
    value: c.count,
    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));
  const categoryTotal = pieData.reduce((total, category) => total + category.value, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={TrendingUp}    label="Total Reports"      value={stats?.total ?? '—'}
          sub={`${stats?.reference_records ?? 0} reference records`} color="#18181b" bg="#f59e0b" accent="#f59e0b" highlightKey={highlightedReportId} />
        <KpiCard icon={GitMerge}      label="Active Clusters"    value={stats?.cluster_count ?? '—'}
          sub={`${stats?.duplicates_clustered ?? 0} posts merged`} color="#7c3aed" bg="#8b5cf6" accent="#f59e0b" />
        <KpiCard icon={AlertTriangle} label="Critical Incidents" value={stats?.critical ?? '—'}
          sub="Severity ≥ 8" color="#e11d48" bg="#ef4444" accent="#e11d48" />
        <KpiCard icon={CheckCircle2}  label="Verified Genuine"   value={stats?.genuine ?? 0}
          sub={`${stats?.unverified ?? 0} unverified · ${stats?.suspicious ?? 0} flagged`} color="#059669" bg="#10b981" accent="#10b981" />
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
          </div>
          <div className="relative isolate z-0 h-[420px] min-h-[350px] w-full rounded-xl overflow-hidden border border-slate-200">
            <MapContainer center={BIHAR_CENTER} zoom={BIHAR_ZOOM} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
              <MapResizer />
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>' />
              <MapIncidentLayer grievances={grievances} highlightedReportId={highlightedReportId} onSelectGrievance={onSelectGrievance} />
            </MapContainer>
            <div className="absolute right-3 top-3 z-20 space-y-1.5 rounded-lg border border-slate-200 bg-white/95 p-3 text-xs text-slate-700 shadow-md backdrop-blur">
              <div className="mb-1 font-semibold text-slate-800">Incident Severity</div>
              {[
                ['#dc2626', 'Critical (≥8)'],
                ['#f97316', 'High (6–7)'],
                ['#eab308', 'Medium (4–5)'],
                ['#be123c', 'Flagged after review'],
                ['#f59e0b', 'Unverified'],
                ['#16a34a', 'Resolved / closed'],
              ].map(([color, label]) => (
                <div key={label} className="flex items-center gap-2 whitespace-nowrap">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Critical alerts */}
        <div className="xl:col-span-1 card p-4 flex flex-col">
          <div className="section-title flex items-center gap-2 mb-1">
            <AlertTriangle size={13} className="text-rose-500" />Recent Reports
          </div>
          <div className="section-sub mb-3">Newest ingested reports first</div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-2">
            {topAlerts.map(g => <AlertRow key={g.id} g={g} onSelect={onSelectGrievance} highlighted={g.id === highlightedReportId} />)}
          </div>
        </div>

        {/* Pie chart */}
        <div className="xl:col-span-1 card p-4 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="section-title">Category Breakdown</div>
              <div className="section-sub mt-0.5">Reports by incident type</div>
            </div>
            <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
              {categoryTotal} total
            </span>
          </div>
          {pieData.length > 0 ? (
            <>
              <div className="relative mx-auto mt-2 h-40 w-40 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius="82%"
                      innerRadius="56%"
                      paddingAngle={2}
                      cornerRadius={3}
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={2}
                      onMouseEnter={(_, index) => setActiveCategory(pieData[index]?.name || null)}
                      onMouseLeave={() => setActiveCategory(null)}
                    >
                      {pieData.map(entry => (
                        <Cell
                          key={entry.name}
                          fill={entry.fill}
                          opacity={!activeCategory || activeCategory === entry.name ? 1 : 0.35}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${value} reports (${categoryTotal ? Math.round((value / categoryTotal) * 100) : 0}%)`,
                        name,
                      ]}
                      contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11, boxShadow: '0 4px 12px rgba(15,23,42,0.12)' }}
                      itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold font-mono text-slate-900">{categoryTotal}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Reports</span>
                </div>
              </div>
              <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto pr-0.5" aria-label="Incident category legend">
                {pieData.map(category => {
                  const percentage = categoryTotal ? Math.round((category.value / categoryTotal) * 100) : 0;
                  return (
                    <button
                      key={category.name}
                      type="button"
                      onMouseEnter={() => setActiveCategory(category.name)}
                      onMouseLeave={() => setActiveCategory(null)}
                      onFocus={() => setActiveCategory(category.name)}
                      onBlur={() => setActiveCategory(null)}
                      className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                        activeCategory === category.name ? 'border-slate-300 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                      }`}
                      aria-label={`${category.name}: ${category.value} reports, ${percentage}%`}
                    >
                      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-sm" style={{ background: category.fill }} />
                      <span className="min-w-0 flex-1 truncate text-slate-700">{category.name}</span>
                      <span className="text-[10px] text-slate-500">{percentage}%</span>
                      <span className="min-w-5 text-right font-mono font-bold text-slate-900">{category.value}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex min-h-40 flex-col items-center justify-center text-center">
              <div className="text-sm font-medium text-slate-600">No category data yet</div>
              <p className="mt-1 text-xs text-slate-500">Categories appear after reports are analyzed.</p>
            </div>
          )}
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
