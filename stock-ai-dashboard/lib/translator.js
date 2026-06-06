const COMPANY_HINTS = {
  BURU: 'Nuburu',
  IREN: 'IREN',
  NVDA: 'NVIDIA',
  AAPL: 'Apple',
  TSLA: 'Tesla',
  AMD: 'AMD',
  MSFT: 'Microsoft',
  META: 'Meta',
  AMZN: 'Amazon',
  GOOGL: 'Alphabet',
  GOOG: 'Alphabet'
};

const PHRASE_REPLACEMENTS = [
  ['stock news', 'ข่าวหุ้น'],
  ['common stock', 'หุ้นสามัญ'],
  ['registered direct offering', 'การเสนอขายหุ้นแบบ registered direct'],
  ['public offering', 'การเสนอขายหุ้นต่อประชาชน'],
  ['direct offering', 'การเสนอขายหุ้นแบบ direct offering'],
  ['atm offering', 'การขายหุ้นผ่านโครงการ ATM'],
  ['at-the-market offering', 'การขายหุ้นผ่านโครงการ ATM'],
  ['securities purchase agreement', 'สัญญาซื้อขายหลักทรัพย์'],
  ['private placement', 'การขายหลักทรัพย์แบบเฉพาะเจาะจง'],
  ['warrants', 'วอร์แรนต์'],
  ['dilution', 'การลดสัดส่วนผู้ถือหุ้นเดิม'],
  ['dilutive', 'มีผลลดสัดส่วนผู้ถือหุ้นเดิม'],
  ['reverse stock split', 'การรวมหุ้น'],
  ['reverse split', 'การรวมหุ้น'],
  ['stock split', 'การแตกหุ้น'],
  ['delisting notice', 'หนังสือเตือนเรื่องการถูกถอดออกจากตลาด'],
  ['delisting', 'ความเสี่ยงถูกถอดออกจากตลาด'],
  ['nasdaq compliance', 'การปฏิบัติตามเกณฑ์ Nasdaq'],
  ['compliance notice', 'หนังสือเตือนเรื่องการปฏิบัติตามเกณฑ์ตลาด'],
  ['sec filing', 'เอกสารยื่นต่อ SEC'],
  ['form 8-k', 'แบบฟอร์ม 8-K'],
  ['form 10-q', 'แบบฟอร์ม 10-Q'],
  ['form 10-k', 'แบบฟอร์ม 10-K'],
  ['earnings call', 'การประชุมชี้แจงผลประกอบการ'],
  ['earnings report', 'รายงานผลประกอบการ'],
  ['quarterly results', 'ผลประกอบการรายไตรมาส'],
  ['financial results', 'ผลประกอบการทางการเงิน'],
  ['annual report', 'รายงานประจำปี'],
  ['revenue', 'รายได้'],
  ['net loss', 'ขาดทุนสุทธิ'],
  ['net income', 'กำไรสุทธิ'],
  ['gross margin', 'อัตรากำไรขั้นต้น'],
  ['guidance raised', 'ปรับเพิ่มคาดการณ์ผลประกอบการ'],
  ['raises guidance', 'ปรับเพิ่มคาดการณ์ผลประกอบการ'],
  ['guidance', 'คาดการณ์ผลประกอบการ'],
  ['beats estimates', 'ผลประกอบการดีกว่าคาด'],
  ['misses estimates', 'ผลประกอบการต่ำกว่าคาด'],
  ['analyst upgrade', 'นักวิเคราะห์ปรับคำแนะนำขึ้น'],
  ['analyst downgrade', 'นักวิเคราะห์ปรับคำแนะนำลง'],
  ['price target', 'ราคาเป้าหมาย'],
  ['lawsuit', 'คดีความ'],
  ['class action', 'คดีแบบกลุ่ม'],
  ['investigation', 'การสอบสวน'],
  ['merger', 'การควบรวมกิจการ'],
  ['acquisition', 'การเข้าซื้อกิจการ'],
  ['partnership', 'ความร่วมมือทางธุรกิจ'],
  ['contract award', 'การได้รับสัญญา'],
  ['defense contract', 'สัญญาด้านกลาโหม'],
  ['government contract', 'สัญญาภาครัฐ'],
  ['new contract', 'สัญญาใหม่'],
  ['customer win', 'ได้ลูกค้าใหม่'],
  ['new order', 'คำสั่งซื้อใหม่'],
  ['order backlog', 'งานในมือ'],
  ['short interest', 'สถานะขายชอร์ต'],
  ['short squeeze', 'โอกาสเกิด short squeeze'],
  ['trading volume', 'ปริมาณซื้อขาย'],
  ['market cap', 'มูลค่าตลาด'],
  ['micro-cap', 'หุ้นขนาดเล็กมาก'],
  ['small-cap', 'หุ้นขนาดเล็ก'],
  ['large-cap', 'หุ้นขนาดใหญ่'],
  ['blue laser', 'เลเซอร์สีน้ำเงิน'],
  ['artificial intelligence', 'ปัญญาประดิษฐ์'],
  ['ai infrastructure', 'โครงสร้างพื้นฐาน AI'],
  ['data center', 'ศูนย์ข้อมูล'],
  ['bitcoin mining', 'การขุดบิตคอยน์'],
  ['crypto mining', 'การขุดคริปโต'],
  ['buyback', 'ซื้อหุ้นคืน'],
  ['dividend', 'เงินปันผล'],
  ['going concern', 'ความเสี่ยงด้านความสามารถในการดำเนินงานต่อเนื่อง'],
  ['record revenue', 'รายได้สูงสุดเป็นประวัติการณ์']
];

