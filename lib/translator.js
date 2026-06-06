const PHRASE_REPLACEMENTS = [
  ['stock news', 'ข่าวหุ้น'],
  ['shares', 'หุ้น'],
  ['stock', 'หุ้น'],
  ['common stock', 'หุ้นสามัญ'],
  ['pre-market', 'ก่อนเปิดตลาด'],
  ['after-hours', 'หลังปิดตลาด'],
  ['earnings call', 'การประชุมชี้แจงผลประกอบการ'],
  ['earnings report', 'รายงานผลประกอบการ'],
  ['quarterly results', 'ผลประกอบการรายไตรมาส'],
  ['annual report', 'รายงานประจำปี'],
  ['revenue', 'รายได้'],
  ['net loss', 'ขาดทุนสุทธิ'],
  ['net income', 'กำไรสุทธิ'],
  ['profit', 'กำไร'],
  ['loss', 'ขาดทุน'],
  ['guidance raised', 'ปรับเพิ่มคาดการณ์ผลประกอบการ'],
  ['raises guidance', 'ปรับเพิ่มคาดการณ์ผลประกอบการ'],
  ['guidance', 'คาดการณ์ผลประกอบการ'],
  ['beats estimates', 'ผลประกอบการดีกว่าคาด'],
  ['misses estimates', 'ผลประกอบการต่ำกว่าคาด'],
  ['public offering', 'การเสนอขายหุ้นต่อประชาชน'],
  ['registered direct offering', 'การเสนอขายหุ้นแบบ registered direct'],
  ['direct offering', 'การเสนอขายหุ้นแบบ direct offering'],
  ['atm offering', 'การขายหุ้นผ่านโครงการ ATM'],
  ['offering', 'การเพิ่มทุน/เสนอขายหุ้น'],
  ['dilution', 'การลดสัดส่วนผู้ถือหุ้นเดิม'],
  ['dilutive', 'มีผลลดสัดส่วนผู้ถือหุ้นเดิม'],
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
  ['analyst upgrade', 'นักวิเคราะห์ปรับคำแนะนำขึ้น'],
  ['analyst downgrade', 'นักวิเคราะห์ปรับคำแนะนำลง'],
  ['upgrade', 'ปรับคำแนะนำขึ้น'],
  ['downgrade', 'ปรับคำแนะนำลง'],
  ['price target', 'ราคาเป้าหมาย'],
  ['lawsuit', 'คดีความ'],
  ['investigation', 'การสอบสวน'],
  ['merger', 'การควบรวมกิจการ'],
  ['acquisition', 'การเข้าซื้อกิจการ'],
  ['partnership', 'ความร่วมมือทางธุรกิจ'],
  ['contract award', 'การได้รับสัญญา'],
  ['defense contract', 'สัญญาด้านกลาโหม'],
  ['government contract', 'สัญญาภาครัฐ'],
  ['new contract', 'สัญญาใหม่'],
  ['contract', 'สัญญา'],
  ['customer win', 'ได้ลูกค้าใหม่'],
  ['new order', 'คำสั่งซื้อใหม่'],
  ['order backlog', 'งานในมือ'],
  ['backlog', 'งานในมือ'],
  ['short interest', 'สถานะขายชอร์ต'],
  ['short squeeze', 'โอกาสเกิด short squeeze'],
  ['high volume', 'ปริมาณซื้อขายสูง'],
  ['trading volume', 'ปริมาณซื้อขาย'],
  ['volume', 'ปริมาณซื้อขาย'],
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
  ['debt', 'หนี้'],
  ['cash runway', 'ระยะเวลาที่เงินสดพอใช้'],
  ['going concern', 'ความเสี่ยงด้านความสามารถในการดำเนินงานต่อเนื่อง'],
  ['bankruptcy', 'ล้มละลาย'],
  ['default', 'ผิดนัดชำระหนี้'],
  ['layoff', 'ปลดพนักงาน'],
  ['fraud', 'ทุจริต'],
  ['record revenue', 'รายได้สูงสุดเป็นประวัติการณ์'],
  ['launch', 'เปิดตัว'],
  ['expansion', 'การขยายธุรกิจ'],
  ['approval', 'การอนุมัติ'],
  ['strategic', 'เชิงกลยุทธ์']
];

