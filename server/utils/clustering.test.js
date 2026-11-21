const test = require('node:test');
const assert = require('node:assert/strict');
const {
  clusterGrievances,
  getMasterTickets,
  hasUsableLocation,
  scoreIncidentPair,
} = require('./clustering');

const now = Date.parse('2026-11-21T00:00:00.000Z');
const coordinates = { lat: 25.5941, lng: 85.1376 };

function report(id, overrides = {}) {
  return {
    id,
    timestamp: new Date(now).toISOString(),
    category: 'Infrastructure Damage',
    department: 'Road Construction Department (RCD)',
    location_tagged: 'Kankarbagh, Patna',
    coordinates,
    coordinates_approximate: false,
    post_text: 'Large pothole on Kankarbagh road near Ward 15 causing vehicle damage.',
    hashtags: ['#KankarbaghRoad', '#RCDRepair'],
    author_handle: `citizen-${id}`,
    severity_score: 5,
    ...overrides,
  };
}

function clustersFor(records) {
  return clusterGrievances(records).filter(record => record.duplicate_cluster_id);
}

test('requires a resolved place and keeps generic or unrelated district-only reports separate', () => {
  const missingCoordinatesA = report('missing-a', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Location unverified',
    post_text: 'A public service complaint needs review.',
    hashtags: [],
    duplicate_cluster_id: 'AUTO_CLUSTER_002',
  });
  const missingCoordinatesB = report('missing-b', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Location unverified',
    post_text: 'A different public service complaint needs review.',
    hashtags: [],
  });
  const labeledUnverified = report('labeled-unverified', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Location unverified',
    post_text: 'The service needs attention.',
    hashtags: [],
  });
  const districtOnlyA = report('district-a', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Patna',
    post_text: 'Potholes are damaging vehicles on several Patna roads.',
    hashtags: [],
  });
  const districtOnlyB = report('district-b', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Patna',
    post_text: 'A power outage has affected homes in Patna since yesterday.',
    hashtags: [],
  });
  const wardWithoutDistrict = report('ward-without-district', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Ward 15',
    post_text: 'A service request with no town or district detail.',
    hashtags: [],
  });

  assert.equal(hasUsableLocation(missingCoordinatesA), false);
  assert.equal(hasUsableLocation(labeledUnverified), false);
  assert.equal(hasUsableLocation(districtOnlyA), true);
  assert.equal(hasUsableLocation(wardWithoutDistrict), false);
  assert.deepEqual(clustersFor([missingCoordinatesA, missingCoordinatesB]), []);
  assert.equal(clusterGrievances([missingCoordinatesA])[0].duplicate_cluster_id, null);
  assert.deepEqual(clustersFor([labeledUnverified, report('labeled-unverified-2', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Location unverified',
    post_text: 'The service needs attention.',
    hashtags: [],
  })]), []);
  assert.deepEqual(clustersFor([districtOnlyA, districtOnlyB]), []);
  assert.deepEqual(clustersFor([wardWithoutDistrict, report('ward-without-district-2', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Ward 15',
  })]), []);
});

test('extracts Bagaha and Gandak references before clustering text-located reports', () => {
  const first = report('bagaha-a', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Location unverified',
    category: 'Flood / Natural Disaster',
    title: 'Gandak River reaches record level at Bagaha gauge in Bihar',
    post_text: 'The Gandak River has reached record 91.25 metres at Bagaha gauge in Bihar.',
  });
  const second = report('bagaha-b', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Location unverified',
    category: 'Flood / Natural Disaster',
    title: 'Bagaha gauge records high Gandak River level',
    post_text: 'Gandak River reaches record 91.25 metres at the Bagaha gauge in Bihar.',
  });

  const clustered = clusterGrievances([first, second]);
  assert.equal(clustered[0].resolved_district, 'West Champaran');
  assert.equal(clustered[0].resolved_landmark, 'Bagaha');
  assert.equal(clustered[0].geo_confidence, 'text_extracted');
  assert.ok(clustered[0].duplicate_cluster_id);
  assert.equal(clustered[0].duplicate_cluster_id, clustered[1].duplicate_cluster_id);
});

