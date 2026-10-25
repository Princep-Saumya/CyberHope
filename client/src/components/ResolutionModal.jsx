import { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  X, Brain, MapPin, Building2, User, Calendar,
  AlertTriangle, CheckCircle2, Copy, ChevronRight,
  Loader2, Image as ImageIcon, ExternalLink, ShieldCheck
} from 'lucide-react';
import { formatDateTime } from '../utils/dateUtils';
import { isFlaggedSuspicious, isUnverified } from '../utils/verification';

const STATUS_FLOW = ['Received', 'Assigned', 'Under Investigation', 'Resolved', 'Closed'];
const STATUS_CFG  = {
  Received:              { bg: 'bg-blue-50',        text: 'text-blue-700',    dot: 'bg-blue-500',     border: 'border-blue-200' },
  Assigned:              { bg: 'bg-blue-50',         text: 'text-blue-700',    dot: 'bg-blue-400',     border: 'border-blue-200'  },
  'Under Investigation': { bg: 'bg-amber-50',        text: 'text-amber-700',   dot: 'bg-amber-400',    border: 'border-amber-200' },
  Resolved:              { bg: 'bg-emerald-50',      text: 'text-emerald-700', dot: 'bg-emerald-400',  border: 'border-emerald-200'},
  Closed:                { bg: 'bg-slate-50',        text: 'text-slate-500',   dot: 'bg-slate-300',    border: 'border-slate-200' },
};

function RiskBar({ label, value, maxValue = 100 }) {
  const pct = Math.min(100, Math.round((value / maxValue) * 100));
  const barColor = pct >= 70 ? '#f97316' : pct > 40 ? '#d97706' : '#059669';
  const textClass = pct >= 70 ? 'text-orange-700' : pct > 40 ? 'text-amber-700' : 'text-emerald-700';
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-slate-600">{label}</span>
        <span className={`text-sm font-mono font-bold ${textClass}`}>{value}{maxValue === 100 ? '%' : '/10'}</span>
      </div>
      <div
        className="h-2 bg-amber-100 rounded-full overflow-hidden"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={maxValue}
        aria-valuenow={value}
      >
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
}

