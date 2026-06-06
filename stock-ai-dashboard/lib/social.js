import { companyQuery, fetchGoogleNewsRss, scoreNewsText } from './news.js';
import { clamp, daysAgo, normalizeTicker } from './utils.js';
import { translateFinancialText } from './translator.js';

const SOCIAL_POSITIVE = [
  'bullish', 'buy', 'bought', 'adding', 'accumulate', 'long', 'breakout', 'squeeze',
  'short squeeze', 'moon', 'rocket', 'gap up', 'runner', 'momentum', 'volume',
  'contract', 'award', 'partnership', 'earnings beat', 'upgrade', 'price target',
  'undervalued', 'support holding', 'reversal', 'higher low', 'calls', 'call sweep'
];

const SOCIAL_NEGATIVE = [
  'bearish', 'sell', 'sold', 'dump', 'dilution', 'offering', 'atm', 'reverse split',
  'rs', 'delisting', 'scam', 'rug', 'bagholder', 'bankruptcy', 'debt', 'lawsuit',
  'investigation', 'low volume', 'fake pump', 'pump and dump', 'short', 'puts',
  'resistance rejected', 'lower low', 'no bid', 'halt'
];

const HYPE_WORDS = [
  'moon', 'rocket', 'squeeze', 'short squeeze', '10x', '100x', 'multi bagger',
  'load up', 'all in', 'yolo', 'fomo', 'pump', 'runner', 'next gme', 'diamond hands'
];

const PLATFORM_META = {
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    badge: 'ชุมชนทั่วไป',
    limitation: 'Facebook จำกัดการดึงโพสต์สาธารณะ ต้องใช้ Graph API/สิทธิ์เพจหรือกลุ่ม จึงวิเคราะห์จากลิงก์ค้นหาและข้อมูลที่ index บนเว็บเท่านั้น'
  },
  x: {
    id: 'x',
    name: 'X / Twitter',
    badge: 'กระแสเร็ว',
    limitation: 'X ต้องใช้ API หรือการเข้าสู่ระบบเพื่ออ่านข้อความจริงแบบครบถ้วน ระบบจึงให้ลิงก์ติดตามและใช้ข้อมูลที่ค้นพบจากเว็บเป็นตัวช่วย'
  },
  reddit: {
    id: 'reddit',
    name: 'Reddit',
    badge: 'ชุมชนนักเก็งกำไร',
    limitation: 'ดึงจาก public Reddit search เท่าที่เปิดได้ในช่วงเวลานั้น อาจถูกจำกัด rate limit ได้'
  },
  stocktwits: {
    id: 'stocktwits',
    name: 'Stocktwits',
    badge: 'สายหุ้นโดยตรง',
    limitation: 'ดึงจาก public Stocktwits stream ถ้า ticker ไม่มีคนพูดถึงมาก ข้อมูลจะน้อย'
  },
  other: {
    id: 'other',
    name: 'อื่น ๆ สำคัญ',
    badge: 'YouTube / Google Trends / เว็บบอร์ด',
    limitation: 'ใช้เป็นแหล่งติดตามเสริม เพราะมักสะท้อนความสนใจรายย่อยและกระแสร้อนแรงก่อนเข้าข่าวหลัก'
  }
};

export async function fetchSocialAnalysis(symbol, days = 7) {
  const ticker = normalizeTicker(symbol);
  const query = companyQuery(ticker);
  const [stocktwits, reddit, webSocial] = await Promise.all([
    safeFetch(() => fetchStocktwitsMentions(ticker)),
    safeFetch(() => fetchRedditMentions(ticker, query, days)),
    safeFetch(() => fetchIndexedSocialMentions(ticker, query, days))
  ]);

  const mentions = [
    ...stocktwits.map(m => ({ ...m, platform: 'stocktwits' })),
    ...reddit.map(m => ({ ...m, platform: 'reddit' })),
    ...webSocial
  ].map(enrichMention);

  const grouped = groupMentions(mentions);
  const platforms = [
    buildPlatformAnalysis('facebook', grouped.facebook || [], ticker, query),
    buildPlatformAnalysis('x', grouped.x || [], ticker, query),
    buildPlatformAnalysis('reddit', grouped.reddit || [], ticker, query),
    buildPlatformAnalysis('stocktwits', grouped.stocktwits || [], ticker, query),
    buildPlatformAnalysis('other', grouped.other || [], ticker, query)
  ];

  const summary = buildSocialSummary(platforms, ticker, query);
  return {
    symbol: ticker,
    query,
    generatedAt: new Date().toISOString(),
    summary,
    platforms,
    mentions: mentions.slice(0, 60),
    links: socialLinks(ticker, query),
    notes: [
      'Facebook และ X มักต้องใช้ API/สิทธิ์บัญชีเพื่ออ่านข้อความจริงแบบครบถ้วน',
      'ระบบนี้ใช้ public source ที่เปิดได้ เช่น Reddit, Stocktwits, Google News RSS/เว็บที่ index แล้ว และให้ลิงก์ตรวจสอบต่อ',
      'คะแนน Social เป็นเครื่องมือช่วยอ่านกระแส ไม่ใช่สัญญาณซื้อขายเดี่ยว ๆ ต้องเทียบกับราคา ข่าว และ volume เสมอ'
    ]
  };
}

