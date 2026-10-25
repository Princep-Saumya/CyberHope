import { formatDistanceToNow } from '../utils/dateUtils';
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, HelpCircle } from 'lucide-react';
import { isFlaggedSuspicious, isVerifiedGenuine } from '../utils/verification';

const PLATFORM_COLORS = {
  'Reddit': 'bg-orange-950/80 text-orange-300 border-orange-800/80',
  'YouTube': 'bg-rose-950/80 text-rose-300 border-rose-800/80',
  'Google News': 'bg-sky-950/80 text-sky-300 border-sky-800/80',
  'X (Twitter)': 'bg-gray-900 text-gray-200 border-gray-700',
  'Facebook': 'bg-blue-900 text-blue-200 border-blue-800',
  'Instagram': 'bg-pink-900 text-pink-200 border-pink-800',
  'WhatsApp (Screenshot)': 'bg-green-900 text-green-200 border-green-800',
};

const PLATFORM_ICONS = {
  'Reddit': '🤖',
  'YouTube': '▶',
  'Google News': '📰',
  'X (Twitter)': '𝕏',
  'Facebook': 'f',
  'Instagram': '◉',
  'WhatsApp (Screenshot)': '💬',
};

function SeverityBadge({ score }) {
  const cfg =
    score >= 9 ? { bg: 'bg-red-900 border-red-700 text-red-300', dot: 'bg-red-400', label: `CRITICAL ${score}` } :
    score >= 7 ? { bg: 'bg-amber-900 border-amber-700 text-amber-300', dot: 'bg-amber-400', label: `HIGH ${score}` } :
    score >= 5 ? { bg: 'bg-blue-900 border-blue-700 text-blue-300', dot: 'bg-blue-400', label: `MED ${score}` } :
                 { bg: 'bg-gray-800 border-gray-700 text-gray-400', dot: 'bg-gray-500', label: `LOW ${score}` };
  return (
    <span className={`badge border ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function AuthBadge({ flag }) {
  const isSuspicious = isFlaggedSuspicious(flag);
  const isGenuine = isVerifiedGenuine(flag);
  return (
    <span className={`badge border ${isSuspicious ? 'bg-purple-900 border-purple-700 text-purple-300' : isGenuine ? 'bg-green-900 border-green-700 text-green-400' : 'bg-amber-900 border-amber-700 text-amber-300'}`}>
      {isSuspicious ? <AlertTriangle size={10} /> : isGenuine ? <CheckCircle2 size={10} /> : <HelpCircle size={10} />}
      {isSuspicious ? 'Flagged after review' : isGenuine ? 'Verified by human' : 'Unverified'}
    </span>
  );
}

export default function GrievanceCard({ grievance, isSelected, onClick, clusterCount }) {
  const {
    id, platform, author_handle, timestamp, post_text,
    location_tagged, hashtags, department, category,
    severity_score, authenticity_risk_score, authenticity_flag,
    status, duplicate_cluster_id, image_url,
  } = grievance;

  const platformStyle = PLATFORM_COLORS[platform] || 'bg-gray-800 text-gray-300 border-gray-700';
  const platformIcon = PLATFORM_ICONS[platform] || '◎';

  const statusColor = {
    Received: 'text-gray-400 bg-gray-800',
    Assigned: 'text-blue-400 bg-blue-900',
    'Under Investigation': 'text-amber-400 bg-amber-900',
    Resolved: 'text-green-400 bg-green-900',
    Closed: 'text-gray-500 bg-gray-900',
  }[status] || 'text-gray-400 bg-gray-800';

  return (
    <div
      className={`card group relative ${isSelected ? 'border-blue-500 ring-1 ring-blue-500/30' : ''}`}
      onClick={() => onClick(grievance)}
    >
      {/* Cluster badge */}
      {clusterCount > 1 && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-purple-900 border border-purple-700 text-purple-300 text-xs px-2 py-0.5 rounded-full font-medium">
          <Copy size={10} />
          {clusterCount} merged
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start gap-2 mb-2">
        <span className={`badge border text-xs font-bold ${platformStyle} flex-shrink-0`}>
          {platformIcon} {platform.split(' ')[0]}
        </span>
        <span className="text-gray-400 text-xs truncate flex-1">{author_handle}</span>
        <span className="text-gray-600 text-xs flex-shrink-0 font-mono">
          {formatDistanceToNow(timestamp)}
        </span>
      </div>

      {/* Media thumbnail if present */}
      {image_url && (
        <div className="relative mb-2.5 h-28 rounded-lg overflow-hidden border border-slate-700/60 bg-slate-900">
          <img
            src={image_url}
            alt="Evidence"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { e.target.style.display = 'none'; }}
          />
          {platform === 'YouTube' && (
            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 text-[9px] font-bold text-white bg-red-600/90 rounded shadow">
              ▶ VIDEO
            </span>
          )}
        </div>
      )}

      {/* Post text */}
      <p className="text-gray-300 text-sm leading-relaxed line-clamp-2 mb-3">{post_text}</p>

      {/* Hashtags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {(hashtags || []).slice(0, 4).map(h => (
          <span key={h} className="text-xs text-blue-400 bg-blue-950 px-2 py-0.5 rounded font-mono">
            {h}
          </span>
        ))}
        {(hashtags || []).length > 4 && (
          <span className="text-xs text-gray-600">+{hashtags.length - 4}</span>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-2 items-center mb-2">
        <SeverityBadge score={severity_score} />
        <AuthBadge flag={authenticity_flag} />
        <span className={`badge text-xs ${statusColor}`}>{status}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/60">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-600 text-xs">📍</span>
          <span className="text-gray-400 text-xs">{location_tagged}</span>
          <span className="text-gray-700 text-xs">·</span>
          <span className="text-gray-600 text-xs truncate max-w-[120px]" title={department}>
            {department?.split('(')[0]?.trim() || department}
          </span>
        </div>
        <span className="text-gray-600 text-xs font-mono">{id}</span>
      </div>
    </div>
  );
}
