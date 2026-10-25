/**
 * GrievancePulse AI — Gemini & Intelligence Service
 * Uses gemini-1.5-flash with full heuristic fallback, sentiment analysis, and Bihar geocoding.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Bihar District Coordinates Dictionary ───────────────────────────────────

const BIHAR_DISTRICT_COORDS = {
  patna: { lat: 25.6093, lng: 85.1235 },
  gaya: { lat: 24.7955, lng: 85.0002 },
  muzaffarpur: { lat: 26.1209, lng: 85.3647 },
  bhagalpur: { lat: 25.2425, lng: 86.9842 },
  darbhanga: { lat: 26.1542, lng: 85.8918 },
  nalanda: { lat: 25.1982, lng: 85.5149 },
  biharsharif: { lat: 25.1982, lng: 85.5149 },
  begusarai: { lat: 25.4182, lng: 86.1272 },
  munger: { lat: 25.3757, lng: 86.4744 },
  purnia: { lat: 25.7771, lng: 87.4753 },
  arrah: { lat: 25.5560, lng: 84.6603 },
  bhojpur: { lat: 25.5560, lng: 84.6603 },
  rohtas: { lat: 24.9528, lng: 84.0315 },
  sasaram: { lat: 24.9528, lng: 84.0315 },
  vaishali: { lat: 25.6858, lng: 85.2146 },
  hajipur: { lat: 25.6858, lng: 85.2146 },
  samastipur: { lat: 25.8560, lng: 85.7868 },
  saran: { lat: 25.7796, lng: 84.7499 },
  chhapra: { lat: 25.7796, lng: 84.7499 },
  champaran: { lat: 26.6469, lng: 84.9089 },
  motihari: { lat: 26.6469, lng: 84.9089 },
  bettiah: { lat: 26.8021, lng: 84.5028 },
  katihar: { lat: 25.5438, lng: 87.5684 },
  saharsa: { lat: 25.8835, lng: 86.5985 },
  madhubani: { lat: 26.3541, lng: 86.0717 },
  aurangabad: { lat: 24.7539, lng: 84.3742 },
  siwan: { lat: 26.2196, lng: 84.3567 },
  gopalganj: { lat: 26.4674, lng: 84.4447 },
  buxar: { lat: 25.5647, lng: 83.9777 },
  nawada: { lat: 24.8872, lng: 85.5434 },
  jamui: { lat: 24.9205, lng: 86.2234 },
  banka: { lat: 24.8856, lng: 86.9221 },
  kishanganj: { lat: 26.0967, lng: 87.9427 },
  supaul: { lat: 26.1264, lng: 86.5956 },
  araria: { lat: 26.1511, lng: 87.5144 },
  madhepura: { lat: 25.9226, lng: 86.7909 },
  khagaria: { lat: 25.5034, lng: 86.4827 },
  sheohar: { lat: 26.5167, lng: 85.2833 },
  sitamarhi: { lat: 26.5982, lng: 85.4925 },
  lakhisarai: { lat: 25.1764, lng: 86.0924 },
  jehanabad: { lat: 25.2136, lng: 84.9869 },
  arwal: { lat: 25.2444, lng: 84.6756 },
  kaimur: { lat: 25.0427, lng: 83.5855 },
};

function geocodeBiharLocation(text) {
  const lower = (text || '').toLowerCase();
  for (const [district, coords] of Object.entries(BIHAR_DISTRICT_COORDS)) {
    if (lower.includes(district)) {
      // Add slight jitter (±0.008 deg ≈ 800m) so multiple reports in a district don't overlap completely
      const jitterLat = (Math.random() - 0.5) * 0.016;
      const jitterLng = (Math.random() - 0.5) * 0.016;
      return {
        location_tagged: district.charAt(0).toUpperCase() + district.slice(1),
        coordinates: {
          lat: Number((coords.lat + jitterLat).toFixed(4)),
          lng: Number((coords.lng + jitterLng).toFixed(4)),
        },
      };
    }
  }
  // Default to Patna center with minor random offset
  const jitterLat = (Math.random() - 0.5) * 0.02;
  const jitterLng = (Math.random() - 0.5) * 0.02;
  return {
    location_tagged: 'Patna',
    coordinates: {
      lat: Number((25.6093 + jitterLat).toFixed(4)),
      lng: Number((85.1235 + jitterLng).toFixed(4)),
    },
  };
}

// ─── Heuristic Fallback ───────────────────────────────────────────────────────

const DEPT_KEYWORDS = {
  'Road Construction Department (RCD)': ['road', 'highway', 'pothole', 'bridge', 'flyover', 'waterlog', 'rcd', 'crater', 'culvert', 'traffic', 'jam'],
  'Bihar State Power Holding Company Ltd (BSPHCL)': ['power', 'electricity', 'outage', 'bsphcl', 'light', 'voltage', 'transformer', 'wire', 'spark', 'blackout', 'meter'],
  'Public Health Department (PHD)': ['water', 'drain', 'phd', 'contamination', 'diarrhea', 'gastro', 'hospital', 'health', 'garbage', 'sewage', 'dengue', 'sanitation'],
  'Cyber Cell / Bihar Police': ['bpsc', 'leak', 'cybercell', 'cyber', 'fake', 'fraud', 'scam', 'hack', 'phishing', 'corrupt', 'forged', 'exam', 'paper leak', 'police', 'fir', 'theft', 'crime'],
  'Water Resources Department (WRD)': ['flood', 'embankment', 'river', 'bagmati', 'ganga', 'breach', 'ndrf', 'dam', 'canal'],
};

const SEVERITY_BOOST_KEYWORDS = ['death', 'killed', 'fatal', 'emergency', 'collapse', 'breach', 'children', 'hospital', 'fire', 'accident', 'contamination', 'spark', 'live wire', 'exposed live wire', 'electric shock', 'electrocution', 'drowned', 'critical'];
const FAKE_KEYWORDS = ['rt rt', 'share before deleted', 'shocking proof', 'viral proof', 'expose', 'secret order', 'bot', 'target shares', 'wakeup', 'breaking proof', 'forged', 'fabricated'];
const OUTRAGE_KEYWORDS = ['shame', 'worst', 'corrupt', 'dying', 'protest', 'disaster', 'furious', 'horrible', 'pathetic', 'resignation', 'unacceptable', 'inaction'];

function computeSentiment(combined, severity) {
  let score = -0.4; // Base negative sentiment for grievances
  for (const word of OUTRAGE_KEYWORDS) {
    if (combined.includes(word)) score -= 0.12;
  }
  if (severity >= 8) score -= 0.25;
  if (severity <= 4) score += 0.2;

  score = Math.max(-1.0, Math.min(1.0, Number(score.toFixed(2))));

  let label = 'Moderate Concern';
  if (score <= -0.7) label = 'Critical Outrage';
  else if (score <= -0.3) label = 'High Distress';
  else if (score < 0.2) label = 'Moderate Concern';
  else label = 'Positive/Appreciation';

  return { sentiment_score: score, sentiment_label: label };
}

function heuristicFallback(postText, imageOcrText = '') {
  const combined = `${postText} ${imageOcrText}`.toLowerCase();

  // Department detection
  let department = 'General Administration';
  let maxMatches = 0;
  for (const [dept, keywords] of Object.entries(DEPT_KEYWORDS)) {
    const matches = keywords.filter(k => combined.includes(k)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      department = dept;
    }
  }

  // Category
  const categoryMap = {
    'Road Construction Department (RCD)': 'Infrastructure Damage',
    'Bihar State Power Holding Company Ltd (BSPHCL)': 'Power & Utilities Failure',
    'Public Health Department (PHD)': 'Water Contamination / Health Risk',
    'Cyber Cell / Bihar Police': combined.includes('fake') || combined.includes('forged') ? 'Fake News / Disinformation' : 'Exam Irregularity / Cyber Crime',
    'Water Resources Department (WRD)': 'Flood / Natural Disaster',
    'General Administration': 'Public Grievance',
  };
  const category = categoryMap[department] || 'Public Grievance';

  // Severity score
  let severity = 5;
  for (const kw of SEVERITY_BOOST_KEYWORDS) {
    if (combined.includes(kw)) severity = Math.min(10, severity + 1);
  }

  // Authenticity risk
  let riskScore = 10;
  for (const kw of FAKE_KEYWORDS) {
    if (combined.includes(kw)) riskScore = Math.min(100, riskScore + 18);
  }
  if (/\d{3,}/.test(combined)) riskScore = Math.min(100, riskScore + 5);

  const authenticityFlag = riskScore > 60
    ? 'Suspicious Defamation / Fake Campaign'
    : 'Likely Genuine Grievance';

  // Location & Geocoding
  const geo = geocodeBiharLocation(combined);

  // Sentiment
  const sentiment = computeSentiment(combined, severity);

  // Priority Score (0 - 100)
  const priorityScore = Math.min(100, Math.round(severity * 9 + Math.abs(sentiment.sentiment_score) * 10));

  // Summary
  const words = postText.split(/\s+/).slice(0, 18).join(' ');
  const authenticityReasons = [];
  const manipulationSignals = [];
  if (riskScore > 50) {
    authenticityReasons.push('Contains sensational or viral urgency language often associated with coordinated campaigns.');
    authenticityReasons.push('Absence of verifiable municipal ward or landmark references.');
    manipulationSignals.push('Urgency / Viral Pattern');
  } else {
    authenticityReasons.push('Describes concrete civic infrastructure deficiency with plausible localized context.');
    authenticityReasons.push('Linguistic pattern matches organic citizen grievance rather than automated bot activity.');
    manipulationSignals.push('None Detected');
  }

  return {
    department,
    category,
    severity_score: severity,
    priority_score: priorityScore,
    authenticity_risk_score: riskScore,
    authenticity_flag: authenticityFlag,
    authenticity_reasons: authenticityReasons,
    manipulation_signals: manipulationSignals,
    extracted_location: geo.location_tagged,
    coordinates: geo.coordinates,
    sentiment_score: sentiment.sentiment_score,
    sentiment_label: sentiment.sentiment_label,
    summary,
    analysis_mode: 'heuristic-fallback',
  };
}

// ─── Gemini Multimodal & Text Analysis ────────────────────────────────────────

async function analyzePost(postText, imageOcrText = '') {
  if (!process.env.GEMINI_API_KEY) {
    return heuristicFallback(postText, imageOcrText);
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `Analyze the following Bihar public social grievance post for civic department routing and cyber authenticity verification:
Text: ${postText}
Image OCR Context: ${imageOcrText}

Return raw JSON strictly matching this schema:
{
  "department": "One of: Road Construction Department (RCD), Bihar State Power Holding Company Ltd (BSPHCL), Public Health Department (PHD), Cyber Cell / Bihar Police, Water Resources Department (WRD), General Administration",
  "category": "e.g. Infrastructure Damage, Power Failure, Water Contamination, Cyber Crime, Flood Alert, Sanitation",
  "severity_score": <integer 1 to 10>,
  "priority_score": <integer 10 to 100>,
  "authenticity_risk_score": <integer 0 to 100>,
  "authenticity_flag": "Likely Genuine Grievance OR Suspicious Defamation / Fake Campaign",
  "authenticity_reasons": ["2-3 concise forensic evidence bullet points explaining why this post is genuine or suspicious"],
  "manipulation_signals": ["0-3 flags e.g. Sensational Urgency Syntax, Bot Pattern, Recycled Media, or None Detected"],
  "extracted_location": "Landmark or District name in Bihar (e.g. Patna, Muzaffarpur, Gaya, Darbhanga)",
  "sentiment_score": <float between -1.0 and 1.0>,
  "sentiment_label": "One of: Critical Outrage, High Distress, Moderate Concern, Positive",
  "summary": "One concise executive summary sentence for the government officer dashboard"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonText = text.replace(/```json?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonText);

    const geo = geocodeBiharLocation(parsed.extracted_location || postText);

    return {
      department: parsed.department || 'General Administration',
      category: parsed.category || 'Public Grievance',
      severity_score: parsed.severity_score || 5,
      priority_score: parsed.priority_score || (parsed.severity_score ? parsed.severity_score * 10 : 50),
      authenticity_risk_score: parsed.authenticity_risk_score || 15,
      authenticity_flag: parsed.authenticity_flag || 'Likely Genuine Grievance',
      authenticity_reasons: Array.isArray(parsed.authenticity_reasons) && parsed.authenticity_reasons.length > 0
        ? parsed.authenticity_reasons
        : ['Evidence reviewed by Gemini AI model.'],
      manipulation_signals: Array.isArray(parsed.manipulation_signals) && parsed.manipulation_signals.length > 0
        ? parsed.manipulation_signals
        : ['None Detected'],
      extracted_location: parsed.extracted_location || geo.location_tagged,
      coordinates: geo.coordinates,
      sentiment_score: parsed.sentiment_score ?? -0.5,
      sentiment_label: parsed.sentiment_label || 'High Distress',
      summary: parsed.summary || postText.slice(0, 100),
      analysis_mode: modelName,
    };
  } catch (err) {
    console.error('Gemini API error, falling back to heuristics:', err.message);
    return heuristicFallback(postText, imageOcrText);
  }
}

// ─── Official Government Response Generator ──────────────────────────────────

const OFFICIAL_RESPONSE_TEMPLATES = {
  'Road Construction Department (RCD)': `This is to acknowledge the public grievance regarding road/infrastructure issues in your locality. The Road Construction Department (RCD), Government of Bihar, has received your complaint (ID: {id}) and assigned it to the concerned divisional executive engineer. Site inspection will be conducted within 24-48 hours. Necessary repair works will be initiated under emergency maintenance provisions. RCD Helpline: 0612-2233456.`,
  'Bihar State Power Holding Company Ltd (BSPHCL)': `BSPHCL acknowledges your complaint (ID: {id}) regarding electrical failure/safety hazards in your area. Our emergency technical fault-rectification team has been dispatched. Power restoration and hazard mitigation is being prioritized. In case of live wire emergencies, contact 24x7 control room: 1912.`,
  'Public Health Department (PHD)': `The Public Health Department (PHD), Government of Bihar acknowledges grievance (ID: {id}) regarding drinking water / sanitation distress. A field water-sampling crew has been assigned to test contamination levels. Alternative safe drinking water tankers are being mobilized. PHD Emergency: 0612-2217305.`,
  'Cyber Cell / Bihar Police': `The Bihar Police Cyber Cell acknowledges receipt of your report (ID: {id}) regarding alleged cyber crime / exam irregularity. Digital forensics and investigation under the IT Act 2000 are underway. Complainants are advised to preserve digital records and transaction screenshots. Cyber Crime Helpline: 1930.`,
  'Water Resources Department (WRD)': `Water Resources Department (WRD), Government of Bihar has logged the flood / embankment concern (ID: {id}). District disaster management and SDRF units have been alerted for monitoring. Embankment engineers are on site. Flood Control Room: 0612-2215045.`,
  'General Administration': `Government of Bihar acknowledges receipt of your grievance (ID: {id}). It has been cataloged and forwarded to the district grievance redressal cell for immediate review and action. Bihar CM Helpline: 181.`,
};

async function generateOfficialResponse(grievance) {
  const template = OFFICIAL_RESPONSE_TEMPLATES[grievance.department] || OFFICIAL_RESPONSE_TEMPLATES['General Administration'];
  const heuristicResponse = template.replace(/{id}/g, grievance.id);

  if (!process.env.GEMINI_API_KEY) {
    return { response: heuristicResponse, source: 'template' };
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `You are an official Bihar Government communications officer. Generate a formal, empathetic, and action-oriented official government response for this public grievance.
Grievance ID: ${grievance.id}
Department: ${grievance.department}
Location: ${grievance.location_tagged}
Citizen Post: "${grievance.post_text}"
AI Summary: ${grievance.ai_summary || ''}

Requirements:
- Formal, professional tone representing the Government of Bihar
- Acknowledge specific locality and problem
- Provide concrete timeline and departmental contact helpline
- Keep under 110 words without markdown fences.`;

    const result = await model.generateContent(prompt);
    return { response: result.response.text().trim(), source: modelName };
  } catch (err) {
    return { response: heuristicResponse, source: 'template' };
  }
}

module.exports = {
  analyzePost,
  heuristicFallback,
  geocodeBiharLocation,
  generateOfficialResponse,
};
