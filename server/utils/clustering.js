/**
 * GrievancePulse AI — Bilingual location- and issue-scored incident clustering.
 */

const CLUSTER_RADIUS_METERS = 500;
const MERGE_SCORE_THRESHOLD = 70;
const SPAM_SIMILARITY_THRESHOLD = 0.92;
const INCIDENT_WINDOW_MS = 72 * 60 * 60 * 1000;
const CHRONIC_HOTSPOT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const { extractBiharLocation } = require('./biharGeoResolver');
const DERIVED_DATA_VERSION = 1;
const GENERIC_HASHTAGS = new Set([
  '#bihar', '#biharflood', '#floodreliefbihar', '#biharroadproblem',
  '#biharnews', '#india', '#viral', '#trending', '#news',
]);
const GENERIC_HASHTAG_TOKENS = new Set([
  'bihar', 'india', 'viral', 'trending', 'news', 'flood', 'road', 'water',
  'power', 'problem', 'relief', 'complaint',
]);
const ISSUE_SYNONYMS = new Map([
  ['road', ['road', 'roads', 'street', 'streets', 'सड़क', 'सडक', 'सड़क', 'सड़कें', 'सड़कों', 'sadak', 'sadke']],
  ['pothole', ['pothole', 'potholes', 'crater', 'craters', 'गड्ढा', 'गड्ढे', 'गड्ढों', 'gaddha', 'gaddhe']],
  ['flood', ['flood', 'flooding', 'inundation', 'river', 'gauge', 'overflow', 'बाढ़', 'बाढ़', 'बाढ़ग्रस्त', 'बाढ', 'baadh', 'badh', 'नदी']],
  ['power', ['electricity', 'electric', 'power', 'blackout', 'outage', 'transformer', 'बिजली', 'विद्युत', 'बिजलीकटौती', 'bijli']],
  ['water', ['water', 'drinking', 'पानी', 'जल', 'पेयजल']],
  ['drainage', ['drain', 'drainage', 'sewer', 'sewage', 'नाला', 'नाली', 'जलनिकासी']],
  ['garbage', ['garbage', 'waste', 'rubbish', 'कचरा', 'कूड़ा', 'कूड़ा', 'safai']],
  ['bridge', ['bridge', ' पुल', 'पुल', 'पुलिया']],
  ['health', ['hospital', 'health', 'clinic', 'medicine', 'दवा', 'अस्पताल', 'स्वास्थ्य']],
  ['school', ['school', 'विद्यालय', 'स्कूल']],
  ['transport', ['bus', 'transport', 'traffic', 'vehicle', 'गाड़ी', 'गाड़ी', 'वाहन', 'यातायात']],
  ['safety', ['danger', 'hazard', 'unsafe', 'accident', 'खतरा', 'दुर्घटना', 'सुरक्षा']],
]);
const ISSUE_ALIASES = new Map();
for (const [canonical, aliases] of ISSUE_SYNONYMS) {
  for (const alias of aliases) ISSUE_ALIASES.set(alias.trim().toLocaleLowerCase(), canonical);
}
const CIVIC_TERMS = new Set([
  ...ISSUE_ALIASES.keys(),
  'complaint', 'repair', 'broken', 'damaged', 'blocked', 'leak', 'leaking', 'failed',
  'समस्या', 'शिकायत', 'मरम्मत', 'खराब', 'टूटा', 'टूटी', 'रिपेयर',
]);