test('extracts Hindi Araria place mentions and leaves generic Hindi posts unlocated', () => {
  const first = report('araria-a', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Location unverified',
    category: 'Infrastructure Damage',
    title: 'अररिया में सड़क पर बड़ा गड्ढा',
    post_text: 'श्री फणीश्वर नाथ रेणु के पैतृक गांव जाने वाली सड़क पर बड़ा गड्ढा है, अररिया में।',
  });
  const second = report('araria-b', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Location unverified',
    category: 'Infrastructure Damage',
    title: 'अररिया की सड़क पर बड़ा गड्ढा',
    post_text: 'फणीश्वर नाथ रेणु के पैतृक गांव जाने वाली सड़क पर बड़ा गड्ढा है, अररिया में।',
  });
  const generic = report('generic-hindi', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Location unverified',
    post_text: 'आज़ादी के बाद भी बिहार की ऐसी हालत, वायरल वीडियो देखिए।',
    title: 'बिहार की हालत',
    hashtags: [],
  });

  const clustered = clusterGrievances([first, second, generic]);
  const resolved = clustered.find(record => record.id === 'araria-a');
  const unresolved = clustered.find(record => record.id === 'generic-hindi');
  assert.equal(resolved.resolved_district, 'Araria');
  assert.equal(resolved.resolved_landmark, 'Phanishwar Nath Renu ancestral village');
  assert.ok(resolved.duplicate_cluster_id);
  assert.equal(unresolved.resolved_district, undefined);
  assert.equal(hasUsableLocation(unresolved), false);
});

test('district-only reports need issue evidence plus a matching creator to reach the score threshold', () => {
  const first = report('district-close-a', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Location unverified',
    post_text: 'अररिया जिले में लगातार बारिश के बाद सड़क पर बड़ा गड्ढा बन गया है।',
    hashtags: [],
  });
  const close = report('district-close-b', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Location unverified',
    post_text: 'अररिया जिले में लगातार बारिश के बाद सड़क पर बड़ा गड्ढा बन गया है।',
    author_handle: 'same-local-source',
    hashtags: [],
  });
  const unrelated = report('district-unrelated', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Location unverified',
    post_text: 'अररिया जिले के अस्पताल में दवाइयों की कमी की शिकायत है।',
    author_handle: 'same-local-source',
    hashtags: [],
  });
  first.author_handle = 'same-local-source';

  assert.equal(clustersFor([first, close]).length, 2);
  assert.equal(scoreIncidentPair(first, close).score, 85);
  assert.equal(scoreIncidentPair(first, unrelated).score, 35);
  assert.deepEqual(clustersFor([first, unrelated]), []);
});

test('clusters bilingual Jandaha road reports across fallback department and category labels', () => {
  const first = report('jandaha-live', {
    timestamp: new Date(now).toISOString(),
    location_tagged: 'Location unverified',
    coordinates: null,
    coordinates_approximate: true,
    category: 'Public Grievance',
    department: 'General Administration',
    author_handle: '@mukundan_chandra_',
    post_text: 'जंदाहा में LIVE गाड़ी फंस गई! सड़क की हालत देखकर रह जाएंगे हैरान!',
    hashtags: [],
  });
  const second = report('jandaha-road', {
    timestamp: new Date(now + 60 * 60 * 1000).toISOString(),
    location_tagged: 'Location unverified',
    coordinates: null,
    coordinates_approximate: true,
    category: 'Infrastructure Damage',
    department: 'Road Construction Department (RCD)',
    author_handle: '@mukundan_chandra_',
    post_text: 'जंदाहा की बदहाल सड़क देखकर रह जाएंगे हैरान! आखिर कब होगा सुधार?',
    hashtags: [],
  });

  const clustered = clusterGrievances([first, second]);
  assert.equal(clustered[0].resolved_district, 'Vaishali');
  assert.equal(clustered[0].resolved_landmark, 'Jandaha');
  assert.ok(clustered[0].duplicate_cluster_id);
  assert.equal(clustered[0].duplicate_cluster_id, clustered[1].duplicate_cluster_id);
  assert.equal(scoreIncidentPair(first, second).score, 100);
  assert.equal(getMasterTickets(clustered)[0].department, 'Road Construction Department (RCD)');
});

