import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Loader2, Image as Img,
  Hash, User, Building2, Sparkles, Search, CheckCircle2,
  ExternalLink, Download, Eye, AlertOctagon,
  MapPin, Clock, Flame, ShieldX, Video, Newspaper, Radio, Check, Upload,
  HelpCircle, Info, FileText, Copy, CheckCheck, RefreshCw, X,
  Activity, ArrowRight, ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import { formatDistanceToNow, formatDateTime } from '../utils/dateUtils';
import { isFlaggedSuspicious, isUnverified } from '../utils/verification';
import { getSafeSourceUrl } from '../utils/urlUtils';

// ── Platform Badges with Dedicated Color Accents ────────────────────────────
const PLATFORM_ICONS = {
  'YouTube': {
    icon: Video,
    label: 'YouTube Video',
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    accentBorder: 'border-l-rose-500',
  },
  'Google News': {
    icon: Newspaper,
    label: 'Google News',
    color: 'text-sky-600 bg-sky-50 border-sky-200',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    accentBorder: 'border-l-sky-500',
  },
  'X (Twitter)': {
    icon: Radio,
    label: 'X (Twitter)',
    color: 'text-slate-800 bg-slate-100 border-slate-300',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
    accentBorder: 'border-l-slate-600',
  },
  'Facebook': {
    icon: Radio,
    label: 'Facebook',
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accentBorder: 'border-l-indigo-500',
  },
  'Reddit': {
    icon: Radio,
    label: 'Reddit Discussion',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    accentBorder: 'border-l-orange-500',
  },
};

function getPlatformCfg(platform) {
  return PLATFORM_ICONS[platform] || {
    icon: Radio,
    label: platform || 'Web Feed',
    color: 'text-slate-600 bg-slate-50 border-slate-200',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    accentBorder: 'border-l-slate-400',
  };
}

// ── Human Review State Resolver ─────────────────────────────────────────────
function getReviewState(grievance) {
  if (grievance.officer_verdict === 'Verified Genuine') {
    return {
      id: 'genuine',
      label: 'Verified Genuine',
      sublabel: 'Human-Audited Genuine',
      badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-300 ring-1 ring-emerald-500/20',
      pillClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      color: '#059669',
      icon: ShieldCheck,
      cardBorder: 'border-l-emerald-500',
    };
  }
  if (grievance.officer_verdict === 'Confirmed Fake') {
    return {
      id: 'fake',
      label: 'Confirmed Fake',
      sublabel: 'Human-Flagged Disinformation',
      badgeClass: 'text-rose-700 bg-rose-50 border-rose-300 ring-1 ring-rose-500/20',
      pillClass: 'bg-rose-50 text-rose-800 border-rose-300',
      color: '#e11d48',
      icon: ShieldX,
      cardBorder: 'border-l-rose-500',
    };
  }
  if (grievance.officer_verdict === 'Under Field Investigation') {
    return {
      id: 'field',
      label: 'Field Check Requested',
      sublabel: 'Under Ground Inspection',
      badgeClass: 'text-amber-800 bg-amber-50 border-amber-300 ring-1 ring-amber-500/20',
      pillClass: 'bg-amber-50 text-amber-900 border-amber-300',
      color: '#d97706',
      icon: Clock,
      cardBorder: 'border-l-amber-500',
    };
  }
  return {
    id: 'pending',
    label: 'Needs Human Review',
    sublabel: 'Awaiting Officer Audit',
    badgeClass: 'text-sky-700 bg-sky-50 border-sky-300 ring-1 ring-sky-500/20',
    pillClass: 'bg-sky-50 text-sky-800 border-sky-300',
    color: '#0284c7',
    icon: Eye,
    cardBorder: 'border-l-sky-500',
  };
}

// ── Plain-Language Metric Tooltip ───────────────────────────────────────────
function MetricTooltip({ title, explanation }) {
  return (
    <span className="group relative inline-flex items-center ml-1.5 cursor-help">
      <HelpCircle size={13} className="text-slate-400 hover:text-slate-600 transition-colors" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-64 rounded-xl bg-slate-900 px-3.5 py-2.5 text-[11px] leading-relaxed text-slate-100 shadow-xl ring-1 ring-white/10 group-hover:block z-50">
        <span className="font-bold text-sky-400 block mb-1">{title}</span>
        {explanation}
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></span>
      </span>
    </span>
  );
}

