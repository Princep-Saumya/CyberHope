import { useRef, useState } from 'react';
import { Brain, ShieldAlert, ShieldCheck, AlertTriangle, Loader2, Image as Img, Hash, User, Building2, Sparkles, Upload } from 'lucide-react';
import { isFlaggedSuspicious, isUnverified, isVerifiedGenuine } from '../utils/verification';

function RiskMeter({ value, label }) {
  const pct   = Math.min(100, value);
  const color = pct > 70 ? '#e11d48' : pct > 40 ? '#d97706' : '#059669';
  const bg    = pct > 70 ? 'bg-rose-50'   : pct > 40 ? 'bg-amber-50'   : 'bg-emerald-50';
  const border= pct > 70 ? 'border-rose-200' : pct > 40 ? 'border-amber-200' : 'border-emerald-200';
  const track = pct > 70 ? 'bg-rose-100'  : pct > 40 ? 'bg-amber-100'  : 'bg-emerald-100';
  return (
    <div className={`p-3 rounded-xl border ${bg} ${border}`}>
      <div className="flex justify-between mb-2">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className="text-sm font-bold font-mono" style={{ color }}>{value}{label.includes('Score') ? '/10' : '%'}</span>
      </div>
      <div className={`h-2 ${track} rounded-full overflow-hidden`}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct * (label.includes('Score') ? 10 : 1)}%`, background: color }} />
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
        base64: dataUrl.slice(separator + 1),
        mimeType: file.type,
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

export default function AIVerification({ grievances, onReanalyze }) {
  const [filter, setFilter] = useState('all');
  const filtered = grievances.filter(g => {
    if (filter === 'suspicious') return isFlaggedSuspicious(g.authenticity_flag);
    if (filter === 'genuine') return isVerifiedGenuine(g.authenticity_flag);
    if (filter === 'unverified') return isUnverified(g.authenticity_flag);
    return true;
  });
  const suspiciousCount = grievances.filter(g => isFlaggedSuspicious(g.authenticity_flag)).length;
  const genuineCount = grievances.filter(g => isVerifiedGenuine(g.authenticity_flag)).length;
  const unverifiedCount = grievances.filter(g => isUnverified(g.authenticity_flag)).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Analysed', value: grievances.length, color: '#2563eb' },
          { label: 'Flagged for Review', value: suspiciousCount, color: '#e11d48' },
          { label: 'Verified Genuine', value: genuineCount, color: '#059669' },
          { label: 'Unverified', value: unverifiedCount, color: '#d97706' },
        ].map(({ label, value, color }) => (
          <div key={label} className="kpi-card hover:scale-[1.02] transition-all">
            <div className="text-2xl font-bold font-mono" style={{ color }}>{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="card p-1 flex gap-1 w-fit">
        {[['all','All Posts'],['suspicious','⚠ Flagged'],['genuine','✅ Verified Genuine'],['unverified','Unverified']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition-all ${
              filter === v ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}>
            {l}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0
          ? <div className="card p-12 text-center text-slate-400">No posts match this filter</div>
          : filtered.map(g => (
            <GrievanceWorkbench key={g.id} g={g} onReanalyze={onReanalyze} />
          ))}
      </div>
    </div>
  );
}