test('merges river flood reports across department and category tags, promoting the master to WRD', () => {
  const first = report('gandak-general', {
    location_tagged: 'Location unverified',
    coordinates: null,
    coordinates_approximate: true,
    category: 'Public Grievance',
    department: 'General Administration',
    post_text: 'Gandak River reaches record 91.25 metres at Bagaha gauge in Bihar.',
    hashtags: [],
  });
  const second = report('gandak-water', {
    location_tagged: 'Location unverified',
    coordinates: null,
    coordinates_approximate: true,
    category: 'Flood / Natural Disaster',
    department: 'Water Resources Department (WRD)',
    post_text: 'Bihar flood reason explained as Gandak River reaches high water levels near Bagaha.',
    hashtags: [],
  });

  const clustered = clusterGrievances([first, second]);
  assert.equal(clustered[0].duplicate_cluster_id, clustered[1].duplicate_cluster_id);
  const ticket = getMasterTickets(clustered)[0];
  assert.equal(ticket.department, 'Water Resources Department (WRD)');
  assert.equal(ticket.category, 'Flood / Natural Disaster');
});

test('excludes low-severity non-civic noise but retains low-severity civic reports', () => {
  const lifestyle = report('lifestyle', {
    severity_score: 1,
    post_text: 'Anyone else moved back to Bihar after living in a tier 1 city?',
    category: 'Public Grievance',
    hashtags: [],
  });
  const road = report('low-severity-road', {
    severity_score: 2,
    post_text: 'A pothole on Kankarbagh road needs repair.',
    hashtags: [],
  });
  const roadFollowUp = report('road-follow-up', {
    severity_score: 4,
    post_text: 'The Kankarbagh road pothole remains unrepaired.',
    hashtags: [],
  });

  const clustered = clusterGrievances([lifestyle, road, roadFollowUp]);
  assert.equal(clustered.find(record => record.id === 'lifestyle').is_civic_relevant, false);
  assert.equal(
    clustered.find(record => record.id === 'lifestyle').cluster_exclusion_reason,
    'low_severity_non_civic'
  );
  assert.equal(clustered.find(record => record.id === 'low-severity-road').is_civic_relevant, true);
  assert.equal(clustered.find(record => record.id === 'lifestyle').duplicate_cluster_id, null);
  assert.ok(clustered.find(record => record.id === 'low-severity-road').duplicate_cluster_id);
});

test('does not merge separate localities even when text and hashtags are identical', () => {
  const kankarbagh = report('kankarbagh');
  const danapur = report('danapur', {
    location_tagged: 'Danapur, Patna',
    coordinates: { lat: 25.628, lng: 85.041 },
    post_text: 'Large pothole on Danapur road near Ward 4 causing vehicle damage.',
  });

  assert.deepEqual(clustersFor([kankarbagh, danapur]), []);
});

test('hard-rejects matching issue reports when their explicit districts conflict', () => {
  const araria = report('district-araria', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Araria',
    post_text: 'A severe pothole has damaged the main road in Araria.',
    author_handle: 'same-local-source',
  });
  const patna = report('district-patna', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Patna',
    post_text: 'A severe pothole has damaged the main road in Patna.',
    author_handle: 'same-local-source',
  });

  assert.deepEqual(clustersFor([araria, patna]), []);
});

test('enforces the 500m coordinate boundary when locality labels differ', () => {
  const first = report('radius-base', { location_tagged: 'Ward 15, Patna' });
  const inside = report('radius-inside', {
    location_tagged: 'Ward 16, Patna',
    coordinates: { lat: 25.5941, lng: 85.1418 },
  });
  const outside = report('radius-outside', {
    location_tagged: 'Ward 16, Patna',
    coordinates: { lat: 25.5941, lng: 85.1430 },
  });

  assert.equal(clustersFor([first, inside]).length, 2);
  assert.deepEqual(clustersFor([first, outside]), []);
});

test('allows category differences but keeps the 72-hour and issue-similarity gates', () => {
  const base = report('base');
  const differentCategory = report('different-category', { category: 'Power & Utilities Failure' });
  const oldReport = report('old', {
    timestamp: new Date(now - 73 * 60 * 60 * 1000).toISOString(),
  });
  const unrelatedText = report('unrelated-text', {
    post_text: 'Officials should inspect the local drinking water supply soon.',
    hashtags: ['#WaterSupply', '#PublicHealth'],
  });

  assert.equal(clustersFor([base, differentCategory]).length, 2);
  assert.deepEqual(clustersFor([base, oldReport]), []);
  assert.deepEqual(clustersFor([base, unrelatedText]), []);
});