// ── Color-Themed Risk Indicator Card ────────────────────────────────────────
function ColorThemedRiskCard({ value = 0, label, description, tooltipTitle, tooltipText, isSeverity = false }) {
  const score = isSeverity ? value : Math.round(value);
  const pct = isSeverity ? Math.min(100, Math.max(0, value * 10)) : Math.min(100, Math.max(0, value));

  let colorTheme = {
    cardBg: 'bg-emerald-50/50 border-emerald-200',
    textColor: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    barBg: 'bg-emerald-500',
    tag: isSeverity ? 'Low Severity' : 'Low Risk · Organic',
  };

  if (!isSeverity) {
    if (pct >= 70) {
      colorTheme = {
        cardBg: 'bg-rose-50/60 border-rose-200',
        textColor: 'text-rose-700',
        badge: 'bg-rose-100 text-rose-800 border-rose-300',
        barBg: 'bg-rose-500',
        tag: 'High Risk · Suspicious',
      };
    } else if (pct >= 40) {
      colorTheme = {
        cardBg: 'bg-amber-50/60 border-amber-200',
        textColor: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-800 border-amber-300',
        barBg: 'bg-amber-500',
        tag: 'Moderate Risk · Inspect',
      };
    }
  } else {
    if (value >= 8) {
      colorTheme = {
        cardBg: 'bg-rose-50/60 border-rose-200',
        textColor: 'text-rose-700',
        badge: 'bg-rose-100 text-rose-800 border-rose-300',
        barBg: 'bg-rose-500',
        tag: 'Critical Hazard',
      };
    } else if (value >= 6) {
      colorTheme = {
        cardBg: 'bg-amber-50/60 border-amber-200',
        textColor: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-800 border-amber-300',
        barBg: 'bg-amber-500',
        tag: 'High Severity',
      };
    } else if (value >= 4) {
      colorTheme = {
        cardBg: 'bg-sky-50/60 border-sky-200',
        textColor: 'text-sky-700',
        badge: 'bg-sky-100 text-sky-800 border-sky-300',
        barBg: 'bg-sky-500',
        tag: 'Moderate Severity',
      };
    }
  }

  return (
    <div className={`border rounded-xl p-4 shadow-xs flex flex-col justify-between transition-all ${colorTheme.cardBg}`}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-xs font-bold text-slate-700">
            <span>{label}</span>
            {tooltipText && <MetricTooltip title={tooltipTitle || label} explanation={tooltipText} />}
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorTheme.badge}`}>
            {colorTheme.tag}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className={`text-2xl font-bold font-mono tracking-tight ${colorTheme.textColor}`}>
            {isSeverity ? `${score}/10` : `${score}%`}
          </span>
          <span className="text-[11px] text-slate-500">
            {isSeverity ? 'Infrastructure threat level' : 'Anomaly signal'}
          </span>
        </div>
      </div>

      <div>
        <div className="h-2 w-full bg-white/80 rounded-full overflow-hidden border border-slate-200/50">
          <div
            className={`h-full rounded-full transition-all duration-700 ${colorTheme.barBg}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5 leading-snug">
          {description}
        </p>
      </div>
    </div>
  );
}

