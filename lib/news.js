import { clamp, daysAgo, normalizeTicker } from './utils.js';

const POSITIVE_KEYWORDS = [
  'contract', 'award', 'partnership', 'beats', 'beat', 'profit', 'profitable',
  'approval', 'upgrade', 'raises guidance', 'raised guidance', 'buyback',
  'strategic', 'acquisition', 'wins', 'record revenue', 'defense contract',
  'government contract', 'new order', 'customer win', 'expansion', 'launch'
];

const NEGATIVE_KEYWORDS = [
  'offering', 'dilution', 'dilutive', 'reverse split', 'delisting', 'lawsuit',
  'investigation', 'misses', 'miss', 'loss widens', 'bankruptcy', 'going concern',
  'downgrade', 'sec filing', 'atm offering', 'registered direct', 'public offering',
  'debt', 'default', 'layoff', 'fraud', 'compliance notice'
];

const HIGH_IMPACT_KEYWORDS = [
  'earnings', 'revenue', 'guidance', 'contract', 'offering', 'dilution', 'reverse split',
  'delisting', 'sec', 'lawsuit', 'merger', 'acquisition', 'short interest', 'analyst',
  'defense', 'government', 'nasdaq', 'nyse', 'amex'
];

const COMPANY_ALIASES = {
  BURU: 'Nuburu Inc',
  IREN: 'IREN Limited',
  NVDA: 'NVIDIA',
  AAPL: 'Apple Inc',
  TSLA: 'Tesla',
  AMD: 'Advanced Micro Devices',
  MSFT: 'Microsoft'
};

export async function fetchNews(symbol, days = 7) {
  const ticker = normalizeTicker(symbol);
  const query = companyQuery(ticker);
  const attempts = [
    () => fetchGdeltNews(ticker, query, days),
    () => fetchGoogleNewsRss(ticker, query, days)
  ];

  for (const attempt of attempts) {
    try {
      const articles = await attempt();
      const cleaned = rankAndCleanNews(articles, ticker, days);
      if (cleaned.length) {
        return {
          symbol: ticker,
          source: cleaned[0].origin,
          query,
          articles: cleaned,
          fallback: false
        };
      }
    } catch (_) {
      // Continue to next source.
    }
  }

  return {
    symbol: ticker,
    source: 'fallback',
    query,
    articles: fallbackNews(ticker, query),
    fallback: true
  };
}

export function companyQuery(ticker) {
  return COMPANY_ALIASES[normalizeTicker(ticker)] || normalizeTicker(ticker);
}

export async function fetchGdeltNews(ticker, query, days = 7) {
  const q = `("${query}" OR "${ticker}") (stock OR shares OR nasdaq OR nyse OR amex OR earnings OR contract OR offering OR sec)`;
  const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
  url.searchParams.set('query', q);
  url.searchParams.set('mode', 'ArtList');
  url.searchParams.set('format', 'json');
  url.searchParams.set('maxrecords', '40');
  url.searchParams.set('timespan', `${Math.max(1, Math.min(days, 30))}d`);
  url.searchParams.set('sort', 'HybridRel');

  const res = await fetch(url, { headers: { 'User-Agent': 'stock-ai-dashboard/1.0' } });
  if (!res.ok) throw new Error(`GDELT HTTP ${res.status}`);
  const data = await res.json();
  return (data.articles || []).map(a => ({
    title: a.title,
    url: a.url,
    source: a.domain || a.sourceCountry || 'GDELT',
    publishedAt: parseGdeltDate(a.seendate),
    snippet: a.domain ? `Source domain: ${a.domain}` : '',
    origin: 'gdelt'
  }));
}

export async function fetchGoogleNewsRss(ticker, query, days = 7) {
  const q = `${query} ${ticker} stock when:${Math.max(1, Math.min(days, 30))}d`;
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(rssUrl, { headers: { 'User-Agent': 'stock-ai-dashboard/1.0' } });
  if (!res.ok) throw new Error(`Google News RSS HTTP ${res.status}`);
  const xml = await res.text();
  return parseGoogleNewsRss(xml).map(a => ({ ...a, origin: 'google-news-rss' }));
}

export function parseGoogleNewsRss(xml) {
  const items = String(xml || '').match(/<item>[\s\S]*?<\/item>/g) || [];
  return items.map(item => ({
    title: decodeXml(matchTag(item, 'title')),
    url: decodeXml(matchTag(item, 'link')),
    source: decodeXml(matchTag(item, 'source')) || 'Google News',
    publishedAt: matchTag(item, 'pubDate') || null,
    snippet: stripHtml(decodeXml(matchTag(item, 'description')))
  })).filter(a => a.title && a.url);
}

