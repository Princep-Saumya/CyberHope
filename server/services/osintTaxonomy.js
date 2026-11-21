const sectors = [
  {
    id: 'roads',
    label: 'Roads & potholes',
    department: 'Road Construction Department (RCD)',
    category: 'Infrastructure Damage',
    terms: [
      '"Bihar Road Problem"', '"बिहार सड़क समस्या"', '"Bad Roads Bihar"', '"बिहार में खराब सड़क"',
      '"Road Complaint Bihar"', '"बिहार सड़क शिकायत"', '"Potholes Bihar"', '"बिहार में सड़क के गड्ढे"',
      '"Road Repair Bihar"', '"बिहार सड़क मरम्मत"', '"#BiharRoadProblem"', '"#बिहारसड़कसमस्या"',
      '"#BadRoadsBihar"', '"#खराबसड़कबिहार"', '"#PotholesBihar"', '"#बिहारसड़कगड्ढे"',
    ],
    quickTags: ['#BiharRoadProblem', '#BadRoadsBihar', '#PotholesBihar'],
  },
  {
    id: 'electricity',
    label: 'Electricity & power',
    department: 'Bihar State Power Holding Company Ltd (BSPHCL)',
    category: 'Power & Utilities Failure',
    terms: [
      '"Bihar Electricity Problem"', '"बिहार बिजली समस्या"', '"Power Cut Bihar"', '"बिहार बिजली कटौती"',
      '"No Electricity Bihar"', '"बिहार में बिजली नहीं"', '"Electricity Complaint Bihar"', '"बिहार बिजली शिकायत"',
      '"Transformer Problem Bihar"', '"बिहार ट्रांसफार्मर समस्या"', '"Low Voltage Bihar"', '"बिहार लो वोल्टेज"',
      '"#BiharElectricityProblem"', '"#बिहारबिजलीसमस्या"', '"#PowerCutBihar"', '"#बिहारबिजलीकटौती"',
      '"#BijliNahiHai"', '"#बिजलीनहींहै"',
    ],
    quickTags: ['#PowerCutBihar', '#BijliNahiHai', '#BiharElectricityProblem'],
  },
  {
    id: 'water-crisis',
    label: 'Water crisis & supply',
    department: 'Public Health Department (PHD)',
    category: 'Water Contamination / Health Risk',
    terms: [
      '"Bihar Water Crisis"', '"बिहार जल संकट"', '"Water Problem Bihar"', '"बिहार पानी समस्या"',
      '"Drinking Water Problem Bihar"', '"बिहार पेयजल समस्या"', '"No Water Bihar"', '"बिहार में पानी नहीं"',
      '"Water Supply Problem Bihar"', '"बिहार जलापूर्ति समस्या"', '"#BiharWaterCrisis"', '"#बिहारजलसंकट"',
      '"#WaterProblemBihar"', '"#बिहारपानीसमस्या"', '"#PaniNahiHai"', '"#पानीनहींहै"',
    ],
    quickTags: ['#BiharWaterCrisis', '#WaterProblemBihar', '#PaniNahiHai'],
  },
  {
    id: 'floods',
    label: 'Floods & relief',
    department: 'Water Resources Department (WRD)',
    category: 'Flood / Natural Disaster',
    terms: [
      '"Bihar Flood"', '"बिहार बाढ़"', '"Flood Problem Bihar"', '"बिहार बाढ़ समस्या"',
      '"Flood Affected Bihar"', '"बिहार बाढ़ प्रभावित"', '"Flood Relief Bihar"', '"बिहार बाढ़ राहत"',
      '"Flood Compensation Bihar"', '"बिहार बाढ़ मुआवजा"', '"Kosi Flood"', '"कोसी बाढ़"',
      '"Gandak Flood"', '"गंडक बाढ़"', '"Bagmati Flood"', '"बागमती बाढ़"',
      '"#BiharFlood"', '"#बिहारबाढ़"', '"#FloodReliefBihar"', '"#बिहारबाढ़राहत"',
      '"#KosiFlood"', '"#कोसीबाढ़"',
    ],
    quickTags: ['#BiharFlood', '#FloodReliefBihar', '#KosiFlood'],
  },
  {
    id: 'waterlogging',
    label: 'Waterlogging & drainage',
    department: 'Public Health Department (PHD)',
    category: 'Water Contamination / Health Risk',
    terms: [
      '"Bihar Waterlogging"', '"बिहार जलजमाव"', '"Patna Waterlogging"', '"पटना जलजमाव"',
      '"Drainage Problem Bihar"', '"बिहार जल निकासी समस्या"', '"Blocked Drain Bihar"', '"बिहार नाला जाम"',
      '"Sewer Overflow Bihar"', '"बिहार सीवर ओवरफ्लो"', '"#BiharWaterlogging"', '"#बिहारजलजमाव"',
      '"#PatnaWaterlogging"', '"#पटनाजलजमाव"', '"#NalaJam"', '"#नालाजाम"',
    ],
    quickTags: ['#BiharWaterlogging', '#PatnaWaterlogging', '#NalaJam'],
  },
  {
    id: 'garbage',
    label: 'Garbage & sanitation',
    department: 'Public Health Department (PHD)',
    category: 'Water Contamination / Health Risk',
    terms: [
      '"Bihar Garbage Problem"', '"बिहार कचरा समस्या"', '"Garbage Not Collected Bihar"', '"बिहार में कचरा नहीं उठा"',
      '"Sanitation Problem Bihar"', '"बिहार सफाई समस्या"', '"Waste Management Bihar"', '"बिहार कचरा प्रबंधन"',
      '"#BiharGarbage"', '"#बिहारकचरा"', '"#GarbageProblemBihar"', '"#बिहारकचरासमस्या"',
      '"#SafaiNahiHui"', '"#सफाईनहींहुई"',
    ],
    quickTags: ['#BiharGarbage', '#GarbageProblemBihar', '#SafaiNahiHui'],
  },
  {
    id: 'health',
    label: 'Hospitals & public health',
    department: 'Public Health Department (PHD)',
    category: 'Water Contamination / Health Risk',
    terms: [
      '"Bihar Hospital Problem"', '"बिहार अस्पताल समस्या"', '"Government Hospital Bihar"', '"बिहार सरकारी अस्पताल"',
      '"Doctor Not Available Bihar"', '"बिहार में डॉक्टर उपलब्ध नहीं"',
      '"Medicine Not Available Bihar"', '"बिहार में दवा उपलब्ध नहीं"',
      '"Ambulance Problem Bihar"', '"बिहार एम्बुलेंस समस्या"', '"#BiharHealth"', '"#बिहारस्वास्थ्य"',
      '"#HospitalProblemBihar"', '"#बिहारअस्पतालसमस्या"',
      '"#DoctorNotAvailable"', '"#डॉक्टरउपलब्धनहीं"',
    ],
    quickTags: ['#BiharHealth', '#HospitalProblemBihar', '#DoctorNotAvailable'],
  },
  {
    id: 'schools',
    label: 'Schools & education',
    department: 'General Administration',
    category: 'Public Grievance',
    terms: [
      '"Bihar School Problem"', '"बिहार स्कूल समस्या"', '"Government School Bihar"', '"बिहार सरकारी स्कूल"',
      '"Teacher Absent Bihar"', '"बिहार शिक्षक अनुपस्थित"',
      '"School Building Problem Bihar"', '"बिहार विद्यालय भवन समस्या"',
      '"School Toilet Problem Bihar"', '"बिहार स्कूल शौचालय समस्या"',
      '"#BiharEducation"', '"#बिहारशिक्षा"', '"#BiharSchoolProblem"', '"#बिहारस्कूलसमस्या"',
      '"#TeacherAbsent"', '"#शिक्षकअनुपस्थित"',
    ],
    quickTags: ['#BiharEducation', '#BiharSchoolProblem', '#TeacherAbsent'],
  },
  {
    id: 'ration',
    label: 'Ration & PDS',
    department: 'General Administration',
    category: 'Public Grievance',
    terms: [
      '"Bihar Ration Problem"', '"बिहार राशन समस्या"', '"Ration Not Received Bihar"', '"बिहार में राशन नहीं मिला"',
      '"Ration Card Problem Bihar"', '"बिहार राशन कार्ड समस्या"', '"PDS Complaint Bihar"', '"बिहार पीडीएस शिकायत"',
      '"Ration Dealer Complaint Bihar"', '"बिहार राशन डीलर शिकायत"',
      '"#BiharRation"', '"#बिहारराशन"', '"#RationNotReceived"', '"#राशननहींमिला"',
      '"#RationCardProblem"', '"#राशनकार्डसमस्या"',
    ],
    quickTags: ['#BiharRation', '#RationNotReceived', '#RationCardProblem'],
  },
  {
    id: 'pension',
    label: 'Pensions',
    department: 'General Administration',
    category: 'Public Grievance',
    terms: [
      '"Bihar Pension Problem"', '"बिहार पेंशन समस्या"', '"Pension Not Received Bihar"', '"बिहार में पेंशन नहीं मिली"',
      '"Old Age Pension Bihar"', '"बिहार वृद्धावस्था पेंशन"',
      '"Widow Pension Bihar"', '"बिहार विधवा पेंशन"',
      '"Disability Pension Bihar"', '"बिहार दिव्यांग पेंशन"',
      '"#BiharPension"', '"#बिहारपेंशन"', '"#PensionNotReceived"', '"#पेंशननहींमिली"',
    ],
    quickTags: ['#BiharPension', '#PensionNotReceived'],
  },
  {
    id: 'government-schemes',
    label: 'Government schemes & DBT',
    department: 'General Administration',
    category: 'Public Grievance',
    terms: [
      '"Bihar Government Scheme"', '"बिहार सरकारी योजना"', '"Bihar Yojana"', '"बिहार योजना"',
      '"Scheme Benefit Not Received"', '"योजना का लाभ नहीं मिला"',
      '"Scheme Payment Pending"', '"योजना का भुगतान लंबित"',
      '"DBT Problem Bihar"', '"बिहार डीबीटी समस्या"',
      '"DBT Money Not Received"', '"डीबीटी का पैसा नहीं मिला"',
      '"#BiharYojana"', '"#बिहारयोजना"', '"#GovernmentSchemeBihar"', '"#बिहारसरकारीयोजना"',
      '"#YojanaBenefit"', '"#योजनाकालाभ"',
    ],
    quickTags: ['#BiharYojana', '#GovernmentSchemeBihar', '#YojanaBenefit'],
  },
  {
    id: 'nal-jal',
    label: 'Nal Jal Yojana',
    department: 'Public Health Department (PHD)',
    category: 'Water Contamination / Health Risk',
    terms: [
      '"Nal Jal Yojana Bihar"', '"बिहार नल जल योजना"', '"Har Ghar Nal Ka Jal"', '"हर घर नल का जल"',
      '"Nal Jal Problem Bihar"', '"बिहार नल जल समस्या"',
      '"No Water in Tap Bihar"', '"बिहार में नल में पानी नहीं"',
      '"#NalJalYojana"', '"#नलजलयोजना"', '"#HarGharNalKaJal"', '"#हरघरनलकाजल"',
      '"#NalJalProblem"', '"#नलजलसमस्या"',
    ],
    quickTags: ['#NalJalYojana', '#HarGharNalKaJal', '#NalJalProblem'],
  },
  {
    id: 'housing',
    label: 'Awas & housing',
    department: 'General Administration',
    category: 'Public Grievance',
    terms: [
      '"Awas Yojana Bihar"', '"बिहार आवास योजना"', '"Housing Scheme Bihar"', '"Awas Not Received"',
      '"आवास नहीं मिला"', '"Awas Payment Not Received"', '"आवास योजना का पैसा नहीं मिला"',
      '"#AwasYojanaBihar"', '"#बिहारआवासयोजना"', '"#AwasNotReceived"', '"#आवासनहींमिला"',
    ],
    quickTags: ['#AwasYojanaBihar', '#AwasNotReceived'],
  },
  {
    id: 'farmers',
    label: 'Farmers & crops',
    department: 'General Administration',
    category: 'Public Grievance',
    terms: [
      '"Farmer Problem Bihar"', '"बिहार किसान समस्या"', '"Crop Damage Bihar"', '"बिहार फसल नुकसान"',
      '"Crop Compensation Bihar"', '"बिहार फसल मुआवजा"',
      '"Irrigation Problem Bihar"', '"बिहार सिंचाई समस्या"',
      '"Fertilizer Shortage Bihar"', '"बिहार खाद की कमी"',
      '"#BiharFarmer"', '"#बिहारकिसान"', '"#FarmerProblemBihar"', '"#बिहारकिसानसमस्या"',
      '"#CropDamageBihar"', '"#बिहारफसलनुकसान"',
    ],
    quickTags: ['#BiharFarmer', '#FarmerProblemBihar', '#CropDamageBihar'],
  },
  {
    id: 'traffic',
    label: 'Traffic & signals',
    department: 'Road Construction Department (RCD)',
    category: 'Infrastructure Damage',
    terms: [
      '"Traffic Problem Bihar"', '"बिहार यातायात समस्या"', '"Traffic Jam Bihar"', '"बिहार ट्रैफिक जाम"',
      '"Patna Traffic Jam"', '"पटना ट्रैफिक जाम"',
      '"Traffic Signal Problem Bihar"', '"बिहार ट्रैफिक सिग्नल समस्या"',
      '"#BiharTraffic"', '"#बिहारट्रैफिक"', '"#TrafficJamBihar"', '"#बिहारट्रैफिकजाम"',
      '"#PatnaTrafficJam"', '"#पटनाट्रैफिकजाम"',
    ],
    quickTags: ['#BiharTraffic', '#TrafficJamBihar', '#PatnaTrafficJam'],
  },
  {
    id: 'street-lights',
    label: 'Street lights',
    department: 'Bihar State Power Holding Company Ltd (BSPHCL)',
    category: 'Power & Utilities Failure',
    terms: [
      '"Street Light Problem Bihar"', '"बिहार स्ट्रीट लाइट समस्या"',
      '"Street Light Not Working"', '"स्ट्रीट लाइट खराब"',
      '"Street Light Off Bihar"', '"बिहार में स्ट्रीट लाइट बंद"',
      '"#BiharStreetLight"', '"#बिहारस्ट्रीटलाइट"',
      '"#StreetLightProblem"', '"#स्ट्रीटलाइटसमस्या"',
    ],
    quickTags: ['#BiharStreetLight', '#StreetLightProblem'],
  },
  {
    id: 'bridges',
    label: 'Bridges',
    department: 'Road Construction Department (RCD)',
    category: 'Infrastructure Damage',
    terms: [
      '"Bridge Problem Bihar"', '"बिहार पुल समस्या"', '"Broken Bridge Bihar"', '"बिहार में टूटा पुल"',
      '"Damaged Bridge Bihar"', '"बिहार में क्षतिग्रस्त पुल"',
      '"Bridge Repair Bihar"', '"बिहार पुल मरम्मत"',
      '"#BiharBridge"', '"#बिहारपुल"', '"#BrokenBridgeBihar"', '"#टूटापुलबिहार"',
    ],
    quickTags: ['#BiharBridge', '#BrokenBridgeBihar'],
  },
  {
    id: 'encroachment',
    label: 'Encroachment',
    department: 'General Administration',
    category: 'Public Grievance',
    terms: [
      '"Encroachment Bihar"', '"बिहार अतिक्रमण"', '"Illegal Encroachment Bihar"', '"बिहार अवैध अतिक्रमण"',
      '"Road Encroachment Bihar"', '"बिहार सड़क अतिक्रमण"',
      '"Footpath Encroachment Bihar"', '"बिहार फुटपाथ अतिक्रमण"',
      '"#BiharEncroachment"', '"#बिहारअतिक्रमण"',
      '"#IllegalEncroachment"', '"#अवैधअतिक्रमण"',
    ],
    quickTags: ['#BiharEncroachment', '#IllegalEncroachment'],
  },
  {
    id: 'public-grievance',
    label: 'General public grievances',
    department: 'General Administration',
    category: 'Public Grievance',
    terms: [
      '"Bihar Public Grievance"', '"बिहार जन शिकायत"', '"Bihar Public Complaint"',
      '"Bihar Citizen Complaint"', '"बिहार नागरिक शिकायत"',
      '"Bihar Public Problem"', '"बिहार जन समस्या"',
      '"Bihar Civic Issue"', '"बिहार नागरिक समस्या"',
      '"People Facing Problem Bihar"', '"बिहार में जनता परेशान"',
      '"#BiharPublicGrievance"', '"#बिहारजनशिकायत"', '"#BiharComplaint"', '"#बिहारशिकायत"',
      '"#BiharPublicProblem"', '"#बिहारजनसमस्या"',
      '"#CitizenComplaintBihar"', '"#बिहारनागरिकशिकायत"',
      '"#JantaPareshan"', '"#जनतापरेशान"',
    ],
    quickTags: ['#BiharPublicGrievance', '#BiharComplaint', '#JantaPareshan'],
  },
];

