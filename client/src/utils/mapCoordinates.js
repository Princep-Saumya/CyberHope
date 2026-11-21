const DISTRICT_CENTERS = {
  araria: [26.1511, 87.5144],
  arwal: [25.2444, 84.6756],
  aurangabad: [24.7539, 84.3742],
  banka: [24.8856, 86.9221],
  begusarai: [25.4182, 86.1272],
  bhagalpur: [25.2425, 86.9842],
  bhojpur: [25.556, 84.6603],
  buxar: [25.5647, 83.9777],
  darbhanga: [26.1542, 85.8918],
  'east champaran': [26.6469, 84.9089],
  gaya: [24.7955, 85.0002],
  gopalganj: [26.4674, 84.4447],
  jamui: [24.9205, 86.2234],
  jehanabad: [25.2136, 84.9869],
  kaimur: [25.0427, 83.5855],
  katihar: [25.5438, 87.5684],
  khagaria: [25.5034, 86.4827],
  kishanganj: [26.0967, 87.9427],
  lakhisarai: [25.1764, 86.0924],
  madhepura: [25.9226, 86.7909],
  madhubani: [26.3541, 86.0717],
  munger: [25.3757, 86.4744],
  muzaffarpur: [26.1209, 85.3647],
  nalanda: [25.1982, 85.5149],
  nawada: [24.8872, 85.5434],
  patna: [25.6093, 85.1235],
  purnia: [25.7771, 87.4753],
  rohtas: [24.9528, 84.0315],
  saharsa: [25.8835, 86.5985],
  samastipur: [25.856, 85.7868],
  saran: [25.7796, 84.7499],
  sheikhpura: [25.1397, 85.8405],
  sheohar: [26.5167, 85.2833],
  sitamarhi: [26.5982, 85.4925],
  siwan: [26.2196, 84.3567],
  supaul: [26.1264, 86.5956],
  vaishali: [25.6858, 85.2146],
  'west champaran': [26.8021, 84.5028],
};

const DISTRICT_ALIASES = {
  araria: ['अररिया'],
  arwal: ['अरवल'],
  aurangabad: ['औरंगाबाद'],
  banka: ['बांका'],
  begusarai: ['बेगूसराय'],
  bhagalpur: ['भागलपुर'],
  bhojpur: ['भोजपुर'],
  buxar: ['बक्सर'],
  darbhanga: ['दरभंगा'],
  'east champaran': ['पूर्वी चंपारण', 'पूर्वी चम्पारण', 'पुरबी चंपारण'],
  gaya: ['गया'],
  gopalganj: ['गोपालगंज'],
  jamui: ['जमुई'],
  jehanabad: ['जहानाबाद'],
  kaimur: ['कैमूर', 'भभुआ'],
  katihar: ['कटिहार'],
  khagaria: ['खगड़िया', 'खगरिया'],
  kishanganj: ['किशनगंज'],
  lakhisarai: ['लखीसराय'],
  madhepura: ['मधेपुरा'],
  madhubani: ['मधुबनी'],
  munger: ['मुंगेर'],
  muzaffarpur: ['मुजफ्फरपुर'],
  nalanda: ['नालंदा'],
  nawada: ['नवादा'],
  patna: ['पटना'],
  purnia: ['पूर्णिया'],
  rohtas: ['रोहतास'],
  saharsa: ['सहरसा'],
  samastipur: ['समस्तीपुर'],
  saran: ['सारण', 'छपरा'],
  sheikhpura: ['शेखपुरा'],
  sheohar: ['शिवहर'],
  sitamarhi: ['सीतामढ़ी', 'सीतामढी'],
  siwan: ['सिवान'],
  supaul: ['सुपौल'],
  vaishali: ['वैशाली', 'हाजीपुर'],
  'west champaran': ['पश्चिमी चंपारण', 'पश्चिमी चम्पारण', 'पश्चिम चंपारण'],
};

