const test = require('node:test');
const assert = require('node:assert/strict');
const { getCuratedRedditResults, normalizeQuery } = require('./publicSources');

test('normalizes quoted hashtag searches before sending provider queries', () => {
  assert.equal(normalizeQuery('"#WaterProblemBihar"'), 'Water Problem Bihar');
});

test('limits curated Reddit fallbacks to the selected sector', () => {
  const waterExamples = getCuratedRedditResults('"#WaterProblemBihar"', 'water-crisis');
  const roadExamples = getCuratedRedditResults('"#WaterProblemBihar"', 'roads');

  assert.equal(waterExamples.length, 1);
  assert.match(waterExamples[0].title, /water/i);
  assert.equal(waterExamples[0].sector_id, 'water-crisis');
  assert.equal(roadExamples.length, 1);
  assert.equal(roadExamples[0].sector_id, 'roads');
});

test('uses query-matching curated examples when no sector is selected', () => {
  const examples = getCuratedRedditResults('power outage', '');

  assert.equal(examples.length, 1);
  assert.equal(examples[0].sector_id, 'electricity');
  assert.equal(examples[0].is_demo, true);
});