const WORD_REPLACEMENTS = new Map([
  ['company', 'บริษัท'], ['announces', 'ประกาศ'], ['announced', 'ประกาศ'], ['reports', 'รายงาน'], ['reported', 'รายงาน'],
  ['expects', 'คาดว่า'], ['expected', 'คาดการณ์'], ['wins', 'ชนะ/ได้รับ'], ['awarded', 'ได้รับ'], ['award', 'รางวัล/สัญญา'],
  ['falls', 'ปรับลง'], ['rises', 'ปรับขึ้น'], ['surges', 'พุ่งขึ้น'], ['jumps', 'กระโดดขึ้น'], ['drops', 'ลดลง'],
  ['plunges', 'ร่วงแรง'], ['slides', 'อ่อนตัว'], ['gains', 'เพิ่มขึ้น'], ['beats', 'ดีกว่าคาด'], ['misses', 'ต่ำกว่าคาด'],
  ['raises', 'ปรับเพิ่ม'], ['cuts', 'ปรับลด'], ['target', 'เป้าหมาย'], ['analyst', 'นักวิเคราะห์'], ['rating', 'คำแนะนำ'],
  ['buy', 'ซื้อ'], ['sell', 'ขาย'], ['hold', 'ถือ'], ['neutral', 'เป็นกลาง'], ['bullish', 'มุมมองบวก'], ['bearish', 'มุมมองลบ'],
  ['growth', 'การเติบโต'], ['risk', 'ความเสี่ยง'], ['risks', 'ความเสี่ยง'], ['investor', 'นักลงทุน'], ['investors', 'นักลงทุน'],
  ['market', 'ตลาด'], ['markets', 'ตลาด'], ['quarter', 'ไตรมาส'], ['fiscal', 'ปีงบประมาณ'], ['year', 'ปี'], ['week', 'สัปดาห์'],
  ['today', 'วันนี้'], ['yesterday', 'เมื่อวาน'], ['latest', 'ล่าสุด'], ['new', 'ใหม่'], ['update', 'อัปเดต'], ['alerts', 'แจ้งเตือน'],
  ['why', 'ทำไม'], ['what', 'อะไร'], ['how', 'อย่างไร'], ['before', 'ก่อน'], ['after', 'หลัง'], ['open', 'เปิด'], ['close', 'ปิด'],
  ['price', 'ราคา'], ['sales', 'ยอดขาย'], ['revenue', 'รายได้'], ['earnings', 'ผลประกอบการ'], ['margin', 'อัตรากำไร'],
  ['cash', 'เงินสด'], ['debt', 'หนี้'], ['loan', 'เงินกู้'], ['shares', 'หุ้น'], ['share', 'หุ้น'], ['stock', 'หุ้น']
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

  out = out
    .replace(/\s+([,.:;!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  return out;
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

  if (/offering|dilution|registered direct|atm/.test(text)) reasons.push('มีประเด็นเพิ่มทุน/ลดสัดส่วนผู้ถือหุ้นเดิม ซึ่งมักกดดันราคา');
  if (/reverse split|delisting|compliance/.test(text)) reasons.push('มีประเด็นเกณฑ์ตลาดหรือการรวมหุ้น ซึ่งเป็นความเสี่ยงสำคัญ');
  if (/earnings|revenue|profit|loss|guidance/.test(text)) reasons.push('เกี่ยวข้องกับผลประกอบการหรือคาดการณ์รายได้ จึงกระทบมุมมองพื้นฐาน');
  if (/contract|award|defense|government|order|partnership/.test(text)) reasons.push('เกี่ยวข้องกับสัญญา/คำสั่งซื้อ/ความร่วมมือ ซึ่งอาจเป็น catalyst ต่อราคา');
  if (/lawsuit|investigation|fraud/.test(text)) reasons.push('มีความเสี่ยงด้านกฎหมายหรือการสอบสวน');
  if (/analyst|upgrade|downgrade|price target/.test(text)) reasons.push('มีผลต่อมุมมองของตลาดผ่านนักวิเคราะห์หรือราคาเป้าหมาย');
  if (/short interest|short squeeze/.test(text)) reasons.push('เกี่ยวข้องกับแรงขายชอร์ตหรือโอกาสเกิดแรงบีบชอร์ต');

  if (!reasons.length) {
    const sentiment = thaiSentimentLabel(article.sentimentScore || 0);
    return `${sentiment}ระดับปานกลาง ยังต้องตรวจเนื้อหาข่าวต้นทางเพื่อยืนยันผลกระทบ`;
  }

  return reasons.join(' / ');
}

export function localizeNewsArticle(article = {}) {
  const sentiment = thaiSentimentLabel(article.sentimentScore ?? article.label);
  const titleTh = translateFinancialText(article.title || '');
  const snippetTh = translateFinancialText(article.snippet || '');
  const impactReasonTh = thaiImpactReason(article);

  return {
    ...article,
    titleOriginal: article.title || '',
    snippetOriginal: article.snippet || '',
    titleTh: titleTh || article.title || '',
    snippetTh: snippetTh || 'ไม่มีคำอธิบายจากแหล่งข่าวนี้',
    sentimentLabelTh: sentiment,
    impactReasonTh
  };
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
