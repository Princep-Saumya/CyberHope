/**
 * GrievancePulse AI — Gemini Service
 * Uses gemini-1.5-flash for post analysis with full heuristic fallback.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Heuristic Fallback ───────────────────────────────────────────────────────

const DEPT_KEYWORDS = {
  'Road Construction Department (RCD)': ['road', 'highway', 'pothole', 'bridge', 'flyover', 'waterlog', 'rcd', 'crater'],
  'Bihar State Power Holding Company Ltd (BSPHCL)': ['power', 'electricity', 'outage', 'bsphcl', 'light', 'voltage', 'transformer'],
  'Public Health Department (PHD)': ['water', 'drain', 'phd', 'contamination', 'diarrhea', 'gastro', 'hospital', 'health'],
  'Cyber Cell / Bihar Police': ['bpsc', 'leak', 'cybercell', 'cyber', 'fake', 'fraud', 'scam', 'hack', 'phishing', 'corrupt', 'forged', 'exam'],
  'Water Resources Department (WRD)': ['flood', 'embankment', 'river', 'bagmati', 'ganga', 'breach', 'ndrf'],
};

const SEVERITY_BOOST_KEYWORDS = ['death', 'killed', 'fatal', 'emergency', 'collapse', 'breach', 'children', 'hospital', 'fire', 'accident', 'contamination'];
const FAKE_KEYWORDS = ['rt rt', 'share before deleted', 'shocking proof', 'viral proof', 'expose', 'secret order', 'bot', 'target shares', 'wakeup', 'breaking proof', 'forged', 'fabricated'];

function heuristicFallback(postText, imageOcrText) {
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

  // Severity score (base 5, boosted by emergency keywords)
  let severity = 5;
  for (const kw of SEVERITY_BOOST_KEYWORDS) {
    if (combined.includes(kw)) severity = Math.min(10, severity + 1);
  }

  // Authenticity risk (bot pattern detection)
  let riskScore = 10;
  for (const kw of FAKE_KEYWORDS) {
    if (combined.includes(kw)) riskScore = Math.min(100, riskScore + 18);
  }
  // Anonymous/numbered handles and urgent share language
  if (/\d{3,}/.test(combined)) riskScore = Math.min(100, riskScore + 5);

  const authenticityFlag = riskScore > 60
    ? 'Suspicious Defamation / Fake Campaign'
    : 'Likely Genuine Grievance';

  // Location extraction (Bihar districts)
  const districts = ['patna', 'gaya', 'muzaffarpur', 'bhagalpur', 'darbhanga', 'nalanda', 'begusarai', 'munger', 'purnia', 'arrah'];
  let extractedLocation = 'Bihar';
  for (const d of districts) {
    if (combined.includes(d)) {
      extractedLocation = d.charAt(0).toUpperCase() + d.slice(1);
      break;
    }
  }

  // Summary
  const words = postText.split(' ').slice(0, 20).join(' ');
  const summary = `[Heuristic] ${words}... — Dept: ${department}, Severity: ${severity}/10`;

  return { department, category, severity_score: severity, authenticity_risk_score: riskScore, authenticity_flag: authenticityFlag, extracted_location: extractedLocation, summary };
}

// ─── Gemini Analysis ──────────────────────────────────────────────────────────

async function analyzePost(postText, imageOcrText = '') {
  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  No Gemini API key — using heuristic fallback');
    return heuristicFallback(postText, imageOcrText);
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Analyze the following Bihar public social post:
Text: ${postText}
Image OCR: ${imageOcrText}

Return JSON strictly (no markdown, no code block, raw JSON only):
{
  "department": "Identified Bihar Govt Dept (e.g. Road Construction Department (RCD), Bihar State Power Holding Company Ltd (BSPHCL), Public Health Department (PHD), Cyber Cell / Bihar Police, Water Resources Department (WRD), General Administration)",
  "category": "Issue classification",
  "severity_score": <integer 1-10>,
  "authenticity_risk_score": <integer 0-100>,
  "authenticity_flag": "Likely Genuine Grievance OR Suspicious Defamation / Fake Campaign",
  "extracted_location": "Landmark or District name in Bihar",
  "summary": "One sentence executive summary for officer briefing"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip any accidental markdown code fences
    const jsonText = text.replace(/```json?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonText);

    // Validate required fields
    const required = ['department', 'category', 'severity_score', 'authenticity_risk_score', 'authenticity_flag', 'extracted_location', 'summary'];
    for (const field of required) {
      if (parsed[field] === undefined) throw new Error(`Missing field: ${field}`);
    }

    return parsed;
  } catch (err) {
    console.error('Gemini API error, falling back to heuristics:', err.message);
    return heuristicFallback(postText, imageOcrText);
  }
}

module.exports = { analyzePost, heuristicFallback };

// ─── Official Government Response Generator ──────────────────────────────────

const OFFICIAL_RESPONSE_TEMPLATES = {
  'Road Construction Department (RCD)': `This is to acknowledge the public grievance regarding road/infrastructure issues in your locality. The Road Construction Department (RCD), Government of Bihar, has received your complaint (ID: {id}) and it has been assigned to the concerned divisional engineer. A site inspection will be conducted within 48 hours. Necessary repair works will be initiated as per approved estimates. Citizens are advised to maintain patience while corrective measures are being undertaken. For urgent safety concerns, contact RCD helpline: 0612-2233456.`,
  'Bihar State Power Holding Company Ltd (BSPHCL)': `The Bihar State Power Holding Company Ltd (BSPHCL) acknowledges your complaint (ID: {id}) regarding power supply disruption in your area. Our technical team has been alerted and a fault-rectification crew has been deployed. Power restoration is our top priority. In case of emergencies involving electrical safety, please call our 24-hour helpline: 1912. We regret the inconvenience caused.`,
  'Public Health Department (PHD)': `The Public Health Department (PHD), Government of Bihar acknowledges complaint (ID: {id}) regarding water quality / sanitation in your locality. Our field inspection team has been dispatched for immediate assessment. Water samples will be collected and tested at the State Water Testing Laboratory. If contamination is confirmed, emergency safe drinking water supply will be arranged within 6 hours. PHD Emergency: 0612-2217305.`,
  'Cyber Cell / Bihar Police': `The Bihar Police Cyber Cell acknowledges receipt of your complaint (ID: {id}) regarding alleged cyber crime / examination irregularity. A First Information Report (FIR) will be registered as applicable under IT Act 2000 and relevant IPC sections. Digital forensic investigation has been initiated. Complainants are requested not to delete any digital evidence. Bihar Cyber Cell Helpline: 1930.`,
  'Water Resources Department (WRD)': `The Water Resources Department (WRD), Government of Bihar acknowledges the flood / embankment emergency reported under complaint (ID: {id}). NDRF and SDRF teams have been alerted. District administration has been notified for immediate evacuation assistance. Embankment inspection will be conducted by WRD engineers within 2 hours. Flood Control Room: 0612-2215045.`,
  'General Administration': `The Government of Bihar acknowledges your grievance (ID: {id}). Your complaint has been duly registered and forwarded to the concerned department for necessary action. A designated nodal officer will contact you within 72 hours. Bihar CM Helpline: 181.`,
};

async function generateOfficialResponse(grievance) {
  const template = OFFICIAL_RESPONSE_TEMPLATES[grievance.department] || OFFICIAL_RESPONSE_TEMPLATES['General Administration'];
  const heuristicResponse = template.replace(/{id}/g, grievance.id);

  if (!process.env.GEMINI_API_KEY) {
    return { response: heuristicResponse, source: 'template' };
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an official Bihar Government communications officer. Generate a formal, empathetic, and action-oriented official government response letter for the following public grievance.

Grievance ID: ${grievance.id}
Department: ${grievance.department}
Category: ${grievance.category}
Location: ${grievance.location_tagged}
Citizen Post: "${grievance.post_text}"
Current Status: ${grievance.status}
AI Summary: ${grievance.ai_summary || ''}

Requirements:
- Write in formal English suitable for official government communication
- Acknowledge the specific issue raised
- State concrete action steps with realistic timelines
- Include relevant Bihar government department contact details
- Keep response between 80-120 words
- Do NOT use markdown, just plain paragraphs

Return ONLY the response text, no labels or metadata.`;

    const result = await model.generateContent(prompt);
    return { response: result.response.text().trim(), source: 'gemini' };
  } catch (err) {
    console.error('Gemini official response error, using template:', err.message);
    return { response: heuristicResponse, source: 'template' };
  }
}

module.exports.generateOfficialResponse = generateOfficialResponse;
