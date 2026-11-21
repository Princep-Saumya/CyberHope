const DISTRICTS = [
  { name: 'Araria', aliases: ['अररिया'] },
  { name: 'Arwal', aliases: ['अरवल'] },
  { name: 'Aurangabad', aliases: ['औरंगाबाद'] },
  { name: 'Banka', aliases: ['बांका'] },
  { name: 'Begusarai', aliases: ['बेगूसराय'] },
  { name: 'Bhagalpur', aliases: ['भागलपुर'] },
  { name: 'Bhojpur', aliases: ['भोजपुर'] },
  { name: 'Buxar', aliases: ['बक्सर'] },
  { name: 'Darbhanga', aliases: ['दरभंगा'] },
  { name: 'East Champaran', aliases: ['पूर्वी चंपारण', 'पूर्वी चम्पारण', 'Purbi Champaran'] },
  { name: 'Gaya', aliases: ['गया'] },
  { name: 'Gopalganj', aliases: ['गोपालगंज'] },
  { name: 'Jamui', aliases: ['जमुई'] },
  { name: 'Jehanabad', aliases: ['जहानाबाद'] },
  { name: 'Kaimur', aliases: ['कैमूर', 'भभुआ'] },
  { name: 'Katihar', aliases: ['कटिहार'] },
  { name: 'Khagaria', aliases: ['खगड़िया', 'खगरिया'] },
  { name: 'Kishanganj', aliases: ['किशनगंज'] },
  { name: 'Lakhisarai', aliases: ['लखीसराय'] },
  { name: 'Madhepura', aliases: ['मधेपुरा'] },
  { name: 'Madhubani', aliases: ['मधुबनी'] },
  { name: 'Munger', aliases: ['मुंगेर'] },
  { name: 'Muzaffarpur', aliases: ['मुजफ्फरपुर'] },
  { name: 'Nalanda', aliases: ['नालंदा'] },
  { name: 'Nawada', aliases: ['नवादा'] },
  { name: 'Patna', aliases: ['पटना'] },
  { name: 'Purnia', aliases: ['पूर्णिया'] },
  { name: 'Rohtas', aliases: ['रोहतास'] },
  { name: 'Saharsa', aliases: ['सहरसा'] },
  { name: 'Samastipur', aliases: ['समस्तीपुर'] },
  { name: 'Saran', aliases: ['सारण', 'छपरा'] },
  { name: 'Sheikhpura', aliases: ['शेखपुरा'] },
  { name: 'Sheohar', aliases: ['शिवहर'] },
  { name: 'Sitamarhi', aliases: ['सीतामढ़ी', 'सीतामढी'] },
  { name: 'Siwan', aliases: ['सिवान'] },
  { name: 'Supaul', aliases: ['सुपौल'] },
  { name: 'Vaishali', aliases: ['वैशाली', 'हाजीपुर'] },
  { name: 'West Champaran', aliases: ['पश्चिमी चंपारण', 'पश्चिमी चम्पारण', 'Paschim Champaran'] },
];

const PLACES = [
  { name: 'Bagaha', district: 'West Champaran', aliases: ['बगहा'] },
  { name: 'Bettiah', district: 'West Champaran', aliases: ['बेतिया'] },
  { name: 'Jandaha', district: 'Vaishali', aliases: ['जंदाहा', 'जन्दाहा', 'जंदहा'] },
  { name: 'Danapur', district: 'Patna', aliases: ['दानापुर'] },
  { name: 'Bihta', district: 'Patna', aliases: ['बिहटा'] },
  { name: 'Kankarbagh', district: 'Patna', aliases: ['कंकड़बाग', 'कंकरबाग'] },
  { name: 'Rajendra Nagar', district: 'Patna', aliases: ['राजेंद्र नगर', 'राजेन्द्र नगर'] },
  { name: 'Patna City', district: 'Patna', aliases: ['पटना सिटी'] },
  { name: 'Ara', district: 'Bhojpur', aliases: ['आरा'] },
  { name: 'Motihari', district: 'East Champaran', aliases: ['मोतिहारी'] },
  { name: 'Hajipur', district: 'Vaishali', aliases: [] },
  { name: 'Bihar Sharif', district: 'Nalanda', aliases: ['बिहारशरीफ', 'बिहार शरीफ'] },
  { name: 'Phanishwar Nath Renu ancestral village', district: 'Araria', aliases: [
    'phanishwar nath renu', 'फणीश्वर नाथ रेणु', 'फणीश्वरनाथ रेणु',
  ] },
];

const LANDMARKS = [
  { name: 'Gandak River', aliases: ['गंडक नदी', 'गंडक'] },
  { name: 'Kosi River', aliases: ['कोसी नदी', 'कोसी'] },
  { name: 'Ganga River', aliases: ['गंगा नदी', 'गंगा'] },
  { name: 'Son River', aliases: ['सोन नदी'] },
  { name: 'Phanishwar Nath Renu ancestral village', aliases: [
    'phanishwar nath renu', 'फणीश्वर नाथ रेणु', 'फणीश्वरनाथ रेणु',
  ] },
];

function normalizeText(text) {
  return String(text || '')
    .normalize('NFKC')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLocaleLowerCase()
    .replace(/[’‘]/g, "'");
}

