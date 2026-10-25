import { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  X, Brain, MapPin, Building2, User, Calendar,
  AlertTriangle, CheckCircle2, Copy, ChevronRight,
  Loader2, Image as ImageIcon, ExternalLink
} from 'lucide-react';
import { formatDateTime } from '../utils/dateUtils';

const STATUS_FLOW = ['Received', 'Assigned', 'Under Investigation', 'Resolved', 'Closed'];
const STATUS_CFG  = {
  Received:              { bg: 'bg-slate-100',      text: 'text-slate-700',   dot: 'bg-slate-400',    border: 'border-slate-200' },
  Assigned:              { bg: 'bg-blue-50',         text: 'text-blue-700',    dot: 'bg-blue-400',     border: 'border-blue-200'  },
  'Under Investigation': { bg: 'bg-amber-50',        text: 'text-amber-700',   dot: 'bg-amber-400',    border: 'border-amber-200' },
  Resolved:              { bg: 'bg-emerald-50',      text: 'text-emerald-700', dot: 'bg-emerald-400',  border: 'border-emerald-200'},
  Closed:                { bg: 'bg-slate-50',        text: 'text-slate-500',   dot: 'bg-slate-300',    border: 'border-slate-200' },
};

function RiskBar({ label, value, maxValue = 100 }) {
  const pct = Math.min(100, Math.round((value / maxValue) * 100));
  const barColor = pct > 70 ? '#e11d48' : pct > 40 ? '#d97706' : '#059669';
  const textClass = pct > 70 ? 'text-rose-600' : pct > 40 ? 'text-amber-600' : 'text-emerald-600';
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-slate-500">{label}</span>
        <span className={`text-xs font-mono font-bold ${textClass}`}>{value}{maxValue === 100 ? '%' : '/10'}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
}