const sectorById = new Map(sectors.map(sector => [sector.id, sector]));

function normalizeText(text) {
  return String(text || '').toLocaleLowerCase('hi-IN')
    .normalize('NFKC')
    .replace(/["“”#]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesTerm(normalizedText, normalizedTerm) {
  if (normalizedText.includes(normalizedTerm)) return true;
  const textWords = normalizedText.split(' ');
  const termWords = normalizedTerm.split(' ');
  if (termWords.length < 2) return false;

  let cursor = textWords.indexOf(termWords[0]);
  while (cursor !== -1) {
    let matched = true;
    let previousIndex = cursor;
    for (const word of termWords.slice(1)) {
      const nextIndex = textWords.indexOf(word, previousIndex + 1);
      if (nextIndex === -1 || nextIndex > previousIndex + 3) {
        matched = false;
        break;
      }
      previousIndex = nextIndex;
    }
    if (matched) return true;
    cursor = textWords.indexOf(termWords[0], cursor + 1);
  }
  return false;
}

function detectSector(text) {
  const normalizedText = normalizeText(text);
  let bestMatch = null;
  let bestLength = 0;

  for (const sector of sectors) {
    for (const term of sector.terms) {
      const normalizedTerm = normalizeText(term);
      if (normalizedTerm.length > bestLength && matchesTerm(normalizedText, normalizedTerm)) {
        bestMatch = sector;
        bestLength = normalizedTerm.length;
      }
    }
  }

  return bestMatch || sectorById.get('public-grievance');
}

function getSector(id) {
  return sectorById.get(id) || null;
}

function getSearchTaxonomy() {
  return sectors.map(({ id, label, category, department, terms, quickTags }) => ({
    id,
    label,
    category,
    department,
    example_query: terms.slice(0, 2).join(' OR '),
    quick_tags: quickTags,
  }));
}

function getPollQuery(index) {
  const sector = sectors[index % sectors.length];
  const termIndex = Math.floor(index / sectors.length) % sector.terms.length;
  const tagIndex = Math.floor(index / sectors.length) % sector.quickTags.length;
  return { sector, query: sector.quickTags[tagIndex] || sector.terms[termIndex] };
}

module.exports = {
  sectors,
  detectSector,
  getSector,
  getSearchTaxonomy,
  getPollQuery,
};
