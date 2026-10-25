import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain, ShieldAlert, ShieldCheck, AlertTriangle, Loader2, Image as Img,
  Hash, User, Building2, Sparkles, Search, Filter, CheckCircle2,
  ExternalLink, Download, Eye, AlertOctagon, MessageSquare,
  MapPin, Clock, Flame, ShieldX, Video, Newspaper, Radio, Check, Upload
} from 'lucide-react';
import { formatDistanceToNow, formatDateTime } from '../utils/dateUtils';
import { isFlaggedSuspicious, isUnverified, isVerifiedGenuine } from '../utils/verification';

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

function getReviewState(grievance) {
  if (grievance.officer_verdict === 'Verified Genuine') {
    return { id: 'genuine', label: 'Human-verified genuine', className: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  }
  if (grievance.officer_verdict === 'Confirmed Fake') {
    return { id: 'fake', label: 'Human-confirmed fake', className: 'text-rose-700 bg-rose-50 border-rose-200' };
  }
  if (grievance.officer_verdict === 'Under Field Investigation') {
    return { id: 'field', label: 'Field check requested', className: 'text-amber-900 bg-amber-100 border-amber-300' };
  }
  return { id: 'pending', label: 'Needs human review', className: 'text-blue-700 bg-blue-50 border-blue-200' };
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

function BotSignalList() {
  return (
    <p className="text-xs text-slate-600">Automated text checks cannot determine whether a post is fake or coordinated. Verify the original source and supporting evidence manually.</p>
  );
}

function GrievanceWorkbench({ g, onReanalyze }) {
  const imageInput = useRef(null);
  const localOcrInput = useRef(null);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [uploadedImageName, setUploadedImageName] = useState('');
  const [ocrProgress, setOcrProgress] = useState(null);

  const display = result || g;
  const isSusp  = isFlaggedSuspicious(display.authenticity_flag);
  const unverified = isUnverified(display.authenticity_flag);

  const handleAnalyze = async () => {
    setLoading(true); setError(null);
    try {
      const res = await onReanalyze(g);
      setResult({ ...g, ...res.analysis, ai_summary: res.analysis?.summary });
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
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
      if (typeof dataUrl !== 'string') throw new Error('Could not encode the selected image.');
      const separator = dataUrl.indexOf(',');
      if (separator < 0) throw new Error('Could not encode the selected image.');
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
        throw new Error('No readable English or Hindi text was found in this image.');
      }

      const res = await onReanalyze(g, { imageOcrText: extractedText });
      setResult({ ...g, ...res.analysis, ai_summary: res.analysis?.summary });
      setUploadedImageName(file.name);
    } catch (e) {
      setError(`Local OCR failed: ${e.message}`);
    } finally {
      if (worker) {
        await worker.terminate().catch(error => {
          console.error('Could not terminate local OCR worker:', error.message);
        });
      }
      setLoading(false);
      setOcrProgress(null);
    }
  };

  return (
    <div className="card overflow-hidden transition-all hover:shadow-md">
      {/* Header */}
      <div className={`px-4 py-3 border-b border-slate-100 flex items-center gap-3 ${isSusp ? 'bg-rose-50' : unverified ? 'bg-amber-50' : 'bg-emerald-50'}`}>
        {isSusp
          ? <ShieldAlert size={17} className="text-rose-600 flex-shrink-0" />
          : unverified
            ? <ShieldAlert size={17} className="text-amber-600 flex-shrink-0" />
            : <ShieldCheck size={17} className="text-emerald-600 flex-shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold" style={{ color: isSusp ? '#be123c' : unverified ? '#b45309' : '#15803d' }}>
            {isSusp ? '⚠ Flagged for human review' : unverified ? 'Unverified report — review required' : '✅ Verified genuine report'}
          </div>
          <div className="text-xs text-slate-500 font-mono">{g.id} · {g.author_handle}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleAnalyze} disabled={loading} className="btn-primary text-xs py-1.5 px-3 flex-shrink-0">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {loading ? 'Analysing...' : 'Re-run text analysis'}
          </button>
          <button onClick={() => imageInput.current?.click()} disabled={loading}
            className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0 disabled:opacity-60">
            <Upload size={12} /> Analyze image with Gemini
          </button>
          <button onClick={() => localOcrInput.current?.click()} disabled={loading}
            className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0 disabled:opacity-60">
            {loading && ocrProgress !== null ? <Loader2 size={12} className="animate-spin" /> : <Img size={12} />}
            {loading && ocrProgress !== null ? `Local OCR ${ocrProgress}%` : 'Local OCR + Groq'}
          </button>
          <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp"
            onChange={handleImageUpload} className="hidden" />
          <input ref={localOcrInput} type="file" accept="image/jpeg,image/png,image/webp"
            onChange={handleLocalOcrUpload} className="hidden" />
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left */}
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <User size={11}/> Post Text
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 leading-relaxed">
              {g.post_text}
            </div>
          </div>
          {(display.image_ocr_text || g.image_ocr_text) && (
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <Img size={11}/> {uploadedImageName ? 'Local English/Hindi OCR' : 'Image OCR Extraction'}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 font-mono leading-relaxed">
                "{display.image_ocr_text || g.image_ocr_text}"
              </div>
            </div>
          )}
          {g.image_url && (
            <img src={g.image_url} alt="" className="rounded-xl border border-slate-200 w-full h-32 object-cover"
              onError={e => e.target.style.display = 'none'} />
          )}
          <p className="text-xs text-slate-500">Local OCR runs in this browser using English and Hindi language data; only extracted text is sent for triage. Alternatively, Gemini can describe the uploaded image. Images are not stored.</p>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Bot / Manipulation Signals</div>
            <BotSignalList />
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">AI Risk Scores</div>
            <div className="flex flex-col gap-2">
              <RiskMeter value={display.severity_score}          label="Severity Score (1–10)" />
              <div className="text-xs text-slate-600">Authenticity cannot be established from text alone. This report is not verified.</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Building2 size={11}/>Department</div>
              <div className="text-sm font-semibold text-slate-800">{display.department}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-xs text-slate-500 mb-1">Category</div>
              <div className="text-sm font-semibold text-slate-800">{display.category}</div>
            </div>
          </div>
          {(display.ai_summary || result?.summary) && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
              <div className="text-xs font-bold text-violet-700 mb-1.5 flex items-center gap-1.5"><Brain size={11}/>{display.analysis_mode?.startsWith('groq:') ? 'Groq Text Triage' : display.analysis_mode?.startsWith('gemini') ? 'Gemini Fallback Triage' : 'Heuristic Summary'}</div>
              <p className="text-sm text-violet-800 italic leading-relaxed">"{display.ai_summary || result?.summary}"</p>
            </div>
          )}
          {display.media_analysis_status === 'completed' && display.media_observation && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="text-xs font-bold text-blue-700 mb-1.5 flex items-center gap-1.5"><Img size={11}/>Gemini Visual Observation</div>
              <p className="text-sm text-blue-800">{display.media_observation}</p>
              <p className="text-xs text-blue-700 mt-1">Visual description only; authenticity and manipulation require human review.</p>
            </div>
          )}
          {display.media_analysis_status === 'unavailable' && (
            <p role="status" className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Gemini image analysis unavailable. The image remains unverified and was not assessed.
            </p>
          )}
          {uploadedImageName && (
            <p className="text-xs text-slate-500">Last uploaded for analysis: {uploadedImageName}</p>
          )}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Hash size={11}/> Hashtags
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(g.hashtags || []).map(h => (
                <span key={h} className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-mono">{h}</span>
              ))}
            </div>
          </div>
          {error && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{error}</div>}
        </div>
      </div>
    </div>
  );
}

