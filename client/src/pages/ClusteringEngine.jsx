import { useState, Fragment } from 'react';
import {
  GitMerge,
  ChevronDown,
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

function AISummaryCard({ summary, category, department, severity }) {
  const [expanded, setExpanded] = useState(false);
  if (!summary) return null;

  const isLong = summary.length > 180;
  const displayText = !expanded && isLong ? `${summary.slice(0, 175)}...` : summary;

  const riskBadge =
    severity >= 8 ? (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-100/90 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md">
        <AlertTriangle size={11} className="text-rose-600" /> High Safety Risk
      </span>
    ) : severity >= 6 ? (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-100/90 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
        <AlertTriangle size={11} className="text-amber-600" /> Moderate Risk
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-100/90 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
        <ShieldCheck size={11} className="text-emerald-600" /> Low Risk
      </span>
    );

  return (
    <div className="mt-3.5 p-3.5 rounded-xl bg-violet-50/70 border border-violet-200/80 shadow-2xs">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-bold text-violet-900 tracking-wide uppercase">
          <Sparkles size={14} className="text-violet-600" />
          <span>AI Master Summary</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {riskBadge}
          {category && (
            <span className="text-[11px] font-medium text-violet-700 bg-violet-100/70 border border-violet-200/70 px-2 py-0.5 rounded-md hidden sm:inline-block">
              {category}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-700 leading-relaxed font-normal">
        {displayText}
      </p>

      {isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          className="mt-2 text-[11px] font-semibold text-violet-700 hover:text-violet-900 hover:underline flex items-center gap-1 cursor-pointer"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

function MemberCard({ g, isRep }) {
  const sv = getSeverityBadge(g.severity_score);
  return (
    <div
      className={`p-3 rounded-xl border transition-all duration-150 ${
        isRep
          ? 'bg-blue-50/40 border-blue-200/90 shadow-2xs ring-1 ring-blue-500/10'
          : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {isRep && (
            <span className="text-[10px] font-bold text-blue-700 bg-blue-100/90 border border-blue-200 px-2 py-0.5 rounded-md tracking-wider flex-shrink-0">
              LEAD
            </span>
          )}
          <span className="text-xs font-bold text-slate-800 truncate">{g.author_handle}</span>
          <span className="text-[11px] text-slate-500 bg-slate-100 border border-slate-200/70 px-1.5 py-0.5 rounded-md">
            {g.platform?.split(' ')[0] || 'Web'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${sv.badge}`}>
            {g.severity_score}/10
          </span>
          <span className="text-[11px] font-mono text-slate-400">{g.id}</span>
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed mb-2 line-clamp-2">{g.post_text}</p>

      {g.hashtags && g.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {g.hashtags.slice(0, 4).map((h) => (
            <span
              key={h}
              className="text-[10px] font-mono font-medium text-slate-500 bg-slate-50 border border-slate-200/80 px-1.5 py-0.5 rounded"
            >
              {h}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ClusterCard({ cluster, grievances, onSelectGrievance }) {
  const [expanded, setExpanded] = useState(false);
  const members = grievances.filter((g) => g.duplicate_cluster_id === cluster.cluster_id);
  const lead = members[0];
  const maxSev = cluster.max_severity;
  const sev = getSeverityBadge(maxSev);

  const cleanDept = cluster.department?.split('(')[0]?.trim();
  const hashtagList =
    typeof cluster.hashtags === 'string'
      ? cluster.hashtags.split(' ')
      : cluster.hashtags || [];

  return (
    <div className="card overflow-hidden transition-all duration-200 hover:shadow-md hover:border-slate-300">
      <div
        className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
        onClick={() => setExpanded((e) => !e)}
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
                {cluster.location}
              </span>
              <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
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

        {/* Right Section: Severity Score badge & Reports count & expand control */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 w-full sm:w-auto flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold ${sev.badge} shadow-2xs`}
          >
            <span className={`w-2 h-2 rounded-full ${sev.dot}`} />
            <span>MAX {maxSev}/10</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Copy size={12} className="text-blue-500" />
            <span>{cluster.member_count} citizen reports</span>
            <span
              className={`ml-1 p-0.5 rounded text-slate-400 group-hover:text-slate-700 transition-transform duration-200 ${
                expanded ? 'rotate-180 text-blue-600' : ''
              }`}
            >
              <ChevronDown size={14} />
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-4 bg-slate-50/60">
          <div className="text-xs font-bold text-slate-600 mb-2.5 uppercase tracking-wider flex items-center justify-between">
            <span>Source Lineage — {members.length} Posts</span>
            <span className="text-[11px] font-normal text-slate-400 normal-case hidden sm:inline-block">
              Click any report to view full details
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {members.map((m, i) => (
              <div key={m.id} onClick={() => onSelectGrievance(m)} className="cursor-pointer">
                <MemberCard g={m} isRep={i === 0} />
              </div>
            ))}
          </div>

          {lead?.ai_summary && (
            <AISummaryCard
              summary={lead.ai_summary}
              category={cluster.category}
              department={cleanDept}
              severity={maxSev}
            />
          )}
        </div>
      )}
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
      <><span className="font-semibold text-blue-600">≥ 70%</span></>
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
  const totalMerged = clusters.reduce((s, c) => s + c.member_count, 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Master Tickets',   value: clusters.length,                color: '#7c3aed', bg: '#8b5cf6' },
          { label: 'Posts Merged',     value: totalMerged,                    color: '#2563eb', bg: '#3b82f6' },
          { label: 'Standalone Posts', value: grievances.length - totalMerged, color: '#64748b', bg: '#94a3b8' },
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

      {clusters.length === 0 ? (
        <div className="card p-12 text-center">
          <GitMerge size={36} className="text-slate-300 mx-auto mb-3" />
          <div className="text-slate-400">No clusters detected yet</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {clusters.map(c => (
            <ClusterCard key={c.cluster_id} cluster={c} grievances={grievances} onSelectGrievance={onSelectGrievance} />
          ))}
        </div>
      )}
    </div>
  );
}
