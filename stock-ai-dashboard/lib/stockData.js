import { daysAgo, normalizeTicker, seededRandom, stableSeedFromText, toIsoDate } from './utils.js';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 stock-ai-dashboard/1.0',
  'Accept': 'text/csv,application/json,text/plain,*/*'
};

export async function fetchPriceHistory(symbol, days = 90) {
  const ticker = normalizeTicker(symbol);
  const lookbackDays = Math.max(30, Math.min(Number(days) || 90, 365));

  const sources = [
    () => fetchFromStooq(ticker),
    () => fetchFromYahooChart(ticker, lookbackDays)
  ];

  for (const source of sources) {
    try {
      const result = await source();
      if (result.history.length >= 20) {
        return {
          symbol: ticker,
          source: result.source,
          history: result.history.slice(-lookbackDays)
        };
      }
    } catch (_) {
      // Try next provider.
    }
  }

  return {
    symbol: ticker,
    source: 'sample-fallback',
    history: generateSampleHistory(ticker, lookbackDays)
  };
}

export async function fetchFromStooq(ticker) {
  const stooqSymbol = `${ticker.toLowerCase()}.us`;
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSymbol)}&i=d`;
  const res = await fetch(url, { headers: DEFAULT_HEADERS });
  if (!res.ok) throw new Error(`Stooq HTTP ${res.status}`);
  const csv = await res.text();
  const history = parseCsvHistory(csv);
  if (history.length < 20) throw new Error('Stooq returned insufficient data');
  return { source: 'stooq', history };
}

export async function fetchFromYahooChart(ticker, days = 90) {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = Math.floor(daysAgo(days + 8).getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${period1}&period2=${period2}&interval=1d&includePrePost=false&events=history`;
  const res = await fetch(url, { headers: { ...DEFAULT_HEADERS, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const timestamps = result?.timestamp || [];
  if (!quote || timestamps.length < 20) throw new Error('Yahoo returned insufficient data');

  const history = timestamps.map((ts, i) => ({
    date: toIsoDate(ts * 1000),
    open: Number(quote.open?.[i]),
    high: Number(quote.high?.[i]),
    low: Number(quote.low?.[i]),
    close: Number(quote.close?.[i]),
    volume: Number(quote.volume?.[i]) || 0
  })).filter(d => Number.isFinite(d.close) && Number.isFinite(d.high) && Number.isFinite(d.low));

  if (history.length < 20) throw new Error('Yahoo parsed insufficient data');
  return { source: 'yahoo-chart', history };
}

export function parseCsvHistory(csv) {
  const lines = String(csv || '').trim().split(/\r?\n/);
  if (lines.length < 2 || !/^date,/i.test(lines[0])) return [];
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const [date, open, high, low, close, volume] = lines[i].split(',');
    const parsed = {
      date,
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: Number(volume) || 0
    };
    if (Number.isFinite(parsed.close) && Number.isFinite(parsed.high) && Number.isFinite(parsed.low)) out.push(parsed);
  }
  return out;
}

export function generateSampleHistory(ticker, days = 90) {
  const seed = stableSeedFromText(ticker);
  const rand = seededRandom(seed);
  const profile = sampleProfileForTicker(ticker);
  let price = profile.last / (1 + profile.drift * days * 0.22);
  const history = [];

  for (let i = 0; i < days; i++) {
    const noise = (rand() - 0.5) * profile.volatility * 1.25;
    const shock = rand() > 0.95 ? (rand() - 0.5) * profile.volatility * 2.4 : 0;
    price = Math.max(0.08, price * (1 + profile.drift + noise + shock));
    const range = Math.max(0.004, profile.volatility * (0.45 + rand() * 0.8));
    const open = price * (1 + (rand() - 0.5) * range);
    const high = Math.max(open, price) * (1 + rand() * range);
    const low = Math.min(open, price) * (1 - rand() * range);
    const volume = Math.round(profile.baseVolume * (0.55 + rand() * 1.2));
    history.push({
      date: toIsoDate(Date.now() - (days - i) * 24 * 60 * 60 * 1000),
      open,
      high,
      low,
      close: price,
      volume
    });
  }

  history[history.length - 1].close = profile.last;
  history[history.length - 1].high = Math.max(history.at(-1).high, profile.last);
  history[history.length - 1].low = Math.min(history.at(-1).low, profile.last);
  return history;
}

function sampleProfileForTicker(ticker) {
  const t = normalizeTicker(ticker);
  const known = {
    BURU: { last: 1.42, volatility: 0.065, drift: -0.0018, baseVolume: 1_900_000 },
    IREN: { last: 11.8, volatility: 0.055, drift: 0.0012, baseVolume: 8_200_000 },
    NVDA: { last: 132, volatility: 0.032, drift: 0.001, baseVolume: 170_000_000 },
    AAPL: { last: 202, volatility: 0.024, drift: 0.0002, baseVolume: 62_000_000 }
  };
  if (known[t]) return known[t];

  const seed = stableSeedFromText(t);
  return {
    last: 5 + (seed % 220),
    volatility: 0.02 + (seed % 60) / 1000,
    drift: ((seed % 17) - 8) / 10000,
    baseVolume: 400_000 + (seed % 50) * 120_000
  };
}
