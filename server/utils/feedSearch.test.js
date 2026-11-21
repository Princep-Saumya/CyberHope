const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getQuickFilterCounts,
  matchesHashtagFilter,
  matchesLocalSearch,
  normalizePublicSearchQuery,
} = require('./feedSearch');

test('matches hashtag filters with or without the prefix across content and metadata', () => {
  const record = {
    title: 'Commission schedule update',
    description: 'BPSC examination information',
    post_text: 'Candidates discuss the latest schedule.',
    hashtags: [],
  };

  assert.equal(matchesHashtagFilter(record, '#BPSC'), true);
  assert.equal(matchesHashtagFilter(record, 'bpsc'), true);
  assert.equal(matchesHashtagFilter({ title: '', post_text: '', hashtags: [] }, '#BPSC'), false);
});

test('matches quick filters against related English and Hindi keywords', () => {
  assert.equal(matchesHashtagFilter({ post_text: 'Transformer failed and residents have no electricity.' }, '#PowerOutage'), true);
  assert.equal(matchesHashtagFilter({ description: 'बिजली कई घंटों से नहीं है' }, 'PowerOutage'), true);
  assert.equal(matchesHashtagFilter({ title: 'Road construction stalled in Bihar' }, '#RCD_Bihar'), true);
  assert.equal(matchesHashtagFilter({ post_text: 'पटना में बाढ़ के कारण घरों में पानी' }, '#PatnaFloods'), true);
  assert.equal(matchesHashtagFilter({ extracted_keywords: ['पेयजल', 'कमी'] }, '#WaterCrisis'), true);
});

test('calculates independent quick-filter counts from all searchable record fields', () => {
  const counts = getQuickFilterCounts([
    { title: 'BPSC exam update', post_text: 'Candidates await the schedule.' },
    { description: 'Transformer failed in Patna', hashtags: ['#PowerOutage'] },
    { post_text: 'पटना में बाढ़ और बिजली कटौती' },
  ]);

  assert.deepEqual(counts, {
    bpsc: 1,
    patnafloods: 1,
    rcdbihar: 0,
    poweroutage: 2,
    watercrisis: 0,
  });
});

test('supports comma-separated keyword alternatives and case-insensitive search', () => {
  const record = { title: 'Gandak River flood alert', hashtags: [] };
  assert.equal(matchesHashtagFilter(record, '#BPSC, flood'), true);
  assert.equal(matchesHashtagFilter(record, 'GANDAK'), true);
});

test('normalizes quoted hashtags and splits CamelCase into searchable words', () => {
  assert.equal(normalizePublicSearchQuery('"#BadRoadsBihar"'), 'Bad Roads Bihar');
});

test('matches cached records against normalized hashtag and natural-language searches', () => {
  const record = {
    platform: 'Reddit',
    title: 'Bad roads reported around Bihar',
    post_text: 'Residents report potholes and broken roads in Patna.',
  };

  assert.equal(matchesLocalSearch(record, '"#BadRoadsBihar"'), true);
  assert.equal(matchesLocalSearch(record, 'Patna potholes'), true);
  assert.equal(matchesLocalSearch(record, 'water contamination'), false);
});