// ── Color-Themed Outrage Indicator Card ─────────────────────────────────────
function ColorThemedOutrageCard({ score = -0.4, label }) {
  const safeScore = score ?? -0.4;
  const outragePct = Math.round(((1.0 - safeScore) / 2.0) * 100);

  let theme = {
    cardBg: 'bg-emerald-50/50 border-emerald-200',
    textColor: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    tag: 'Calm / Positive',
    barBg: 'bg-emerald-500',
    desc: 'Citizen tone is balanced or informational.'
  };

  if (safeScore <= -0.7) {
    theme = {
      cardBg: 'bg-rose-50/60 border-rose-200',
      textColor: 'text-rose-700',
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      tag: 'Critical Outrage',
      barBg: 'bg-rose-500',
      desc: 'Acute distress or extreme citizen frustration.'
    };
  } else if (safeScore <= -0.3) {
    theme = {
      cardBg: 'bg-orange-50/60 border-orange-200',
      textColor: 'text-orange-700',
      badge: 'bg-orange-100 text-orange-800 border-orange-300',
      tag: 'High Distress',
      barBg: 'bg-orange-500',
      desc: 'Urgent citizen concern demanding prompt attention.'
    };
  } else if (safeScore < 0.2) {
    theme = {
      cardBg: 'bg-sky-50/60 border-sky-200',
      textColor: 'text-sky-700',
      badge: 'bg-sky-100 text-sky-800 border-sky-300',
      tag: 'Moderate Concern',
      barBg: 'bg-sky-500',
      desc: 'Standard civic grievance tone without severe anger.'
    };
  }

  return (
    <div className={`border rounded-xl p-4 shadow-xs flex flex-col justify-between transition-all ${theme.cardBg}`}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-xs font-bold text-slate-700">
            <Flame size={14} className="text-orange-500 mr-1" />
            <span>Public Outrage Index</span>
            <MetricTooltip
              title="Public Outrage Index"
              explanation="Measures citizen sentiment and emotional distress intensity on social feeds. Higher outrage indicates public friction needing de-escalation."
            />
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${theme.badge}`}>
            {label || theme.tag}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className={`text-2xl font-bold font-mono tracking-tight ${theme.textColor}`}>
            {outragePct}%
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            (Score: {safeScore > 0 ? `+${safeScore}` : safeScore})
          </span>
        </div>
      </div>

      <div>
        <div className="h-2 w-full bg-white/80 rounded-full overflow-hidden border border-slate-200/50">
          <div
            className={`h-full rounded-full transition-all duration-700 ${theme.barBg}`}
            style={{ width: `${outragePct}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5 leading-snug">
          {theme.desc}
        </p>
      </div>
    </div>
  );
}

// ── Extended OCR & Image Analysis Workbench Drawer ──────────────────────────
function GrievanceWorkbench({ g, onReanalyze }) {
  const imageInput = useRef(null);
  const localOcrInput = useRef(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [uploadedImageName, setUploadedImageName] = useState('');
  const [ocrProgress, setOcrProgress] = useState(null);

  const display = result || g;

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
        reader.onerror = () => reject(new Error('Could not read image.'));
        reader.readAsDataURL(file);
      });
      const separator = dataUrl.indexOf(',');
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
      if (!extractedText) throw new Error('No readable text found.');
      const res = await onReanalyze(g, { imageOcrText: extractedText });
      setResult({ ...g, ...res.analysis, ai_summary: res.analysis?.summary });
      setUploadedImageName(file.name);
    } catch (e) {
      setError(`Local OCR failed: ${e.message}`);
    } finally {
      if (worker) await worker.terminate().catch(() => {});
      setLoading(false);
      setOcrProgress(null);
    }
  };

  return (
    <div className="card overflow-hidden border border-slate-200 bg-white mt-3">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Img size={14} className="text-sky-600" />
          Multimodal Image Analysis & Local OCR (Hindi / English)
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleAnalyze} disabled={loading} className="btn-primary text-xs py-1.5 px-3">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            <span>Re-run Triage</span>
          </button>
          <button onClick={() => imageInput.current?.click()} disabled={loading} className="btn-secondary text-xs py-1.5 px-3">
            <Upload size={12} />
            <span>Analyze Image (Gemini)</span>
          </button>
          <button onClick={() => localOcrInput.current?.click()} disabled={loading} className="btn-secondary text-xs py-1.5 px-3">
            {loading && ocrProgress !== null ? <Loader2 size={12} className="animate-spin" /> : <Img size={12} />}
            <span>{loading && ocrProgress !== null ? `OCR ${ocrProgress}%` : 'Local OCR (Device)'}</span>
          </button>
          <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
          <input ref={localOcrInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLocalOcrUpload} className="hidden" />
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div>
          <span className="font-bold text-slate-600 uppercase text-[10px] block mb-1">OCR Text Found</span>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 min-h-[50px] font-mono">
            {display.image_ocr_text || g.image_ocr_text || 'No OCR text extracted.'}
          </div>
        </div>
        <div>
          <span className="font-bold text-slate-600 uppercase text-[10px] block mb-1">Visual Observation</span>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 min-h-[50px]">
            {display.media_observation || 'No visual anomalies reported.'}
          </div>
        </div>
      </div>
      {error && <div className="mx-4 mb-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">{error}</div>}
    </div>
  );
}