async function safeFetch(fn) {
  try {
    const result = await fn();
    return Array.isArray(result) ? result : [];
  } catch (_) {
    return [];
  }
}

async function fetchStocktwitsMentions(ticker) {
  const url = `https://api.stocktwits.com/api/2/streams/symbol/${encodeURIComponent(ticker)}.json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'stock-ai-dashboard/1.3' } });
  if (!res.ok) throw new Error(`Stocktwits HTTP ${res.status}`);
  const data = await res.json();
  return (data.messages || []).slice(0, 30).map(message => ({
    id: `stocktwits-${message.id}`,
    platform: 'stocktwits',
    author: message.user?.username || 'Stocktwits user',
    text: stripHtml(message.body || ''),
    url: `https://stocktwits.com/${message.user?.username || 'symbol'}/message/${message.id}`,
    publishedAt: message.created_at || null,
    rawSentiment: message.entities?.sentiment?.basic || null,
    source: 'Stocktwits'
  }));
}

async function fetchRedditMentions(ticker, query, days = 7) {
  const q = `(${ticker} OR "${query}") stock OR shares`;
  const url = new URL('https://www.reddit.com/search.json');
  url.searchParams.set('q', q);
  url.searchParams.set('sort', 'new');
  url.searchParams.set('t', days <= 1 ? 'day' : days <= 7 ? 'week' : 'month');
  url.searchParams.set('limit', '25');

  const res = await fetch(url, { headers: { 'User-Agent': 'stock-ai-dashboard/1.3 by zole3500-ANA' } });
  if (!res.ok) throw new Error(`Reddit HTTP ${res.status}`);
  const data = await res.json();
  const cutoff = daysAgo(Math.max(1, days));
  return (data.data?.children || [])
    .map(child => child.data || {})
    .filter(post => post.title)
    .map(post => ({
      id: `reddit-${post.id}`,
      platform: 'reddit',
      author: post.author || 'Reddit user',
      text: `${post.title || ''}${post.selftext ? ` — ${post.selftext.slice(0, 220)}` : ''}`,
      url: post.permalink ? `https://www.reddit.com${post.permalink}` : `https://www.reddit.com/search/?q=${encodeURIComponent(ticker)}`,
      publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
      scoreHint: Number(post.score || 0),
      commentHint: Number(post.num_comments || 0),
      source: `r/${post.subreddit || 'stocks'}`
    }))
    .filter(m => !m.publishedAt || new Date(m.publishedAt) >= cutoff)
    .slice(0, 20);
}

async function fetchIndexedSocialMentions(ticker, query, days = 7) {
  const q = `${query} ${ticker} (Reddit OR Stocktwits OR Twitter OR X OR Facebook OR YouTube OR forum) stock when:${Math.max(1, Math.min(days, 30))}d`;
  const articles = await fetchGoogleNewsRss(ticker, q, days);
  return (articles || []).slice(0, 18).map(a => ({
    id: `indexed-${hash(`${a.title}|${a.url}`)}`,
    platform: inferPlatform(`${a.source} ${a.url} ${a.title}`),
    author: a.source || 'Indexed web',
    text: `${a.title || ''}${a.snippet ? ` — ${a.snippet}` : ''}`,
    url: a.url,
    publishedAt: a.publishedAt || null,
    source: a.source || 'Google News RSS'
  }));
}

function inferPlatform(text) {
  const lower = String(text || '').toLowerCase();
  if (/reddit|redd\.it/.test(lower)) return 'reddit';
  if (/stocktwits/.test(lower)) return 'stocktwits';
  if (/twitter|x\.com/.test(lower)) return 'x';
  if (/facebook|fb\.com/.test(lower)) return 'facebook';
  return 'other';
}

