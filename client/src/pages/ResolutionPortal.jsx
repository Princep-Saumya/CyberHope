import { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2, Clock, AlertTriangle, FileText, Save,
  ChevronRight, MapPin, Building2, Calendar,
  User, Download, Zap, Loader2, Megaphone, X, ExternalLink, Image as ImgIcon
} from 'lucide-react';
import { api } from '../services/api';
import { formatDateTime, formatDistanceToNow } from '../utils/dateUtils';
import { getSafeSourceUrl } from '../utils/urlUtils';
import { getSlaInfo } from '../utils/resolutionSla';

const STATUS_FLOW = ['Received', 'Assigned', 'Under Investigation', 'Resolved', 'Closed'];
const ACTIVE_DISPATCH_STATUSES = ['Assigned', 'Under Investigation', 'Resolved', 'Closed', 'Escalated to DM'];

const STATUS_CFG = {
  Received:              { bg: 'bg-slate-100',      text: 'text-slate-700',   dot: '#94a3b8', border: 'border-slate-200' },
  Assigned:              { bg: 'bg-blue-50',         text: 'text-blue-700',    dot: '#3b82f6', border: 'border-blue-200' },
  'Under Investigation': { bg: 'bg-amber-50',        text: 'text-amber-700',   dot: '#f59e0b', border: 'border-amber-200' },
  Resolved:              { bg: 'bg-emerald-50',      text: 'text-emerald-700', dot: '#22c55e', border: 'border-emerald-200' },
  Closed:                { bg: 'bg-slate-50',        text: 'text-slate-500',   dot: '#cbd5e1', border: 'border-slate-200' },
  'Escalated to DM':     { bg: 'bg-rose-50',         text: 'text-rose-700',    dot: '#f43f5e', border: 'border-rose-200' },
};

const RESPONSE_TEMPLATES = {
  Received: 'Your complaint ({id}) regarding {category} in {location} has been received. Reference No: {id}. We will update you within 24 hours.',
  Assigned: 'Complaint {id} has been assigned to {department} for immediate review. An officer will contact you shortly.',
  'Under Investigation': 'Investigation is underway for complaint {id}. Our team is on-site at {location}. Expected resolution: 72 hours.',
  Resolved: 'Complaint {id} regarding {category} in {location} has been resolved. Thank you for your report.',
  Closed: 'Complaint {id} has been closed. If the issue persists, file a new complaint referencing {id}.',
  'Escalated to DM': 'Complaint {id} has been escalated to the District Nodal Officer / District Magistrate for urgent intervention.',
};

function fillTemplate(t, g) {
  return (t || '').replace(/{id}/g, g.id).replace(/{category}/g, g.category)
    .replace(/{location}/g, g.location_tagged).replace(/{department}/g, g.department);
}

