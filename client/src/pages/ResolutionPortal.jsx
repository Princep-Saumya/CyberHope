import { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2, Clock, AlertTriangle, FileText, Send,
  ChevronDown, ChevronRight, MapPin, Building2, Calendar,
  User, Download, Zap, Loader2, Megaphone
} from 'lucide-react';
import { api } from '../services/api';
import { formatDateTime, formatDistanceToNow } from '../utils/dateUtils';

const STATUS_FLOW = ['Received', 'Assigned', 'Under Investigation', 'Resolved', 'Closed'];
const SLA_HOURS   = { Received: 4, Assigned: 24, 'Under Investigation': 72, Resolved: 0, Closed: 0, 'Escalated to DM': 0 };

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

function getSlaInfo(g) {
  const slaHrs = SLA_HOURS[g.status] || 0;
  if (slaHrs === 0) return null;
  const remaining = new Date(g.timestamp).getTime() + slaHrs * 3600000 - Date.now();
  const overdue   = remaining < 0;
  const absH = Math.abs(Math.floor(remaining / 3600000));
  const absM = Math.abs(Math.floor((remaining % 3600000) / 60000));
  return { overdue, label: overdue ? `OVERDUE by ${absH}h ${absM}m` : `${absH}h ${absM}m left` };
}

function exportCSV(grievances) {
  const headers = ['Complaint ID','District','Department','Category','Status','Severity','Risk Score','Authenticity Flag','Filed At'];
  const rows    = grievances.map(g => [
    g.id, g.location_tagged, `"${g.department}"`, `"${g.category}"`,
    g.status, g.severity_score, g.authenticity_risk_score, `"${g.authenticity_flag}"`, g.timestamp,
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a   = Object.assign(document.createElement('a'), { href: url, download: `GrievancePulse_SLA_Audit_${new Date().toISOString().slice(0,10)}.csv` });
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
              className="flex flex-col items-center gap-1 flex-1 min-w-0 px-1 py-2 rounded-lg transition-all hover:bg-slate-100 disabled:cursor-default" title={s}>
              <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{ background: isDone ? '#22c55e' : isCurrent ? cfg.dot : '#f1f5f9', borderColor: isDone ? '#22c55e' : isCurrent ? cfg.dot : '#e2e8f0' }}>
                {isDone ? <CheckCircle2 size={12} className="text-white" />
                  : isCurrent ? <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  : <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
              </div>
              <span className="font-medium truncate w-full text-center"
                style={{ fontSize: 10, color: isCurrent ? cfg.dot : isDone ? '#22c55e' : '#94a3b8' }}>{s}</span>
            </button>
            {idx < STATUS_FLOW.length - 1 && (
              <div className="h-0.5 w-3 flex-shrink-0 mx-0.5 transition-all"
                style={{ background: idx < currentIdx ? '#22c55e' : '#e2e8f0' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ResolutionRow({ g, onUpdate, onEscalate }) {
  const [expanded, setExpanded]     = useState(false);
  const [localStatus, setLocal]     = useState(g.status);
  const [localAudit, setAudit]      = useState(g.audit_log || []);
  const [response, setResponse]     = useState(() => fillTemplate(RESPONSE_TEMPLATES[g.status] || '', g));
  const [acknowledgmentRecorded, setAcknowledgmentRecorded] = useState(Boolean(g.acknowledgment));
  const [ackLoading, setAckLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiResponseSource, setAiResponseSource] = useState('');
  const [escLoading, setEscLoading] = useState(false);
  const [isEscalated, setEscalated] = useState(false);

  const cfg = STATUS_CFG[localStatus] || STATUS_CFG.Received;
  const sla = getSlaInfo({ ...g, status: localStatus });

  useEffect(() => { setLocal(g.status); }, [g.status]);
  useEffect(() => {
    setAudit(g.audit_log || []);
    setAcknowledgmentRecorded(Boolean(g.acknowledgment));
  }, [g.audit_log, g.acknowledgment]);

  const handleUpdate = async (id, status) => {
    setActionError('');
    await onUpdate(id, status);
    setLocal(status);
    setResponse(fillTemplate(RESPONSE_TEMPLATES[status] || '', g));
  };

  const handleGenerateAI = async () => {
    setAiLoading(true);
    setActionError('');
    try {
      const r = await api.generateOfficialResponse(g.id);
      setAiResponse(r.response);
      setAiResponseSource(r.source);
      setResponse(r.response);
    } catch(e) {
      setActionError(`Could not generate a response: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleEscalate = async () => {
    setEscLoading(true);
    setActionError('');
    try {
      const r = await onEscalate(g.id);
      setLocal('Escalated to DM');
      setAudit(r.record?.audit_log || [...localAudit, { action: 'ESCALATED_TO_DM', timestamp: new Date().toISOString(), by: 'System', note: 'Escalated to DM due to SLA breach' }]);
      setEscalated(true);
    } catch(e) {
      setActionError(`Could not escalate this report: ${e.message}`);
    } finally {
      setEscLoading(false);
    }
  };

  const handleRecordAcknowledgment = async () => {
    setAckLoading(true);
    setActionError('');
    try {
      const result = await api.recordAcknowledgment(g.id, response);
      setAudit(result.record.audit_log || []);
      setAcknowledgmentRecorded(true);
    } catch(e) {
      setActionError(`Could not save the acknowledgment: ${e.message}`);
    } finally {
      setAckLoading(false);
    }
  };

  return (
    <div className={`rounded-xl border overflow-hidden transition-all duration-200 bg-white ${
      isEscalated ? 'border-rose-300' :
      sla?.overdue ? 'border-rose-200' : 'border-slate-200'
    }`}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(e => !e)}>
        <span className="relative flex-shrink-0">
          <span className="w-2.5 h-2.5 rounded-full block" style={{ background: cfg.dot }} />
          {sla?.overdue && !isEscalated && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse border border-white" />
          )}
        </span>
        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-800 truncate">{g.category}</div>
            <div className="text-xs text-slate-400 font-mono">{g.id}</div>
          </div>
          <div className="text-sm text-slate-600 flex items-center gap-1.5">
            <MapPin size={11} className="text-emerald-600 flex-shrink-0"/>{g.location_tagged}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
            <Building2 size={11} className="text-slate-400 flex-shrink-0"/>
            <span className="truncate">{g.department?.split('(')[0]?.trim()}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge border text-xs font-bold ${cfg.bg} ${cfg.text} ${cfg.border}`}>{localStatus}</span>
            {sla && (
              <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${
                sla.overdue ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                <Clock size={10}/>{sla.label}
              </span>
            )}
            {sla?.overdue && !isEscalated && (
              <button onClick={e => { e.stopPropagation(); handleEscalate(); }} disabled={escLoading}
                className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors">
                {escLoading ? <Loader2 size={10} className="animate-spin"/> : <Megaphone size={10}/>} Escalate to DM
              </button>
            )}
            {isEscalated && (
              <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700">🚨 Escalated to DM</span>
            )}
          </div>
        </div>
        {expanded ? <ChevronDown size={14} className="text-slate-400 flex-shrink-0"/> : <ChevronRight size={14} className="text-slate-400 flex-shrink-0"/>}
      </div>

      {actionError && (
        <div role="alert" className="mx-4 mb-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
          {actionError}
        </div>
      )}

      {expanded && (
        <div className="border-t border-slate-100 p-4 bg-slate-50 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Status Lifecycle</div>
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <LifecycleStepper currentStatus={localStatus} grievanceId={g.id} onUpdate={handleUpdate} onError={setActionError}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                <div className="text-slate-500 mb-0.5 flex items-center gap-1"><User size={10}/>Author</div>
                <div className="font-bold text-slate-800">{g.author_handle}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                <div className="text-slate-500 mb-0.5 flex items-center gap-1"><Calendar size={10}/>Filed</div>
                <div className="font-bold text-slate-800">{formatDistanceToNow(g.timestamp)}</div>
              </div>
            </div>
            {g.resolution_note && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="text-xs font-bold text-emerald-700 mb-1 flex items-center gap-1"><CheckCircle2 size={11}/>Resolution Note</div>
                <p className="text-xs text-emerald-800 leading-relaxed">{g.resolution_note}</p>
                {g.resolution_date && <div className="text-xs text-emerald-600 mt-1 font-mono">{formatDateTime(g.resolution_date)}</div>}
              </div>
            )}
            {localAudit.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Audit Timeline</div>
                <div className="flex flex-col gap-2">
                  {localAudit.map((entry, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0 mt-1"/>
                      <div>
                        <span className="font-bold text-slate-700">{entry.action}</span>
                        <span className="text-slate-400 ml-1 font-mono">{entry.timestamp?.slice(0,16).replace('T',' ')}</span>
                        <div className="text-slate-500">{entry.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Zap size={11} className="text-amber-500"/>AI Response Draft
              </div>
              <button onClick={handleGenerateAI} disabled={aiLoading}
                className="w-full flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-sm font-bold px-4 py-2.5 rounded-lg transition-colors mb-2">
                {aiLoading ? <Loader2 size={13} className="animate-spin"/> : <Zap size={13}/>}
                {aiLoading ? 'Generating...' : '⚡ Generate Draft for Review'}
              </button>
              {aiResponseSource && (
                <div className="text-xs text-slate-500 mb-2">
                  Generated by {aiResponseSource?.startsWith('gemini') ? 'Gemini' : 'a response template'}. Review before use; it is not sent automatically.
                </div>
              )}
              {aiResponse && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 italic leading-relaxed">"{aiResponse}"</div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <FileText size={11}/>Citizen Acknowledgment
              </div>
              <textarea rows={4} value={response}
                onChange={e => setResponse(e.target.value)}
                className="input-field resize-none text-xs font-mono leading-relaxed mb-2"/>
              <div className="flex gap-2">
                <button onClick={handleRecordAcknowledgment} disabled={ackLoading} className="btn-primary text-xs py-1.5 flex-1 justify-center disabled:opacity-60">
                  {ackLoading ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>}
                  {acknowledgmentRecorded ? '✓ Recorded locally' : ackLoading ? 'Saving…' : 'Record Acknowledgment'}
                </button>
                <button onClick={() => {
                  setResponse(fillTemplate(RESPONSE_TEMPLATES[localStatus] || '', g));
                  setAcknowledgmentRecorded(Boolean(g.acknowledgment));
                  setActionError('');
                }} className="btn-secondary text-xs py-1.5 px-3">Reset</button>
              </div>
              {acknowledgmentRecorded && (
                <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 font-medium">
                  Saved to the temporary in-memory audit only. No message was sent to the citizen.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResolutionPortal({ grievances, onUpdateStatus, onEscalate }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const departments = useMemo(
    () => [...new Set(grievances.map(g => g.department).filter(Boolean))].sort(),
    [grievances]
  );

  const stats = useMemo(() => {
    const c = {};
    grievances.forEach(g => c[g.status] = (c[g.status]||0)+1);
    return c;
  }, [grievances]);

  const filtered = grievances.filter(g =>
    (!statusFilter || g.status === statusFilter) &&
    (!departmentFilter || g.department === departmentFilter)
  );
  const overdueCount = useMemo(() => grievances.filter(g => {
    const sla = SLA_HOURS[g.status]; if (!sla) return false;
    return Date.now() > new Date(g.timestamp).getTime() + sla * 3600000;
  }).length, [grievances]);

  const ALL_STATUSES = [...STATUS_FLOW, 'Escalated to DM'];

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-base font-bold text-slate-800">Complaint Resolution Tracker</div>
          <div className="text-xs text-slate-500">{grievances.length} total complaints across Bihar districts</div>
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
            <span className="text-xs text-rose-500 ml-2">— Use "Escalate to DM" on each overdue row</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {filtered.length === 0
          ? <div className="card p-10 text-center text-slate-400 font-medium">No complaints in this status</div>
          : filtered.map(g => <ResolutionRow key={g.id} g={g} onUpdate={onUpdateStatus} onEscalate={onEscalate}/>)}
      </div>
    </div>
  );
}
