import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Loader2, Image as Img,
  Hash, User, Building2, Sparkles, Search, CheckCircle2,
  ExternalLink, Download, Eye, AlertOctagon,
  MapPin, Clock, Flame, ShieldX, Video, Newspaper, Radio, Check, Upload,
  HelpCircle, Info, FileText, Copy, CheckCheck, RefreshCw, ChevronDown, ChevronUp,
  Activity, ArrowUpRight
} from 'lucide-react';
import { formatDistanceToNow, formatDateTime } from '../utils/dateUtils';
import { isFlaggedSuspicious, isUnverified } from '../utils/verification';

// ── Platform Configuration with Cybersecurity Color Accents ─────────────────
const PLATFORM_ICONS = {
  'YouTube': {
    icon: Video,
    label: 'YouTube Video',
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    badge: 'bg-rose-500/10 text-rose-700 border-rose-200'
  },
  'Google News': {
    icon: Newspaper,
    label: 'Google News RSS',
    color: 'text-sky-600 bg-sky-50 border-sky-200',
    badge: 'bg-sky-500/10 text-sky-700 border-sky-200'
  },
  'X (Twitter)': {
    icon: Radio,
    label: 'X (Twitter)',
    color: 'text-slate-800 bg-slate-100 border-slate-300',
    badge: 'bg-slate-500/10 text-slate-800 border-slate-300'
  },
  'Facebook': {
    icon: Radio,
    label: 'Facebook',
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    badge: 'bg-indigo-500/10 text-indigo-700 border-indigo-200'
  },
  'Reddit': {
    icon: Radio,
    label: 'Reddit Discussion',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    badge: 'bg-orange-500/10 text-orange-700 border-orange-200'
  },
};

function getPlatformCfg(platform) {
  return PLATFORM_ICONS[platform] || {
    icon: Radio,
    label: platform || 'Web Feed',
    color: 'text-slate-600 bg-slate-50 border-slate-200',
    badge: 'bg-slate-100 text-slate-700 border-slate-200'
  };
}

// ── Human Review State Resolver ─────────────────────────────────────────────
function getReviewState(grievance) {
  if (grievance.officer_verdict === 'Verified Genuine') {
    return {
      id: 'genuine',
      label: 'Verified Genuine',
      sublabel: 'Confirmed by Officer',
      badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-300 ring-1 ring-emerald-500/20',
      pillClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      accentColor: '#059669',
      icon: ShieldCheck
    };
  }
  if (grievance.officer_verdict === 'Confirmed Fake') {
    return {
      id: 'fake',
      label: 'Confirmed Fake',
      sublabel: 'Disinformation Flagged',
      badgeClass: 'text-rose-700 bg-rose-50 border-rose-300 ring-1 ring-rose-500/20',
      pillClass: 'bg-rose-50 text-rose-800 border-rose-300',
      accentColor: '#e11d48',
      icon: ShieldX
    };
  }
  if (grievance.officer_verdict === 'Under Field Investigation') {
    return {
      id: 'field',
      label: 'Field Check Requested',
      sublabel: 'Under Ground Inspection',
      badgeClass: 'text-amber-800 bg-amber-50 border-amber-300 ring-1 ring-amber-500/20',
      pillClass: 'bg-amber-50 text-amber-900 border-amber-300',
      accentColor: '#d97706',
      icon: Clock
    };
  }
  return {
    id: 'pending',
    label: 'Needs Human Review',
    sublabel: 'Pending Triage',
    badgeClass: 'text-sky-700 bg-sky-50 border-sky-300 ring-1 ring-sky-500/20',
    pillClass: 'bg-sky-50 text-sky-800 border-sky-300',
    accentColor: '#0284c7',
    icon: Eye
  };
}

// ── Tooltip Component for Non-Technical Users ───────────────────────────────
function MetricTooltip({ title, explanation }) {
  return (
    <span className="group relative inline-flex items-center ml-1 cursor-help">
      <HelpCircle size={13} className="text-slate-400 hover:text-slate-600 transition-colors" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-60 rounded-lg bg-slate-900 px-3 py-2 text-[11px] leading-relaxed text-slate-100 shadow-xl ring-1 ring-white/10 group-hover:block z-50">
        <span className="font-semibold text-sky-400 block mb-0.5">{title}</span>
        {explanation}
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></span>
      </span>
    </span>
  );
}

