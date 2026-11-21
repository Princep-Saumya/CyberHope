const QUICK_FILTER_KEYWORDS = {
  bpsc: [['bpsc'], ['bihar', 'public', 'service', 'commission']],
  patnafloods: [['patnafloods'], ['patna', 'flood'], ['पटना', 'बाढ़'], ['पटना', 'बाढ़']],
  rcdbihar: [['rcdbihar'], ['rcd', 'bihar'], ['road', 'construction'], ['सड़क', 'बिहार'], ['सडक', 'बिहार']],
  poweroutage: [
    ['poweroutage'], ['power', 'outage'], ['power', 'cut'], ['electricity'],
    ['transformer'], ['बिजली'], ['विद्युत'],
  ],
  watercrisis: [
    ['watercrisis'], ['water', 'shortage'], ['water', 'contamination'],
    ['water', 'supply'], ['पानी'], ['पेयजल'], ['जल', 'संकट'],
  ],
};
const QUICK_FILTER_KEYS = ['bpsc', 'patnafloods', 'rcdbihar', 'poweroutage', 'watercrisis'];

function getSearchableGrievanceText(record) {
  const values = [
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
  ];
  return values.flatMap(value => Array.isArray(value) ? value : [value])
    .filter(value => typeof value === 'string')
    .join(' ')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/#/g, ' ');
}

function normalizePublicSearchQuery(query) {
  return String(query || '')
    .normalize('NFKC')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/["'`]/g, '')
    .replace(/#/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesLocalSearch(record, query) {
  const searchText = getSearchableGrievanceText(record);
  const normalizedQuery = normalizePublicSearchQuery(query).toLocaleLowerCase();
  if (!normalizedQuery) return false;
  const compactQuery = normalizedQuery.replace(/[^\p{L}\p{N}]/gu, '');
  const compactText = searchText.replace(/[^\p{L}\p{N}]/gu, '');
  if (compactText.includes(compactQuery)) return true;
  const terms = normalizedQuery.split(/\s+/).filter(term => term.length > 1);
  return terms.length > 0 && terms.every(term => searchText.includes(term));
}

function matchesHashtagFilter(record, query) {
  const text = getSearchableGrievanceText(record);
  const queries = String(query || '')
    .split(',')
    .map(value => value.trim().replace(/^#+/, '').toLocaleLowerCase())
    .filter(Boolean);

  return queries.some(term => {
    const quickFilter = QUICK_FILTER_KEYWORDS[term.replace(/[^a-z0-9]/g, '')];
    if (quickFilter) {
      return quickFilter.some(variant => variant.every(word => text.includes(word)));
    }
    return text.includes(term);
  });
}

function getQuickFilterCounts(records) {
  return Object.fromEntries(QUICK_FILTER_KEYS.map(key => [
    key,
    records.filter(record => matchesHashtagFilter(record, key)).length,
  ]));
}

module.exports = {
  getQuickFilterCounts,
  matchesHashtagFilter,
  matchesLocalSearch,
  normalizePublicSearchQuery,
};