export default function AIVerification({ grievances = [], selectedGrievanceId = null, onReanalyze, onVerify, onReanalyzeAll }) {
  const [selectedId, setSelectedId] = useState(selectedGrievanceId || grievances[0]?.id || null);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [officerNote, setOfficerNote] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isBatchAuditing, setIsBatchAuditing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

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
      showToast('success', 'AI analysis refreshed. Review the signals; this does not verify the report.');
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

  // Export reports that a human reviewer confirmed as fake.
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
    link.setAttribute('download', `CyberCell_Human_Confirmed_Fake_Reports_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', `Exported ${flagged.length} human-confirmed fake reports to CSV.`);
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
  const hasMedia = Boolean(activeGrievance?.image_url || activeGrievance?.image_ocr_text);
  const mediaCheck = !hasMedia
    ? 'No image or OCR text attached'
    : activeGrievance.media_analysis_status === 'completed'
      ? 'Media analysis completed'
      : activeGrievance.media_analysis_status === 'unavailable'
        ? 'Media analysis unavailable'
        : 'Media attached; analysis not recorded';
  const textAnalysisLabel = activeGrievance?.analysis_mode
    ? `Analysis recorded · ${activeGrievance.analysis_mode}`
    : 'No text analysis recorded';

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="text-blue-600" size={22} />
              AI Triage & Human Review
            </h1>
            <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              Live Engine Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Review AI-generated signals, inspect the source, then record a human decision.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleBatchAudit}
            disabled={isBatchAuditing || totalCount === 0}
            className="text-xs font-bold text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-lg px-3.5 py-2 shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {isBatchAuditing ? <Loader2 size={13} className="animate-spin" /> : (
              <svg className="h-3.5 w-3.5 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span>{isBatchAuditing ? 'Analyzing all reports...' : 'Re-analyze all with AI'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={totalCount === 0}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Download size={13} />
            <span>Export confirmed fake reports</span>
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

      <section className="mb-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">What happens here?</h2>
            <p className="text-xs text-slate-500">
              AI helps prioritize reports; it cannot prove that a report is true or fake. Check the original source before recording a decision.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-3 md:grid-cols-3">
          {[
            ['1', 'Choose a report', 'Start with reports waiting for review.'],
            ['2', 'Check the evidence', 'Read the post and open its source when available.'],
            ['3', 'Record your decision', 'Verify, confirm fake, or request a field check. Add a note.'],
          ].map(([step, title, description]) => (
            <div key={step} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-xs font-extrabold text-amber-400 shadow-sm">{step}</span>
              <div>
                <div className="text-xs font-semibold text-slate-800">{title}</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {activeGrievance && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active review target</p>
              <h2 className="mt-1 break-words text-sm font-bold text-slate-900">
                {activeGrievance.id} <span className="font-normal text-slate-500">— {activeGrievance.location_tagged || 'Location unverified'}</span>
              </h2>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">{activeGrievance.post_text}</p>
            </div>
            <span className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${activeReviewState.className}`}>
              {activeReviewState.label}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Department suggested by AI</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{activeGrievance.department || 'Not assigned'}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Classification suggestion only; no department dispatch is triggered here.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Current case lifecycle</p>
              <p className="mt-1 text-sm font-semibold text-blue-700">{activeGrievance.status || 'Status not recorded'}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">This is the grievance status, separate from the human authenticity review.</p>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Review checks</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-800">Text triage</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{textAnalysisLabel}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-800">Image / OCR evidence</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{mediaCheck}</p>
                {activeGrievance.media_observation && (
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{activeGrievance.media_observation}</p>
                )}
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-800">Duplicate cross-check</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  {activeGrievance.duplicate_cluster_id
                    ? `${duplicateSiblings.length + 1} reports linked in ${activeGrievance.duplicate_cluster_id}`
                    : 'No duplicate cluster is currently recorded'}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── KPI Metrics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="kpi-card bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total reports</span>
            <Brain size={14} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">In this review queue</div>
        </div>

        <div className="kpi-card bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Needs review</span>
            <Eye size={14} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600">{pendingReviewCount}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">No human decision yet</div>
        </div>

        <div className="kpi-card bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Field checks</span>
            <MapPin size={14} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600">{fieldCheckCount}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">Marked for follow-up</div>
        </div>

        <div className="kpi-card bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Human decisions</span>
            <CheckCircle2 size={14} className="text-violet-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-violet-600">{officerDecisionCount}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">Genuine or fake recorded</div>
        </div>
      </div>

      {/* ── Search & Filter Command Bar ── */}
      <div className="card p-3 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          {[
            { id: 'all', label: `All (${totalCount})` },
            { id: 'pending', label: `Needs review (${pendingReviewCount})` },
            { id: 'field', label: `Field check (${fieldCheckCount})` },
            { id: 'decided', label: `Human decisions (${officerDecisionCount})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`text-xs px-3.5 py-1.5 rounded-lg border transition-all ${
                filterType === tab.id
                  ? tab.id === 'field'
                    ? 'bg-amber-500 text-zinc-950 border-amber-500 font-bold shadow-sm hover:bg-amber-400'
                    : 'bg-zinc-950 text-amber-400 border-zinc-800 font-semibold shadow-sm'
                  : 'bg-slate-100 text-slate-600 border-slate-200 font-medium hover:bg-slate-200'
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
                const reviewState = getReviewState(g);
                const pCfg = getPlatformCfg(g.platform);
                const PIcon = pCfg.icon;

                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedId(g.id)}
                    className={`card p-3 cursor-pointer transition-all border text-left flex flex-col gap-2 ${
                      isSelected
                        ? 'border-2 border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/40'
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
                        <span className={`badge border px-2 py-0.5 text-[10px] font-semibold ${reviewState.className}`}>
                          {reviewState.label}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500 truncate max-w-[120px]">{g.location_tagged}</span>
                      </div>

                      <span className="text-[10px] font-mono text-slate-500">
                        AI risk {g.authenticity_risk_score ?? '—'}% · Sev {g.severity_score ?? '—'}/10
                      </span>
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
                  : isFieldCheckRequested
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-start gap-3">
                  {isConfirmedFake ? (
                    <ShieldX size={24} className="text-rose-600 shrink-0 mt-0.5" />
                  ) : isFieldCheckRequested ? (
                    <ShieldAlert size={24} className="text-amber-600 shrink-0 mt-0.5" />
                  ) : isVerifiedGenuine ? (
                    <ShieldCheck size={24} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Eye size={24} className="text-blue-600 shrink-0 mt-0.5" />
                  )}

                  <div>
                    <div className="text-sm font-bold" style={{
                      color: isConfirmedFake ? '#be123c' : isFieldCheckRequested ? '#b45309' : isVerifiedGenuine ? '#15803d' : '#1d4ed8'
                    }}>
                      {isConfirmedFake
                        ? 'Human decision: confirmed fake'
                        : isVerifiedGenuine
                        ? 'Human decision: verified genuine'
                        : isFieldCheckRequested
                        ? 'Field check requested'
                        : 'Waiting for human review'}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                      <span>ID: {activeGrievance.id}</span>
                      <span>·</span>
                      <span>Source: {activeGrievance.platform}</span>
                      <span>·</span>
                      <span>{formatDateTime(activeGrievance.timestamp)}</span>
                    </div>
                    {isPendingReview && (
                      <p className="mt-1 text-xs text-blue-800">
                        AI risk is a triage signal only; no reviewer has verified this report yet.
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
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-blue-700 bg-white"
                    >
                      <ExternalLink size={12} />
                      <span>{activeGrievance.platform === 'YouTube' ? 'Watch Video' : 'View Source'}</span>
                    </a>
                  )}

                  <button
                    onClick={handleSingleReanalyze}
                    disabled={isReanalyzing}
                    className="text-xs font-bold text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-md shadow-sm transition-all py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {isReanalyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    <span>{isReanalyzing ? 'Analyzing...' : 'Re-analyze with AI'}</span>
                  </button>
                </div>
              </div>

              <div className="p-5 flex flex-col gap-5">
                {/* ── Officer Human-in-the-Loop Action Center ── */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-blue-600" />
                      Human review decision
                    </span>
                    {activeGrievance.officer_verdict && (
                      <span className="badge bg-violet-100 text-violet-800 border border-violet-200 text-xs font-bold">
                        Logged Verdict: {activeGrievance.officer_verdict}
                      </span>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed text-slate-600">
                    AI analysis is not a verdict. Review the source and evidence first. Add a short note explaining the basis for your decision.
                  </p>

                  {activeGrievance.officer_notes && (
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 italic">
                      <span className="font-semibold text-slate-900 not-italic">Officer Audit Note: </span>
                      "{activeGrievance.officer_notes}" · <span className="text-slate-400 font-mono">{formatDateTime(activeGrievance.verified_at)}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Review note (e.g. source checked, site visit completed)..."
                      value={officerNote}
                      onChange={e => setOfficerNote(e.target.value)}
                      className="input-field text-xs py-1.5 flex-1"
                    />

                    <div className="flex gap-1.5 shrink-0 w-full sm:w-auto">
                      <button
                        onClick={() => handleOfficerVerdict('Verified Genuine')}
                        disabled={isVerifying}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
                      >
                        <Check size={13} />
                        <span>Verify Genuine</span>
                      </button>

                      <button
                        onClick={() => handleOfficerVerdict('Confirmed Fake')}
                        disabled={isVerifying}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-rose-600 disabled:cursor-wait disabled:opacity-60"
                      >
                        <AlertOctagon size={13} />
                        <span>Confirm Fake</span>
                      </button>

                      <button
                        onClick={() => handleOfficerVerdict('Under Field Investigation')}
                        disabled={isVerifying}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-zinc-950 shadow-md transition-all hover:bg-amber-400 hover:shadow-amber-500/20 active:scale-95 disabled:cursor-wait disabled:opacity-60"
                      >
                        <Clock size={13} />
                        <span>Request field check</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    “Request field check” records a follow-up status in this dashboard; it does not dispatch a team automatically.
                  </p>
                </div>

                {/* ── Triple Risk Meters ── */}
                <div>
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-700">AI triage signals</h3>
                  <p className="mb-2 text-[11px] text-slate-500">
                    These model-generated indicators help prioritize review. They are not proof or a probability that the report is true or fake.
                  </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <RiskMeter
                    value={activeGrievance.authenticity_risk_score || 15}
                    label="AI authenticity-risk signal"
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
          {activeGrievance && (
            <details className="card p-3">
              <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                Optional image analysis and English/Hindi OCR tools
              </summary>
              <div className="pt-3">
                <GrievanceWorkbench key={activeGrievance.id} g={activeGrievance} onReanalyze={onReanalyze} />
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