export default function ResolutionModal({ grievance, clusterSiblings, onClose, onStatusUpdate, onReanalyze, onOpenAIReview }) {
  const [status, setStatus]               = useState(grievance.status);
  const [statusLoading, setStatusLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [statusMsg, setStatusMsg]         = useState(null);

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => { setStatus(grievance.status); }, [grievance.status]);

  const handleStatusChange = useCallback(async (newStatus) => {
    if (newStatus === status) return;
    setStatusLoading(true);
    try {
      await onStatusUpdate(grievance.id, newStatus);
      setStatus(newStatus);
      setStatusMsg({ type: 'success', text: `Status updated to "${newStatus}"` });
    } catch (e) {
      setStatusMsg({ type: 'error', text: e.message });
    } finally {
      setStatusLoading(false);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  }, [status, grievance.id, onStatusUpdate]);

  const handleReanalyze = useCallback(async () => {
    setAnalyzeLoading(true);
    try {
      const result = await onReanalyze(grievance);
      setAnalysisResult(result?.analysis || null);
      setStatusMsg({ type: 'success', text: 'AI analysis refreshed' });
    } catch (e) {
      setStatusMsg({ type: 'error', text: `Analysis failed: ${e.message}` });
    } finally {
      setAnalyzeLoading(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  }, [grievance, onReanalyze]);

  const isSuspicious = isFlaggedSuspicious(grievance.authenticity_flag);
  const isUnverifiedReport = isUnverified(grievance.authenticity_flag);
  const currentIdx   = STATUS_FLOW.indexOf(status);
  const cfg          = STATUS_CFG[status] || STATUS_CFG.Received;
  const summary = analysisResult?.summary || grievance.ai_summary;
  const sourceLabel = grievance.category || grievance.platform || 'Public Grievance';
  const title = `${grievance.category || 'Public Grievance'} — ${grievance.location_tagged || 'Location unverified'}`;
  const locationText = grievance.coordinates
    ? `${grievance.location_tagged}${grievance.coordinates_approximate ? ' (approx.)' : ''} (${grievance.coordinates.lat.toFixed(3)}, ${grievance.coordinates.lng.toFixed(3)})`
    : grievance.location_tagged;

  const modal = (
    <div
      className="modal-overlay-container fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-3 sm:p-6"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl shadow-slate-900/20 animate-modal-spring">
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs text-slate-600 font-mono">{grievance.id}</span>
              <span className="px-2 py-0.5 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full border border-violet-200">
                {sourceLabel}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">{title}</h2>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => onOpenAIReview?.(grievance)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
            >
              <ShieldCheck size={14} />
              Review AI signals
            </button>
            <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
              {status}
            </span>
            <button
              onClick={onClose}
              aria-label="Close grievance details"
              className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className={`mx-5 sm:mx-6 mt-4 px-4 py-2 rounded-lg text-sm font-medium border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>{statusMsg.text}</div>
        )}

        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5 overflow-y-auto">
          <div className="md:col-span-2 flex flex-col gap-5 min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                <User size={14} className="text-slate-600" /> {grievance.author_handle || 'Unknown reporter'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-600" /> {formatDateTime(grievance.timestamp)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} className="text-slate-600" /> {locationText}
              </span>
              {grievance.source_url ? (
                <a
                  href={grievance.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors"
                >
                  <span>{grievance.platform === 'Reddit' ? 'View on Reddit' : grievance.platform === 'YouTube' ? 'Watch on YouTube' : 'View Source'}</span>
                  <ExternalLink size={11} />
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {grievance.platform || 'Public Feed'}
                </span>
              )}
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{grievance.post_text}</p>
              {(grievance.hashtags || []).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {grievance.hashtags.map(h => (
                    <span key={h} className="px-2.5 py-1 bg-blue-50 text-blue-800 text-xs rounded-full border border-blue-200 font-mono">
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {grievance.image_url && (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
                <img
                  src={grievance.image_url}
                  alt="Submitted report evidence"
                  className="w-full max-h-64 object-cover"
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
                {grievance.source_url && (
                  <a
                    href={grievance.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-2.5 right-2.5 px-3 py-1 text-xs font-semibold text-white bg-slate-900/80 hover:bg-slate-900 rounded-lg flex items-center gap-1.5 backdrop-blur border border-white/20 transition-all shadow-md"
                  >
                    <span>{grievance.platform === 'YouTube' ? 'Watch on YouTube' : grievance.platform === 'Reddit' ? 'View on Reddit' : 'View Source'}</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                {grievance.image_ocr_text && (
                  <div className="px-3 py-2 bg-amber-50 border-t border-amber-200 flex gap-2 items-start">
                    <ImageIcon size={13} className="text-amber-700 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-amber-900 font-mono italic">{grievance.image_ocr_text}</span>
                  </div>
                )}
              </div>
            )}

            <section className="p-4 bg-violet-50/70 border border-violet-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Brain size={14} className="text-violet-800" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-violet-900">
                  {grievance.analysis_mode?.startsWith('groq:') ? 'Groq Text Triage' : grievance.analysis_mode?.startsWith('gemini') ? 'Gemini Fallback Summary' : 'Analysis Summary'}
                </h3>
              </div>
              <p className="text-sm text-violet-950 leading-relaxed">
                {summary ? <>&ldquo;{summary}&rdquo;</> : 'No analysis summary is available for this report.'}
              </p>
            </section>

            {clusterSiblings?.length > 0 && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Copy size={13} className="text-violet-700" />
                  <span className="text-xs font-semibold text-violet-800 uppercase tracking-wide">
                    {clusterSiblings.length + 1} Reports — Master Ticket: {grievance.duplicate_cluster_id}
                  </span>
                </div>
                {clusterSiblings.map(s => (
                  <div key={s.id} className="flex items-center gap-2 text-xs text-violet-800 py-1">
                    <ChevronRight size={12} />
                    <span className="font-mono">{s.id}</span>
                    <span>{s.author_handle}</span>
                    <span className="ml-auto text-slate-600">{s.platform.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            )}

            {grievance.resolution_note && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="text-xs text-emerald-800 font-semibold uppercase tracking-wide mb-1">Resolution Note</div>
                <p className="text-sm text-emerald-900 leading-relaxed">{grievance.resolution_note}</p>
                {grievance.resolution_date && (
                  <p className="text-xs text-slate-600 font-mono mt-2">{formatDateTime(grievance.resolution_date)}</p>
                )}
              </div>
            )}
          </div>

          <aside className="md:border-l md:border-slate-200 md:pl-5 flex flex-col gap-4 min-w-0">
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Building2 size={14} className="text-blue-700" />
                <span className="text-xs text-slate-600 uppercase tracking-wide font-bold">Department</span>
              </div>
              <div className="text-sm font-semibold text-slate-900">{grievance.department || 'Unassigned'}</div>
              <span className="inline-flex mt-2 px-2 py-0.5 rounded-full bg-white border border-slate-200 text-xs text-slate-700">
                {grievance.category || 'Public Grievance'}
              </span>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-col gap-3">
              <RiskBar label="Severity" value={grievance.severity_score} maxValue={10} />
              <div className="text-xs text-slate-700">Automated text analysis does not establish authenticity; human review is required.</div>
              <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border font-semibold ${
                isSuspicious
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : isUnverifiedReport
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                {isSuspicious || isUnverifiedReport ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
                {isSuspicious ? 'Flagged after review' : isUnverifiedReport ? 'Unverified' : grievance.authenticity_flag}
              </div>
            </div>

            <button
              onClick={handleReanalyze}
              disabled={analyzeLoading}
              className="w-full justify-center text-sm font-bold py-2.5 gap-2 text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors inline-flex items-center disabled:opacity-50"
            >
              {analyzeLoading ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
              {analyzeLoading ? 'Analyzing…' : 'Re-analyze with AI'}
            </button>

            <div className="pt-1">
              <div className="text-xs text-slate-600 uppercase tracking-wide font-bold mb-3">Resolution Lifecycle</div>
              <div className="relative flex flex-col">
                {STATUS_FLOW.map((s, idx) => {
                  const isPast    = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  const sc        = STATUS_CFG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => !isCurrent && handleStatusChange(s)}
                      disabled={statusLoading || isCurrent}
                      className={`relative flex items-center gap-3 min-h-9 px-2 text-xs text-left transition-colors ${
                        isCurrent ? `${sc.text} font-semibold` : isPast ? 'text-slate-500' : 'text-slate-600 hover:text-slate-900'
                      } ${statusLoading ? 'cursor-wait' : ''}`}
                    >
                      <span className={`relative z-10 w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                        isCurrent ? `${sc.dot} border-white ring-2 ring-blue-200` : isPast ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'
                      }`} />
                      {idx < STATUS_FLOW.length - 1 && (
                        <span className={`absolute left-[13px] top-6 h-3 w-px ${isPast ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                      )}
                      <span>{s}</span>
                      {isCurrent && <span className="ml-auto rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-semibold">Current</span>}
                    </button>
                  );
                })}
              </div>
              {statusLoading && (
                <div className="flex items-center gap-2 mt-2 text-xs text-blue-700">
                  <Loader2 size={12} className="animate-spin" /> Updating…
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}
