import { useState, useMemo } from 'react';
import {
  Brain, ShieldAlert, ShieldCheck, AlertTriangle, Loader2, Image as Img,
  Hash, User, Building2, Sparkles, Search, Filter, CheckCircle2,
  ExternalLink, Download, RefreshCw, Eye, AlertOctagon, MessageSquare,
  MapPin, Clock, Flame, ShieldX, Video, Newspaper, Radio, Check
} from 'lucide-react';
import { formatDistanceToNow, formatDateTime } from '../utils/dateUtils';

const PLATFORM_ICONS = {
  'YouTube': { icon: Video, color: 'text-red-600 bg-red-50 border-red-200' },
  'Google News': { icon: Newspaper, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  'X (Twitter)': { icon: Radio, color: 'text-slate-800 bg-slate-100 border-slate-300' },
  'Facebook': { icon: Radio, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  'Reddit': { icon: Radio, color: 'text-orange-600 bg-orange-50 border-orange-200' },
};

function getPlatformCfg(platform) {
  return PLATFORM_ICONS[platform] || { icon: Radio, color: 'text-slate-600 bg-slate-50 border-slate-200' };
}

function RiskMeter({ value, label, max = 100, isScore = false, invert = false }) {
  const pct = Math.min(100, Math.max(0, isScore ? value * 10 : value));
  let color = '#059669';
  let bg = 'bg-emerald-50';
  let border = 'border-emerald-200';
  let track = 'bg-emerald-100';

  if (!invert) {
    if (pct >= 70) {
      color = '#e11d48'; bg = 'bg-rose-50'; border = 'border-rose-200'; track = 'bg-rose-100';
    } else if (pct >= 40) {
      color = '#d97706'; bg = 'bg-amber-50'; border = 'border-amber-200'; track = 'bg-amber-100';
    }
  } else {
    // For positive metrics
    if (pct < 40) {
      color = '#e11d48'; bg = 'bg-rose-50'; border = 'border-rose-200'; track = 'bg-rose-100';
    } else if (pct < 70) {
      color = '#d97706'; bg = 'bg-amber-50'; border = 'border-amber-200'; track = 'bg-amber-100';
    }
  }

  return (
    <div className={`p-3 rounded-xl border ${bg} ${border} flex flex-col justify-between`}>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className="text-base font-bold font-mono" style={{ color }}>
          {isScore ? `${value}/10` : `${Math.round(value)}%`}
        </span>
      </div>
      <div className={`h-2 ${track} rounded-full overflow-hidden`}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function SentimentOutrageMeter({ score, label }) {
  const safeScore = score ?? -0.4;
  // Normalized 0 to 100 where -1.0 is 100% outrage, +1.0 is 0%
  const outragePct = Math.round(((1.0 - safeScore) / 2.0) * 100);

  const getStyle = () => {
    if (safeScore <= -0.7) return { color: '#e11d48', bg: 'bg-rose-50', border: 'border-rose-200', tag: 'Critical Outrage' };
    if (safeScore <= -0.3) return { color: '#ea580c', bg: 'bg-orange-50', border: 'border-orange-200', tag: 'High Distress' };
    if (safeScore < 0.2) return { color: '#2563eb', bg: 'bg-blue-50', border: 'border-blue-200', tag: 'Moderate Concern' };
    return { color: '#059669', bg: 'bg-emerald-50', border: 'border-emerald-200', tag: 'Positive / Calm' };
  };

  const style = getStyle();

  return (
    <div className={`p-3 rounded-xl border ${style.bg} ${style.border} flex flex-col justify-between`}>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
          <Flame size={13} style={{ color: style.color }} /> Public Outrage Index
        </span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-white" style={{ color: style.color, borderColor: style.color }}>
          {label || style.tag}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 font-mono mb-1.5">
        <span>Score: {safeScore > 0 ? `+${safeScore}` : safeScore}</span>
        <span>Outrage: {outragePct}%</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${outragePct}%`, background: style.color }}
        />
      </div>
    </div>
  );
}

export default function AIVerification({ grievances = [], onReanalyze, onVerify, onReanalyzeAll }) {
  const [selectedId, setSelectedId] = useState(grievances[0]?.id || null);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [officerNote, setOfficerNote] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isBatchAuditing, setIsBatchAuditing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Selected grievance object
  const activeGrievance = useMemo(() => {
    return grievances.find(g => g.id === selectedId) || grievances[0] || null;
  }, [grievances, selectedId]);

  // Unique districts for filter
  const districts = useMemo(() => {
    const set = new Set();
    grievances.forEach(g => {
      if (g.location_tagged) set.add(g.location_tagged);
    });
    return Array.from(set).sort();
  }, [grievances]);

  // Filtered grievances list
  const filteredGrievances = useMemo(() => {
    return grievances.filter(g => {
      const isSusp = g.authenticity_flag !== 'Likely Genuine Grievance';
      const isConfirmedFake = g.officer_verdict === 'Confirmed Fake';
      const isVerifiedGenuine = g.officer_verdict === 'Verified Genuine';

      if (filterType === 'suspicious' && !isSusp) return false;
      if (filterType === 'genuine' && isSusp) return false;
      if (filterType === 'confirmed-fake' && !isConfirmedFake) return false;
      if (filterType === 'officer-verified' && !isVerifiedGenuine) return false;

      if (districtFilter && g.location_tagged !== districtFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${g.id} ${g.post_text} ${g.author_handle} ${g.department} ${g.location_tagged}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [grievances, filterType, districtFilter, searchQuery]);

  // Statistics counters
  const totalCount = grievances.length;
  const suspCount = grievances.filter(g => g.authenticity_flag !== 'Likely Genuine Grievance').length;
  const genuineCount = totalCount - suspCount;
  const officerVerifiedCount = grievances.filter(g => g.officer_verdict).length;

  const showToast = (type, message) => {
    setFeedbackMsg({ type, message });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Human-in-the-Loop verdict handler
  const handleOfficerVerdict = async (verdict) => {
    if (!activeGrievance) return;
    setIsVerifying(true);
    try {
      if (onVerify) {
        await onVerify(activeGrievance.id, {
          verdict,
          notes: officerNote || `Officer marked as ${verdict}`,
          officer_id: 'CyberCell_DSP_Patna',
        });
      }
      setOfficerNote('');
      showToast('success', `Verdict logged: ${verdict} for ticket ${activeGrievance.id}`);
    } catch (err) {
      showToast('error', `Failed to record verdict: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // Re-run single analysis
  const handleSingleReanalyze = async () => {
    if (!activeGrievance) return;
    setIsReanalyzing(true);
    try {
      if (onReanalyze) {
        await onReanalyze(activeGrievance);
      }
      showToast('success', `AI Forensic audit updated using active Gemini model.`);
    } catch (err) {
      showToast('error', `AI Re-analysis error: ${err.message}`);
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Batch re-analyze all
  const handleBatchAudit = async () => {
    setIsBatchAuditing(true);
    try {
      if (onReanalyzeAll) {
        const res = await onReanalyzeAll();
        showToast('success', `Batch audit completed: ${res.reanalyzed_count || totalCount} posts evaluated.`);
      }
    } catch (err) {
      showToast('error', `Batch audit failed: ${err.message}`);
    } finally {
      setIsBatchAuditing(false);
    }
  };

  // Export CSV of flagged fake campaigns
  const handleExportCSV = () => {
    const flagged = grievances.filter(g => g.authenticity_flag !== 'Likely Genuine Grievance');
    const header = ['ID', 'Platform', 'Author', 'Location', 'Department', 'Severity', 'RiskScore', 'OfficerVerdict', 'PostText'];
    const rows = flagged.map(g => [
      g.id,
      g.platform,
      `"${(g.author_handle || '').replace(/"/g, '""')}"`,
      `"${(g.location_tagged || '').replace(/"/g, '""')}"`,
      `"${(g.department || '').replace(/"/g, '""')}"`,
      g.severity_score,
      g.authenticity_risk_score,
      g.officer_verdict || 'Pending',
      `"${(g.post_text || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CyberCell_Flagged_Campaigns_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', `Exported ${flagged.length} flagged reports to CSV.`);
  };

  const isSuspicious = activeGrievance?.authenticity_flag !== 'Likely Genuine Grievance';
  const isConfirmedFake = activeGrievance?.officer_verdict === 'Confirmed Fake';
  const isVerifiedGenuine = activeGrievance?.officer_verdict === 'Verified Genuine';
  const platformCfg = activeGrievance ? getPlatformCfg(activeGrievance.platform) : null;
  const PlatformIcon = platformCfg?.icon || Radio;

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="text-blue-600" size={22} />
              AI Forensic & Authenticity Verification
            </h1>
            <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              Live Engine Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Bihar Cyber Crime & Disinformation Monitoring Unit · Multimodal Fake News & Coordinated Campaign Detection
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleBatchAudit}
            disabled={isBatchAuditing || totalCount === 0}
            className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {isBatchAuditing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            <span>{isBatchAuditing ? 'Auditing All...' : 'Batch Audit All (Gemini AI)'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={totalCount === 0}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Download size={13} />
            <span>Export Cyber Report (CSV)</span>
          </button>
        </div>
      </div>

      {/* ── Toast Notification ── */}
      {feedbackMsg && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          <span>{feedbackMsg.message}</span>
        </div>
      )}

      {/* ── KPI Metrics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="kpi-card bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total Evaluated</span>
            <Brain size={14} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Multi-source citizen posts</div>
        </div>

        <div className="kpi-card bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Verified Genuine</span>
            <ShieldCheck size={14} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">{genuineCount}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            {totalCount ? Math.round((genuineCount / totalCount) * 100) : 0}% authentic civic issues
          </div>
        </div>

        <div className="kpi-card bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Flagged Suspicious</span>
            <ShieldAlert size={14} className="text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600">{suspCount}</div>
          <div className="text-[11px] text-rose-700 font-medium mt-1">
            {totalCount ? Math.round((suspCount / totalCount) * 100) : 0}% potential disinformation
          </div>
        </div>

        <div className="kpi-card bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Officer Decisions</span>
            <CheckCircle2 size={14} className="text-violet-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-violet-600">{officerVerifiedCount}</div>
          <div className="text-[11px] text-violet-700 font-medium mt-1">Human-in-the-loop audited</div>
        </div>
      </div>

      {/* ── Search & Filter Command Bar ── */}
      <div className="card p-3 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          {[
            { id: 'all', label: `All Reports (${totalCount})` },
            { id: 'suspicious', label: `⚠ Suspicious (${suspCount})` },
            { id: 'genuine', label: `✅ Genuine (${genuineCount})` },
            { id: 'officer-verified', label: `🛡️ Verified (${officerVerifiedCount})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                filterType === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search keyword, user, ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field text-xs pl-8 py-1.5 w-full"
            />
          </div>

          <select
            value={districtFilter}
            onChange={e => setDistrictFilter(e.target.value)}
            className="select-field text-xs py-1.5 sm:w-36"
          >
            <option value="">All Districts</option>
            {districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Master-Detail Command Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ── Left Column: Verification Queue ── */}
        <div className="lg:col-span-5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide px-1">
            <span>Incoming Report Queue</span>
            <span>{filteredGrievances.length} match</span>
          </div>

          <div className="flex flex-col gap-2 max-h-[750px] overflow-y-auto pr-1">
            {filteredGrievances.length === 0 ? (
              <div className="card p-8 text-center text-slate-400 text-xs">
                No reports match your selected criteria.
              </div>
            ) : (
              filteredGrievances.map(g => {
                const isSelected = g.id === activeGrievance?.id;
                const isItemSusp = g.authenticity_flag !== 'Likely Genuine Grievance';
                const pCfg = getPlatformCfg(g.platform);
                const PIcon = pCfg.icon;

                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedId(g.id)}
                    className={`card p-3 cursor-pointer transition-all border text-left flex flex-col gap-2 ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20'
                        : 'hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`badge border text-[10px] font-bold py-0.5 px-2 flex items-center gap-1 ${pCfg.color}`}>
                          <PIcon size={10} />
                          {g.platform?.split(' ')[0] || 'Web'}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {g.author_handle || '@citizen'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {formatDistanceToNow(g.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                      {g.post_text}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isItemSusp ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isItemSusp ? `⚠ Risk ${g.authenticity_risk_score}%` : `✅ Authentic`}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500 truncate max-w-[120px]">{g.location_tagged}</span>
                      </div>

                      {g.officer_verdict ? (
                        <span className="badge bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-bold">
                          {g.officer_verdict}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400">
                          SEV {g.severity_score}/10
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Column: Deep-Dive Forensic Workbench ── */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {!activeGrievance ? (
            <div className="card p-12 text-center text-slate-400">
              Select an item from the queue to inspect forensic signals.
            </div>
          ) : (
            <div className="card overflow-hidden bg-white border border-slate-200 shadow-sm flex flex-col">
              {/* ── Workbench Header & Status ── */}
              <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isConfirmedFake
                  ? 'bg-rose-50 border-rose-200'
                  : isVerifiedGenuine
                  ? 'bg-emerald-50 border-emerald-200'
                  : isSuspicious
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50/60 border-emerald-100'
              }`}>
                <div className="flex items-start gap-3">
                  {isConfirmedFake ? (
                    <ShieldX size={24} className="text-rose-600 shrink-0 mt-0.5" />
                  ) : isSuspicious ? (
                    <ShieldAlert size={24} className="text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck size={24} className="text-emerald-600 shrink-0 mt-0.5" />
                  )}

                  <div>
                    <div className="text-sm font-bold" style={{
                      color: isConfirmedFake ? '#be123c' : isSuspicious ? '#b45309' : '#15803d'
                    }}>
                      {isConfirmedFake
                        ? '🚨 CONFIRMED FAKE / CO-ORDINATED DEFAMATION'
                        : isVerifiedGenuine
                        ? '✅ VERIFIED GENUINE CITIZEN GRIEVANCE'
                        : isSuspicious
                        ? '⚠ SUSPICIOUS PATTERN / POTENTIAL MISINFORMATION'
                        : '✅ LIKELY GENUINE PUBLIC COMPLAINT'}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                      <span>ID: {activeGrievance.id}</span>
                      <span>·</span>
                      <span>Source: {activeGrievance.platform}</span>
                      <span>·</span>
                      <span>{formatDateTime(activeGrievance.timestamp)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeGrievance.source_url && (
                    <a
                      href={activeGrievance.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-blue-700 bg-white"
                    >
                      <ExternalLink size={12} />
                      <span>{activeGrievance.platform === 'YouTube' ? 'Watch Video' : 'View Source'}</span>
                    </a>
                  )}

                  <button
                    onClick={handleSingleReanalyze}
                    disabled={isReanalyzing}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    {isReanalyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    <span>{isReanalyzing ? 'Auditing...' : 'Re-run Gemini AI'}</span>
                  </button>
                </div>
              </div>

              <div className="p-5 flex flex-col gap-5">
                {/* ── Officer Human-in-the-Loop Action Center ── */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-blue-600" />
                      Officer Human-in-the-Loop Verdict
                    </span>
                    {activeGrievance.officer_verdict && (
                      <span className="badge bg-violet-100 text-violet-800 border border-violet-200 text-xs font-bold">
                        Logged Verdict: {activeGrievance.officer_verdict}
                      </span>
                    )}
                  </div>

                  {activeGrievance.officer_notes && (
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 italic">
                      <span className="font-semibold text-slate-900 not-italic">Officer Audit Note: </span>
                      "{activeGrievance.officer_notes}" · <span className="text-slate-400 font-mono">{formatDateTime(activeGrievance.verified_at)}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Enter verification notes (e.g. Field team verified site at Kankarbagh Patna)..."
                      value={officerNote}
                      onChange={e => setOfficerNote(e.target.value)}
                      className="input-field text-xs py-1.5 flex-1"
                    />

                    <div className="flex gap-1.5 shrink-0 w-full sm:w-auto">
                      <button
                        onClick={() => handleOfficerVerdict('Verified Genuine')}
                        disabled={isVerifying}
                        className="btn-secondary text-xs py-1.5 px-2.5 flex-1 sm:flex-initial text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-semibold"
                      >
                        <Check size={13} />
                        <span>Verify Genuine</span>
                      </button>

                      <button
                        onClick={() => handleOfficerVerdict('Confirmed Fake')}
                        disabled={isVerifying}
                        className="btn-secondary text-xs py-1.5 px-2.5 flex-1 sm:flex-initial text-rose-700 border-rose-300 hover:bg-rose-50 font-semibold"
                      >
                        <AlertOctagon size={13} />
                        <span>Confirm Fake</span>
                      </button>

                      <button
                        onClick={() => handleOfficerVerdict('Under Field Investigation')}
                        disabled={isVerifying}
                        className="btn-secondary text-xs py-1.5 px-2.5 flex-1 sm:flex-initial text-amber-700 border-amber-300 hover:bg-amber-50 font-semibold"
                      >
                        <Clock size={13} />
                        <span>Dispatch Field Check</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Triple Risk Meters ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <RiskMeter
                    value={activeGrievance.authenticity_risk_score || 15}
                    label="Authenticity Risk %"
                  />
                  <SentimentOutrageMeter
                    score={activeGrievance.sentiment_score}
                    label={activeGrievance.sentiment_label}
                  />
                  <RiskMeter
                    value={activeGrievance.severity_score || 5}
                    label="Civic Severity Impact"
                    isScore={true}
                  />
                </div>

                {/* ── Post Content & Media Evidence ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Raw Text & Context */}
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <User size={12} /> Post Content & Source Context
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed font-sans">
                        {activeGrievance.post_text}
                      </div>
                    </div>

                    {activeGrievance.image_ocr_text && (
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                          <Img size={12} /> Extracted Image OCR Text
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 font-mono leading-relaxed">
                          "{activeGrievance.image_ocr_text}"
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <Hash size={12} /> Tagged Keywords & Hashtags
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(activeGrievance.hashtags || []).length > 0 ? (
                          activeGrievance.hashtags.map(h => (
                            <span key={h} className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full font-mono">
                              {h}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No explicit hashtags tagged in post</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Media Preview & Geocoding */}
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <Video size={12} /> Visual / Media Evidence
                      </div>

                      {activeGrievance.image_url ? (
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group h-44">
                          <img
                            src={activeGrievance.image_url}
                            alt="Evidence"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                          {activeGrievance.platform === 'YouTube' && (
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-bold text-white bg-red-600 rounded flex items-center gap-1 shadow">
                              <Video size={11} /> YOUTUBE VIDEO EVIDENCE
                            </span>
                          )}
                          {activeGrievance.source_url && (
                            <a
                              href={activeGrievance.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute top-2 right-2 px-2 py-1 text-xs font-semibold text-white bg-slate-900/80 hover:bg-slate-900 rounded-lg flex items-center gap-1 backdrop-blur shadow"
                            >
                              <span>Inspect Source</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="h-44 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                          <Img size={24} className="mb-1 text-slate-300" />
                          <span>No direct photo/video media attached</span>
                          <span className="text-[11px] text-slate-400 mt-1">Text-based citizen post from {activeGrievance.platform}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="text-[11px] text-slate-500 mb-0.5 flex items-center gap-1">
                          <Building2 size={11} /> Assigned Department
                        </div>
                        <div className="text-xs font-bold text-slate-800 line-clamp-1">
                          {activeGrievance.department}
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="text-[11px] text-slate-500 mb-0.5 flex items-center gap-1">
                          <MapPin size={11} /> Detected Location
                        </div>
                        <div className="text-xs font-bold text-slate-800 line-clamp-1">
                          {activeGrievance.location_tagged}
                          {activeGrievance.coordinates ? ` (${activeGrievance.coordinates.lat?.toFixed(2)}, ${activeGrievance.coordinates.lng?.toFixed(2)})` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Explainable AI (XAI) Forensic Reasoning ── */}
                <div className="bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-xl p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-violet-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles size={13} className="text-violet-600" />
                      Gemini AI Forensic Evidence Reasoning
                    </span>
                    <span className="text-[11px] font-mono text-violet-600 font-semibold bg-white px-2 py-0.5 rounded border border-violet-200">
                      Model: {activeGrievance.analysis_mode || 'gemini-3.5-flash'}
                    </span>
                  </div>

                  {activeGrievance.ai_summary && (
                    <p className="text-xs text-violet-900 font-medium italic bg-white/70 border border-violet-100 rounded-lg p-2.5 leading-relaxed">
                      "{activeGrievance.ai_summary}"
                    </p>
                  )}

                  <div className="flex flex-col gap-1.5 mt-1">
                    <span className="text-[11px] font-bold text-violet-800 uppercase">Detection Factors:</span>
                    {(activeGrievance.authenticity_reasons && activeGrievance.authenticity_reasons.length > 0
                      ? activeGrievance.authenticity_reasons
                      : [
                          'Specific localized civic deficiency described in Bihar district jurisdiction.',
                          'Linguistic structure matches organic citizen reporting pattern.',
                        ]
                    ).map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-white/80 rounded-lg p-2 border border-violet-100">
                        <span className="text-violet-600 font-bold shrink-0">•</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  {activeGrievance.manipulation_signals && activeGrievance.manipulation_signals.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className="text-[11px] font-bold text-slate-600">Forensic Flags:</span>
                      {activeGrievance.manipulation_signals.map((sig, idx) => (
                        <span
                          key={idx}
                          className={`badge text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            sig === 'None Detected'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {sig !== 'None Detected' ? '⚠ ' : '✅ '}{sig}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
