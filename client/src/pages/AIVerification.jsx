import { useState } from 'react';
import { Brain, ShieldAlert, ShieldCheck, AlertTriangle, Loader2, Image as Img, Hash, User, Building2, Sparkles } from 'lucide-react';
const FAKE_KEYWORDS = ['RT RT', 'share before', 'shocking proof', 'expose', 'secret order', 'fabricated', 'forged', 'viral proof'];

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

function BotSignalList({ postText }) {
  const signals = [];
  const text = postText.toLowerCase();
  if (FAKE_KEYWORDS.some(k => text.includes(k.toLowerCase()))) signals.push({ label: 'Viral share / urgency language detected', risk: 'high' });
  if (/\d{3,}/.test(postText)) signals.push({ label: 'Numbered account pattern', risk: 'medium' });
  if (text.includes('rt ') || text.includes('retweet')) signals.push({ label: 'Coordinated retweet solicitation', risk: 'high' });
  if (text.length < 80) signals.push({ label: 'Very short post — low context', risk: 'low' });
  if (!signals.length) signals.push({ label: 'No bot pattern signals detected', risk: 'none' });

  const colors = {
    high:   'text-rose-700 bg-rose-50 border-rose-200',
    medium: 'text-amber-700 bg-amber-50 border-amber-200',
    low:    'text-blue-700 bg-blue-50 border-blue-200',
    none:   'text-emerald-700 bg-emerald-50 border-emerald-200',
  };
  return (
    <div className="flex flex-col gap-1.5">
      {signals.map((s, i) => (
        <div key={i} className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${colors[s.risk]}`}>
          {s.risk !== 'none' ? '⚠ ' : '✅ '}{s.label}
        </div>
      ))}
    </div>
  );
}

function GrievanceWorkbench({ g, onReanalyze }) {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);

  const display = result || g;
  const isSusp  = display.authenticity_flag !== 'Likely Genuine Grievance';

  const handleAnalyze = async () => {
    setLoading(true); setError(null);
    try {
      const res = await onReanalyze(g);
      setResult({ ...g, ...res.analysis, ai_summary: res.analysis?.summary });
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="card overflow-hidden transition-all hover:shadow-md">
      {/* Header */}
      <div className={`px-4 py-3 border-b border-slate-100 flex items-center gap-3 ${isSusp ? 'bg-rose-50' : 'bg-emerald-50'}`}>
        {isSusp
          ? <ShieldAlert size={17} className="text-rose-600 flex-shrink-0" />
          : <ShieldCheck size={17} className="text-emerald-600 flex-shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold" style={{ color: isSusp ? '#be123c' : '#15803d' }}>
            {isSusp ? '⚠ Suspicious / Possible Fake Campaign' : '✅ Likely Genuine Public Grievance'}
          </div>
          <div className="text-xs text-slate-500 font-mono">{g.id} · {g.author_handle}</div>
        </div>
        <button onClick={handleAnalyze} disabled={loading} className="btn-primary text-xs py-1.5 px-3 flex-shrink-0">
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {loading ? 'Analysing...' : `Re-run ${display.analysis_mode === 'gemini' ? 'Gemini' : 'local'} analysis`}
        </button>
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
          {g.image_ocr_text && (
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <Img size={11}/> Image OCR Extraction
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 font-mono leading-relaxed">
                "{g.image_ocr_text}"
              </div>
            </div>
          )}
          {g.image_url && (
            <img src={g.image_url} alt="" className="rounded-xl border border-slate-200 w-full h-32 object-cover"
              onError={e => e.target.style.display = 'none'} />
          )}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Bot / Manipulation Signals</div>
            <BotSignalList postText={g.post_text} />
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">AI Risk Scores</div>
            <div className="flex flex-col gap-2">
              <RiskMeter value={display.severity_score}          label="Severity Score (1–10)" />
              <RiskMeter value={display.authenticity_risk_score} label="Authenticity Risk %" />
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
              <div className="text-xs font-bold text-violet-700 mb-1.5 flex items-center gap-1.5"><Brain size={11}/>{display.analysis_mode === 'gemini' ? 'Gemini Summary' : 'Heuristic Summary'}</div>
              <p className="text-sm text-violet-800 italic leading-relaxed">"{display.ai_summary || result?.summary}"</p>
            </div>
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
    if (filter === 'suspicious') return g.authenticity_flag !== 'Likely Genuine Grievance';
    if (filter === 'genuine')    return g.authenticity_flag === 'Likely Genuine Grievance';
    return true;
  });
  const suspCount = grievances.filter(g => g.authenticity_flag !== 'Likely Genuine Grievance').length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Analysed',   value: grievances.length,              color: '#2563eb' },
          { label: 'Suspicious',       value: suspCount,                       color: '#e11d48' },
          { label: 'Verified Genuine', value: grievances.length - suspCount,   color: '#059669' },
        ].map(({ label, value, color }) => (
          <div key={label} className="kpi-card hover:scale-[1.02] transition-all">
            <div className="text-2xl font-bold font-mono" style={{ color }}>{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="card p-1 flex gap-1 w-fit">
        {[['all','All Posts'],['suspicious','⚠ Suspicious'],['genuine','✅ Genuine']].map(([v,l]) => (
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