function exportCSV(grievances) {
  const headers = ['Complaint ID','District','Department','Category','Status','Severity','Risk Score','Authenticity Flag','Filed At'];
  const rows    = grievances.map(g => [
    g.id, g.location_tagged, `"${g.department}"`, `"${g.category}"`,
    g.status, g.severity_score, g.authenticity_risk_score, `"${g.authenticity_flag}"`, g.timestamp,
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a   = Object.assign(document.createElement('a'), { href: url, download: `JanSuno_SLA_Audit_${new Date().toISOString().slice(0,10)}.csv` });
  a.click(); URL.revokeObjectURL(url);
}

function LifecycleStepper({ currentStatus, grievanceId, onUpdate, onError }) {
  const [loading, setLoading] = useState(false);
  const currentIdx = STATUS_FLOW.indexOf(currentStatus);
  const handle = async (status) => {
    if (status === currentStatus) return;
    setLoading(true);
    try { await onUpdate(grievanceId, status); } catch(e) { onError(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="flex items-center w-full">
      {STATUS_FLOW.map((s, idx) => {
        const isDone = idx < currentIdx, isCurrent = idx === currentIdx;
        const cfg = STATUS_CFG[s];
        return (
          <div key={s} className="flex items-center flex-1 min-w-0">
            <button onClick={() => handle(s)} disabled={loading || isCurrent}
              className="flex flex-col items-center gap-1 flex-1 min-w-0 px-1 py-2 rounded-xl transition-all hover:bg-slate-100 disabled:cursor-default" title={s}>
              <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-transform duration-200 hover:scale-110"
                style={{ background: isDone ? '#22c55e' : isCurrent ? cfg.dot : '#f1f5f9', borderColor: isDone ? '#22c55e' : isCurrent ? cfg.dot : '#e2e8f0' }}>
                {isDone ? <CheckCircle2 size={14} className="text-white" />
                  : isCurrent ? <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                  : <span className="w-2 h-2 rounded-full bg-slate-300" />}
              </div>
              <span className="font-bold truncate w-full text-center text-xs mt-0.5"
                style={{ color: isCurrent ? cfg.dot : isDone ? '#22c55e' : '#94a3b8' }}>{s}</span>
            </button>
            {idx < STATUS_FLOW.length - 1 && (
              <div className="h-0.5 w-4 flex-shrink-0 mx-1 transition-all"
                style={{ background: idx < currentIdx ? '#22c55e' : '#e2e8f0' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── DETAIL POP-UP MODAL ─────────────────────────────────────────────────────
function ResolutionDetailModal({ grievance, onClose, onUpdate, onEscalate }) {
  const [localStatus, setLocal] = useState(grievance.status);
  const [localAudit, setAudit] = useState(grievance.audit_log || []);
  const [response, setResponse] = useState(() => fillTemplate(RESPONSE_TEMPLATES[grievance.status] || '', grievance));
  const [acknowledgmentRecorded, setAcknowledgmentRecorded] = useState(Boolean(grievance.acknowledgment));
  const [ackLoading, setAckLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiResponseSource, setAiResponseSource] = useState('');
  const [escLoading, setEscLoading] = useState(false);
  const [isEscalated, setEscalated] = useState(grievance.status === 'Escalated to DM');

  const cfg = STATUS_CFG[localStatus] || STATUS_CFG.Received;
  const sla = getSlaInfo({ ...grievance, status: localStatus });

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleUpdateStatus = async (id, status) => {
    setActionError('');
    await onUpdate(id, status);
    setLocal(status);
    setResponse(fillTemplate(RESPONSE_TEMPLATES[status] || '', grievance));
  };

  const handleGenerateAI = async () => {
    setAiLoading(true);
    setActionError('');
    try {
      const r = await api.generateOfficialResponse(grievance.id);
      setAiResponse(r.response);
      setAiResponseSource(r.source);
      setResponse(r.response);
    } catch(e) {
      setActionError(`Could not generate response: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleEscalateAction = async () => {
    setEscLoading(true);
    setActionError('');
    try {
      const r = await onEscalate(grievance.id);
      setLocal('Escalated to DM');
      setAudit(r.record?.audit_log || [...localAudit, { action: 'ESCALATED_TO_DM', timestamp: new Date().toISOString(), by: 'System', note: 'Escalated to DM due to SLA breach' }]);
      setEscalated(true);
    } catch(e) {
      setActionError(`Could not escalate: ${e.message}`);
    } finally {
      setEscLoading(false);
    }
  };

  const handleRecordAck = async () => {
    setAckLoading(true);
    setActionError('');
    try {
      const result = await api.recordAcknowledgment(grievance.id, response);
      setAudit(result.record.audit_log || []);
      setAcknowledgmentRecorded(true);
    } catch(e) {
      setActionError(`Could not save acknowledgment: ${e.message}`);
    } finally {
      setAckLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 animate-modal-spring"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2 rounded-xl shrink-0 border bg-blue-50 border-blue-200 text-blue-700">
              <Building2 size={20} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-extrabold text-slate-900 truncate">
                  {grievance.category || 'Public Grievance'}
                </span>
                <span className={`badge border text-xs font-bold px-2.5 py-0.5 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                  {localStatus}
                </span>
                {sla && (
                  <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    sla.overdue ? 'bg-rose-50 border-rose-200 text-rose-700 animate-glow-rose' : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}>
                    <Clock size={11} /> {sla.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-mono flex-wrap">
                <span className="font-bold text-slate-800">{grievance.id}</span>
                <span>·</span>
                <span>{grievance.location_tagged || 'Bihar'}</span>
                <span>·</span>
                <span>{grievance.department || 'General Administration'}</span>
                <span>·</span>
                <span>Filed {formatDistanceToNow(grievance.timestamp)}</span>
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

          {/* Action error banner */}
          {actionError && (
            <div role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* ════ SECTION 1: CITIZEN REPORT CONTENT & EVIDENCE ════ */}
          <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <FileText size={14} className="text-blue-600" /> Citizen Grievance Statement & Media Evidence
            </span>

            <p className="text-sm text-slate-800 font-sans leading-relaxed bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 italic">
              "{grievance.post_text}"
            </p>

            {grievance.image_url && (
              <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 max-h-60 bg-slate-900 relative">
                <img
                  src={grievance.image_url}
                  alt="Evidence"
                  className="w-full h-full object-cover max-h-60"
                  onError={e => { e.target.style.display = 'none'; }}
                />
                {getSafeSourceUrl(grievance.source_url, grievance.platform) && (
                  <a
                    href={getSafeSourceUrl(grievance.source_url, grievance.platform)}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-2 right-2 px-3 py-1 text-xs font-semibold text-white bg-slate-900/80 hover:bg-slate-900 rounded-lg flex items-center gap-1.5 backdrop-blur shadow"
                  >
                    <span>Inspect Source</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}
          </section>

          {/* ════ SECTION 2: STATUS LIFECYCLE STEPPER ════ */}
          <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> Progression Lifecycle Stepper
              </span>
              <span className="text-xs text-slate-400">Click a stage to update resolution state</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <LifecycleStepper currentStatus={localStatus} grievanceId={grievance.id} onUpdate={handleUpdateStatus} onError={setActionError} />
            </div>
          </section>

          {/* ════ SECTION 3: ESCALATION BANNER (IF OVERDUE) ════ */}
          {sla?.overdue && !isEscalated && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <Megaphone size={18} />
                </span>
                <div>
                  <div className="text-sm font-bold text-rose-800">SLA Breach Detected ({sla.label})</div>
                  <div className="text-xs text-rose-600">Standard response timeline has lapsed. Official escalation required.</div>
                </div>
              </div>
              <button
                onClick={handleEscalateAction}
                disabled={escLoading}
                className="btn-danger text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5"
              >
                {escLoading ? <Loader2 size={13} className="animate-spin" /> : <Megaphone size={13} />}
                <span>Escalate to District Magistrate</span>
              </button>
            </div>
          )}

          {/* ════ SECTION 4: ACTIONS & AUDIT GRID ════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Left: Metadata & Audit Timeline */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="text-slate-500 mb-1 flex items-center gap-1"><User size={12}/> Author / Handle</div>
                  <div className="font-bold text-slate-900 truncate">{grievance.author_handle || '@citizen'}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="text-slate-500 mb-1 flex items-center gap-1"><Calendar size={12}/> Registered At</div>
                  <div className="font-bold text-slate-900 truncate">{formatDateTime(grievance.timestamp)}</div>
                </div>
              </div>

              {grievance.resolution_note && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 size={13}/> Official Resolution Note
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed">{grievance.resolution_note}</p>
                  {grievance.resolution_date && (
                    <div className="text-[11px] text-emerald-700 mt-1.5 font-mono">{formatDateTime(grievance.resolution_date)}</div>
                  )}
                </div>
              )}

              {localAudit.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Legally Traceable Audit Timeline
                  </div>
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {localAudit.map((entry, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 mt-1" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-800">{entry.action}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {entry.timestamp?.slice(0, 16).replace('T', ' ')}
                            </span>
                          </div>
                          <div className="text-slate-600 mt-0.5 leading-snug">{entry.note}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: AI Response Draft & Citizen Acknowledgment */}
            <div className="space-y-4">
              {/* AI Draft Generator */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Zap size={13} className="text-amber-500" /> Automated AI Response Draft
                </div>
                <button
                  onClick={handleGenerateAI}
                  disabled={aiLoading}
                  className="w-full flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs disabled:opacity-60 mb-2"
                >
                  {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                  <span>{aiLoading ? 'Generating AI Response...' : '⚡ Generate Draft for Review'}</span>
                </button>
                {aiResponse && (
                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 italic leading-relaxed">
                    "{aiResponse}"
                  </div>
                )}
              </div>

              {/* Citizen Response Draft Console */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <FileText size={13} className="text-blue-600" /> Official Response Dispatch
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Draft an official communication. Saving stamps the dispatch text into the local audit trail.
                </p>
                <textarea
                  rows={4}
                  value={response}
                  onChange={e => setResponse(e.target.value)}
                  className="input-field resize-none text-xs font-mono leading-relaxed mb-3 rounded-xl p-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleRecordAck}
                    disabled={ackLoading}
                    className="text-xs font-bold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-xl px-4 py-2 flex-1 justify-center inline-flex items-center gap-2 transition-all shadow-xs disabled:opacity-60 active:scale-95"
                  >
                    {ackLoading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>{ackLoading ? 'Saving draft…' : acknowledgmentRecorded ? 'Draft Saved to Audit Log' : 'Save Response to Audit'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setResponse(fillTemplate(RESPONSE_TEMPLATES[localStatus] || '', grievance));
                      setAcknowledgmentRecorded(Boolean(grievance.acknowledgment));
                      setActionError('');
                    }}
                    className="btn-secondary text-xs py-2 px-3 rounded-xl"
                  >
                    Reset
                  </button>
                </div>
                {acknowledgmentRecorded && (
                  <div className="mt-2.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 font-medium flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Saved to official audit trail. Ready for departmental transmission.</span>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* ── Modal Footer ── */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="font-mono text-[11px]">Bihar Cyber Crime & Disinformation Monitoring Unit</span>
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

// ── COMPACT LIST CARD ROW ───────────────────────────────────────────────────
function ResolutionRow({ g, onOpenModal, onEscalate, onAssign }) {
  const [assigning, setAssigning] = useState(false);
  const [assignmentError, setAssignmentError] = useState('');
  const cfg = STATUS_CFG[g.status] || STATUS_CFG.Received;
  const sla = getSlaInfo(g);
  const isEscalated = g.status === 'Escalated to DM';

  const assignToDepartment = async (event) => {
    event.stopPropagation();
    setAssigning(true);
    setAssignmentError('');
    try {
      await onAssign(g.id, 'Assigned');
    } catch (error) {
      setAssignmentError(error.message);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div
      onClick={() => onOpenModal(g)}
      className={`group card interactive-card animate-fade-slide-up rounded-2xl border p-4 cursor-pointer transition-all duration-200 bg-white hover:border-blue-400 hover:shadow-md flex items-center justify-between gap-4 flex-wrap ${
        isEscalated ? 'border-rose-300' :
        sla?.overdue ? 'border-rose-200' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <span className="relative flex-shrink-0">
          <span className="w-3 h-3 rounded-full block" style={{ background: cfg.dot }} />
          {sla?.overdue && !isEscalated && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse border border-white" />
          )}
        </span>
        <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-center">
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
              {g.title || g.headline || g.ai_summary || g.post_text || g.category || 'Public Grievance'}
            </div>
            <div className="text-[11px] text-slate-500 truncate">{g.category || 'Public grievance'}</div>
            <div className="text-xs text-slate-400 font-mono">{g.id}</div>
          </div>
          <div className="text-xs text-slate-600 flex items-center gap-1.5 truncate">
            <MapPin size={12} className="text-emerald-600 flex-shrink-0" />
            <span className="truncate">{g.location_tagged || 'Location unverified'}</span>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
            <Building2 size={12} className="text-slate-400 flex-shrink-0" />
            <span className="truncate">{g.department?.split('(')[0]?.trim() || 'General Administration'}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge border text-xs font-bold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
              {g.status}
            </span>
            {sla && (
              <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                sla.overdue ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                <Clock size={11} />
                {sla.label}
              </span>
            )}
            {isEscalated && (
              <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700">
                🚨 Escalated
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-shrink-0">
        {g.status === 'Received' && (
          <button
            type="button"
            onClick={assignToDepartment}
            disabled={assigning}
            className="flex items-center gap-1 rounded-xl bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            <Building2 size={11} /> {assigning ? 'Assigning…' : `Assign to ${g.department?.split('(')[0]?.trim() || 'department'}`}
          </button>
        )}
        {sla?.overdue && !isEscalated && (
          <button
            onClick={e => {
              e.stopPropagation();
              onEscalate(g.id);
            }}
            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-xs"
          >
            <Megaphone size={11} /> Escalate to DM
          </button>
        )}
        {assignmentError && <span role="alert" className="text-xs text-rose-700">{assignmentError}</span>}
        <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:text-blue-800 transition-colors">
          <span>View Details</span>
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
}

// ── MAIN RESOLUTION PORTAL ──────────────────────────────────────────────────
export default function ResolutionPortal({ grievances, onUpdateStatus, onEscalate }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [selectedModalGrievance, setSelectedModalGrievance] = useState(null);

  const dispatchRecords = useMemo(
    () => grievances.filter(g => g.dispatch_approved_at || ACTIVE_DISPATCH_STATUSES.includes(g.status)),
    [grievances]
  );
  const pendingApprovalCount = useMemo(
    () => grievances.filter(g => g.status === 'Received' && !g.dispatch_approved_at
      && g.officer_verdict !== 'Confirmed Fake').length,
    [grievances]
  );
  const departments = useMemo(
    () => [...new Set(dispatchRecords.map(g => g.department).filter(Boolean))].sort(),
    [dispatchRecords]
  );

  const stats = useMemo(() => {
    const c = {};
    dispatchRecords.forEach(g => c[g.status] = (c[g.status]||0)+1);
    return c;
  }, [dispatchRecords]);

  const filtered = dispatchRecords.filter(g =>
    (!statusFilter || g.status === statusFilter) &&
    (!departmentFilter || g.department === departmentFilter)
  );

  const overdueCount = useMemo(
    () => dispatchRecords.filter(g => getSlaInfo(g)?.overdue).length,
    [dispatchRecords]
  );

  const ALL_STATUSES = [...STATUS_FLOW, 'Escalated to DM'];

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-base font-bold text-slate-800">Complaint Resolution Tracker</div>
          <div className="text-xs text-slate-500">{dispatchRecords.length} internal dispatch tickets across Bihar districts</div>
          {pendingApprovalCount > 0 && (
            <div className="mt-1 text-xs text-amber-700">
              {pendingApprovalCount} report{pendingApprovalCount === 1 ? '' : 's'} awaiting operator approval; not yet in the internal dispatch queue.
            </div>
          )}
          <div className="mt-1 text-xs text-amber-800">
            Only operator-approved reports and actively assigned cases appear here. Queue updates are internal; this app does not dispatch externally.
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            aria-label="Filter by department"
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="select-field max-w-xs"
          >
            <option value="">All departments</option>
            {departments.map(department => <option key={department} value={department}>{department}</option>)}
          </select>
          <button onClick={() => exportCSV(filtered)} className="btn-secondary text-sm font-semibold">
            <Download size={14}/>📥 Export SLA Audit Report
          </button>
        </div>
      </div>

      {/* Status KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {ALL_STATUSES.map(s => {
          const cfg    = STATUS_CFG[s] || STATUS_CFG.Received;
          const isAct  = statusFilter === s;
          return (
            <button key={s} onClick={() => setStatusFilter(isAct ? '' : s)}
              className={`kpi-card text-left transition-all ${isAct ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white' : ''}`}>
              <div className="text-xl font-bold font-mono text-slate-800">{stats[s] || 0}</div>
              <div className={`text-xs font-semibold ${cfg.text}`}>{s}</div>
            </button>
          );
        })}
      </div>

      {overdueCount > 0 && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <span className="relative flex-shrink-0">
            <AlertTriangle size={18} className="text-rose-500"/>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse border-2 border-white"/>
          </span>
          <div>
            <span className="text-sm font-bold text-rose-700">{overdueCount} complaint{overdueCount > 1 ? 's' : ''} have exceeded SLA</span>
            <span className="text-xs text-rose-500 ml-2">— Click any row to inspect details or Escalate to DM</span>
          </div>
        </div>
      )}

      {/* ── Compact, Clean List View of Reports ── */}
      <div className="flex flex-col gap-2.5">
        {filtered.length === 0
          ? <div className="card p-10 text-center text-slate-400 font-medium">No complaints in this status</div>
          : filtered.map(g => (
              <ResolutionRow
                key={g.id}
                g={g}
                onOpenModal={setSelectedModalGrievance}
                onEscalate={onEscalate}
                onAssign={onUpdateStatus}
              />
            ))}
      </div>

      {/* ── Detail Pop-Up Modal ── */}
      {selectedModalGrievance && (
        <ResolutionDetailModal
          grievance={selectedModalGrievance}
          onClose={() => setSelectedModalGrievance(null)}
          onUpdate={onUpdateStatus}
          onEscalate={onEscalate}
        />
      )}
    </div>
  );
}
