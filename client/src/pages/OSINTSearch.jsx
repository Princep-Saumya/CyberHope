import { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, Building2, Shield, RotateCcw, Hash, LayoutGrid, List, AlertTriangle, CheckCircle2, Copy, ExternalLink, Newspaper, Loader2, Radio, SlidersHorizontal } from 'lucide-react';
import { formatDistanceToNow } from '../utils/dateUtils';
import { api } from '../services/api';
import { isFlaggedSuspicious, isUnverified, isVerifiedGenuine } from '../utils/verification';

const DEPARTMENTS = [
  '', 'Road Construction Department (RCD)',
  'Bihar State Power Holding Company Ltd (BSPHCL)',
  'Public Health Department (PHD)', 'Cyber Cell / Bihar Police',
  'Water Resources Department (WRD)', 'General Administration',
];
const LOCATIONS   = ['', 'Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Nalanda'];
const PLATFORMS   = { 'X (Twitter)': '𝕏', Facebook: 'f', Instagram: '◉', 'WhatsApp (Screenshot)': '💬' };
const QUICK_FILTERS = [
  { label: '#BPSC', key: 'bpsc', terms: [['bpsc'], ['bihar', 'public', 'service', 'commission']] },
  { label: '#PatnaFloods', key: 'patnafloods', terms: [['patnafloods'], ['patna', 'flood'], ['पटना', 'बाढ़'], ['पटना', 'बाढ़']] },
  { label: '#RCD_Bihar', key: 'rcdbihar', terms: [['rcdbihar'], ['rcd', 'bihar'], ['road', 'construction'], ['सड़क', 'बिहार'], ['सडक', 'बिहार']] },
  { label: '#PowerOutage', key: 'poweroutage', terms: [
    ['poweroutage'], ['power', 'outage'], ['power', 'cut'], ['electricity'],
    ['transformer'], ['बिजली'], ['विद्युत'],
  ] },
  { label: '#WaterCrisis', key: 'watercrisis', terms: [
    ['watercrisis'], ['water', 'shortage'], ['water', 'contamination'],
    ['water', 'supply'], ['पानी'], ['पेयजल'], ['जल', 'संकट'],
  ] },
];

function getFeedSearchText(record) {
  return [
    record.title,
    record.description,
    record.post_text,
    record.body,
    record.ai_summary,
    record.location_tagged,
    record.department,
    record.category,
    record.hashtags,
    record.extracted_keywords,
    record.extractedKeywords,
    record.keywords,
  ]
    .flatMap(value => Array.isArray(value) ? value : [value])
    .filter(value => typeof value === 'string')
    .join(' ')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/#/g, ' ');
}

function getQuickFilterCount(records, terms) {
  return records.filter(record => {
    const text = getFeedSearchText(record);
    return terms.some(variant => variant.every(term => text.includes(term)));
  }).length;
}

