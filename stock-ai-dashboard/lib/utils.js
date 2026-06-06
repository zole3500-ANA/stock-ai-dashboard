export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function round(value, decimals = 2) {
  const p = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * p) / p;
}

export function pct(value, decimals = 2) {
  if (!Number.isFinite(value)) return null;
  return round(value * 100, decimals);
}

export function normalizeTicker(input) {
  return String(input || 'BURU')
    .trim()
    .replace(/[^A-Za-z0-9.\-]/g, '')
    .toUpperCase()
    .slice(0, 16) || 'BURU';
}

export function marketSymbol(market, ticker) {
  const m = String(market || 'AMEX').trim().toUpperCase();
  const t = normalizeTicker(ticker);
  return `${m}:${t}`;
}

export function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function toIsoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function stableSeedFromText(text) {
  let seed = 0;
  for (const ch of String(text || '')) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return seed || 12345;
}

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

export function jsonResponse(res, status, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}