test('does not use broad statewide hashtags as a substitute for local or department tags', () => {
  const first = report('broad-tag-a', {
    hashtags: ['#BiharFlood', '#FloodReliefBihar'],
    post_text: 'Heavy water has entered several homes near the river.',
  });
  const second = report('broad-tag-b', {
    hashtags: ['#BiharFlood', '#FloodReliefBihar'],
    post_text: 'A bridge inspection is required before school transport resumes.',
  });

  assert.deepEqual(clustersFor([first, second]), []);
});

test('merges verified reports within 500m using matching content and local hashtags', () => {
  const first = report('first');
  const nearby = report('nearby', {
    coordinates: { lat: 25.5949, lng: 85.1376 },
    post_text: 'Pothole on Kankarbagh road near Ward 15 is damaging vehicles.',
  });

  const clustered = clusterGrievances([first, nearby]);
  assert.ok(clustered[0].duplicate_cluster_id);
  assert.equal(clustered[0].duplicate_cluster_id, clustered[1].duplicate_cluster_id);

  const distant = report('distant', {
    coordinates: { lat: 25.61, lng: 85.1376 },
    location_tagged: 'Ward 15, Kankarbagh, Patna',
    post_text: 'Same-looking road incident near Kankarbagh Ward 15.',
  });
  assert.deepEqual(clustersFor([first, distant]), []);
});

test('allows an exact ward or landmark label as the non-coordinate location key', () => {
  const first = report('ward-a', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Ward 15, Kankarbagh, Patna',
  });
  const second = report('ward-b', {
    coordinates: null,
    coordinates_approximate: true,
    location_tagged: 'Ward 15, Kankarbagh, Patna',
    timestamp: new Date(now + 60_000).toISOString(),
  });

  const clustered = clusterGrievances([first, second]);
  assert.ok(clustered[0].duplicate_cluster_id);
  assert.equal(clustered[0].duplicate_cluster_id, clustered[1].duplicate_cluster_id);
});

test('keeps incidents more than 30 days apart separate and marks the newer report chronic', () => {
  const oldReport = report('old-hotspot', {
    timestamp: new Date(now - 31 * 24 * 60 * 60 * 1000).toISOString(),
  });
  const recentReport = report('recent-hotspot');
  const secondRecentReport = report('second-recent-hotspot', {
    timestamp: new Date(now + 60_000).toISOString(),
  });
  const result = clusterGrievances([oldReport, recentReport, secondRecentReport]);

  assert.equal(result[0].duplicate_cluster_id, null);
  assert.equal(result[0].is_chronic_hotspot, false);
  assert.ok(result[1].duplicate_cluster_id);
  assert.equal(result[1].duplicate_cluster_id, result[2].duplicate_cluster_id);
  assert.equal(result[1].is_chronic_hotspot, true);
});

test('collapses same-author repeats for priority while counting distinct reporters', () => {
  const first = report('first-spam', { author_handle: 'citizen-a', severity_score: 4 });
  const duplicate = report('duplicate-spam', {
    author_handle: 'citizen-a',
    severity_score: 10,
    timestamp: new Date(now + 60_000).toISOString(),
  });
  const otherCitizen = report('other-citizen', {
    author_handle: 'citizen-b',
    severity_score: 5,
    timestamp: new Date(now + 120_000).toISOString(),
  });
  const clustered = clusterGrievances([first, duplicate, otherCitizen]);
  const ticket = getMasterTickets(clustered)[0];

  assert.equal(clustered.find(item => item.id === 'duplicate-spam').spam_duplicate_of, 'first-spam');
  assert.equal(ticket.spam_flood_count, 1);
  assert.equal(ticket.raw_report_count, 3);
  assert.equal(ticket.member_count, 2);
  assert.equal(ticket.unique_reporter_count, 2);
  assert.equal(ticket.max_severity, 5);
  assert.equal(ticket.priority_score, 6);
});