function enrichMention(mention) {
  const text = stripHtml(mention.text || '');
  const score = socialTextScore(text, mention.rawSentiment);
  const heat = mentionHeat(text, mention);
  const textTh = translateSocialText(text);
  return {
    ...mention,
    text,
    textTh,
    sentimentScore: score,
    sentimentLabelTh: score > 0.18 ? 'เชิงบวก' : score < -0.18 ? 'เชิงลบ' : 'กลาง/รอดู',
    heatScore: heat,
    hypeRisk: hypeRisk(text, heat),
    keyReasonTh: socialReason(text, score, heat)
  };
}

function socialTextScore(text, rawSentiment) {
  const lower = String(text || '').toLowerCase();
  let score = scoreNewsText(lower) * 0.55;
  for (const keyword of SOCIAL_POSITIVE) if (lower.includes(keyword)) score += 0.18;
  for (const keyword of SOCIAL_NEGATIVE) if (lower.includes(keyword)) score -= 0.22;
  if (String(rawSentiment || '').toLowerCase().includes('bullish')) score += 0.28;
  if (String(rawSentiment || '').toLowerCase().includes('bearish')) score -= 0.28;
  return round(clamp(score, -1, 1), 3);
}

function mentionHeat(text, mention = {}) {
  const t = String(text || '');
  let heat = 10;
  if (/[🚀🌕💎🔥]/.test(t)) heat += 18;
  if ((t.match(/!/g) || []).length >= 2) heat += 8;
  if (/[A-Z]{5,}/.test(t.replace(/\$?[A-Z]{1,5}\b/g, ''))) heat += 6;
  if (mention.scoreHint) heat += Math.min(18, Math.log10(Math.max(1, mention.scoreHint)) * 8);
  if (mention.commentHint) heat += Math.min(18, Math.log10(Math.max(1, mention.commentHint)) * 7);
  for (const word of HYPE_WORDS) if (t.toLowerCase().includes(word)) heat += 8;
  return Math.round(clamp(heat, 0, 100));
}

function hypeRisk(text, heat) {
  const lower = String(text || '').toLowerCase();
  let risk = heat * 0.35;
  for (const word of HYPE_WORDS) if (lower.includes(word)) risk += 8;
  if (/pump|dump|fake|scam|all in|yolo/.test(lower)) risk += 18;
  return Math.round(clamp(risk, 0, 100));
}

function groupMentions(mentions) {
  return mentions.reduce((acc, m) => {
    const key = PLATFORM_META[m.platform] ? m.platform : 'other';
    acc[key] ||= [];
    acc[key].push(m);
    return acc;
  }, {});
}

function buildPlatformAnalysis(id, mentions, ticker, query) {
  const meta = PLATFORM_META[id];
  const count = mentions.length;
  const sentiment = weightedAverage(mentions, 'sentimentScore', 'heatScore');
  const heat = count ? Math.round(clamp(mentions.reduce((a, m) => a + (m.heatScore || 0), 0) / count + Math.min(30, count * 2), 0, 100)) : 0;
  const hype = count ? Math.round(clamp(mentions.reduce((a, m) => a + (m.hypeRisk || 0), 0) / count, 0, 100)) : 0;
  const status = count ? statusFromScore(sentiment) : 'ข้อมูลจำกัด';
  const confidence = id === 'facebook' || id === 'x'
    ? Math.max(18, Math.min(45, count * 8 + 18))
    : Math.max(30, Math.min(82, count * 6 + 30));

  const sampleMentions = mentions
    .sort((a, b) => (b.heatScore + Math.abs(b.sentimentScore) * 20) - (a.heatScore + Math.abs(a.sentimentScore) * 20))
    .slice(0, 5);

  return {
    ...meta,
    status,
    sentimentScore: round(sentiment, 3),
    heatScore: heat,
    hypeRisk: hype,
    confidence,
    mentionCount: count,
    sampleMentions,
    analysisTh: platformAnalysisText(id, { count, sentiment, heat, hype, ticker, query }),
    links: socialLinks(ticker, query)[id]
  };
}