// ── Re-architected Forensic Analysis Modal (Organized, Readable, Color-Themed) ──
function ForensicAnalysisModal({
  grievance,
  onClose,
  onVerify,
  onApproveForDispatch,
  onReanalyze,
  onCopyId,
  copiedId
}) {
  const [officerNote, setOfficerNote] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isApprovingDispatch, setIsApprovingDispatch] = useState(false);
  const [dispatchApprovalError, setDispatchApprovalError] = useState('');
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [showExtendedOcr, setShowExtendedOcr] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!grievance) return null;

  const reviewState = getReviewState(grievance);
  const platformCfg = getPlatformCfg(grievance.platform);
  const PIcon = platformCfg.icon;

  const handleVerdict = async (verdict) => {
    setIsVerifying(true);
    try {
      if (onVerify) {
        await onVerify(grievance.id, {
          verdict,
          notes: officerNote || `Officer marked as ${verdict}`,
          officer_id: 'CyberCell_DSP_Patna',
        });
      }
      setOfficerNote('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSingleReanalyze = async () => {
    setIsReanalyzing(true);
    try {
      if (onReanalyze) await onReanalyze(grievance);
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleApproveForDispatch = async () => {
    if (!onApproveForDispatch) return;
    setIsApprovingDispatch(true);
    setDispatchApprovalError('');
    try {
      await onApproveForDispatch(grievance.id, {
        notes: officerNote || 'Operator reviewed and approved this report for internal Department Dispatch.',
        officer_id: 'CyberCell_DSP_Patna',
      });
    } catch (error) {
      setDispatchApprovalError(`Could not approve dispatch: ${error.message}`);
    } finally {
      setIsApprovingDispatch(false);
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
            <span className={`p-2 rounded-xl shrink-0 border ${reviewState.badgeClass}`}>
              <reviewState.icon size={22} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge border text-[11px] font-bold py-0.5 px-2.5 flex items-center gap-1.5 ${platformCfg.badge}`}>
                  <PIcon size={12} />
                  <span>{grievance.platform}</span>
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${reviewState.badgeClass}`}>
                  {reviewState.label}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 font-mono">
                <span className="font-bold text-slate-900">{grievance.id}</span>
                <button
                  onClick={() => onCopyId(grievance.id)}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                  title="Copy ID"
                >
                  {copiedId === grievance.id ? <CheckCheck size={12} className="text-emerald-600" /> : <Copy size={12} />}
                </button>
                <span>·</span>
                <span>{grievance.author_handle || '@citizen'}</span>
                <span>·</span>
                <span>{formatDateTime(grievance.timestamp)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {getSafeSourceUrl(grievance.source_url, grievance.platform) && (
              <a
                href={getSafeSourceUrl(grievance.source_url, grievance.platform)}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 text-sky-700 hover:text-sky-900 bg-sky-50/70 border-sky-200 hover:bg-sky-100"
              >
                <ExternalLink size={12} />
                <span>{grievance.platform === 'YouTube' ? 'Watch Video' : 'Inspect Source'}</span>
              </a>
            )}

            <button
              onClick={handleSingleReanalyze}
              disabled={isReanalyzing}
              className="btn-secondary text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 disabled:opacity-60"
            >
              {isReanalyzing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              <span>{isReanalyzing ? 'Analyzing...' : 'Re-analyze'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
              title="Close modal (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Modal Scrollable Body: Logically Arranged & Color-Themed ── */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-5 text-left bg-slate-50/40">

          {/* ════ CARD 1 (TOP): CITIZEN REPORT & MEDIA EVIDENCE ════ */}
          {/* Color Theme: Clean Sky / Slate Blue */}
          <section className="bg-white border border-sky-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <User size={14} className="text-sky-600" />
                Citizen Public Grievance & Evidence
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {formatDistanceToNow(grievance.timestamp)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* Post Text & Context */}
              <div className="md:col-span-7 flex flex-col gap-3">
                <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-4">
                  <p className="text-sm sm:text-base text-slate-900 leading-relaxed font-sans font-normal">
                    "{grievance.post_text}"
                  </p>
                </div>

                {/* OCR Text if present */}
                {grievance.image_ocr_text && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <span className="text-[11px] font-bold text-amber-800 uppercase block mb-1 flex items-center gap-1">
                      <Img size={12} /> Extracted Document Text (OCR)
                    </span>
                    <p className="text-xs text-amber-900 font-mono leading-relaxed">
                      "{grievance.image_ocr_text}"
                    </p>
                  </div>
                )}

                {/* Metadata row: Department & Location */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-2.5 flex items-center gap-2">
                    <Building2 size={16} className="text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-blue-700 font-bold uppercase block">Department</span>
                      <span className="text-xs font-bold text-slate-900 truncate block">
                        {grievance.department || 'General Administration'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-2.5 flex items-center gap-2">
                    <MapPin size={16} className="text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase block">District</span>
                      <span className="text-xs font-bold text-slate-900 truncate block">
                        {grievance.location_tagged || 'Location unverified'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tagged Hashtags */}
                {(grievance.hashtags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {grievance.hashtags.map(h => (
                      <span key={h} className="text-xs text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full font-mono">
                        {h}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Visual Evidence / Video Preview */}
              <div className="md:col-span-5 flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Video size={12} /> Visual / Media Evidence
                </span>

                {grievance.image_url ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group h-52 shadow-xs">
                    <img
                      src={grievance.image_url}
                      alt="Incident Evidence"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    {grievance.platform === 'YouTube' && (
                      <span className="absolute bottom-2 left-2 px-2.5 py-1 text-[10px] font-bold text-white bg-rose-600 rounded-md flex items-center gap-1 shadow">
                        <Video size={12} /> YOUTUBE VIDEO
                      </span>
                    )}
                    {grievance.platform === 'Reddit' && (
                      <span className="absolute bottom-2 left-2 px-2.5 py-1 text-[10px] font-bold text-white bg-orange-600 rounded-md flex items-center gap-1 shadow">
                        <Radio size={12} /> REDDIT DISCUSSION
                      </span>
                    )}
                    {getSafeSourceUrl(grievance.source_url, grievance.platform) && (
                      <a
                        href={getSafeSourceUrl(grievance.source_url, grievance.platform)}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute top-2 right-2 px-2.5 py-1 text-xs font-semibold text-white bg-slate-900/80 hover:bg-slate-900 rounded-lg flex items-center gap-1 backdrop-blur shadow"
                      >
                        <span>Open Media</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="h-52 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                    <Img size={28} className="mb-2 text-slate-300" />
                    <span className="font-semibold text-slate-600">No media file attached</span>
                    <span className="text-[11px] text-slate-400 mt-1">Text dispatch from {grievance.platform}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ════ CARD 2 (MIDDLE-1): AI AUTOMATED TRIAGE SIGNALS ════ */}
          {/* Color Theme: Distinct Tri-color Status Tiles */}
          <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                AI Automated Triage Signals
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Model Advisory (Non-Binding)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <ColorThemedRiskCard
                value={grievance.authenticity_risk_score || 15}
                label="Authenticity Risk"
                description="Anomaly score based on synthetic phrasing & astroturfing patterns."
                tooltipTitle="AI Authenticity Risk"
                tooltipText="Calculates the likelihood of synthetic manipulation, copied text, or non-organic civic claims based on linguistic patterns."
              />

              <ColorThemedOutrageCard
                score={grievance.sentiment_score}
                label={grievance.sentiment_label}
              />

              <ColorThemedRiskCard
                value={grievance.severity_score || 5}
                label="Civic Severity Impact"
                description="Infrastructure & public hazard magnitude on a 1-10 scale."
                tooltipTitle="Civic Severity Score"
                tooltipText="Evaluates the immediate operational threat to public safety, water, roads, electricity, or health services."
                isSeverity={true}
              />
            </div>
          </section>

          {/* ════ CARD 3 (MIDDLE-2): EXPLAINABLE AI (XAI) REASONING ════ */}
          {/* Color Theme: Royal Violet / Indigo Gradient */}
          <section className="relative overflow-hidden bg-gradient-to-r from-violet-50/80 via-purple-50/60 to-indigo-50/80 border border-violet-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3">
            {/* Ambient Eye-Catching Shimmer Beam */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-violet-300/25 to-transparent animate-shimmer pointer-events-none" />

            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-violet-900 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles size={14} className="text-violet-600" />
                Gemini Explainable AI (XAI) Forensic Evidence Reasoning
              </span>
              <span className="text-[11px] font-mono text-violet-700 font-semibold bg-white/90 px-2 py-0.5 rounded-md border border-violet-200">
                Engine: {grievance.analysis_mode || 'gemini-3.5-flash'}
              </span>
            </div>

            {grievance.ai_summary && (
              <p className="text-xs text-violet-950 font-medium italic bg-white/90 border border-violet-100 rounded-xl p-3.5 leading-relaxed shadow-2xs">
                "{grievance.ai_summary}"
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-violet-900 uppercase">Detection Factors:</span>
              {(grievance.authenticity_reasons && grievance.authenticity_reasons.length > 0
                ? grievance.authenticity_reasons
                : [
                    'Specific localized civic deficiency described in Bihar district jurisdiction.',
                    'Linguistic structure matches organic citizen reporting pattern.',
                  ]
              ).map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-white/90 rounded-lg p-2.5 border border-violet-100/70">
                  <span className="text-violet-600 font-bold shrink-0">•</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>

            {grievance.manipulation_signals && grievance.manipulation_signals.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-violet-200/50">
                <span className="text-[11px] font-bold text-slate-600">Forensic Flags:</span>
                {grievance.manipulation_signals.map((sig, idx) => (
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
          </section>

          {/* ════ CARD 4: EXTENDED OCR TOOLS (COLLAPSIBLE) ════ */}
          <section className="pt-1">
            <button
              onClick={() => setShowExtendedOcr(!showExtendedOcr)}
              className="w-full text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-3 transition-all flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Img size={15} className="text-sky-600" />
                <span>Optional: Extended Media Inspection & Local Hindi/English OCR Tools</span>
              </span>
              {showExtendedOcr ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showExtendedOcr && (
              <GrievanceWorkbench g={grievance} onReanalyze={onReanalyze} />
            )}
          </section>

          {/* ════ CARD 5 (BOTTOM): HUMAN OFFICER VERDICT AUTHORIZATION ════ */}
          {/* Color Theme: Deep Cyber Slate / Navy Console */}
          <section className="bg-slate-900 text-white rounded-2xl p-5 shadow-md border border-slate-800 flex flex-col gap-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <CheckCircle2 size={16} />
                Authoritative Human Officer Verdict Center
              </span>
              {grievance.officer_verdict && (
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-violet-900/60 text-violet-200 border border-violet-700">
                  Current: {grievance.officer_verdict}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Having examined the citizen report, media, and AI triage signals, authorize an official decision below. Your decision will be stamped to the legal audit log:
            </p>

            {grievance.officer_notes && (
              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 text-xs text-slate-200">
                <span className="font-semibold text-amber-400">Recorded Audit Note: </span>
                <span className="italic">"{grievance.officer_notes}"</span>
                <span className="text-slate-400 font-mono ml-2 text-[10px]">
                  [{grievance.verified_by || 'CyberCell_DSP_Patna'} · {formatDateTime(grievance.verified_at)}]
                </span>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-1">
              <input
                type="text"
                placeholder="Enter verification rationale (e.g. video cross-checked, nodal officer called, site inspected)..."
                value={officerNote}
                onChange={e => setOfficerNote(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/50 w-full"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Verify Genuine */}
                <button
                  onClick={() => handleVerdict('Verified Genuine')}
                  disabled={isVerifying}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-600/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 px-4 py-3 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-60"
                >
                  <Check size={16} />
                  <span>Verify Genuine</span>
                </button>

                {/* Confirm Fake */}
                <button
                  onClick={() => handleVerdict('Confirmed Fake')}
                  disabled={isVerifying}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-600/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 px-4 py-3 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-60"
                >
                  <ShieldX size={16} />
                  <span>Confirm Fake</span>
                </button>

                {/* Request Field Check */}
                <button
                  onClick={() => handleVerdict('Under Field Investigation')}
                  disabled={isVerifying}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 hover:shadow-lg hover:shadow-amber-400/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 px-4 py-3 text-xs font-bold text-zinc-950 shadow-sm transition-all disabled:opacity-60"
                >
                  <Clock size={16} />
                  <span>Request Field Check</span>
                </button>
                {grievance.dispatch_approved_at ? (
                  <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-950/60 px-4 py-3 text-xs font-bold text-emerald-200">
                    <CheckCircle2 size={16} />
                    <span>Approved for Dispatch</span>
                  </div>
                ) : reviewState.id !== 'fake' && (
                  <button
                    onClick={handleApproveForDispatch}
                    disabled={isVerifying || isApprovingDispatch || !onApproveForDispatch}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-sky-500 disabled:opacity-60"
                  >
                    {isApprovingDispatch ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    <span>{isApprovingDispatch ? 'Approving…' : 'Approve & Send to Dispatch'}</span>
                  </button>
                )}
              </div>
              {dispatchApprovalError && (
                <div role="alert" className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-xs text-rose-200">
                  {dispatchApprovalError}
                </div>
              )}
              <p className="text-[11px] text-slate-400">
                Approval adds this report to the internal queue; no external message is sent.
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
              <span>Officer Session: DSP Cyber Cell Patna</span>
              <span>Audit Status: Legally Traceable</span>
            </div>
          </section>

        </div>

        {/* ── Modal Footer ── */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="font-mono">Bihar Cyber Crime & Disinformation Monitoring Unit</span>
          <button
            onClick={onClose}
            className="btn-secondary text-xs py-1.5 px-4 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component: AI Verification Hub (Clean List View + Modal) ───────────
export default function AIVerification({
  grievances = [],
  selectedGrievanceId = null,
  onReanalyze,
  onVerify,
  onApproveForDispatch,
  onReanalyzeAll,
  batchAuditProgress = null,
}) {
  const [activeModalGrievance, setActiveModalGrievance] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [isBatchAuditing, setIsBatchAuditing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (selectedGrievanceId) {
      const target = grievances.find(g => g.id === selectedGrievanceId);
      if (target) setActiveModalGrievance(target);
    }
  }, [selectedGrievanceId, grievances]);

  // Keep modal grievance in sync with fresh data
  useEffect(() => {
    if (activeModalGrievance) {
      const fresh = grievances.find(g => g.id === activeModalGrievance.id);
      if (fresh) setActiveModalGrievance(fresh);
    }
  }, [grievances]);

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

  // Batch re-analyze all
  const handleBatchAudit = async () => {
    setIsBatchAuditing(true);
    try {
      if (onReanalyzeAll) {
        const res = await onReanalyzeAll();
        const failed = res.failed_count ? ` ${res.failed_count} failed.` : '';
        showToast(
          res.failed_count ? 'error' : 'success',
          `Batch audit finished: ${res.reanalyzed_count} posts evaluated.${failed}`
        );
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

  return (
    <div className="flex flex-col gap-5">

      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
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
              AI Triage & Verification Queue
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            AI Verification Queue
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            onClick={handleBatchAudit}
            disabled={isBatchAuditing || totalCount === 0}
            className="text-xs font-bold text-zinc-950 bg-amber-400 hover:bg-amber-300 active:scale-95 rounded-xl px-4 py-2.5 shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {isBatchAuditing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span>
              {isBatchAuditing
                ? `Analyzing ${batchAuditProgress?.completed || 0}/${batchAuditProgress?.total || totalCount}...`
                : 'Re-analyze All with AI'}
            </span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={totalCount === 0}
            className="btn-secondary text-xs rounded-xl px-4 py-2.5 flex items-center gap-1.5 border border-slate-200 shadow-sm"
          >
            <Download size={14} className="text-slate-600" />
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

      {/* ── KPI Metrics Ribbon ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>Total Queue</span>
            <Activity size={15} className="text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Multi-platform reports</div>
        </div>

        <div className="bg-white border border-sky-200/80 rounded-2xl p-4 shadow-sm bg-gradient-to-b from-sky-50/30 to-white">
          <div className="flex items-center justify-between text-sky-800 text-xs font-semibold mb-1.5">
            <span>Needs Review</span>
            <Eye size={15} className="text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-600">{pendingReviewCount}</div>
          <div className="text-[11px] text-sky-700/80 mt-1">Awaiting officer audit</div>
        </div>

        <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-sm bg-gradient-to-b from-amber-50/30 to-white">
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold mb-1.5">
            <span>Field Checks</span>
            <MapPin size={15} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600">{fieldCheckCount}</div>
          <div className="text-[11px] text-amber-700/80 mt-1">Ground inspection active</div>
        </div>

        <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-sm bg-gradient-to-b from-emerald-50/30 to-white">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold mb-1.5">
            <span>Decisions Logged</span>
            <CheckCircle2 size={15} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">{officerDecisionCount}</div>
          <div className="text-[11px] text-emerald-700/80 mt-1">Audited & certified</div>
        </div>
      </div>

      {/* ── Search & Filter Command Bar ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
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
              className={`text-xs px-3.5 py-2 rounded-xl border transition-all flex items-center gap-1.5 ${
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
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search keyword, ID, handle, district..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field text-xs pl-8 py-2 w-full rounded-xl"
            />
          </div>

          <div className="relative">
            <select
              value={districtFilter}
              onChange={e => setDistrictFilter(e.target.value)}
              className="select-field text-xs py-2 pr-8 rounded-xl font-medium"
            >
              <option value="">All Bihar Districts</option>
              {districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── The Clean List View of Reports ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          <span>Available Reports ({filteredGrievances.length})</span>
        </div>

        {filteredGrievances.length === 0 ? (
          <div className="card p-12 text-center text-slate-400 text-xs border-dashed border-2 bg-white">
            <AlertTriangle size={24} className="mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">No reports found.</p>
            <p className="text-[11px] text-slate-400 mt-1">Try clearing your search query or picking another filter tab.</p>
          </div>
        ) : (
          filteredGrievances.map((g, idx) => {
            const reviewState = getReviewState(g);
            const pCfg = getPlatformCfg(g.platform);
            const PIcon = pCfg.icon;
            const riskPct = Number(g.authenticity_risk_score) || 0;
            const severity = Number(g.severity_score) || 0;
            const isCritical = severity >= 8;

            return (
              <div
                key={g.id}
                onClick={() => setActiveModalGrievance(g)}
                style={{ animationDelay: `${Math.min(idx * 35, 300)}ms` }}
                className={`group card interactive-card animate-fade-slide-up p-4 sm:p-5 cursor-pointer bg-white border border-slate-200/90 rounded-2xl hover:border-sky-400 flex flex-col gap-3 relative overflow-hidden border-l-4 ${reviewState.cardBorder}`}
              >
                {/* Line 1: Platform, Author, Department, Time */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge border text-[11px] font-bold py-0.5 px-2.5 flex items-center gap-1.5 ${pCfg.badge}`}>
                      <PIcon size={12} />
                      <span>{g.platform?.split(' ')[0] || 'Web'}</span>
                    </span>

                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {g.id}
                    </span>

                    <span className="text-xs text-slate-500 truncate max-w-[150px]">
                      {g.author_handle || '@citizen'}
                    </span>

                    <span className="text-slate-300">·</span>

                    <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                      <Building2 size={12} className="text-slate-400" />
                      {g.department || 'General Administration'}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1 shrink-0">
                    <Clock size={12} />
                    {formatDistanceToNow(g.timestamp)}
                  </span>
                </div>

                {/* Line 2: Citizen Post Snippet */}
                <p className="text-sm text-slate-800 leading-relaxed font-sans line-clamp-2">
                  "{g.post_text}"
                </p>

                {/* Line 3: Location, Status Badge, Risk Pill, Action */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2.5 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Badge */}
                    <span className={`badge border px-2.5 py-0.5 text-xs font-bold ${reviewState.badgeClass}`}>
                      {reviewState.label}
                    </span>

                    {/* Location Badge */}
                    <span className="badge bg-slate-100 text-slate-700 border border-slate-200 text-xs flex items-center gap-1">
                      <MapPin size={11} className="text-slate-500" />
                      <span>{g.location_tagged || 'Bihar'}</span>
                    </span>

                    {/* AI Risk Score Pill */}
                    <span className={`badge border text-xs font-mono font-bold px-2 py-0.5 ${
                      riskPct >= 70 ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : riskPct >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      AI Risk: {riskPct}%
                    </span>

                    {/* Civic Severity Pill */}
                    <span className={`badge border text-xs font-mono px-2 py-0.5 ${
                      isCritical ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-glow-rose'
                                 : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      Severity: {severity}/10
                    </span>

                    {/* Media indicator */}
                    {g.image_url && (
                      <span className="badge bg-purple-50 text-purple-700 border border-purple-200 text-xs flex items-center gap-1">
                        <Img size={11} /> Visual Media Attached
                      </span>
                    )}
                  </div>

                  {/* Open Inspection CTA */}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-600 group-hover:text-sky-700 transition-colors">
                    <span>Inspect Analysis & Verify</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Detailed Forensic Analysis Modal ── */}
      {activeModalGrievance && (
        <ForensicAnalysisModal
          grievance={activeModalGrievance}
          onClose={() => setActiveModalGrievance(null)}
          onVerify={onVerify}
          onApproveForDispatch={onApproveForDispatch}
          onReanalyze={onReanalyze}
          onCopyId={handleCopyId}
          copiedId={copiedId}
        />
      )}

    </div>
  );
}