const WORD_REPLACEMENTS = new Map([
  ['company', 'บริษัท'], ['announces', 'ประกาศ'], ['announced', 'ประกาศ'], ['reports', 'รายงาน'], ['reported', 'รายงาน'],
  ['expects', 'คาดว่า'], ['expected', 'คาดการณ์'], ['wins', 'ได้รับ'], ['awarded', 'ได้รับ'], ['award', 'รางวัล/สัญญา'],
  ['falls', 'ปรับลง'], ['rises', 'ปรับขึ้น'], ['surges', 'พุ่งขึ้น'], ['jumps', 'กระโดดขึ้น'], ['drops', 'ลดลง'],
  ['plunges', 'ร่วงแรง'], ['slides', 'อ่อนตัว'], ['gains', 'เพิ่มขึ้น'], ['beats', 'ดีกว่าคาด'], ['misses', 'ต่ำกว่าคาด'],
  ['raises', 'ปรับเพิ่ม'], ['cuts', 'ปรับลด'], ['target', 'เป้าหมาย'], ['analyst', 'นักวิเคราะห์'], ['rating', 'คำแนะนำ'],
  ['buy', 'ซื้อ'], ['sell', 'ขาย'], ['hold', 'ถือ'], ['neutral', 'เป็นกลาง'], ['bullish', 'มุมมองบวก'], ['bearish', 'มุมมองลบ'],
  ['growth', 'การเติบโต'], ['risk', 'ความเสี่ยง'], ['risks', 'ความเสี่ยง'], ['investor', 'นักลงทุน'], ['investors', 'นักลงทุน'],
  ['market', 'ตลาด'], ['markets', 'ตลาด'], ['quarter', 'ไตรมาส'], ['fiscal', 'ปีงบประมาณ'], ['year', 'ปี'], ['week', 'สัปดาห์'],
  ['today', 'วันนี้'], ['yesterday', 'เมื่อวาน'], ['latest', 'ล่าสุด'], ['new', 'ใหม่'], ['update', 'อัปเดต'], ['alerts', 'แจ้งเตือน'],
  ['why', 'ทำไม'], ['what', 'อะไร'], ['how', 'อย่างไร'], ['before', 'ก่อน'], ['after', 'หลัง'], ['open', 'เปิด'], ['close', 'ปิด'],
  ['price', 'ราคา'], ['sales', 'ยอดขาย'], ['earnings', 'ผลประกอบการ'], ['margin', 'อัตรากำไร'],
  ['cash', 'เงินสด'], ['debt', 'หนี้'], ['loan', 'เงินกู้'], ['shares', 'หุ้น'], ['share', 'หุ้น'], ['stock', 'หุ้น'],
  ['offering', 'การเสนอขายหุ้น'], ['contract', 'สัญญา'], ['volume', 'ปริมาณซื้อขาย'], ['approval', 'การอนุมัติ'], ['launch', 'เปิดตัว'],
  ['profit', 'กำไร'], ['loss', 'ขาดทุน'], ['fraud', 'ทุจริต'], ['default', 'ผิดนัดชำระหนี้'], ['bankruptcy', 'ล้มละลาย']
]);

