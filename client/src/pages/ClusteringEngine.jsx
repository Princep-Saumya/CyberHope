import { useState, Fragment, useEffect } from 'react';
import {
  GitMerge,
  ChevronRight,
  MapPin,
  Users,
  Copy,
  Layers,
  FileText,
  Hash,
  ArrowRight,
  Sparkles,
  Building2,
  AlertTriangle,
  ShieldCheck,
  X,
  ExternalLink,
} from 'lucide-react';

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

// ── MEMBER CARD IN POP-UP MODAL ─────────────────────────────────────────────
function MemberCard({ g, isRep, onSelectGrievance }) {
  const sv = getSeverityBadge(g.severity_score);
  return (
    <div
      onClick={() => onSelectGrievance && onSelectGrievance(g)}
      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
        isRep
          ? 'bg-blue-50/50 border-blue-200 hover:border-blue-300 hover:shadow-xs'
          : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/70 hover:shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {isRep && (
            <span className="text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md tracking-wider flex-shrink-0">
              LEAD REPORT
            </span>
          )}
          <span className="text-xs font-bold text-slate-900 truncate">{g.author_handle}</span>
          <span className="text-[11px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-medium">
            {g.platform?.split(' ')[0] || 'Web'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${sv.badge}`}>
            {g.severity_score}/10
          </span>
          <span className="text-xs font-mono text-slate-400">{g.id}</span>
        </div>
      </div>

      <p className="text-xs text-slate-700 leading-relaxed mb-2.5 font-sans">
        "{g.post_text}"
      </p>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2 flex-wrap text-xs">
        <div className="flex flex-wrap gap-1">
          {(g.hashtags || []).slice(0, 4).map((h) => (
            <span
              key={h}
              className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded"
            >
              {h}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors ml-auto">
          <span>Inspect Full Report</span>
          <ExternalLink size={12} />
        </div>
      </div>
    </div>
  );
}

// ── CLUSTER DETAIL POP-UP DIALOG ────────────────────────────────────────────
function ClusterDetailModal({ cluster, grievances, onClose, onSelectGrievance }) {
  const members = grievances.filter((g) => g.duplicate_cluster_id === cluster.cluster_id);
  const lead = members[0];
  const maxSev = cluster.max_severity;
  const sev = getSeverityBadge(maxSev);
  const cleanDept = cluster.department?.split('(')[0]?.trim();
  const hashtagList =
    typeof cluster.hashtags === 'string'
      ? cluster.hashtags.split(' ')
      : cluster.hashtags || [];

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 animate-modal-spring"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border"
              style={{ backgroundColor: `${sev.color}15`, borderColor: `${sev.color}35` }}
            >
              <GitMerge size={20} style={{ color: sev.color }} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-extrabold text-slate-900 tracking-tight">
                  {cluster.category}
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {cluster.cluster_id}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-bold ${sev.badge}`}>
                  <span className={`w-2 h-2 rounded-full ${sev.dot}`} />
                  <span>MAX {maxSev}/10</span>
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 text-slate-700">
                  <MapPin size={12} className="text-emerald-600 shrink-0" />
                  {cluster.location}
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-blue-700">
                  <Users size={12} className="text-blue-600 shrink-0" />
                  {cluster.member_count} reports merged
                </span>
                {cleanDept && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <Building2 size={12} className="text-slate-400 shrink-0" />
                      {cleanDept}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
            title="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Modal Body (Scrollable) ── */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 bg-slate-50/60">

          {/* ════ SECTION 1: AI MASTER SYNTHESIS SUMMARY ════ */}
          {lead?.ai_summary && (
            <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-900 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-violet-600" /> AI Master Cluster Summary
                </span>
                <span className="badge bg-violet-50 text-violet-700 border border-violet-200 text-xs">
                  Automated Triage Synthesis
                </span>
              </div>
              <p className="text-xs text-slate-800 leading-relaxed bg-violet-50/50 border border-violet-100 rounded-xl p-3.5 italic">
                "{lead.ai_summary}"
              </p>
            </section>
          )}

          {/* ════ SECTION 2: COMMON HASHTAGS ════ */}
          {hashtagList.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap bg-white border border-slate-200 rounded-xl p-3 text-xs">
              <span className="font-bold text-slate-600 flex items-center gap-1">
                <Hash size={13} className="text-blue-600" /> Correlated Hashtags:
              </span>
              {hashtagList.map((h) => (
                <span
                  key={h}
                  className="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200/80"
                >
                  {h}
                </span>
              ))}
            </div>
          )}

          {/* ════ SECTION 3: SOURCE LINEAGE REPORTS ════ */}
          <section className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
              <span>Source Lineage — {members.length} Citizen Reports</span>
              <span className="text-[11px] text-slate-400 font-normal lowercase">
                click any card to view full ticket
              </span>
            </div>

            <div className="space-y-3">
              {members.map((m, i) => (
                <MemberCard
                  key={m.id}
                  g={m}
                  isRep={i === 0}
                  onSelectGrievance={(grievance) => {
                    onClose();
                    onSelectGrievance && onSelectGrievance(grievance);
                  }}
                />
              ))}
            </div>
          </section>

        </div>

        {/* ── Modal Footer ── */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="font-mono text-[11px]">
            Bihar State Cyber Cell · Automated Clustering Engine
          </span>
          <button
            onClick={onClose}
            className="btn-secondary text-xs py-1.5 px-4 rounded-xl"
          >
            Close Dialog
          </button>
        </div>
      </div>
    </div>
  );
}

// ── COMPACT CLUSTER CARD (CLEAN LIST ROW) ───────────────────────────────────
function ClusterCard({ cluster, grievances, onOpenModal }) {
  const members = grievances.filter((g) => g.duplicate_cluster_id === cluster.cluster_id);
  const maxSev = cluster.max_severity;
  const sev = getSeverityBadge(maxSev);
  const cleanDept = cluster.department?.split('(')[0]?.trim();
  const hashtagList =
    typeof cluster.hashtags === 'string'
      ? cluster.hashtags.split(' ')
      : cluster.hashtags || [];

  return (
    <div
      onClick={() => onOpenModal(cluster)}
      className="card interactive-card animate-fade-slide-up rounded-2xl border border-slate-200/90 p-4 sm:p-5 cursor-pointer bg-white hover:border-indigo-400 hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        {/* Cluster Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border mt-0.5"
          style={{ backgroundColor: `${sev.color}15`, borderColor: `${sev.color}35` }}
        >
          <GitMerge size={18} style={{ color: sev.color }} />
        </div>

        <div className="min-w-0 flex-1">
          {/* Title & Cluster ID badge */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-base font-bold text-slate-900 tracking-tight hover:text-indigo-700 transition-colors">
              {cluster.category}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              {cluster.cluster_id}
            </span>
          </div>

          {/* Metadata row */}
          <div className="flex items-center flex-wrap gap-x-3.5 gap-y-1 text-xs text-slate-500 mb-2">
            <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
              <MapPin size={12} className="text-emerald-600 shrink-0" />
              {cluster.location}
            </span>
            <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
              <Users size={12} className="text-blue-600 shrink-0" />
              {cluster.member_count} reports merged
            </span>
            {cleanDept && (
              <span className="inline-flex items-center gap-1 text-slate-500 truncate max-w-xs">
                <Building2 size={12} className="text-slate-400 shrink-0" />
                {cleanDept}
              </span>
            )}
          </div>

          {/* Hashtag chips */}
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

      {/* Right Section: Severity Score badge & View Details CTA */}
      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 w-full sm:w-auto flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold ${sev.badge} shadow-2xs`}
        >
          <span className={`w-2 h-2 rounded-full ${sev.dot}`} />
          <span>MAX {maxSev}/10</span>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-800 transition-colors">
          <span>View Details ({cluster.member_count})</span>
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
}

const WORKFLOW_STEPS = [
  {
    title: 'Location Match',
    desc: (
      <>Within <span className="font-semibold text-blue-600">500 m</span></>
    ),
    icon: MapPin,
  },
  {
    title: 'Text Similarity',
    desc: (
      <>Jaccard overlap <span className="font-semibold text-blue-600">≥ 70%</span></>
    ),
    icon: FileText,
  },
  {
    title: 'Hashtag Match',
    desc: (
      <><span className="font-semibold text-blue-600">2+</span> shared hashtags</>
    ),
    icon: Hash,
  },
  {
    title: 'AI Clustering',
    desc: 'Groups related reports',
    icon: Sparkles,
  },
  {
    title: 'Master Ticket',
    desc: 'Unique cluster ID',
    icon: GitMerge,
  },
  {
    title: 'Department',
    desc: 'Assigned for action',
    icon: Building2,
  },
];

export default function ClusteringEngine({ clusters, grievances, onSelectGrievance }) {
  const [selectedModalCluster, setSelectedModalCluster] = useState(null);

  const totalMerged = clusters.reduce((s, c) => s + c.member_count, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="kpi-card interactive-card hover:-translate-y-1 transition-all">
          <div className="text-2xl font-bold font-mono text-purple-600">{clusters.length}</div>
          <div className="text-xs text-slate-500 font-medium">Master Tickets</div>
        </div>
        <div className="kpi-card interactive-card hover:-translate-y-1 transition-all">
          <div className="text-2xl font-bold font-mono text-blue-600">{totalMerged}</div>
          <div className="text-xs text-slate-500 font-medium">Posts Merged</div>
        </div>
        <div className="kpi-card interactive-card hover:-translate-y-1 transition-all">
          <div className="text-2xl font-bold font-mono text-slate-600">
            {grievances.length - totalMerged}
          </div>
          <div className="text-xs text-slate-500 font-medium">Standalone Posts</div>
        </div>
      </div>

      {/* How Duplicate Clustering Works Process Banner */}
      <div className="card p-3 sm:p-4 border-l-4 border-blue-500 bg-white">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          <Layers size={14} className="text-blue-600" />
          <span>How Duplicate Clustering Works</span>
        </div>

        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <div className="min-w-[620px] md:min-w-0 grid grid-cols-[repeat(5,1fr_auto)_1fr] items-start">
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
      </div>

      {/* ── Compact, Clean Cluster List Cards ── */}
      {clusters.length === 0 ? (
        <div className="card p-12 text-center">
          <GitMerge size={36} className="text-slate-300 mx-auto mb-3" />
          <div className="text-slate-400">No clusters detected yet</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {clusters.map((c) => (
            <ClusterCard
              key={c.cluster_id}
              cluster={c}
              grievances={grievances}
              onOpenModal={setSelectedModalCluster}
            />
          ))}
        </div>
      )}

      {/* ── Cluster Detail Pop-Up Modal ── */}
      {selectedModalCluster && (
        <ClusterDetailModal
          cluster={selectedModalCluster}
          grievances={grievances}
          onClose={() => setSelectedModalCluster(null)}
          onSelectGrievance={onSelectGrievance}
        />
      )}
    </div>
  );
}