function normalizeFilterValue(value) {
  return String(value || '').trim().replace(/^#+/, '').toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
}

const SEVERITY_CFG = s =>
  s >= 9 ? { cls: 'bg-rose-50 text-rose-700 border-rose-200', dot: '#e11d48', label: `CRITICAL ${s}` } :
  s >= 7 ? { cls: 'bg-rose-50 text-rose-700 border-rose-200', dot: '#e11d48', label: `HIGH ${s}` }     :
  s >= 5 ? { cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: '#d97706', label: `MED ${s}` }  :
           { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: '#059669', label: `LOW ${s}` };

const STATUS_CLS = {
  Received:              'text-slate-600 bg-slate-100 border-slate-200',
  Assigned:              'text-blue-700 bg-blue-50 border-blue-200',
  'Under Investigation': 'text-amber-700 bg-amber-50 border-amber-200',
  Resolved:              'text-emerald-700 bg-emerald-50 border-emerald-200',
  Closed:                'text-slate-500 bg-slate-50 border-slate-200',
};

function PublicSourceSearch({ onImportSourceItem, onAddDemoSample }) {
  const [source, setSource] = useState('all');
  const [query, setQuery] = useState('');
  const [taxonomy, setTaxonomy] = useState([]);
  const [sectorId, setSectorId] = useState('');
  const [statuses, setStatuses] = useState({});
  const [items, setItems] = useState([]);
  const [sourceStatus, setSourceStatus] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchComplete, setSearchComplete] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [itemActions, setItemActions] = useState({});

  useEffect(() => {
    api.getPublicSourceStatus()
      .then(result => setStatuses(result.sources || {}))
      .catch(error => setSearchError(`Could not load source status: ${error.message}`));
    api.getOsintTaxonomy()
      .then(result => setTaxonomy(result.sectors || []))
      .catch(error => setSearchError(`Could not load official OSINT search taxonomy: ${error.message}`));
  }, []);

  const handleSearch = async (event) => {
    event.preventDefault();
    setSearching(true);
    setSearchComplete(false);
    setSearchError('');
    setItems([]);
    setSourceStatus([]);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const result = await api.searchPublicSource(source, query, sectorId, { signal: controller.signal });
      setItems(result.items || []);
      setSourceStatus(result.source_status || [{
        source,
        count: result.count || 0,
        source_mode: result.source_mode || 'live',
      }]);
    } catch (error) {
      setSearchError(controller.signal.aborted
        ? 'Search timed out after 12 seconds. Try a different source or a shorter query.'
        : error.message);
    } finally {
      clearTimeout(timeoutId);
      setSearching(false);
      setSearchComplete(true);
    }
  };

  const handleAddDemoSample = async (item) => {
    setItemActions(prev => ({ ...prev, [item.id]: { state: 'loading' } }));
    try {
      const result = await onAddDemoSample(item);
      setItemActions(prev => ({
        ...prev,
        [item.id]: { state: 'saved', duplicate: false, department: result.record.department,
          severity: result.record.severity_score, mode: result.analysis.analysis_mode },
      }));
    } catch (error) {
      setItemActions(prev => ({ ...prev, [item.id]: { state: 'error', message: error.message } }));
    }
  };

  const handleImport = async (item) => {
    setItemActions(prev => ({ ...prev, [item.id]: { state: 'loading' } }));
    try {
      const result = await onImportSourceItem({
        source: item.source,
        source_id: item.id,
        source_url: item.url,
        author: item.author,
        published_at: item.published_at,
        post_text: item.text || item.title,
        thumbnail_url: item.thumbnail_url,
      });
      setItemActions(prev => ({
        ...prev,
        [item.id]: {
          state: 'saved',
          duplicate: result.duplicate,
          department: result.record.department,
          severity: result.record.severity_score,
          mode: result.record.analysis_mode,
        },
      }));
    } catch (error) {
      setItemActions(prev => ({ ...prev, [item.id]: { state: 'error', message: error.message } }));
    }
  };

  const selectedStatus = statuses[source];
  const showingCachedMatches = sourceStatus.some(status => status.source_mode === 'cached-local');
  const selectedSector = taxonomy.find(sector => sector.id === sectorId);
  const sourceConnected = source === 'all' || Boolean(selectedStatus?.configured);
  const sourceStatusLabel = source === 'all'
    ? 'Provider status shown per result'
    : selectedStatus?.status || (selectedStatus?.configured ? 'Connected' : 'Not configured');
  const sourceAvailable = source === 'all'
    ? Object.values(statuses).some(status => status.configured)
    : Boolean(selectedStatus?.configured);

  return (
    <>
    <section className="card p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Radio size={15} className="text-amber-500" /> Public Source Search
          </div>
        </div>
        <details className="relative self-start md:self-auto md:min-w-52 rounded-lg border border-zinc-800 bg-zinc-900">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-semibold text-amber-400">
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${sourceConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {source === 'all' ? 'Multiple sources' : selectedStatus?.configured ? 'Source connected' : 'Source status'}
            </span>
            {source === 'youtube' && selectedStatus?.configured && (
              <span className="font-mono text-amber-200">{selectedStatus.searches_remaining}/{selectedStatus.daily_search_limit} left</span>
            )}
          </summary>
          <div className="absolute right-0 top-full z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">{source === 'all' ? 'Supported public sources' : selectedStatus?.configured ? 'Search provider' : 'Setup required'}</span>
              <span className={sourceConnected ? 'text-emerald-700' : 'text-amber-700'}>
                {sourceStatusLabel}
              </span>
            </div>
            {source === 'youtube' && selectedStatus?.configured && (
              <p className="mt-2 text-xs text-slate-600">
                {selectedStatus.searches_remaining} of {selectedStatus.daily_search_limit} daily searches remain; requests are spaced at least {selectedStatus.minimum_interval_seconds} seconds apart.
              </p>
            )}
            {!selectedStatus?.configured && selectedStatus?.reason && (
              <p className="mt-2 text-xs text-amber-800">{selectedStatus.reason} Add credentials to the server environment to enable this source.</p>
            )}
            {statuses.grok?.configured && statuses.grok.status !== 'ready' && (
              <p role="status" className="mt-2 border-t border-slate-100 pt-2 text-xs text-amber-800">
                xAI Grok: {statuses.grok.status}. Text analysis may use Groq or Gemini fallback.
              </p>
            )}
            {statuses.groq?.configured && statuses.groq.status !== 'ready' && (
              <p role="status" className="mt-2 border-t border-slate-100 pt-2 text-xs text-amber-800">
                Groq: {statuses.groq.status}. Text analysis may use Gemini fallback or local heuristics.
              </p>
            )}
            {statuses.gemini?.configured && !statuses.gemini.status.startsWith('Configured') && (
              <p role="status" className="mt-2 border-t border-slate-100 pt-2 text-xs text-amber-800">
                Gemini: {statuses.gemini.status}. Gemini fallback and image analysis may be unavailable.
              </p>
            )}
          </div>
        </details>
      </div>

      <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-[100px_125px_minmax(0,1fr)_auto] gap-2">
        <select value={source} onChange={event => setSource(event.target.value)} className="select-field min-w-0 w-full px-2">
          <option value="all">All supported sources</option>
          <option value="google-news">Google News</option>
          <option value="reddit">Reddit</option>
          <option value="youtube">YouTube</option>
        </select>
        <select
          value={sectorId}
          onChange={event => {
            const nextId = event.target.value;
            const nextSector = taxonomy.find(sector => sector.id === nextId);
            setSectorId(nextId);
            if (nextSector) setQuery(nextSector.example_query);
          }}
          className="select-field min-w-0 w-full px-2"
          aria-label="Official OSINT sector"
        >
          <option value="">Choose official sector</option>
          {taxonomy.map(sector => <option key={sector.id} value={sector.id}>{sector.label}</option>)}
        </select>
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          maxLength={160}
          placeholder="Search Bihar civic issues, e.g. Patna water supply or Bihar road pothole"
          className="input-field min-w-0"
          required
        />
        <button type="submit" disabled={searching || !sourceAvailable}
          className="justify-center whitespace-nowrap px-3 py-2 rounded-lg bg-amber-500 text-zinc-950 text-sm font-semibold hover:bg-amber-400 transition-colors inline-flex items-center gap-2 disabled:opacity-50">
          {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {searching ? 'Searching…' : 'Search source'}
        </button>
      </form>
      {selectedSector && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Official quick tags:</span>
          {selectedSector.quick_tags.map(tag => (
            <button key={tag} type="button" onClick={() => setQuery(`"${tag}"`)}
              className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-700 font-mono hover:bg-blue-50 hover:border-blue-200 hover:text-blue-800 transition-colors">
              {tag}
            </button>
          ))}
        </div>
      )}
      {source === 'youtube' && (selectedStatus?.searches_remaining === 0 || selectedStatus?.quota_blocked) && (
        <p role="status" className="mt-2 text-xs text-amber-800">
          {selectedStatus?.reason || 'YouTube’s live daily quota is reached.'} Searches can still show matching records already saved locally.
        </p>
      )}
      <p className="mt-2 text-xs text-slate-500">
        Hashtag and keyword search covers Google News, Reddit, and YouTube public results; it cannot search every website or private social post.
      </p>
      {searchError && <p role="alert" className="mt-2 text-sm text-rose-700">{searchError}</p>}
    </section>
    {(items.length > 0 || searching || searchComplete) && (
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-bold text-slate-800">Public Search Results</div>
          {items.length > 0 && <span className="text-xs text-slate-600">{items.length} results</span>}
        </div>
        {showingCachedMatches && (
          <p role="status" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            Showing cached OSINT matches (Live API quota reached). These reports are already saved locally; they are not new live results.
          </p>
        )}
        {searching && items.length === 0 && <p className="text-sm text-slate-600">Searching public sources…</p>}
        {sourceStatus.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {sourceStatus.map(status => (
              <span key={status.source} className={`rounded-full border px-2.5 py-1 text-xs ${
                status.error ? 'border-rose-200 bg-rose-50 text-rose-800' :
                    ['curated-demo', 'cached-local'].includes(status.source_mode) ? 'border-amber-200 bg-amber-50 text-amber-800' :
                    'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}>
                {status.source}: {status.source_mode === 'cached-local'
                  ? `${status.count} cached matches`
                  : status.error
                    ? status.error
                    : `${status.count} found${status.source_mode === 'curated-demo' ? ' · demo examples only' : ''}`}
              </span>
            ))}
          </div>
        )}
        {searchComplete && !searching && items.length === 0 && (
          <p className="text-sm text-slate-600">
            {showingCachedMatches
              ? 'No matching saved reports were found. Try a broader keyword or search again when the live quota is available.'
              : 'No matching posts were returned. Try another hashtag or keyword, or check the provider status above.'}
          </p>
        )}
        {items.length > 0 && (
          <div className="flex flex-col gap-3">
          {items.map(item => {
            const action = itemActions[item.id];
            const sourceStyle = item.source?.toLowerCase().includes('youtube')
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : item.source?.toLowerCase().includes('reddit')
                ? 'bg-orange-50 text-orange-800 border-orange-200'
                : 'bg-blue-50 text-blue-700 border-blue-200';
            const descriptionTags = [...new Set(item.text?.match(/#[\p{L}\p{N}_]+/gu) || [])];
            const description = item.text?.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\s+/g, ' ').trim();
            return (
              <article key={item.id} className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      {item.thumbnail_url && (
                        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-900">
                          <img src={item.thumbnail_url} alt={item.title} className="h-full w-full object-cover" />
                          <span className={`absolute bottom-1 right-1 rounded px-1 py-0.5 text-[9px] font-bold text-white ${item.source === 'YouTube' ? 'bg-red-600/90' : 'bg-orange-600/90'}`}>
                            {item.source === 'YouTube' ? 'VIDEO' : 'IMAGE'}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${sourceStyle}`}>{item.source}</span>
                          {item.is_demo && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Demo example · not live</span>}
                          {item.is_cached && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Already saved locally</span>}
                          {item.subreddit && <span className="text-xs font-semibold text-slate-700">r/{item.subreddit}</span>}
                          <span className="text-xs font-semibold text-slate-800">{item.author}</span>
                          {item.published_at && <span className="text-xs text-slate-600">{formatDistanceToNow(item.published_at)}</span>}
                        </div>
                        <a href={item.url || undefined} target="_blank" rel="noreferrer"
                          className="text-sm font-semibold text-blue-700 hover:underline">
                          {item.title}
                        </a>
                        {description && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-700">{description}</p>}
                        {descriptionTags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {descriptionTags.map(tag => <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">{tag}</span>)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => item.is_demo ? handleAddDemoSample(item) : handleImport(item)}
                    disabled={item.is_cached || (!item.is_demo && !item.url) || action?.state === 'loading' || action?.state === 'saved'}
                    className="inline-flex items-center justify-center gap-1.5 self-start rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {action?.state === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <Newspaper size={12} />}
                    {item.is_demo
                      ? action?.state === 'saved' ? 'Sample added' : 'Add sample to feed'
                      : item.is_cached ? 'Already in feed' : action?.state === 'saved' ? (action.duplicate ? 'Already added' : 'Added to reports') : 'Analyze & Add'}
                  </button>
                </div>
                {action?.state === 'saved' && (
                  <p className="mt-2 text-xs text-emerald-700">
                    {action.duplicate ? 'This source link was already recorded.' : `${action.department} · Severity ${action.severity}/10 · ${action.mode?.startsWith('grok:') ? 'xAI Grok' : action.mode?.startsWith('groq:') ? 'Groq' : action.mode?.startsWith('gemini') ? 'Gemini fallback' : 'Local heuristic'} analysis`}
                  </p>
                )}
                {action?.state === 'error' && <p role="alert" className="text-xs text-rose-700">{action.message}</p>}
              </article>
            );
          })}
          </div>
        )}
      </section>
    )}
    </>
  );
}

function GrievanceRow({ g, onSelect, clusterCount, highlighted }) {
  const sv = SEVERITY_CFG(g.severity_score);
  const isSusp = isFlaggedSuspicious(g.authenticity_flag);
  const verified = isVerifiedGenuine(g.authenticity_flag);
  const statusCls = STATUS_CLS[g.status] || STATUS_CLS.Received;
  return (
    <tr
      data-report-id={g.id}
      className={`table-row-hover border-b border-slate-100 last:border-0 transition-colors ${highlighted ? 'bg-amber-100 ring-2 ring-inset ring-amber-400' : ''}`}
      onClick={() => onSelect(g)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{PLATFORMS[g.platform] || '◎'}</span>
          <div>
            <div className="text-sm font-semibold text-slate-800">{g.author_handle}</div>
            <div className="text-xs text-slate-400 font-mono">{g.platform.split(' ')[0]}</div>
            {g.is_reference_record && (
              <span className="badge mt-1 bg-slate-100 text-slate-600 border border-slate-200">Reference record</span>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 max-w-xs">
        <p className="text-sm text-slate-700 line-clamp-2">{g.post_text}</p>
        <div className="flex gap-1 mt-1 flex-wrap">
          {(g.hashtags || []).slice(0, 3).map(h => (
            <span key={h} className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-1.5 rounded font-mono">{h}</span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-slate-800">{g.location_tagged}</div>
        <div className="text-xs text-slate-500">{g.department?.split('(')[0]?.trim()}</div>
        {g.sector_label && <div className="text-xs text-blue-700">{g.sector_label}</div>}
      </td>
      <td className="px-4 py-3">
        <span className={`badge border ${sv.cls}`}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sv.dot }} />
          {sv.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className={`badge border ${isSusp ? 'bg-purple-50 text-purple-800 border-purple-200' : verified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            {isSusp || !verified ? <AlertTriangle size={10}/> : <CheckCircle2 size={10}/>}
            {isSusp ? 'Flagged after review' : verified ? 'Verified by human' : 'Unverified'}
          </span>
          {clusterCount > 1 && (
            <span className="badge bg-indigo-100 text-indigo-800 border border-indigo-200">
              <Copy size={9}/>{clusterCount} merged
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`badge text-xs border ${statusCls}`}>{g.status}</span>
      </td>
      <td className="px-4 py-3">
        <button type="button" onClick={e => { e.stopPropagation(); onSelect(g); }} className="rounded px-3 py-1 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors">
          <ExternalLink size={11}/> View
        </button>
      </td>
    </tr>
  );
}

function GrievanceCard({ g, onSelect, clusterCount, highlighted }) {
  const sv = SEVERITY_CFG(g.severity_score);
  const isSusp = isFlaggedSuspicious(g.authenticity_flag);
  const unverified = isUnverified(g.authenticity_flag);
  return (
    <div
      data-report-id={g.id}
      className={`card-hover p-4 transition-colors ${highlighted ? 'bg-amber-100 ring-2 ring-amber-400' : ''}`}
      onClick={() => onSelect(g)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{PLATFORMS[g.platform] || '◎'}</span>
          <span className="text-sm font-semibold text-slate-800">{g.author_handle}</span>
          <span className="text-xs text-slate-400">{formatDistanceToNow(g.timestamp)}</span>
        </div>
        <span className={`badge border flex-shrink-0 ${sv.cls}`}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sv.dot }} />
          {sv.label}
        </span>
      </div>
      <p className="text-sm text-slate-700 line-clamp-2 mb-2">{g.post_text}</p>
      {g.is_reference_record && (
        <span className="badge mb-2 bg-slate-100 text-slate-600 border border-slate-200">Reference record</span>
      )}
      <div className="flex gap-1 flex-wrap mb-2">
        {(g.hashtags||[]).slice(0,4).map(h => (
          <span key={h} className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-mono">{h}</span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
        <span className="flex items-center gap-1"><MapPin size={10} className="text-emerald-600"/>{g.location_tagged}</span>
        <div className="flex gap-1.5">
          {isSusp && <span className="badge bg-purple-100 text-purple-800 border border-purple-200">⚠ Flagged</span>}
          {!isSusp && unverified && <span className="badge bg-amber-100 text-amber-800 border border-amber-200">Unverified</span>}
          {clusterCount > 1 && <span className="badge bg-indigo-100 text-indigo-800 border border-indigo-200"><Copy size={9}/>{clusterCount}</span>}
        </div>
      </div>
      {g.sector_label && <div className="text-xs text-blue-700 mt-2">{g.sector_label}</div>}
    </div>
  );
}

export default function OSINTSearch({ filters, onFilterChange, onReset, grievances, loading, highlightedReportId, onSelectGrievance, onImportSourceItem, onAddDemoSample }) {
  const [viewMode, setViewMode] = useState('table');
  const [loadedFeed, setLoadedFeed] = useState([]);
  const [quickFilterCounts, setQuickFilterCounts] = useState(null);
  const [loadedFeedError, setLoadedFeedError] = useState('');

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    api.getQuickFilterCounts({ signal: controller.signal })
      .then(result => {
        if (active) setQuickFilterCounts(result.counts || {});
      })
      .catch(error => {
        if (active && !controller.signal.aborted) {
          setLoadedFeedError(`Quick-filter count service unavailable; showing counts for loaded reports (${error.message}).`);
        } else if (active) {
          setLoadedFeedError('Quick-filter count request timed out; showing counts for loaded reports.');
        }
      })
      .finally(() => clearTimeout(timeoutId));
    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!grievances.length) return;
    setLoadedFeed(current => {
      const records = new Map(current.map(record => [record.id, record]));
      for (const record of grievances) records.set(record.id, record);
      return [...records.values()];
    });
  }, [grievances]);

  const clusterCounts = useMemo(() => {
    const m = {};
    for (const g of grievances) {
      if (g.duplicate_cluster_id) m[g.duplicate_cluster_id] = (m[g.duplicate_cluster_id] || 0) + 1;
    }
    return m;
  }, [grievances]);

  return (
    <div className="flex flex-col gap-4">
      <PublicSourceSearch onImportSourceItem={onImportSourceItem} onAddDemoSample={onAddDemoSample} />

      {/* Filter bar */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal size={14} className="text-amber-500" />
          <span className="text-sm font-bold text-slate-800">Multi-Parameter OSINT Filter</span>
          {loading && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />Scanning...
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="relative">
            <Hash size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
            <input type="text" placeholder="Filter loaded feed by keyword, topic, or #tag..."
              value={filters.hashtag} onChange={e => onFilterChange('hashtag', e.target.value)}
              className="input-field pl-8 focus:border-amber-500 focus:ring-amber-500/20" />
          </div>
          <div className="relative">
            <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
            <select value={filters.location} onChange={e => onFilterChange('location', e.target.value)}
              className="select-field w-full pl-8 focus:border-amber-500 focus:ring-amber-500/20">
              {LOCATIONS.map(l => <option key={l} value={l}>{l || 'All Districts'}</option>)}
            </select>
          </div>
          <div className="relative">
            <Building2 size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
            <select value={filters.department} onChange={e => onFilterChange('department', e.target.value)}
              className="select-field w-full pl-8 focus:border-amber-500 focus:ring-amber-500/20">
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d || 'All Departments'}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Shield size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
              <select value={filters.authenticity} onChange={e => onFilterChange('authenticity', e.target.value)}
                className="select-field w-full pl-8 focus:border-amber-500 focus:ring-amber-500/20">
                <option value="">All Posts</option>
                <option value="genuine">✅ Verified Genuine Only</option>
                <option value="suspicious">⚠️ Flagged Only</option>
                <option value="unverified">Unverified Only</option>
              </select>
            </div>
            <button onClick={onReset} className="btn-secondary px-3 flex-shrink-0"><RotateCcw size={13}/></button>
          </div>
        </div>

        {/* Quick chips */}
        <div className="flex gap-2 mt-3 flex-wrap items-center">
          <span className="text-xs text-slate-500 font-semibold">Quick Filters:</span>
          {QUICK_FILTERS.map(filter => {
            const active = normalizeFilterValue(filters.hashtag) === filter.key;
            const count = quickFilterCounts?.[filter.key] ?? getQuickFilterCount(loadedFeed, filter.terms);
            return (
            <button key={filter.key}
              type="button"
              onClick={() => onFilterChange('hashtag', active ? '' : filter.label)}
              aria-pressed={active}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all font-mono ${
                active
                  ? 'bg-zinc-950 border-zinc-800 text-amber-400 shadow-sm'
                  : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-zinc-900 hover:text-amber-400'
              }`}>{filter.label} <span className="ml-1 opacity-70">({count})</span></button>
          );})}
          <button onClick={() => onFilterChange('severity', filters.severity === '8' ? '' : '8')}
            className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
              filters.severity === '8' ? 'bg-rose-600 border-rose-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-rose-50 hover:border-rose-200'
            }`}>🔴 Critical Only</button>
        </div>
        {loadedFeedError && (
          <p role="status" className="mt-2 text-xs text-amber-800">{loadedFeedError}</p>
        )}
      </div>

      {/* Result header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          Showing <span className="text-slate-900 font-bold">{grievances.length}</span> grievances
          {Object.keys(clusterCounts).length > 0 && (
            <span className="ml-2 text-indigo-600 text-xs">· {Object.keys(clusterCounts).length} active clusters</span>
          )}
        </div>
        <div className="flex gap-1">
          {[['table', List], ['grid', LayoutGrid]].map(([mode, Icon]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              title={mode === 'table' ? 'Table View' : 'Card Grid View'}
              aria-label={mode === 'table' ? 'Table View' : 'Card Grid View'}
              aria-pressed={viewMode === mode}
              className={`p-1.5 rounded-md border transition-all ${viewMode === mode ? 'bg-zinc-950 text-amber-400 shadow-sm border-zinc-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 border-transparent'}`}>
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {/* Data */}
      {loading ? (
        <div className="card p-6 flex flex-col gap-3">
          {Array.from({length: 5}).map((_,i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : grievances.length === 0 ? (
        <div className="card p-12 flex flex-col items-center text-center">
          <Search size={36} className="text-slate-300 mb-3" />
          <div className="text-slate-500 font-medium">No matching grievances</div>
          <div className="text-slate-400 text-sm mt-1">Try changing your filters or reset them to see all reports.</div>
          <button
            type="button"
            onClick={onReset}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <RotateCcw size={14} /> Reset Filters
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/80">
                  {['Source','Post Content','Location / Dept','Severity','Authenticity','Status','Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grievances.map(g => (
                  <GrievanceRow key={g.id} g={g} highlighted={g.id === highlightedReportId} onSelect={onSelectGrievance}
                    clusterCount={clusterCounts[g.duplicate_cluster_id] || 0} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {grievances.map(g => (
            <GrievanceCard key={g.id} g={g} highlighted={g.id === highlightedReportId} onSelect={onSelectGrievance}
              clusterCount={clusterCounts[g.duplicate_cluster_id] || 0} />
          ))}
        </div>
      )}
    </div>
  );
}