export function translateFinancialText(text = '') {
  let out = normalizeText(text);
  if (!out) return '';

  for (const [en, th] of PHRASE_REPLACEMENTS) {
    const re = new RegExp(escapeRegExp(en), 'gi');
    out = out.replace(re, th);
  }

  out = out.replace(/\b[A-Za-z][A-Za-z'-]*\b/g, (word) => {
    const mapped = WORD_REPLACEMENTS.get(word.toLowerCase());
    return mapped || word;
  });

  return out
    .replace(/\s+([,.:;!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function thaiSentimentLabel(labelOrScore) {
  if (typeof labelOrScore === 'number') {
    if (labelOrScore > 0.15) return 'ข่าวบวก';
    if (labelOrScore < -0.15) return 'ข่าวลบ';
    return 'ข่าวกลาง';
  }
  const label = String(labelOrScore || '').toLowerCase();
  if (label.includes('positive')) return 'ข่าวบวก';
  if (label.includes('negative')) return 'ข่าวลบ';
  return 'ข่าวกลาง';
}

export function thaiImpactReason(article = {}) {
  const text = `${article.title || ''} ${article.snippet || ''}`.toLowerCase();
  const reasons = [];

  if (/offering|dilution|registered direct|atm|private placement|warrant/.test(text)) reasons.push('มีประเด็นเพิ่มทุน/เสนอขายหุ้น/วอร์แรนต์ ซึ่งมักกดดันราคาเพราะผู้ถือหุ้นเดิมเสี่ยงถูกลดสัดส่วน');
  if (/reverse split|delisting|compliance/.test(text)) reasons.push('มีประเด็นเกณฑ์ตลาดหรือการรวมหุ้น ซึ่งเป็นความเสี่ยงสำคัญต่อความเชื่อมั่น');
  if (/earnings|revenue|profit|loss|guidance|quarterly results/.test(text)) reasons.push('เกี่ยวข้องกับผลประกอบการหรือคาดการณ์รายได้ จึงกระทบมุมมองพื้นฐานโดยตรง');
  if (/contract|award|defense|government|order|partnership|customer win/.test(text)) reasons.push('เกี่ยวข้องกับสัญญา/คำสั่งซื้อ/ความร่วมมือ ซึ่งอาจเป็น catalyst ต่อราคา');
  if (/lawsuit|investigation|fraud|class action/.test(text)) reasons.push('มีความเสี่ยงด้านกฎหมายหรือการสอบสวน อาจกดดัน sentiment');
  if (/analyst|upgrade|downgrade|price target/.test(text)) reasons.push('มีผลต่อมุมมองของตลาดผ่านนักวิเคราะห์หรือราคาเป้าหมาย');
  if (/short interest|short squeeze/.test(text)) reasons.push('เกี่ยวข้องกับแรงขายชอร์ตหรือโอกาสเกิดแรงบีบชอร์ต ทำให้ราคาผันผวนสูง');
  if (/pre-market|after-hours|surge|plunge|falls|rises|jumps|drops/.test(text)) reasons.push('เป็นข่าวความเคลื่อนไหวราคาโดยตรง จึงสะท้อนแรงซื้อขายระยะสั้น');

  if (!reasons.length) {
    const sentiment = thaiSentimentLabel(article.sentimentScore || 0);
    return `${sentiment}ระดับปานกลาง ยังต้องตรวจเนื้อหาข่าวต้นทางเพื่อยืนยันผลกระทบ`;
  }

  return reasons.join(' / ');
}

export function localizeNewsArticle(article = {}, ticker = '') {
  const sentiment = thaiSentimentLabel(article.sentimentScore ?? article.label);
  const event = classifyNewsEvent(article);
  const company = detectCompany(article, ticker);
  const titleTh = buildThaiHeadline(article, event, company);
  const snippetTh = buildThaiNewsSummary(article, event, company, sentiment);
  const impactReasonTh = thaiImpactReason(article);
  const originalTranslated = translateFinancialText(article.title || '');

  return {
    ...article,
    titleOriginal: article.title || '',
    snippetOriginal: article.snippet || '',
    titleTh,
    snippetTh,
    originalTitleTranslatedTh: originalTranslated,
    sentimentLabelTh: sentiment,
    impactReasonTh,
    eventTypeTh: event.labelTh
  };
}

export function classifyNewsEvent(article = {}) {
  const text = `${article.title || ''} ${article.snippet || ''}`.toLowerCase();
  const has = (re) => re.test(text);

  if (has(/offering|dilution|registered direct|atm offering|at-the-market|private placement|warrant/)) {
    return { id: 'offering', labelTh: 'เพิ่มทุน/เสนอขายหุ้น', polarity: -1 };
  }
  if (has(/reverse split|delisting|compliance notice|nasdaq compliance|nyse compliance/)) {
    return { id: 'listing-risk', labelTh: 'ความเสี่ยงเกณฑ์ตลาด', polarity: -1 };
  }
  if (has(/lawsuit|investigation|fraud|class action/)) {
    return { id: 'legal', labelTh: 'คดีความ/การสอบสวน', polarity: -1 };
  }
  if (has(/earnings|quarterly results|financial results|revenue|profit|loss|guidance/)) {
    return { id: 'earnings', labelTh: 'ผลประกอบการ', polarity: 0 };
  }
  if (has(/contract|award|defense|government|order|partnership|customer win|backlog/)) {
    return { id: 'contract', labelTh: 'สัญญา/คำสั่งซื้อ', polarity: 1 };
  }
  if (has(/analyst|upgrade|downgrade|price target|rating/)) {
    return { id: 'analyst', labelTh: 'มุมมองนักวิเคราะห์', polarity: 0 };
  }
  if (has(/short interest|short squeeze|squeeze/)) {
    return { id: 'short', labelTh: 'แรงขายชอร์ต/บีบชอร์ต', polarity: 0 };
  }
  if (has(/pre-market|after-hours|surge|plunge|falls|rises|jumps|drops|why.*moving|shares.*move/)) {
    return { id: 'price-action', labelTh: 'ความเคลื่อนไหวราคา', polarity: 0 };
  }
  if (has(/launch|approval|expansion|strategic/)) {
    return { id: 'business-update', labelTh: 'อัปเดตธุรกิจ', polarity: 1 };
  }
  return { id: 'general', labelTh: 'ข่าวทั่วไป', polarity: 0 };
}

function buildThaiHeadline(article, event, company) {
  const source = article.source ? ` (${article.source})` : '';
  switch (event.id) {
    case 'offering':
      return `${company}: ข่าวเพิ่มทุน/เสนอขายหุ้น อาจกดดันราคา${source}`;
    case 'listing-risk':
      return `${company}: ข่าวความเสี่ยงด้านเกณฑ์ตลาด/การรวมหุ้น ต้องระวัง${source}`;
    case 'legal':
      return `${company}: ข่าวคดีความหรือการสอบสวน อาจกระทบความเชื่อมั่น${source}`;
    case 'earnings':
      return `${company}: ข่าวผลประกอบการ/รายได้ ต้องดูว่าดีกว่าหรือต่ำกว่าคาด${source}`;
    case 'contract':
      return `${company}: ข่าวสัญญา คำสั่งซื้อ หรือความร่วมมือ อาจเป็นแรงหนุนราคา${source}`;
    case 'analyst':
      return `${company}: ข่าวนักวิเคราะห์หรือราคาเป้าหมาย มีผลต่อมุมมองตลาด${source}`;
    case 'short':
      return `${company}: ข่าวแรงขายชอร์ต/โอกาสบีบชอร์ต ทำให้ผันผวนสูง${source}`;
    case 'price-action':
      return `${company}: ข่าวความเคลื่อนไหวราคาหุ้นระยะสั้น${source}`;
    case 'business-update':
      return `${company}: ข่าวอัปเดตธุรกิจหรือการเปิดตัวใหม่${source}`;
    default:
      return `${company}: ข่าวสำคัญที่ควรตรวจสอบเพิ่มเติม${source}`;
  }
}

function buildThaiNewsSummary(article, event, company, sentiment) {
  const impact = Number(article.impactScore || 0);
  const score = Number(article.sentimentScore || 0);
  const original = translateFinancialText(article.title || article.snippet || '');
  const impactLevel = impact >= 70 ? 'สูง' : impact >= 40 ? 'ปานกลาง' : 'ต่ำ';
  const direction = score > 0.15 ? 'เอนบวก' : score < -0.15 ? 'เอนลบ' : 'เป็นกลาง';

  const base = `ระบบจัดข่าวนี้เป็น “${event.labelTh}” สำหรับ ${company} โดยประเมินผลกระทบระดับ${impactLevel} และ sentiment ${direction}`;
  let detail;
  switch (event.id) {
    case 'offering':
      detail = 'ประเด็นนี้มักเป็นลบระยะสั้น เพราะตลาดกังวลจำนวนหุ้นเพิ่มขึ้น ต้นทุนเงินทุน และแรงขายจากผู้ถือหุ้นเดิม';
      break;
    case 'listing-risk':
      detail = 'ประเด็นนี้ควรระวังเป็นพิเศษ เพราะเกี่ยวกับสถานะการซื้อขาย ความน่าเชื่อถือ และโอกาสเกิดความผันผวนสูง';
      break;
    case 'legal':
      detail = 'ประเด็นกฎหมายอาจทำให้นักลงทุนลดความเสี่ยง ส่งผลให้ราคาถูกกดดันจนกว่าจะมีความชัดเจน';
      break;
    case 'earnings':
      detail = 'ให้ดูตัวเลขรายได้ กำไร/ขาดทุน กระแสเงินสด และ guidance เพราะเป็นตัวกำหนดมุมมองพื้นฐาน';
      break;
    case 'contract':
      detail = 'ถ้าสัญญามีมูลค่าสูงและเกิดรายได้จริง อาจช่วยหนุนราคา แต่ต้องตรวจว่ามีตัวเลขมูลค่าสัญญาชัดเจนหรือไม่';
      break;
    case 'analyst':
      detail = 'ข่าวนักวิเคราะห์มีผลต่อความคาดหวังของตลาด โดยเฉพาะเมื่อมีการปรับราคาเป้าหมายหรือคำแนะนำ';
      break;
    case 'short':
      detail = 'หุ้นที่มีแรงขายชอร์ตสูงอาจเด้งแรงเมื่อมีข่าวบวก แต่ก็เสี่ยงร่วงแรงหากข่าวไม่หนุน';
      break;
    case 'price-action':
      detail = 'เป็นสัญญาณราคาในระยะสั้น ควรใช้ร่วมกับ volume, VWAP และแนวรับ/แนวต้าน';
      break;
    case 'business-update':
      detail = 'ข่าวธุรกิจเป็นปัจจัยหนุนได้ หากเชื่อมโยงกับรายได้จริง ไม่ใช่เพียงข่าวประชาสัมพันธ์';
      break;
    default:
      detail = 'ควรเปิดอ่านต้นทางเพื่อดูรายละเอียด ตัวเลข และเวลาที่ข่าวเผยแพร่ก่อนตัดสินใจ';
  }

  return `${base}. ${detail}. หัวข่าวต้นทางแปลโดยระบบ: ${original || 'ไม่มีข้อความต้นทางให้แปล'}`;
}

function detectCompany(article, ticker = '') {
  const raw = `${ticker || ''} ${article.title || ''} ${article.snippet || ''}`;
  const upper = raw.toUpperCase();
  for (const [symbol, name] of Object.entries(COMPANY_HINTS)) {
    if (upper.includes(symbol) || upper.includes(name.toUpperCase())) return `${name} (${symbol})`;
  }

  const leading = String(article.title || '').match(/^([A-Z][A-Za-z0-9.&\- ]{2,40}?)(?:\s|:|-)/);
  if (leading) return leading[1].trim();
  return ticker ? ticker.toUpperCase() : 'หุ้นนี้';
}

function normalizeText(text) {
  return String(text || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
