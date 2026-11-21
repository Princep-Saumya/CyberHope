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

module.exports = { matchesHashtagFilter };