const PLACE_COORDINATES = [
  { name: 'bagaha', aliases: ['बगहा'], coordinates: [27.099, 84.091] },
  { name: 'bettiah', aliases: ['बेतिया'], coordinates: [26.8021, 84.5028] },
  { name: 'bihta', aliases: ['बिहटा'], coordinates: [25.5622, 84.8701] },
  { name: 'danapur', aliases: ['दानापुर'], coordinates: [25.6208, 85.0417] },
  { name: 'jandaha', aliases: ['जंदाहा', 'जन्दाहा', 'जंदहा'], coordinates: [25.7012, 85.3474] },
  { name: 'kankarbagh', aliases: ['कंकड़बाग', 'कंकरबाग'], coordinates: [25.5941, 85.1456] },
  { name: 'rajendra nagar', aliases: ['राजेंद्र नगर', 'राजेन्द्र नगर'], coordinates: [25.6121, 85.1662] },
  { name: 'patna city', aliases: ['पटना सिटी'], coordinates: [25.6176, 85.2297] },
  { name: 'hajipur', aliases: ['हाजीपुर'], coordinates: [25.6858, 85.2146] },
  { name: 'motihari', aliases: ['मोतिहारी'], coordinates: [26.6469, 84.9089] },
  { name: 'bihar sharif', aliases: ['बिहारशरीफ', 'बिहार शरीफ'], coordinates: [25.1982, 85.5149] },
  { name: 'ara', aliases: ['आरा'], coordinates: [25.556, 84.6603] },
];

function normalizeLocation(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value || '')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function containsPlace(text, place) {
  return [place.name, ...place.aliases].some(alias => {
    if (/[\p{Script=Devanagari}]/u.test(alias)) return text.includes(alias);
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'u').test(text);
  });
}

function getLocationCoordinates(record) {
  const coordinates = record?.coordinates;
  if (record?.coordinates_approximate === false
    && record?.data_origin !== 'demo-seed'
    && Number.isFinite(coordinates?.lat)
    && Number.isFinite(coordinates?.lng)
    && Math.abs(coordinates.lat) <= 90
    && Math.abs(coordinates.lng) <= 180) {
    return {
      coordinates: [coordinates.lat, coordinates.lng],
      precision: 'verified',
      label: record.location_tagged,
    };
  }

  const placeText = normalizeLocation([
    record?.resolved_landmark,
    record?.location_tagged,
    record?.title,
    record?.post_text,
    record?.body,
    record?.ai_summary,
    record?.image_ocr_text,
    ...(Array.isArray(record?.hashtags) ? record.hashtags : []),
  ].filter(Boolean).join(' '));
  const place = [...PLACE_COORDINATES]
    .sort((a, b) => b.name.length - a.name.length)
    .find(entry => containsPlace(placeText, entry));
  if (place) {
    const label = place.name.replace(/\b\w/g, character => character.toUpperCase());
    return { coordinates: place.coordinates, precision: 'approximate-locality', label };
  }

  const districtText = normalizeLocation([
    record?.resolved_district,
    record?.location_tagged,
    record?.title,
    record?.post_text,
    record?.body,
    record?.ai_summary,
    record?.image_ocr_text,
    ...(Array.isArray(record?.hashtags) ? record.hashtags : []),
  ].filter(Boolean).join(' '));
  const district = Object.entries(DISTRICT_CENTERS)
    .map(([name, coordinates]) => ({ name, coordinates, aliases: DISTRICT_ALIASES[name] || [] }))
    .sort((a, b) => b.name.length - a.name.length)
    .find(entry => containsPlace(districtText, entry));
  if (!district) return null;

  const [lat, lng] = district.coordinates;
  const hash = hashString(record?.id || record?.post_text);
  const latOffset = (((hash & 0xffff) / 0xffff) * 2 - 1) * 0.015;
  const lngOffset = ((((hash >>> 16) & 0xffff) / 0xffff) * 2 - 1) * 0.015;
  return {
    coordinates: [lat + latOffset, lng + lngOffset],
    precision: 'approximate-district',
    label: district.name.replace(/\b\w/g, character => character.toUpperCase()),
  };
}

export { getLocationCoordinates };
