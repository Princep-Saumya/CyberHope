import { useEffect, useState, Fragment } from 'react';
import {
  GitMerge,
  X,
  MapPin,
  Users,
  Copy,
  Layers,
  FileText,
  ArrowRight,
  Building2,
  ExternalLink,
  Clock3,
} from 'lucide-react';
import { formatDistanceToNow } from '../utils/dateUtils';

const BIHAR_DISTRICTS = [
  'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur',
  'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui',
  'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai',
  'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada',
  'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura',
  'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran',
];

function UnlocatedRecord({ record, onSelect, onAssign }) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [district, setDistrict] = useState('');
  const [landmark, setLandmark] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submitLocation = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onAssign(record.id, district, landmark);
    } catch (assignmentError) {
      setError(assignmentError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="rounded-lg border border-amber-200 bg-white/80 p-2.5">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onSelect(record)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block text-xs font-semibold text-slate-800">
            {record.category || 'Needs classification'} · {record.location_tagged || 'Location unverified'}
          </span>
          <span className="mt-0.5 line-clamp-2 block text-xs text-slate-600">{record.post_text}</span>
        </button>
        <button
          type="button"
          onClick={() => setIsAssigning(open => !open)}
          className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-900"
          aria-expanded={isAssigning}
        >
          {isAssigning ? 'Cancel' : 'Assign Location'}
        </button>
      </div>
      {isAssigning && (
        <form onSubmit={submitLocation} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <label className="sr-only" htmlFor={`district-${record.id}`}>District</label>
          <select
            id={`district-${record.id}`}
            value={district}
            onChange={event => setDistrict(event.target.value)}
            required
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
          >
            <option value="">Select district</option>
            {BIHAR_DISTRICTS.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <label className="sr-only" htmlFor={`landmark-${record.id}`}>Landmark, ward, or locality (optional)</label>
          <input
            id={`landmark-${record.id}`}
            value={landmark}
            onChange={event => setLandmark(event.target.value)}
            maxLength={120}
            placeholder="Landmark, ward, or locality (optional)"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
          />
          <button
            type="submit"
            disabled={!district || saving}
            className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save location'}
          </button>
          {error && <p role="alert" className="text-xs text-rose-700 sm:col-span-3">{error}</p>}
        </form>
      )}
    </article>
  );
}

const getSeverityBadge = (s) => {
  if (s >= 8) {
    return {
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
      color: '#e11d48',
      label: 'High Severity',
    };
  }
  if (s >= 6) {
    return {
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-500',
      color: '#d97706',
      label: 'Medium Severity',
    };
  }
  return {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    color: '#059669',
    label: 'Low Severity',
  };
};

function ClusterCard({ cluster, onOpen }) {
  const maxSev = cluster.priority_score ?? cluster.max_severity;
  const sev = getSeverityBadge(maxSev);

  const cleanDept = cluster.department?.split('(')[0]?.trim();
  const hashtagList =
    typeof cluster.hashtags === 'string'
      ? cluster.hashtags.split(' ')
      : cluster.hashtags || [];

  return (
    <button
      type="button"
      className="card group w-full overflow-hidden p-4 text-left transition-all duration-200 hover:shadow-md hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      onClick={() => onOpen(cluster)}
      aria-label={`View ${cluster.member_count} posts merged into ${cluster.category}`}
    >
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
      >
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {/* Cluster Icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border mt-0.5 transition-colors"
            style={{ backgroundColor: `${sev.color}15`, borderColor: `${sev.color}35` }}
          >
            <GitMerge size={18} style={{ color: sev.color }} />
          </div>

          <div className="min-w-0 flex-1">
            {/* Title & Cluster ID badge */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-base font-bold text-slate-900 tracking-tight">
                {cluster.category}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                {cluster.cluster_id}
              </span>
            </div>

            {/* Single well-aligned metadata row */}
            <div className="flex items-center flex-wrap gap-x-3.5 gap-y-1 text-xs text-slate-500 mb-2">
              <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                <MapPin size={12} className="text-emerald-600 shrink-0" />
                {cluster.location || 'Local area verified'}
              </span>
              <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                <Users size={12} className="text-blue-600 shrink-0" />
                {cluster.member_count} distinct reports
              </span>
              {cluster.unique_reporter_count > 0 && (
                <span className="text-slate-500">{cluster.unique_reporter_count} identified reporters</span>
              )}
              {cluster.spam_flood_count > 0 && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                  {cluster.spam_flood_count} repetitive posts collapsed
                </span>
              )}
              {cluster.is_chronic_hotspot && (
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-semibold text-rose-800">
                  Chronic hotspot
                </span>
              )}
              {cleanDept && (
                <span className="inline-flex items-center gap-1 text-slate-500 truncate max-w-xs">
                  <Building2 size={12} className="text-slate-400 shrink-0" />
                  {cleanDept}
                </span>
              )}
            </div>

            {/* Compact modern hashtag chips */}
            {hashtagList.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {hashtagList.slice(0, 5).map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center text-[11px] font-medium text-blue-600 bg-blue-50/80 border border-blue-200/60 px-2 py-0.5 rounded-md font-mono"
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Severity Score badge and report count */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 w-full sm:w-auto flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold ${sev.badge} shadow-2xs`}
          >
            <span className={`w-2 h-2 rounded-full ${sev.dot}`} />
            <span>PRIORITY {maxSev}/10</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Copy size={12} className="text-blue-500" />
            <span>{cluster.member_count} distinct citizen reports</span>
            <ExternalLink size={13} className="ml-1 text-slate-400 group-hover:text-blue-600" />
          </div>
        </div>
      </div>
    </button>
  );
}

function ClusterMembersModal({ cluster, onClose, onSelectGrievance }) {
  const members = cluster.members || [];

  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cluster-members-title"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Merged reports</p>
            <h2 id="cluster-members-title" className="mt-1 text-lg font-bold text-slate-900">
              {cluster.category || 'Related reports'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {cluster.cluster_id} · {members.length} posts in this group
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
            aria-label="Close merged reports"
          >
            <X size={18} />
          </button>
        </header>

        <div className="overflow-y-auto p-4 sm:p-5">
          {members.length ? (
            <div className="flex flex-col gap-3">
              {members.map((member, index) => (
                <article key={member.id} className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      {index === 0 && (
                        <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          LEAD POST
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-800">
                        {member.author_handle || 'Unknown author'}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                        {member.platform || 'Unknown source'}
                      </span>
                      {member.spam_duplicate_of && (
                        <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          Repetitive post collapsed
                        </span>
                      )}
                      {member.timestamp && (
                        <span className="text-[11px] text-slate-500">
                          {formatDistanceToNow(member.timestamp)}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">{member.id}</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                    {member.post_text || 'No post text available.'}
                  </p>
                  {member.hashtags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {member.hashtags.map(tag => (
                        <span key={tag} className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[11px] text-blue-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                    <span className="text-[11px] text-slate-500">
                      Severity {member.severity_score ?? '—'}/10 · {member.analysis_mode || 'Analysis mode unavailable'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectGrievance(member);
                      }}
                      className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      Open report <ExternalLink size={12} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              This group has no report details available. Refresh the page and try again.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}


const WORKFLOW_STEPS = [
  {
    title: 'Civic Filter',
    desc: 'Exclude severity ≤2 with no civic terms',
    icon: FileText,
  },
  {
    title: 'Location Score',
    desc: '+50 same place · +35 same district',
    icon: MapPin,
  },
  {
    title: 'Bilingual Issue',
    desc: '+30 shared Hindi / English issue concept',
    icon: FileText,
  },
  {
    title: 'Creator & Time',
    desc: '+20 same creator · within 72h · score ≥70',
    icon: Clock3,
  },
  {
    title: 'Master Ticket',
    desc: 'Category may vary; prefer a specific department',
    icon: GitMerge,
  },
];

export default function ClusteringEngine({
  clusters,
  unlocatedRecords = [],
  totalRecords = 0,
  excludedNonCivicCount = 0,
  onSelectGrievance,
  onAssignLocation,
}) {
  const [selectedCluster, setSelectedCluster] = useState(null);
  const totalMerged = clusters.reduce((sum, cluster) => sum + (cluster.raw_report_count || cluster.member_count), 0);
  const standaloneCount = Math.max(0, totalRecords - excludedNonCivicCount - totalMerged);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Master Tickets',   value: clusters.length,                color: '#7c3aed', bg: '#8b5cf6' },
          { label: 'Posts Merged',     value: totalMerged,                    color: '#2563eb', bg: '#3b82f6' },
          { label: 'Standalone Posts', value: standaloneCount, color: '#64748b', bg: '#94a3b8' },
          { label: 'Non-civic Excluded', value: excludedNonCivicCount, color: '#b45309', bg: '#f59e0b' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="kpi-card hover:scale-[1.02] transition-all">
            <div className="text-2xl font-bold font-mono" style={{ color }}>{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="card p-4 sm:p-5 border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-4">
          <Layers size={14} className="text-blue-600" />
          <span>HOW DUPLICATE CLUSTERING WORKS</span>
        </div>

        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <div className="min-w-[780px] md:min-w-0 grid grid-cols-[repeat(4,1fr_auto)_1fr] items-start">
            {WORKFLOW_STEPS.map((step, idx) => (
              <Fragment key={step.title}>
                <div className="flex flex-col items-center text-center px-1">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50/70 border border-blue-200/60 flex items-center justify-center text-blue-600 shadow-2xs">
                    <step.icon size={16} />
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-2 tracking-tight whitespace-nowrap">
                    {step.title}
                  </div>
                  <div className="text-[11px] text-slate-500 font-normal mt-0.5 whitespace-nowrap">
                    {step.desc}
                  </div>
                </div>

                {idx < WORKFLOW_STEPS.length - 1 && (
                  <div className="h-9 sm:h-10 flex items-center justify-center text-slate-300 px-1 sm:px-1.5">
                    <ArrowRight size={13} className="text-slate-400" />
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-slate-500">
          Different explicit districts never merge. Category labels may differ; bilingual issue matches use deterministic synonyms, not AI embeddings.
        </p>
      </div>

      <section className="card border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <MapPin size={18} className="mt-0.5 shrink-0 text-amber-700" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-amber-950">
              Unlocated / Needs Geo-Triage ({unlocatedRecords.length})
            </h2>
            <p className="mt-1 text-xs text-amber-900">
              English and Hindi place names are extracted first. Reports without a usable place stay here until an operator assigns a district and, optionally, a landmark or ward.
            </p>
            {unlocatedRecords.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {unlocatedRecords.slice(0, 5).map(record => (
                  <UnlocatedRecord
                    key={record.id}
                    record={record}
                    onSelect={onSelectGrievance}
                    onAssign={onAssignLocation}
                  />
                ))}
                {unlocatedRecords.length > 5 && (
                  <p className="text-xs text-amber-900">
                    Showing 5 of {unlocatedRecords.length}; use OSINT Search to filter and review the remaining reports.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {clusters.length === 0 ? (
        <div className="card p-12 text-center">
          <GitMerge size={36} className="text-slate-300 mx-auto mb-3" />
          <div className="text-slate-400">No clusters detected yet</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {clusters.map(c => (
            <ClusterCard key={c.cluster_id} cluster={c} onOpen={setSelectedCluster} />
          ))}
        </div>
      )}
      {selectedCluster && (
        <ClusterMembersModal
          cluster={selectedCluster}
          onClose={() => setSelectedCluster(null)}
          onSelectGrievance={onSelectGrievance}
        />
      )}
    </div>
  );
}