function buildSocialSummary(platforms, ticker, query) {
  const active = platforms.filter(p => p.mentionCount > 0);
  const sentiment = active.length ? weightedAverage(active, 'sentimentScore', 'mentionCount') : 0;
  const heat = active.length ? Math.round(active.reduce((a, p) => a + p.heatScore, 0) / active.length) : 0;
  const hype = active.length ? Math.round(active.reduce((a, p) => a + p.hypeRisk, 0) / active.length) : 0;
  const confidence = Math.round(clamp(active.reduce((a, p) => a + p.confidence, 0) / Math.max(1, platforms.length), 18, 78));
  const dominantTone = statusFromScore(sentiment);
  const buzzLevel = heat > 70 ? 'ร้อนแรงมาก' : heat > 48 ? 'เริ่มร้อนแรง' : heat > 25 ? 'มีคนพูดถึงปานกลาง' : 'กระแสยังเบา';
  const manipulationRisk = hype > 68 ? 'เสี่ยงปั่นกระแสสูง' : hype > 42 ? 'มีความเสี่ยงปั่นกระแส ต้องระวัง' : 'ยังไม่เห็นสัญญาณปั่นเด่นชัด';

  return {
    sentimentScore: round(sentiment, 3),
    heatScore: heat,
    hypeRisk: hype,
    confidence,
    dominantTone,
    buzzLevel,
    manipulationRisk,
    thaiSummary: `${ticker}/${query}: กระแส social media โดยรวมเป็น “${dominantTone}” ระดับความร้อนแรง “${buzzLevel}” และความเสี่ยงกระแสปั่นคือ “${manipulationRisk}”`,
    risks: socialRisks(platforms),
    opportunities: socialOpportunities(platforms)
  };
}

function socialRisks(platforms) {
  const risks = [];
  if (platforms.some(p => p.hypeRisk > 60)) risks.push('พบคำพูดแนว hype/pump เช่น moon, squeeze, all in หรือ rocket ควรระวังการไล่ราคา');
  if (platforms.some(p => p.sentimentScore < -0.25)) risks.push('บางแพลตฟอร์มมี sentiment ลบชัด อาจกดดันราคาเมื่อเปิดตลาด');
  if (platforms.some(p => ['facebook', 'x'].includes(p.id) && p.confidence < 35)) risks.push('Facebook/X ยังดึงข้อมูลตรงได้จำกัด จึงต้องกดลิงก์ตรวจสอบโพสต์จริงก่อนตัดสินใจ');
  if (!risks.length) risks.push('ยังไม่พบความเสี่ยง social ที่เด่นชัด แต่ควรเทียบกับข่าวและ volume');
  return risks;
}

function socialOpportunities(platforms) {
  const out = [];
  if (platforms.some(p => p.id === 'stocktwits' && p.sentimentScore > 0.25 && p.heatScore > 45)) out.push('Stocktwits เริ่มมีแรงเชียร์พร้อมความร้อนแรง อาจช่วย momentum ระยะสั้น');
  if (platforms.some(p => p.id === 'reddit' && p.mentionCount >= 3 && p.heatScore > 45)) out.push('Reddit เริ่มมีการพูดถึงมากขึ้น อาจเป็น early signal ของความสนใจรายย่อย');
  if (platforms.some(p => p.sentimentScore > 0.25)) out.push('มี social sentiment เชิงบวกบางส่วน ควรดูว่าราคาและ volume ยืนยันหรือไม่');
  if (!out.length) out.push('ยังไม่มี social catalyst ชัดเจน จึงควรรอข่าวหรือ volume ยืนยัน');
  return out;
}

function platformAnalysisText(id, { count, sentiment, heat, hype, ticker }) {
  if (!count) {
    if (id === 'facebook') return `ยังไม่พบโพสต์ Facebook สาธารณะที่ดึงได้โดยตรงสำหรับ ${ticker}; ควรตรวจกลุ่มหุ้น/เพจข่าวผ่านลิงก์ค้นหา เพราะ Facebook มักปิดกั้นข้อมูลนอก API`;
    if (id === 'x') return `ยังไม่พบโพสต์ X ที่ดึงได้โดยตรงสำหรับ ${ticker}; ควรตรวจ hashtag/ค้นหา cashtag $${ticker} เพราะ X เป็นแหล่งกระแสเร็วแต่ต้องใช้ API จึงจะอ่านครบ`;
    return `ยังไม่พบการพูดคุยที่เปิดให้ดึงได้ชัดเจนสำหรับ ${ticker} ในแพลตฟอร์มนี้`;
  }
  const tone = statusFromScore(sentiment);
  const heatText = heat > 70 ? 'ร้อนแรงมาก' : heat > 48 ? 'เริ่มร้อนแรง' : 'ปานกลาง/เบา';
  const hypeText = hype > 60 ? 'มีความเสี่ยงปั่นกระแสสูง' : hype > 40 ? 'ต้องระวังคำพูดเชิง hype' : 'ยังไม่พบ hype เด่นชัด';
  return `พบ ${count} รายการที่เกี่ยวข้อง สรุปอารมณ์เป็น “${tone}” ความร้อนแรง “${heatText}” และ ${hypeText}`;
}