function hasAlias(text, alias) {
  const normalizedAlias = normalizeText(alias).trim();
  if (!normalizedAlias) return false;
  if (/[\p{Script=Devanagari}]/u.test(normalizedAlias)) {
    const escaped = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\p{Script=Devanagari}])${escaped}($|[^\\p{Script=Devanagari}])`, 'u')
      .test(text);
  }
  const escaped = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'u').test(text);
}

function matchingNames(text, entries) {
  return entries.filter(entry => [entry.name, ...(entry.aliases || [])]
    .some(alias => hasAlias(text, alias)));
}

function extractBiharLocation(record) {
  const existingDistrict = String(record.resolved_district || '').trim();
  const existingLandmark = String(record.resolved_landmark || '').trim();
  if (existingDistrict && record.geo_confidence === 'manual') {
    return {
      ...record,
      resolved_district: existingDistrict,
      resolved_landmark: existingLandmark,
      resolved_location_keys: existingLandmark ? [existingLandmark.toLowerCase()] : [],
      geo_confidence: 'manual',
    };
  }

  const coreText = normalizeText([
    record.title,
    record.location_tagged,
    record.post_text,
    record.body,
    record.ai_summary,
    record.image_ocr_text,
  ].filter(Boolean).join(' '));
  const hashtagText = normalizeText(
    Array.isArray(record.hashtags) ? record.hashtags.join(' ') : ''
  );
  const metadataText = normalizeText(record.location_tagged);
  const districtMatches = matchingNames(coreText, DISTRICTS);
  const hashtagDistrictMatches = matchingNames(hashtagText, DISTRICTS);
  const placeMatches = matchingNames(coreText, PLACES);
  const hashtagPlaceMatches = matchingNames(hashtagText, PLACES);
  const landmarkMatches = matchingNames(coreText, LANDMARKS);
  const hashtagLandmarkMatches = matchingNames(hashtagText, LANDMARKS);
  const metadataDistrictMatches = matchingNames(metadataText, DISTRICTS);
  const metadataPlaceMatches = matchingNames(metadataText, PLACES);

  const textualDistrict = districtMatches
    .sort((a, b) => b.name.length - a.name.length)[0]?.name;
  const metadataDistrict = metadataPlaceMatches[0]?.district
    || metadataDistrictMatches.sort((a, b) => b.name.length - a.name.length)[0]?.name;
  const districtConstraint = metadataDistrict || textualDistrict;
  const place = metadataPlaceMatches.sort((a, b) => b.name.length - a.name.length)[0]
    || placeMatches
      .filter(entry => !metadataDistrict || entry.district === metadataDistrict)
      .sort((a, b) => b.name.length - a.name.length)[0]
    || hashtagPlaceMatches
      .filter(entry => !districtConstraint || entry.district === districtConstraint)
      .sort((a, b) => b.name.length - a.name.length)[0];
  const district = place?.district || metadataDistrict || textualDistrict
    || hashtagDistrictMatches
    .sort((a, b) => b.name.length - a.name.length)[0]?.name || existingDistrict;
  const explicitLabelParts = String(record.location_tagged || '')
    .split(/\s*,\s*|\s*\/\s*/)
    .map(part => part.trim())
    .filter(part => part && !/^(bihar|india|unknown|location unverified)$/i.test(part)
      && !/^(road|street|landmark|locality|area)$/i.test(part)
      && !DISTRICTS.some(entry => [entry.name, ...entry.aliases].some(alias =>
        normalizeText(alias) === normalizeText(part))));
  const explicitLandmark = district && explicitLabelParts.length
    ? explicitLabelParts.sort((a, b) => b.length - a.length)[0]
    : '';
  const landmark = place?.name
    || landmarkMatches.sort((a, b) => b.name.length - a.name.length)[0]?.name
    || explicitLandmark
    || existingLandmark;

  const locationKeys = new Set([
    ...placeMatches
      .filter(entry => !district || entry.district === district)
      .map(entry => entry.name),
    ...hashtagPlaceMatches
      .filter(entry => !district || entry.district === district)
      .map(entry => entry.name),
    ...landmarkMatches.map(entry => entry.name),
    ...hashtagLandmarkMatches.map(entry => entry.name),
    ...(explicitLandmark ? [explicitLandmark] : []),
    ...(existingLandmark ? [existingLandmark] : []),
  ].map(value => value.trim().toLocaleLowerCase()).filter(Boolean));
  if (!district && !landmark && locationKeys.size === 0) return record;
  const locationLabel = landmark
    ? `${landmark}, ${district || 'Bihar'}`
    : district ? `${district}, Bihar` : 'Location unverified';

  return {
    ...record,
    location_tagged: record.geo_confidence === 'manual'
      ? record.location_tagged || locationLabel
      : locationLabel,
    resolved_district: district || null,
    resolved_landmark: landmark || null,
    resolved_districts: [...new Set([
      ...(existingDistrict ? [existingDistrict] : []),
      ...districtMatches.map(entry => entry.name),
      ...hashtagDistrictMatches.map(entry => entry.name),
      ...placeMatches.map(entry => entry.district),
    ])],
    resolved_location_keys: [...locationKeys],
    geo_confidence: record.geo_confidence === 'manual' ? 'manual' : 'text_extracted',
  };
}

function getBiharDistricts() {
  return DISTRICTS.map(district => district.name);
}

module.exports = { extractBiharLocation, getBiharDistricts };
