import { useState } from 'react';
import { GitMerge, ChevronDown, ChevronRight, MapPin, Users, Copy, Layers } from 'lucide-react';

const SEVERITY_COLOR = s => s >= 9 ? '#e11d48' : s >= 7 ? '#d97706' : s >= 5 ? '#2563eb' : '#059669';

function MemberCard({ g, isRep }) {
  const sv = SEVERITY_COLOR(g.severity_score);
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${isRep ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
      {isRep && <span className="text-xs font-bold text-blue-700 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5">LEAD</span>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-slate-800">{g.author_handle}</span>
          <span className="text-xs text-slate-400">{g.platform.split(' ')[0]}</span>
        </div>
        <p className="text-xs text-slate-600 line-clamp-2 mb-2">{g.post_text}</p>
        <div className="flex flex-wrap gap-1">
          {(g.hashtags || []).slice(0, 3).map(h => (
            <span key={h} className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-1.5 rounded font-mono">{h}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: sv }}>
          {g.severity_score}/10
        </span>
        <span className="text-xs text-slate-400 font-mono">{g.id}</span>
      </div>
    </div>
  );
}

function ClusterCard({ cluster, grievances, onSelectGrievance }) {
  const [expanded, setExpanded] = useState(false);
  const members = grievances.filter(g => g.duplicate_cluster_id === cluster.cluster_id);
  const lead    = members[0];
  const maxSev  = cluster.max_severity;
  const sevColor = SEVERITY_COLOR(maxSev);
  return (
    <div className="card interactive-card animate-fade-slide-up overflow-hidden rounded-2xl border border-slate-200/90 hover:border-indigo-400">
      <div className="flex items-start gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(e => !e)}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border"
          style={{ background: sevColor + '15', borderColor: sevColor + '40' }}>
          <GitMerge size={18} style={{ color: sevColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-slate-800 text-sm">{cluster.category}</span>
            <span className="badge bg-slate-100 text-slate-600 border border-slate-200 font-mono text-xs">{cluster.cluster_id}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><MapPin size={11} className="text-emerald-600"/>{cluster.location}</span>
            <span className="flex items-center gap-1"><Users size={11} className="text-indigo-600"/>{cluster.member_count} reports merged</span>
            <span className="text-slate-400 truncate">{cluster.department?.split('(')[0]?.trim()}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {(typeof cluster.hashtags === 'string' ? cluster.hashtags.split(' ') : cluster.hashtags || []).slice(0, 5).map(h => (
              <span key={h} className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-mono">{h}</span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-sm font-bold px-2.5 py-1 rounded-lg text-white" style={{ background: sevColor }}>
            MAX {maxSev}/10
          </span>
          <div className="flex items-center gap-1 text-xs text-indigo-600">
            <Copy size={11}/>{cluster.member_count} citizen reports
          </div>
          {expanded ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronRight size={14} className="text-slate-400"/>}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-4 bg-slate-50">
          <div className="card p-3 mb-4">
            <div className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Matching Rules</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="badge bg-slate-100 text-slate-700 border border-slate-200">Same department and category</span>
              <span className="badge bg-blue-50 text-blue-700 border border-blue-200">Within 500 m</span>
              <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-200">Text overlap ≥70%</span>
              <span className="badge bg-violet-50 text-violet-700 border border-violet-200">2+ shared hashtags</span>
            </div>
            <div className="mt-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2">
              New sample reports are matched against available records using these rules. Initial clusters are pre-grouped records; match percentages are not model confidence scores.
            </div>
          </div>
          <div className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Source Lineage — {members.length} Posts</div>
          <div className="flex flex-col gap-2">
            {members.map((m, i) => (
              <div key={m.id} onClick={() => onSelectGrievance(m)} className="cursor-pointer">
                <MemberCard g={m} isRep={i === 0} />
              </div>
            ))}
          </div>
          {lead?.ai_summary && (
            <div className="mt-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
              <div className="text-xs font-bold text-violet-700 mb-1">🤖 AI Master Summary</div>
              <p className="text-sm text-violet-800 italic">"{lead.ai_summary}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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

      <div className="card p-4 border-l-4 border-blue-500">
        <div className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
          <Layers size={14} className="text-indigo-600" />How Duplicate Clustering Works
        </div>
        <div className="text-xs text-slate-500 leading-relaxed">
          Three triggers merge posts into a <strong className="text-slate-700">Master Ticket</strong>: (1) <strong className="text-slate-700">Geo-Proximity</strong> — coordinates within 500 metres;
          (2) <strong className="text-slate-700">Text Similarity</strong> — Jaccard word-set overlap ≥ 0.70;
          (3) <strong className="text-slate-700">Hashtag Overlap</strong> — 2 or more identical hashtags.
          Each cluster is routed as a single actionable ticket to the responsible department.
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