function haversineDistance(coord1, coord2) {
  const R = 6371000;
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function stringSimilarity(textA, textB) {
  const tokenize = text =>
    new Set(
      String(text || '')
        .toLowerCase()
        .replace(/#[\p{L}\p{N}_]+/gu, ' ')
        .replace(/[^\p{L}\p{M}\p{N}\s#]/gu, '')
        .split(/\s+/)
        .filter(word => word.length > 2)
    );

  const setA = tokenize(textA);
  const setB = tokenize(textB);
  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = [...setA].filter(word => setB.has(word)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

function tokenizeText(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/#/g, ' ')
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean);
}

function getRelevantHashtagText(record) {
  return (Array.isArray(record.hashtags) ? record.hashtags : [])
    .filter(tag => {
      const normalized = String(tag).trim().toLocaleLowerCase();
      if (GENERIC_HASHTAGS.has(normalized)) return false;
      const tokens = tokenizeText(tag);
      return tokens.some(token => !GENERIC_HASHTAG_TOKENS.has(token));
    })
    .join(' ');
}

function getIssueTokens(record) {
  const text = [
    record.title,
    record.post_text,
    record.body,
    record.ai_summary,
    record.image_ocr_text,
    getRelevantHashtagText(record),
  ].filter(Boolean).join(' ');
  const tokens = new Set();
  for (const token of tokenizeText(text)) {
    const canonical = ISSUE_ALIASES.get(token);
    if (canonical) tokens.add(canonical);
  }
  return tokens;
}

function hasCivicIssueTerms(record) {
  const text = [
    record.title,
    record.post_text,
    record.body,
    record.ai_summary,
    record.image_ocr_text,
    getRelevantHashtagText(record),
  ].filter(Boolean).join(' ');
  return tokenizeText(text).some(token => CIVIC_TERMS.has(token));
}

function isLowSeverityNonCivic(record) {
  if (record.severity_score === null || record.severity_score === undefined
    || record.severity_score === '') return false;
  const severity = Number(record.severity_score);
  return Number.isFinite(severity) && severity <= 2 && !hasCivicIssueTerms(record);
}

function hasResolvedLocation(record) {
  const resolved = extractBiharLocation(record);
  return Boolean(resolved.resolved_district || resolved.resolved_landmark
    || resolved.resolved_location_keys?.length);
}

function hasVerifiedCoordinates(record) {
  const { coordinates } = record || {};
  return record?.coordinates_approximate === false
    && Number.isFinite(coordinates?.lat)
    && Number.isFinite(coordinates?.lng)
    && Math.abs(coordinates.lat) <= 90
    && Math.abs(coordinates.lng) <= 180;
}

function hasUsableLocation(record) {
  return hasVerifiedCoordinates(record) || hasResolvedLocation(record);
}

function getGeofenceTier(a, b) {
  const locationA = extractBiharLocation(a);
  const locationB = extractBiharLocation(b);
  if (!hasUsableLocation(locationA) || !hasUsableLocation(locationB)) return '';

  const districtA = String(locationA.resolved_district || '').trim().toLocaleLowerCase();
  const districtB = String(locationB.resolved_district || '').trim().toLocaleLowerCase();
  if (districtA && districtB && districtA !== districtB) return '';

  if (hasVerifiedCoordinates(a) && hasVerifiedCoordinates(b)
    && haversineDistance(a.coordinates, b.coordinates) <= CLUSTER_RADIUS_METERS) {
    return 'same_place';
  }
  if (hasVerifiedCoordinates(a) && hasVerifiedCoordinates(b)) {
    return districtA && districtA === districtB ? 'same_district' : '';
  }

  const keysA = new Set(locationA.resolved_location_keys || []);
  const keysB = locationB.resolved_location_keys || [];
  if (keysB.some(key => keysA.has(key))) return 'same_place';

  return districtA && districtA === districtB ? 'same_district' : '';
}

function hashtagOverlap(hashtagsA, hashtagsB) {
  const setA = new Set((hashtagsA || [])
    .map(tag => String(tag).toLowerCase())
    .filter(tag => !GENERIC_HASHTAGS.has(tag)));
  return new Set((hashtagsB || [])
    .map(tag => String(tag).toLowerCase())
    .filter(tag => setA.has(tag) && !GENERIC_HASHTAGS.has(tag))).size;
}

function sameVisualEvidence(a, b) {
  const hashA = String(a.image_hash || a.perceptual_hash || '').toLowerCase();
  const hashB = String(b.image_hash || b.perceptual_hash || '').toLowerCase();
  if (hashA && hashA === hashB) return true;

  const imageA = String(a.image_url || '').trim().toLowerCase();
  const imageB = String(b.image_url || '').trim().toLowerCase();
  return Boolean(imageA && imageA === imageB);
}

function getTimestamp(record) {
  const timestamp = Date.parse(record.timestamp || '');
  return Number.isFinite(timestamp) ? timestamp : null;
}

function hasIssueMatch(a, b) {
  const issuesA = getIssueTokens(a);
  const issuesB = getIssueTokens(b);
  return [...issuesA].some(issue => issuesB.has(issue)) || sameVisualEvidence(a, b);
}

function hasDifferentExplicitDistricts(a, b) {
  const districtA = String(extractBiharLocation(a).resolved_district || '').trim().toLocaleLowerCase();
  const districtB = String(extractBiharLocation(b).resolved_district || '').trim().toLocaleLowerCase();
  return Boolean(districtA && districtB && districtA !== districtB);
}

function hasDifferentSpecificPlaces(a, b) {
  const resolvedA = extractBiharLocation(a);
  const resolvedB = extractBiharLocation(b);
  const keysA = resolvedA.resolved_location_keys || [];
  const keysB = resolvedB.resolved_location_keys || [];
  if (keysA.length && keysB.length && !keysB.some(key => keysA.includes(key))) return true;
  return hasVerifiedCoordinates(a) && hasVerifiedCoordinates(b)
    && haversineDistance(a.coordinates, b.coordinates) > CLUSTER_RADIUS_METERS;
}

function scoreIncidentPair(a, b) {
  if (hasDifferentExplicitDistricts(a, b)) {
    return { score: 0, locationScore: 0, issueScore: 0, authorScore: 0, districtConflict: true };
  }

  const locationTier = getGeofenceTier(a, b);
  const locationScore = locationTier === 'same_place' ? 50
    : locationTier === 'same_district' ? 35
      : 0;
  const issueMatch = hasIssueMatch(a, b);
  const issueScore = issueMatch ? 30 : 0;
  const sameCreator = Boolean(getAuthorKey(a) && getAuthorKey(a) === getAuthorKey(b));
  const authorScore = sameCreator && issueMatch && !hasDifferentSpecificPlaces(a, b) ? 20 : 0;

  return {
    score: locationScore + issueScore + authorScore,
    locationScore,
    issueScore,
    authorScore,
    districtConflict: false,
  };
}

function canJoinIncident(candidate, members) {
  const candidateTime = getTimestamp(candidate);
  if (candidateTime === null || !hasUsableLocation(candidate) || isLowSeverityNonCivic(candidate)) return false;

  let earliest = candidateTime;
  let latest = candidateTime;
  for (const member of members) {
    const memberTime = getTimestamp(member);
    if (memberTime === null || isLowSeverityNonCivic(member)
      || scoreIncidentPair(candidate, member).score < MERGE_SCORE_THRESHOLD) return false;
    earliest = Math.min(earliest, memberTime);
    latest = Math.max(latest, memberTime);
  }

  return latest - earliest <= INCIDENT_WINDOW_MS;
}

function getCategory(record) {
  return String(record.category || '').trim().toLocaleLowerCase();
}

function stableClusterId(members) {
  const input = members.map(member => String(member.id)).sort().join('|');
  let hash = 2166136261;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `AUTO_CLUSTER_${(hash >>> 0).toString(36).toUpperCase().padStart(7, '0')}`;
}

function getAuthorKey(record) {
  const author = String(record.author_id || record.author_handle || record.author || '')
    .trim()
    .toLowerCase();
  if (!author || ['unknown', 'u/bihar_redditor', 'news publisher'].includes(author)) return '';
  return author.replace(/^@/, '');
}

function markSpamDuplicates(members) {
  const representatives = [];

  for (const member of members) {
    const authorKey = getAuthorKey(member);
    const representative = authorKey && representatives.find(candidate =>
      getAuthorKey(candidate) === authorKey
      && stringSimilarity(candidate.post_text, member.post_text) >= SPAM_SIMILARITY_THRESHOLD
    );

    if (representative) {
      member.spam_duplicate_of = representative.id;
      representative.spam_flood_count = (representative.spam_flood_count || 0) + 1;
    } else {
      representatives.push(member);
    }
  }
}

function markChronicHotspots(records) {
  const dated = records
    .filter(record => !record.is_reference_record && !record.is_demo
      && !isLowSeverityNonCivic(record)
      && getCategory(record) && getTimestamp(record) !== null && hasUsableLocation(record))
    .sort((a, b) => getTimestamp(a) - getTimestamp(b));

  for (let index = 0; index < dated.length; index++) {
    const current = dated[index];
    const currentTime = getTimestamp(current);
    const olderIncident = dated.slice(0, index).some(previous =>
      getCategory(previous) === getCategory(current)
      && currentTime - getTimestamp(previous) >= CHRONIC_HOTSPOT_WINDOW_MS
      && getGeofenceTier(current, previous) === 'same_place'
    );
    current.is_chronic_hotspot = olderIncident;
  }
}

function clusterGrievances(records) {
  const result = records.map(record => ({
    ...extractBiharLocation(record),
    derived_data_version: DERIVED_DATA_VERSION,
    is_civic_relevant: !isLowSeverityNonCivic(record),
    cluster_exclusion_reason: isLowSeverityNonCivic(record) ? 'low_severity_non_civic' : null,
    duplicate_cluster_id: null,
    spam_duplicate_of: null,
    spam_flood_count: 0,
    is_chronic_hotspot: false,
  }));
  const groups = [];
  const ordered = result
    .filter(record => !record.is_reference_record && !record.is_demo && record.is_civic_relevant)
    .slice()
    .sort((a, b) => (getTimestamp(a) ?? Number.MAX_SAFE_INTEGER)
      - (getTimestamp(b) ?? Number.MAX_SAFE_INTEGER));

  for (const record of ordered) {
    if (!getCategory(record) || !hasUsableLocation(record) || getTimestamp(record) === null) continue;
    const group = groups.find(candidate => canJoinIncident(record, candidate.members));
    if (group) group.members.push(record);
    else groups.push({ members: [record] });
  }

  markChronicHotspots(result);

  const usedIds = new Set();
  for (const group of groups) {
    if (group.members.length < 2) continue;
    let clusterId = stableClusterId(group.members);
    let suffix = 1;
    while (usedIds.has(clusterId)) clusterId = `${stableClusterId(group.members)}_${suffix++}`;
    usedIds.add(clusterId);

    markSpamDuplicates(group.members);
    for (const member of group.members) {
      member.duplicate_cluster_id = clusterId;
      member.is_chronic_hotspot = group.members.some(item => item.is_chronic_hotspot);
    }
  }

  return result;
}

function getClusterDepartment(records) {
  const issues = new Set(records.flatMap(record => [...getIssueTokens(record)]));
  if (issues.has('road') || issues.has('pothole') || issues.has('bridge')) {
    return 'Road Construction Department (RCD)';
  }
  if (issues.has('flood')) return 'Water Resources Department (WRD)';
  if (issues.has('power')) return 'Bihar State Power Holding Company Ltd (BSPHCL)';
  if (issues.has('water') || issues.has('health')) return 'Public Health Department (PHD)';

  const departments = new Map();
  for (const record of records) {
    const department = String(record.department || '').trim();
    if (!department || /^(general administration|public grievance)$/i.test(department)) continue;
    departments.set(department, (departments.get(department) || 0) + 1);
  }
  return [...departments.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    || records[0]?.department
    || 'General Administration';
}

function getClusterCategory(records) {
  const categories = new Map();
  for (const record of records) {
    const category = String(record.category || '').trim();
    if (!category || /^public grievance$/i.test(category)) continue;
    categories.set(category, (categories.get(category) || 0) + 1);
  }
  return [...categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    || records[0]?.category
    || 'Public Grievance';
}

function getMasterTickets(records) {
  const groups = new Map();

  for (const record of records) {
    const clusterId = record.duplicate_cluster_id;
    if (!clusterId) continue;
    if (!groups.has(clusterId)) {
      groups.set(clusterId, {
        cluster_id: clusterId,
        member_ids: [],
        member_count: 0,
        raw_report_count: 0,
        unique_reporter_count: 0,
        spam_flood_count: 0,
        is_chronic_hotspot: false,
        department: record.department,
        _members: [],
        category: record.category,
        location: record.location_tagged,
        max_severity: 0,
        priority_score: 0,
        representative_post: null,
        hashtags: new Set(),
        reporters: new Set(),
      });
    }

    const group = groups.get(clusterId);
    group._members.push(record);
    group.member_ids.push(record.id);
    group.raw_report_count++;
    if (record.spam_duplicate_of) group.spam_flood_count++;
    group.is_chronic_hotspot ||= Boolean(record.is_chronic_hotspot);

    if (record.spam_duplicate_of) continue;
    group.member_count++;
    const authorKey = getAuthorKey(record);
    if (authorKey) group.reporters.add(authorKey);
    if ((record.severity_score || 0) > group.max_severity) {
      group.max_severity = record.severity_score;
      group.representative_post = `${record.post_text?.slice(0, 120) || ''}...`;
    }
    (record.hashtags || []).forEach(tag => group.hashtags.add(tag));
  }

  return [...groups.values()]
    .filter(group => group.raw_report_count > 1)
    .map(group => {
      group.unique_reporter_count = group.reporters.size;
      group.priority_score = Math.min(
        10,
        group.max_severity + Math.min(2, Math.max(0, group.unique_reporter_count - 1))
      );
      delete group.reporters;
      group.department = getClusterDepartment(group._members);
      group.category = getClusterCategory(group._members);
      delete group._members;
      return {
        ...group,
        hashtags: [...group.hashtags],
      };
    })
    .sort((a, b) => b.priority_score - a.priority_score);
}

module.exports = {
  haversineDistance,
  stringSimilarity,
  scoreIncidentPair,
  hashtagOverlap,
  hasUsableLocation,
  DERIVED_DATA_VERSION,
  clusterGrievances,
  getMasterTickets,
};