// ── Refined Risk Gauge Component ────────────────────────────────────────────
function RiskIndicatorCard({ value = 0, label, description, tooltipTitle, tooltipText, isSeverity = false }) {
  const score = isSeverity ? value : Math.round(value);
  const pct = isSeverity ? Math.min(100, Math.max(0, value * 10)) : Math.min(100, Math.max(0, value));

  let color = '#059669';
  let bg = 'bg-emerald-500';
  let badgeText = isSeverity ? (value >= 8 ? 'Critical Hazard' : value >= 6 ? 'High Severity' : value >= 4 ? 'Moderate' : 'Low Severity')
                             : (pct >= 70 ? 'High Risk · Suspicious' : pct >= 40 ? 'Moderate Risk · Inspect' : 'Low Risk · Organic');
  let badgeStyle = isSeverity
    ? (value >= 8 ? 'bg-rose-100 text-rose-800 border-rose-300' : value >= 6 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-blue-100 text-blue-800 border-blue-300')
    : (pct >= 70 ? 'bg-rose-100 text-rose-800 border-rose-300' : pct >= 40 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300');

  if (!isSeverity) {
    if (pct >= 70) {
      color = '#e11d48';
      bg = 'bg-rose-500';
    } else if (pct >= 40) {
      color = '#d97706';
      bg = 'bg-amber-500';
    }
  } else {
    if (value >= 8) {
      color = '#e11d48';
      bg = 'bg-rose-500';
    } else if (value >= 6) {
      color = '#ea580c';
      bg = 'bg-orange-500';
    } else if (value >= 4) {
      color = '#0284c7';
      bg = 'bg-sky-500';
    }
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center text-xs font-semibold text-slate-700">
            <span>{label}</span>
            {tooltipText && <MetricTooltip title={tooltipTitle || label} explanation={tooltipText} />}
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle}`}>
            {badgeText}
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold font-mono tracking-tight" style={{ color }}>
            {isSeverity ? `${score}/10` : `${score}%`}
          </span>
          <span className="text-[11px] text-slate-500">
            {isSeverity ? 'Public impact magnitude' : 'Automated anomaly index'}
          </span>
        </div>
      </div>

      <div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
          <div
            className={`h-full rounded-full transition-all duration-700 ${bg}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
          {description}
        </p>
      </div>
    </div>
  );
}

// ── Outrage & Distress Meter ────────────────────────────────────────────────
function OutrageIndicatorCard({ score = -0.4, label }) {
  const safeScore = score ?? -0.4;
  const outragePct = Math.round(((1.0 - safeScore) / 2.0) * 100);

  let style = {
    color: '#059669',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    tag: 'Calm / Positive',
    bg: 'bg-emerald-500',
    desc: 'Citizen tone is balanced or informational.'
  };

  if (safeScore <= -0.7) {
    style = {
      color: '#e11d48',
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      tag: 'Critical Outrage',
      bg: 'bg-rose-500',
      desc: 'Extreme emotional distress or acute public frustration.'
    };
  } else if (safeScore <= -0.3) {
    style = {
      color: '#ea580c',
      badge: 'bg-orange-100 text-orange-800 border-orange-300',
      tag: 'High Distress',
      bg: 'bg-orange-500',
      desc: 'Urgent citizen concern demanding prompt acknowledgment.'
    };
  } else if (safeScore < 0.2) {
    style = {
      color: '#0284c7',
      badge: 'bg-sky-100 text-sky-800 border-sky-300',
      tag: 'Moderate Concern',
      bg: 'bg-sky-500',
      desc: 'Normal civic grievance tone without aggressive outrage.'
    };
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center text-xs font-semibold text-slate-700">
            <Flame size={14} className="text-rose-500 mr-1" />
            <span>Public Outrage Index</span>
            <MetricTooltip
              title="Public Outrage Index"
              explanation="Measures citizen sentiment and emotional distress intensity on social feeds. Outrage >= 75% indicates urgent public pressure."
            />
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>
            {label || style.tag}
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold font-mono tracking-tight" style={{ color: style.color }}>
            {outragePct}%
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            (Score: {safeScore > 0 ? `+${safeScore}` : safeScore})
          </span>
        </div>
      </div>

      <div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
          <div
            className={`h-full rounded-full transition-all duration-700 ${style.bg}`}
            style={{ width: `${outragePct}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
          {style.desc}
        </p>
      </div>
    </div>
  );
}

// ── Collapsible Advanced OCR & Vision Workbench Component ────────────────────
function GrievanceWorkbench({ g, onReanalyze }) {
  const imageInput = useRef(null);
  const localOcrInput = useRef(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [uploadedImageName, setUploadedImageName] = useState('');
  const [ocrProgress, setOcrProgress] = useState(null);

  const display = result || g;
  const isSusp = isFlaggedSuspicious(display.authenticity_flag);
  const unverified = isUnverified(display.authenticity_flag);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await onReanalyze(g);
      setResult({ ...g, ...res.analysis, ai_summary: res.analysis?.summary });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Image must be 4 MB or smaller.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read the selected image.'));
        reader.readAsDataURL(file);
      });
      if (typeof dataUrl !== 'string') throw new Error('Could not encode image.');
      const separator = dataUrl.indexOf(',');
      if (separator < 0) throw new Error('Could not encode image.');
      const res = await onReanalyze(g, {
        image: {
          base64: dataUrl.slice(separator + 1),
          mimeType: file.type,
        },
      });
      setResult({ ...g, ...res.analysis, ai_summary: res.analysis?.summary });
      setUploadedImageName(file.name);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLocalOcrUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Image must be 4 MB or smaller.');
      return;
    }

    setLoading(true);
    setError(null);
    setOcrProgress(0);
    let worker;
    try {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker(['eng', 'hin'], 1, {
        logger: message => {
          if (message.status === 'recognizing text') {
            setOcrProgress(Math.round(message.progress * 100));
          }
        },
      });
      const { data } = await worker.recognize(file);
      const extractedText = data.text.trim().slice(0, 2000);
      if (!extractedText) {
        throw new Error('No readable English or Hindi text found in this image.');
      }

      const res = await onReanalyze(g, { imageOcrText: extractedText });
      setResult({ ...g, ...res.analysis, ai_summary: res.analysis?.summary });
      setUploadedImageName(file.name);
    } catch (e) {
      setError(`Local OCR failed: ${e.message}`);
    } finally {
      if (worker) {
        await worker.terminate().catch(() => {});
      }
      setLoading(false);
      setOcrProgress(null);
    }
  };

  return (
    <div className="card overflow-hidden border border-slate-200 bg-white">
      <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
        isSusp ? 'bg-rose-50 border-rose-200' : unverified ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
      }`}>
        <div className="flex items-center gap-2">
          {isSusp ? <ShieldAlert size={16} className="text-rose-600" /> : <ShieldCheck size={16} className="text-emerald-600" />}
          <span className="text-xs font-bold text-slate-800">
            {display.id} · Extended Media Inspection & OCR
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="btn-primary text-xs py-1.5 px-3 disabled:opacity-60"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            <span>{loading ? 'Analyzing...' : 'Re-run Text Analysis'}</span>
          </button>
          <button
            onClick={() => imageInput.current?.click()}
            disabled={loading}
            className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-60"
          >
            <Upload size={12} />
            <span>Analyze Image with Gemini</span>
          </button>
          <button
            onClick={() => localOcrInput.current?.click()}
            disabled={loading}
            className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-60"
          >
            {loading && ocrProgress !== null ? <Loader2 size={12} className="animate-spin" /> : <Img size={12} />}
            <span>{loading && ocrProgress !== null ? `OCR ${ocrProgress}%` : 'Local English/Hindi OCR'}</span>
          </button>
          <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
          <input ref={localOcrInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLocalOcrUpload} className="hidden" />
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <span className="font-bold text-slate-600 uppercase text-[10px] block mb-1">OCR Extracted Text</span>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 min-h-[60px] font-mono">
            {display.image_ocr_text || g.image_ocr_text || 'No supplementary OCR text extracted.'}
          </div>
          {uploadedImageName && (
            <span className="text-[10px] text-slate-400 mt-1 block">Uploaded: {uploadedImageName}</span>
          )}
        </div>
        <div>
          <span className="font-bold text-slate-600 uppercase text-[10px] block mb-1">Observation Notes</span>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 min-h-[60px]">
            {display.media_observation || 'No visual anomalies reported by multimodal model.'}
          </div>
        </div>
      </div>
      {error && <div className="mx-4 mb-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">{error}</div>}
    </div>
  );
}

// ── Main Component: AI Verification Hub ─────────────────────────────────────
export default function AIVerification({
  grievances = [],
  selectedGrievanceId = null,
  onReanalyze,
  onVerify,
  onReanalyzeAll
}) {
  const [selectedId, setSelectedId] = useState(selectedGrievanceId || grievances[0]?.id || null);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [officerNote, setOfficerNote] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isBatchAuditing, setIsBatchAuditing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showSopGuide, setShowSopGuide] = useState(false);
  const [showOcrTools, setShowOcrTools] = useState(false);

  useEffect(() => {
    if (selectedGrievanceId) setSelectedId(selectedGrievanceId);
  }, [selectedGrievanceId]);

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
      const state = getReviewState(g);
      if (filterType === 'pending' && state.id !== 'pending') return false;
      if (filterType === 'field' && state.id !== 'field') return false;
      if (filterType === 'decided' && !['genuine', 'fake'].includes(state.id)) return false;

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
  const pendingReviewCount = grievances.filter(g => getReviewState(g).id === 'pending').length;
  const fieldCheckCount = grievances.filter(g => getReviewState(g).id === 'field').length;
  const officerDecisionCount = grievances.filter(g => ['genuine', 'fake'].includes(getReviewState(g).id)).length;

  const showToast = (type, message) => {
    setFeedbackMsg({ type, message });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleCopyId = (id) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
      showToast('success', `Verdict recorded: ${verdict} for report ${activeGrievance.id}`);
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
      showToast('success', 'AI triage signals refreshed successfully.');
    } catch (err) {
      showToast('error', `AI re-analysis failed: ${err.message}`);
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
        showToast('success', `Batch audit finished: ${res.reanalyzed_count || totalCount} posts evaluated.`);
      }
    } catch (err) {
      showToast('error', `Batch audit failed: ${err.message}`);
    } finally {
      setIsBatchAuditing(false);
    }
  };

  // Export confirmed fake reports
  const handleExportCSV = () => {
    const flagged = grievances.filter(g => getReviewState(g).id === 'fake');
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
    link.setAttribute('download', `JanSuno_Confirmed_Fake_Reports_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', `Exported ${flagged.length} confirmed fake reports to CSV.`);
  };

  const activeReviewState = activeGrievance ? getReviewState(activeGrievance) : null;
  const isConfirmedFake = activeReviewState?.id === 'fake';
  const isVerifiedGenuine = activeReviewState?.id === 'genuine';
  const isFieldCheckRequested = activeReviewState?.id === 'field';
  const isPendingReview = activeReviewState?.id === 'pending';
  const platformCfg = activeGrievance ? getPlatformCfg(activeGrievance.platform) : null;
  const PlatformIcon = platformCfg?.icon || Radio;

  const duplicateSiblings = activeGrievance?.duplicate_cluster_id
    ? grievances.filter((g) => g.duplicate_cluster_id === activeGrievance.duplicate_cluster_id && g.id !== activeGrievance.id)
    : [];

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto">

      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase bg-slate-900 text-sky-400 border border-slate-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
              JanSuno Cyber Cell
            </span>
            <span className="badge bg-slate-100 text-slate-700 border border-slate-200 text-xs">
              AI Triage & Human-in-the-Loop Oversight
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            AI Verification & Evidence Review
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Correlate incoming citizen grievances across Bihar public feeds, review automated Gemini XAI risk signals, and record binding, auditable human officer verdicts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            onClick={() => setShowSopGuide(!showSopGuide)}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 transition-all flex items-center gap-1.5"
            title="Toggle Review SOP Protocol"
          >
            <Info size={14} className="text-sky-600" />
            <span>{showSopGuide ? 'Hide SOP Guide' : 'Review SOP'}</span>
            {showSopGuide ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          <button
            onClick={handleBatchAudit}
            disabled={isBatchAuditing || totalCount === 0}
            className="text-xs font-bold text-zinc-950 bg-amber-400 hover:bg-amber-300 active:scale-95 rounded-xl px-3.5 py-2 shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {isBatchAuditing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            <span>{isBatchAuditing ? 'Analyzing All...' : 'Re-analyze All with AI'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={totalCount === 0}
            className="btn-secondary text-xs rounded-xl px-3.5 py-2 flex items-center gap-1.5 border border-slate-200 shadow-sm"
          >
            <Download size={13} className="text-slate-600" />
            <span>Export Confirmed Fakes</span>
          </button>
        </div>
      </div>

      {/* ── Toast Notification ── */}
      {feedbackMsg && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all shadow-sm ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
            : 'bg-rose-50 text-rose-800 border-rose-300'
        }`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={16} className="text-rose-600 shrink-0" />}
          <span className="flex-1">{feedbackMsg.message}</span>
        </div>
      )}

      {/* ── Collapsible SOP Verification Protocol Walkthrough ── */}
      {showSopGuide && (
        <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/50 via-white to-blue-50/40 p-5 shadow-sm transition-all">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                <FileText size={16} />
              </span>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Standard Review Protocol (SOP)</h2>
                <p className="text-[11px] text-slate-500">Official guidance for cyber intelligence officers</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-sky-700 bg-sky-100/70 px-2.5 py-0.5 rounded-full">
              Non-Technical Operator Guide
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center text-xs font-bold">1</span>
                <span className="text-xs font-bold text-slate-800">Identify Priority Reports</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Filter by <strong>Needs Review</strong>. High severity (≥8) or high AI risk (≥70%) reports appear with alert badges and should be triaged first.
              </p>
            </div>

            <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center text-xs font-bold">2</span>
                <span className="text-xs font-bold text-slate-800">Cross-Examine Evidence</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Inspect the original source link, citizen text, OCR image extract, and Gemini Explainable AI signals. Check duplicate sibling reports.
              </p>
            </div>

            <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center text-xs font-bold">3</span>
                <span className="text-xs font-bold text-slate-800">Record Binding Verdict</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Click <strong>Verify Genuine</strong>, <strong>Confirm Fake</strong>, or <strong>Request Field Check</strong>. Add a short note for the legal audit trail.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── KPI Metrics Ribbon ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:shadow transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>Total Ingested Queue</span>
            <Activity size={15} className="text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Multi-platform feeds</span>
            <span className="text-slate-500 font-mono">100% indexed</span>
          </div>
        </div>

        <div className="bg-white border border-sky-200/80 rounded-2xl p-4 shadow-sm hover:shadow transition-all bg-gradient-to-b from-sky-50/30 to-white">
          <div className="flex items-center justify-between text-sky-800 text-xs font-semibold mb-1.5">
            <span>Needs Human Review</span>
            <Eye size={15} className="text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-600">{pendingReviewCount}</div>
          <div className="text-[11px] text-sky-700/80 mt-1 flex items-center justify-between">
            <span>Awaiting officer audit</span>
            <span className="font-semibold text-sky-700">Action Required</span>
          </div>
        </div>

        <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-sm hover:shadow transition-all bg-gradient-to-b from-amber-50/30 to-white">
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold mb-1.5">
            <span>Field Checks Dispatched</span>
            <MapPin size={15} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600">{fieldCheckCount}</div>
          <div className="text-[11px] text-amber-700/80 mt-1 flex items-center justify-between">
            <span>Ground inspection active</span>
            <span className="font-semibold text-amber-700">In Progress</span>
          </div>
        </div>

        <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-sm hover:shadow transition-all bg-gradient-to-b from-emerald-50/30 to-white">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold mb-1.5">
            <span>Human Verdicts Logged</span>
            <CheckCircle2 size={15} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">{officerDecisionCount}</div>
          <div className="text-[11px] text-emerald-700/80 mt-1 flex items-center justify-between">
            <span>Genuine or fake certified</span>
            <span className="font-semibold text-emerald-700">Audited</span>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Command Bar ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          {[
            { id: 'all', label: `All Reports (${totalCount})` },
            { id: 'pending', label: `Needs Review (${pendingReviewCount})`, dot: 'bg-sky-500' },
            { id: 'field', label: `Field Check (${fieldCheckCount})`, dot: 'bg-amber-500' },
            { id: 'decided', label: `Decided (${officerDecisionCount})`, dot: 'bg-emerald-500' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`text-xs px-3.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                filterType === tab.id
                  ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }`}
            >
              {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ID, text, author, district..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field text-xs pl-8 py-1.5 w-full rounded-xl"
            />
          </div>

          <div className="relative">
            <select
              value={districtFilter}
              onChange={e => setDistrictFilter(e.target.value)}
              className="select-field text-xs py-1.5 pr-7 rounded-xl font-medium"
            >
              <option value="">All Bihar Districts</option>
              {districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Master-Detail Intelligence Command Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ── Left Column: Incoming Report Queue ── */}
        <div className="lg:col-span-5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            <span className="flex items-center gap-1.5">
              <span>Report Triage Queue</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-mono">
                {filteredGrievances.length}
              </span>
            </span>
            <span className="text-[11px] text-slate-400 font-normal">Click to load evidence</span>
          </div>

          <div className="flex flex-col gap-2.5 max-h-[780px] overflow-y-auto pr-1">
            {filteredGrievances.length === 0 ? (
              <div className="card p-10 text-center text-slate-400 text-xs border-dashed border-2">
                <AlertTriangle size={20} className="mx-auto mb-2 text-slate-300" />
                <span>No grievances found matching this query.</span>
              </div>
            ) : (
              filteredGrievances.map(g => {
                const isSelected = g.id === activeGrievance?.id;
                const reviewState = getReviewState(g);
                const pCfg = getPlatformCfg(g.platform);
                const PIcon = pCfg.icon;
                const isUrgent = (Number(g.severity_score) || 0) >= 8;
                const riskPct = Number(g.authenticity_risk_score) || 0;

                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedId(g.id)}
                    className={`card p-3.5 cursor-pointer transition-all border text-left flex flex-col gap-2.5 relative overflow-hidden ${
                      isSelected
                        ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/30 shadow-md'
                        : 'hover:border-slate-300 hover:shadow-sm bg-white'
                    }`}
                  >
                    {/* Active accent strip */}
                    {isSelected && (
                      <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-sky-500 rounded-l" />
                    )}

                    {/* Top Row: Platform + Time + Author */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`badge border text-[10px] font-bold py-0.5 px-2 flex items-center gap-1 ${pCfg.badge}`}>
                          <PIcon size={11} />
                          <span>{g.platform?.split(' ')[0] || 'Web'}</span>
                        </span>
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {g.author_handle || '@citizen'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 flex items-center gap-1">
                        <Clock size={10} />
                        {formatDistanceToNow(g.timestamp)}
                      </span>
                    </div>

                    {/* Post Content Snippet */}
                    <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                      {g.post_text}
                    </p>

                    {/* Bottom Metadata & Status Pill */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`badge border px-2 py-0.5 text-[10px] font-bold ${reviewState.badgeClass}`}>
                          {reviewState.label}
                        </span>
                        <span className="text-slate-400 truncate max-w-[110px] text-[10px]">
                          📍 {g.location_tagged || 'Bihar'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                        <span className={`px-1.5 py-0.5 rounded border ${
                          riskPct >= 70 ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                                        : riskPct >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          Risk {riskPct}%
                        </span>
                        <span className={`px-1.5 py-0.5 rounded border ${
                          isUrgent ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                                   : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          Sev {g.severity_score ?? '—'}/10
                        </span>
                      </div>
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
            <div className="card p-12 text-center text-slate-400 bg-white">
              <Eye size={28} className="mx-auto mb-2 text-slate-300" />
              <span>Select an item from the queue to inspect forensic evidence.</span>
            </div>
          ) : (
            <div className="card overflow-hidden bg-white border border-slate-200 shadow-sm flex flex-col">

              {/* ── Workbench Header & Status Banner ── */}
              <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                isConfirmedFake
                  ? 'bg-rose-50/70 border-rose-200'
                  : isVerifiedGenuine
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : isFieldCheckRequested
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-sky-50/60 border-sky-200'
              }`}>
                <div className="flex items-start gap-3">
                  <span className={`p-2 rounded-xl shrink-0 border ${
                    isConfirmedFake
                      ? 'bg-rose-100 text-rose-700 border-rose-300'
                      : isVerifiedGenuine
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      : isFieldCheckRequested
                      ? 'bg-amber-100 text-amber-700 border-amber-300'
                      : 'bg-sky-100 text-sky-700 border-sky-300'
                  }`}>
                    {isConfirmedFake ? <ShieldX size={20} />
                                     : isVerifiedGenuine ? <ShieldCheck size={20} />
                                     : isFieldCheckRequested ? <Clock size={20} />
                                     : <Eye size={20} />}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Verification Status:
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${activeReviewState.badgeClass}`}>
                        {activeReviewState.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 font-mono">
                      <span className="font-bold text-slate-900">{activeGrievance.id}</span>
                      <button
                        onClick={() => handleCopyId(activeGrievance.id)}
                        className="text-slate-400 hover:text-slate-700 transition-colors"
                        title="Copy Ticket ID"
                      >
                        {copiedId === activeGrievance.id ? <CheckCheck size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                      <span>·</span>
                      <span>{activeGrievance.platform}</span>
                      <span>·</span>
                      <span>{formatDateTime(activeGrievance.timestamp)}</span>
                    </div>

                    {isPendingReview && (
                      <p className="mt-1 text-[11px] text-sky-800">
                        ⚠ Automated AI risk triage is active. Record an official human decision below.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeGrievance.source_url && (
                    <a
                      href={activeGrievance.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 text-sky-700 hover:text-sky-900 bg-white border border-slate-200"
                    >
                      <ExternalLink size={12} />
                      <span>{activeGrievance.platform === 'YouTube' ? 'Watch Video' : 'Inspect Source'}</span>
                    </a>
                  )}

                  <button
                    onClick={handleSingleReanalyze}
                    disabled={isReanalyzing}
                    className="text-xs font-bold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-xl px-3 py-1.5 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {isReanalyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    <span>{isReanalyzing ? 'Refreshing...' : 'Re-analyze with AI'}</span>
                  </button>
                </div>
              </div>

              <div className="p-5 flex flex-col gap-5">

                {/* ── Officer Human-in-the-Loop Action Center ── */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-sky-600" />
                      Human-in-the-Loop Verdict Authorization
                    </span>
                    {activeGrievance.officer_verdict && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
                        Logged Verdict: {activeGrievance.officer_verdict}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    AI analysis provides prioritized advisory signals. Operators must cross-check the evidence before recording a binding decision. Enter an optional officer note below:
                  </p>

                  {/* Previous Audit Note if logged */}
                  {activeGrievance.officer_notes && (
                    <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 shadow-2xs">
                      <span className="font-semibold text-slate-900">Recorded Audit Trail: </span>
                      <span className="italic">"{activeGrievance.officer_notes}"</span>
                      <span className="text-slate-400 font-mono ml-2 text-[10px]">
                        [{activeGrievance.verified_by || 'CyberCell_Officer'} · {formatDateTime(activeGrievance.verified_at)}]
                      </span>
                    </div>
                  )}

                  {/* Note input + 3 Primary Actions */}
                  <div className="flex flex-col gap-2.5">
                    <input
                      type="text"
                      placeholder="Enter verification rationale (e.g. video cross-checked, nodal officer called, site inspected)..."
                      value={officerNote}
                      onChange={e => setOfficerNote(e.target.value)}
                      className="input-field text-xs py-2 px-3 rounded-xl w-full"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      {/* Verify Genuine */}
                      <button
                        onClick={() => handleOfficerVerdict('Verified Genuine')}
                        disabled={isVerifying}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-60"
                      >
                        <Check size={14} />
                        <span>Verify Genuine</span>
                      </button>

                      {/* Confirm Fake */}
                      <button
                        onClick={() => handleOfficerVerdict('Confirmed Fake')}
                        disabled={isVerifying}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-60"
                      >
                        <ShieldX size={14} />
                        <span>Confirm Fake</span>
                      </button>

                      {/* Request Field Check */}
                      <button
                        onClick={() => handleOfficerVerdict('Under Field Investigation')}
                        disabled={isVerifying}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 px-3 py-2.5 text-xs font-bold text-zinc-950 shadow-sm transition-all disabled:opacity-60"
                      >
                        <Clock size={14} />
                        <span>Request Field Check</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                    <span>Officer Session: DSP Cyber Cell Patna</span>
                    <span>Audit Status: Legally Traceable</span>
                  </div>
                </div>

                {/* ── Triple AI Triage Signals ── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-500" />
                      AI Automated Triage Signals
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium">Model Advisory Only · Non-Binding</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <RiskIndicatorCard
                      value={activeGrievance.authenticity_risk_score || 15}
                      label="AI Authenticity Risk"
                      description="Statistical anomaly index for synthetic/misleading text."
                      tooltipTitle="AI Authenticity Risk Score"
                      tooltipText="Calculates the likelihood of synthetic manipulation, repetitive astroturfing, or non-organic civic claims based on linguistic patterns."
                    />

                    <OutrageIndicatorCard
                      score={activeGrievance.sentiment_score}
                      label={activeGrievance.sentiment_label}
                    />

                    <RiskIndicatorCard
                      value={activeGrievance.severity_score || 5}
                      label="Civic Severity Impact"
                      description="Physical infrastructure hazard magnitude on a 1-10 scale."
                      tooltipTitle="Civic Severity Score"
                      tooltipText="Evaluates the immediate operational threat to public safety, water, roads, electricity, or health services."
                      isSeverity={true}
                    />
                  </div>
                </div>

                {/* ── Post Content & Media Evidence ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Left: Raw Text & Context */}
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <User size={13} />
                        <span>Citizen Post Text</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed font-sans shadow-2xs">
                        {activeGrievance.post_text}
                      </div>
                    </div>

                    {activeGrievance.image_ocr_text && (
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                          <Img size={13} />
                          <span>Extracted Document / Image OCR</span>
                        </div>
                        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 font-mono leading-relaxed">
                          "{activeGrievance.image_ocr_text}"
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <Hash size={13} />
                        <span>Tagged Keywords & Hashtags</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(activeGrievance.hashtags || []).length > 0 ? (
                          activeGrievance.hashtags.map(h => (
                            <span key={h} className="text-xs text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full font-mono">
                              {h}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No specific hashtags tagged</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Media Preview & Geocoding */}
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <Video size={13} />
                        <span>Visual / Media Evidence</span>
                      </div>

                      {activeGrievance.image_url ? (
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group h-44 shadow-2xs">
                          <img
                            src={activeGrievance.image_url}
                            alt="Incident Evidence"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                          {activeGrievance.platform === 'YouTube' && (
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-bold text-white bg-rose-600 rounded flex items-center gap-1 shadow">
                              <Video size={11} /> YOUTUBE VIDEO EVIDENCE
                            </span>
                          )}
                          {activeGrievance.source_url && (
                            <a
                              href={activeGrievance.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute top-2 right-2 px-2.5 py-1 text-xs font-semibold text-white bg-slate-900/80 hover:bg-slate-900 rounded-lg flex items-center gap-1 backdrop-blur shadow"
                            >
                              <span>Inspect Source</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="h-44 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                          <Img size={24} className="mb-1 text-slate-300" />
                          <span className="font-medium">No direct visual media attached</span>
                          <span className="text-[11px] text-slate-400 mt-1">Text-based public dispatch from {activeGrievance.platform}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="text-[11px] text-slate-500 mb-0.5 flex items-center gap-1">
                          <Building2 size={12} /> Assigned Department
                        </div>
                        <div className="text-xs font-bold text-slate-800 line-clamp-1">
                          {activeGrievance.department || 'General Administration'}
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="text-[11px] text-slate-500 mb-0.5 flex items-center gap-1">
                          <MapPin size={12} /> Detected District
                        </div>
                        <div className="text-xs font-bold text-slate-800 line-clamp-1">
                          {activeGrievance.location_tagged || 'Location unverified'}
                          {activeGrievance.coordinates ? ` (${activeGrievance.coordinates.lat?.toFixed(2)}, ${activeGrievance.coordinates.lng?.toFixed(2)})` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Explainable AI (XAI) Forensic Reasoning ── */}
                <div className="bg-gradient-to-r from-violet-50/60 via-indigo-50/40 to-sky-50/60 border border-violet-200/90 rounded-2xl p-4 flex flex-col gap-3 shadow-2xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-violet-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles size={14} className="text-violet-600" />
                      Gemini Explainable AI (XAI) Forensic Evidence Reasoning
                    </span>
                    <span className="text-[11px] font-mono text-violet-700 font-semibold bg-white px-2 py-0.5 rounded-md border border-violet-200">
                      Engine: {activeGrievance.analysis_mode || 'gemini-3.5-flash'}
                    </span>
                  </div>

                  {activeGrievance.ai_summary && (
                    <p className="text-xs text-violet-950 font-medium italic bg-white/80 border border-violet-100 rounded-xl p-3 leading-relaxed shadow-2xs">
                      "{activeGrievance.ai_summary}"
                    </p>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-violet-900 uppercase">Detection Factors:</span>
                    {(activeGrievance.authenticity_reasons && activeGrievance.authenticity_reasons.length > 0
                      ? activeGrievance.authenticity_reasons
                      : [
                          'Specific localized civic deficiency described in Bihar district jurisdiction.',
                          'Linguistic structure matches organic citizen reporting pattern.',
                        ]
                    ).map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-white/90 rounded-lg p-2 border border-violet-100/70">
                        <span className="text-violet-600 font-bold shrink-0">•</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  {activeGrievance.manipulation_signals && activeGrievance.manipulation_signals.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-violet-200/50">
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

                {/* ── Supplementary OCR & Image Analysis Toggle ── */}
                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={() => setShowOcrTools(!showOcrTools)}
                    className="w-full text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-2.5 transition-all flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <Img size={14} className="text-sky-600" />
                      <span>Optional: Extended Image Analysis & English/Hindi OCR Tools</span>
                    </span>
                    {showOcrTools ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showOcrTools && (
                    <div className="pt-3">
                      <GrievanceWorkbench key={activeGrievance.id} g={activeGrievance} onReanalyze={onReanalyze} />
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