export default function ResolutionModal({ grievance, clusterSiblings, onClose, onStatusUpdate, onReanalyze }) {
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

  const isSuspicious = grievance.authenticity_flag !== 'Likely Genuine Grievance';
  const currentIdx   = STATUS_FLOW.indexOf(status);
  const cfg          = STATUS_CFG[status] || STATUS_CFG.Received;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl my-8 shadow-2xl shadow-slate-900/20">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
          <div className="w-1.5 h-8 rounded-full bg-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-400 font-mono">{grievance.id}</div>
            <div className="font-semibold text-slate-800 text-sm">{grievance.category} — {grievance.location_tagged}</div>
          </div>
          <span className={`badge border flex-shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            {status}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors ml-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Toast ── */}
        {statusMsg && (
          <div className={`mx-5 mt-4 px-4 py-2 rounded-lg text-sm font-medium border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>{statusMsg.text}</div>
        )}

        <div className="p-5 grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── Left: post content ── */}
          <div className="lg:col-span-3 flex flex-col gap-4">

            {/* Meta row */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: User,     text: grievance.author_handle },
                { icon: Calendar, text: formatDateTime(grievance.timestamp) },
                { icon: MapPin,   text: grievance.coordinates
                  ? `${grievance.location_tagged} (${grievance.coordinates.lat.toFixed(3)}, ${grievance.coordinates.lng.toFixed(3)})`
                  : grievance.location_tagged },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Icon size={13} className="text-slate-400 flex-shrink-0" />
                  <span className="font-mono text-xs">{text}</span>
                </div>
              ))}
            </div>

            {/* Post text */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-700 leading-relaxed">{grievance.post_text}</p>
            </div>

            {/* Image & Video Evidence */}
            {grievance.image_url && (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
                <img
                  src={grievance.image_url}
                  alt="Evidence"
                  className="w-full h-48 object-cover"
                  onError={e => { e.target.style.display = 'none'; }}
                />
                {grievance.source_url && (
                  <a
                    href={grievance.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-2.5 right-2.5 px-3 py-1 text-xs font-semibold text-white bg-slate-900/80 hover:bg-slate-900 rounded-lg flex items-center gap-1.5 backdrop-blur border border-white/20 transition-all shadow-md"
                  >
                    <span>{grievance.platform === 'YouTube' ? 'Watch on YouTube' : 'View Source'}</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                {grievance.image_ocr_text && (
                  <div className="px-3 py-2 bg-amber-50 border-t border-amber-200 flex gap-2 items-start">
                    <ImageIcon size={11} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-amber-800 font-mono italic">{grievance.image_ocr_text}</span>
                  </div>
                )}
              </div>
            )}

            {/* Hashtags */}
            <div className="flex flex-wrap gap-1.5">
              {(grievance.hashtags || []).map(h => (
                <span key={h} className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-mono">
                  {h}
                </span>
              ))}
            </div>

            {/* Cluster siblings */}
            {clusterSiblings?.length > 0 && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Copy size={12} className="text-violet-600" />
                  <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
                    {clusterSiblings.length + 1} Reports — Master Ticket: {grievance.duplicate_cluster_id}
                  </span>
                </div>
                {clusterSiblings.map(s => (
                  <div key={s.id} className="flex items-center gap-2 text-xs text-violet-600 py-0.5">
                    <ChevronRight size={10} />
                    <span className="font-mono text-violet-500">{s.id}</span>
                    <span>{s.author_handle}</span>
                    <span className="ml-auto text-violet-400">{s.platform.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Resolution note (if resolved) */}
            {grievance.resolution_note && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="text-xs text-emerald-700 font-semibold uppercase tracking-wide mb-1">
                  ✓ Resolution Note
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">{grievance.resolution_note}</p>
                {grievance.resolution_date && (
                  <p className="text-xs text-emerald-500 font-mono mt-1">{formatDateTime(grievance.resolution_date)}</p>
                )}
              </div>
            )}
          </div>

          {/* ── Right: AI scores + actions ── */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Department */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Building2 size={12} className="text-blue-500" />
                <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Department</span>
              </div>
              <div className="text-sm font-medium text-slate-800">{grievance.department}</div>
              <div className="text-xs text-slate-500 mt-0.5">{grievance.category}</div>
            </div>

            {/* AI scores */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-3">
              <div className="flex items-center gap-1.5">
                <Brain size={12} className="text-violet-600" />
                <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">AI Intelligence</span>
              </div>

              <RiskBar label="Severity" value={grievance.severity_score} maxValue={10} />
              <RiskBar label="Authenticity Risk" value={grievance.authenticity_risk_score} maxValue={100} />

              <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border font-medium ${
                isSuspicious
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                {isSuspicious ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                {grievance.authenticity_flag}
              </div>

              {(analysisResult?.summary || grievance.ai_summary) && (
                <div className="bg-violet-50 border border-violet-200 rounded-lg p-2.5">
                  <div className="text-xs text-violet-700 font-semibold mb-1">
                    {grievance.analysis_mode === 'gemini' ? 'Gemini Summary' : 'Analysis Summary'}
                  </div>
                  <p className="text-xs text-violet-800 italic leading-relaxed">
                    &ldquo;{analysisResult?.summary || grievance.ai_summary}&rdquo;
                  </p>
                </div>
              )}

              <button
                onClick={handleReanalyze}
                disabled={analyzeLoading}
                className="btn-primary w-full justify-center text-xs py-1.5 gap-1.5"
              >
                {analyzeLoading ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                {analyzeLoading ? 'Analysing…' : `Re-analyze with ${grievance.analysis_mode === 'gemini' ? 'Gemini' : 'local'} analysis`}
              </button>
            </div>

            {/* Status lifecycle stepper */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-3">Resolution Lifecycle</div>
              <div className="flex flex-col gap-1">
                {STATUS_FLOW.map((s, idx) => {
                  const isPast    = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  const sc        = STATUS_CFG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => !isCurrent && handleStatusChange(s)}
                      disabled={statusLoading || isCurrent}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border text-left ${
                        isCurrent
                          ? `cursor-default ${sc.bg} ${sc.text} ${sc.border}`
                          : isPast
                            ? 'opacity-40 line-through cursor-pointer hover:opacity-60 border-slate-200 text-slate-500'
                            : 'cursor-pointer hover:bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isCurrent ? sc.dot : isPast ? 'bg-emerald-400' : 'bg-slate-300'
                        }`}
                      />
                      {s}
                      {isCurrent && <span className="ml-auto text-xs opacity-40">current</span>}
                    </button>
                  );
                })}
              </div>
              {statusLoading && (
                <div className="flex items-center gap-2 mt-2 text-xs text-blue-600">
                  <Loader2 size={11} className="animate-spin" /> Updating…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}