export function scoreNewsText(text) {
  const lower = String(text || '').toLowerCase();
  let score = 0;
  for (const keyword of POSITIVE_KEYWORDS) if (lower.includes(keyword)) score += 0.26;
  for (const keyword of NEGATIVE_KEYWORDS) if (lower.includes(keyword)) score -= 0.34;
  return clamp(score, -1, 1);
}

export function articleImpact(article, days = 7) {
  const combined = `${article.title || ''} ${article.snippet || ''}`.toLowerCase();
  let impact = 0;
  for (const keyword of HIGH_IMPACT_KEYWORDS) if (combined.includes(keyword)) impact += 1;

  const publishedAt = article.publishedAt ? new Date(article.publishedAt) : null;
  const ageHours = publishedAt && !Number.isNaN(publishedAt.getTime())
    ? Math.max(0, (Date.now() - publishedAt.getTime()) / 36e5)
    : days * 24;
  const recency = clamp(1 - ageHours / (days * 24), 0, 1);
  const polarity = Math.abs(scoreNewsText(combined));
  return Math.round(clamp(impact * 17 + recency * 30 + polarity * 38, 0, 100));
}

export function rankAndCleanNews(articles, ticker, days = 7) {
  const cutoff = daysAgo(Math.max(1, days));
  const seen = new Set();
  return (articles || [])
    .filter(a => a && a.title && a.url)
    .map(a => ({
      ...a,
      title: cleanTitle(a.title),
      publishedAt: a.publishedAt || null,
      sentimentScore: scoreNewsText(`${a.title} ${a.snippet}`),
      impactScore: articleImpact(a, days)
    }))
    .filter(a => {
      const key = `${a.title}|${a.source}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      if (!a.publishedAt) return true;
      const d = new Date(a.publishedAt);
      return Number.isNaN(d.getTime()) || d >= cutoff;
    })
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 12)
    .map(a => ({
      title: a.title,
      url: a.url,
      source: a.source || 'Unknown',
      publishedAt: a.publishedAt,
      snippet: a.snippet || '',
      sentimentScore: a.sentimentScore,
      impactScore: a.impactScore,
      label: a.sentimentScore > 0.15 ? 'positive' : a.sentimentScore < -0.15 ? 'negative' : 'neutral',
      origin: a.origin || 'news'
    }));
}

export function aggregateNewsSentiment(articles) {
  if (!articles?.length) return 0;
  let weighted = 0;
  let total = 0;
  for (const a of articles) {
    const w = Math.max(10, a.impactScore || 20);
    weighted += (a.sentimentScore || 0) * w;
    total += w;
  }
  return total ? clamp(weighted / total, -1, 1) : 0;
}

function fallbackNews(ticker, query) {
  return rankAndCleanNews([
    {
      title: `${ticker}: เปิดลิงก์ค้นข่าวจริงจาก Google News / Yahoo Finance / SEC เพื่อยืนยัน catalyst ล่าสุด`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`${ticker} stock news last 7 days`)}`,
      source: 'Fallback guidance',
      publishedAt: new Date().toISOString(),
      snippet: `ระบบ backend โหลดข่าวสดไม่ได้ชั่วคราว จึงแสดงลิงก์สำรองสำหรับ ${query}`,
      origin: 'fallback'
    },
    {
      title: `${query}: จับตาข่าว offering, dilution, earnings, SEC filing, contract และ analyst action`,
      url: `https://finance.yahoo.com/quote/${ticker}/news`,
      source: 'Fallback guidance',
      publishedAt: new Date().toISOString(),
      snippet: 'ข่าวกลุ่มนี้มีผลต่อราคาในวันถัดไปมากกว่าข่าวประชาสัมพันธ์ทั่วไป โดยเฉพาะหุ้นขนาดเล็กและหุ้นที่มี short interest สูง',
      origin: 'fallback'
    }
  ], ticker, 7);
}

function parseGdeltDate(value) {
  if (!value) return null;
  const s = String(value);
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?/);
  if (!m) return value;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4] || '00'}:${m[5] || '00'}:${m[6] || '00'}Z`;
}

function matchTag(xml, tag) {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = String(xml || '').match(regex);
  return match ? match[1] : '';
}

function decodeXml(text) {
  return String(text || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function stripHtml(text) {
  return String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanTitle(title) {
  return String(title || '').replace(/\s+-\s+Google News$/i, '').trim();
}