function statusFromScore(score) {
  if (score > 0.22) return 'เชิงบวก';
  if (score < -0.22) return 'เชิงลบ';
  return 'กลาง/รอดู';
}

function weightedAverage(items, valueKey, weightKey) {
  if (!items.length) return 0;
  let total = 0;
  let weight = 0;
  for (const item of items) {
    const w = Math.max(1, Number(item[weightKey] || 1));
    total += Number(item[valueKey] || 0) * w;
    weight += w;
  }
  return weight ? clamp(total / weight, -1, 1) : 0;
}

function socialLinks(ticker, query) {
  const cashtag = `%24${encodeURIComponent(ticker)}`;
  return {
    facebook: [
      { label: 'ค้นหา Facebook', url: `https://www.facebook.com/search/posts/?q=${encodeURIComponent(`${ticker} stock ${query}`)}` },
      { label: 'ค้นหา Google เฉพาะ Facebook', url: `https://www.google.com/search?q=${encodeURIComponent(`site:facebook.com ${ticker} stock`)}` }
    ],
    x: [
      { label: 'ค้นหา X ด้วย Cashtag', url: `https://x.com/search?q=${cashtag}&src=typed_query&f=live` },
      { label: 'ค้นหา X ข่าวหุ้น', url: `https://x.com/search?q=${encodeURIComponent(`${ticker} stock`)}&src=typed_query&f=live` }
    ],
    reddit: [
      { label: 'Reddit Search', url: `https://www.reddit.com/search/?q=${encodeURIComponent(`${ticker} stock`)}` },
      { label: 'r/pennystocks', url: `https://www.reddit.com/r/pennystocks/search/?q=${encodeURIComponent(ticker)}&restrict_sr=1` }
    ],
    stocktwits: [
      { label: 'Stocktwits Symbol', url: `https://stocktwits.com/symbol/${ticker}` }
    ],
    other: [
      { label: 'YouTube Search', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${ticker} stock analysis`)}` },
      { label: 'Google Trends', url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(ticker)}` },
      { label: 'Google รวมเว็บบอร์ด', url: `https://www.google.com/search?q=${encodeURIComponent(`${ticker} stock forum message board`)}` }
    ]
  };
}

function socialReason(text, score, heat) {
  const lower = String(text || '').toLowerCase();
  const reasons = [];
  if (/squeeze|short squeeze|short/.test(lower)) reasons.push('มีการพูดถึง short/squeeze ซึ่งอาจทำให้ราคาผันผวนแรง');
  if (/moon|rocket|10x|100x|all in|yolo|pump/.test(lower)) reasons.push('มีคำเชิง hype สูง ต้องระวังการปั่นกระแส');
  if (/offering|dilution|reverse split|delisting|lawsuit/.test(lower)) reasons.push('มีประเด็นลบด้านโครงสร้างทุน/กฎหมาย/ตลาด');
  if (/contract|award|partnership|earnings|upgrade|breakout/.test(lower)) reasons.push('มีประเด็นบวกที่อาจหนุน momentum');
  if (heat > 60) reasons.push('ข้อความมีความร้อนแรงหรือ engagement สูง');
  if (!reasons.length) reasons.push(score > 0.18 ? 'น้ำเสียงค่อนข้างบวก' : score < -0.18 ? 'น้ำเสียงค่อนข้างลบ' : 'น้ำเสียงกลาง ต้องดูบริบทเพิ่มเติม');
  return reasons.join(' / ');
}

function translateSocialText(text) {
  const translated = translateFinancialText(text || '');
  return translated
    .replace(/moon/gi, 'ขึ้นแรงแบบ moon')
    .replace(/rocket/gi, 'จรวด/พุ่งแรง')
    .replace(/squeeze/gi, 'แรงบีบชอร์ต')
    .replace(/yolo/gi, 'ลงเต็มพอร์ตแบบเสี่ยงสูง')
    .replace(/fomo/gi, 'กลัวตกรถ')
    .replace(/bagholder/gi, 'คนติดดอย')
    .replace(/pump and dump/gi, 'ปั่นขึ้นแล้วเทขาย');
}

function stripHtml(text) {
  return String(text || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function hash(value) {
  let h = 0;
  const s = String(value || '');
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function round(value, digits = 3) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(digits));
}
