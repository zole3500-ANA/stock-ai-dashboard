import { clamp, round, safeNumber } from './utils.js';

export function sma(values, period) {
  const clean = values.map(Number).filter(Number.isFinite);
  if (clean.length < period || period <= 0) return null;
  const slice = clean.slice(-period);
  return slice.reduce((sum, v) => sum + v, 0) / period;
}

export function ema(values, period) {
  const clean = values.map(Number).filter(Number.isFinite);
  if (clean.length < period || period <= 0) return null;
  const k = 2 / (period + 1);
  let prev = clean.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
  for (let i = period; i < clean.length; i++) prev = clean[i] * k + prev * (1 - k);
  return prev;
}

export function rsi(closes, period = 14) {
  const c = closes.map(Number).filter(Number.isFinite);
  if (c.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = c.length - period; i < c.length; i++) {
    const diff = c[i] - c[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0 && gains === 0) return 50;
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

export function atr(history, period = 14) {
  if (!Array.isArray(history) || history.length <= period) return null;
  const trs = [];
  for (let i = history.length - period; i < history.length; i++) {
    const current = history[i];
    const prev = history[i - 1];
    const high = safeNumber(current.high);
    const low = safeNumber(current.low);
    const prevClose = safeNumber(prev.close);
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  return trs.reduce((sum, v) => sum + v, 0) / trs.length;
}

export function macd(closes, fast = 12, slow = 26, signal = 9) {
  const c = closes.map(Number).filter(Number.isFinite);
  if (c.length < slow + signal) return { macd: 0, signal: 0, histogram: 0 };

  const emaSeries = (values, period) => {
    const k = 2 / (period + 1);
    const out = [];
    let prev = values.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
    for (let i = period; i < values.length; i++) {
      prev = values[i] * k + prev * (1 - k);
      out.push(prev);
    }
    return out;
  };

  const fastSeries = emaSeries(c, fast);
  const slowSeries = emaSeries(c, slow);
  const offset = fastSeries.length - slowSeries.length;
  const macdSeries = slowSeries.map((slowValue, i) => fastSeries[i + offset] - slowValue);
  const signalValue = ema(macdSeries, signal) || 0;
  const macdValue = macdSeries.at(-1) || 0;
  return { macd: macdValue, signal: signalValue, histogram: macdValue - signalValue };
}

export function estimateVwap(history, period = 20) {
  if (!Array.isArray(history) || history.length === 0) return null;
  const slice = history.slice(-period);
  let pv = 0;
  let volume = 0;
  for (const d of slice) {
    const v = Math.max(1, safeNumber(d.volume, 1));
    const typical = (safeNumber(d.high) + safeNumber(d.low) + safeNumber(d.close)) / 3;
    pv += typical * v;
    volume += v;
  }
  return volume ? pv / volume : null;
}

export function volumeRatio(history, period = 20) {
  if (!Array.isArray(history) || history.length < period + 1) return 1;
  const lastVolume = safeNumber(history.at(-1).volume);
  const avgVolume = history
    .slice(-(period + 1), -1)
    .reduce((sum, d) => sum + safeNumber(d.volume), 0) / period;
  return avgVolume > 0 ? lastVolume / avgVolume : 1;
}

export function priceChangePercent(history, lookback = 1) {
  if (!Array.isArray(history) || history.length <= lookback) return 0;
  const last = safeNumber(history.at(-1).close);
  const prev = safeNumber(history.at(-(lookback + 1)).close);
  return prev > 0 ? (last - prev) / prev : 0;
}

export function technicalSnapshot(history) {
  const closes = history.map(d => safeNumber(d.close)).filter(Number.isFinite);
  const last = closes.at(-1) || 0;
  const ma5 = sma(closes, 5) || last;
  const ma20 = sma(closes, 20) || last;
  const ma50 = sma(closes, 50) || ma20;
  const rsi14 = rsi(closes, 14);
  const atr14 = atr(history, 14) || last * 0.035;
  const atrPct = last > 0 ? atr14 / last : 0.035;
  const vwap20 = estimateVwap(history, 20) || ma20;
  const volRatio = volumeRatio(history, 20);
  const dayChange = priceChangePercent(history, 1);
  const weekChange = priceChangePercent(history, 5);
  const macdValue = macd(closes);

  const trendRaw =
    (last > ma5 ? 0.18 : -0.18) +
    (last > ma20 ? 0.25 : -0.25) +
    (last > ma50 ? 0.15 : -0.15) +
    (last > vwap20 ? 0.22 : -0.22) +
    (ma5 > ma20 ? 0.16 : -0.16) +
    (macdValue.histogram > 0 ? 0.12 : -0.12);

  return {
    last: round(last, 4),
    ma5: round(ma5, 4),
    ma20: round(ma20, 4),
    ma50: round(ma50, 4),
    vwap20: round(vwap20, 4),
    rsi14: round(rsi14, 2),
    atr14: round(atr14, 4),
    atrPct: round(atrPct, 4),
    volRatio: round(volRatio, 3),
    dayChange: round(dayChange, 4),
    weekChange: round(weekChange, 4),
    macd: {
      macd: round(macdValue.macd, 4),
      signal: round(macdValue.signal, 4),
      histogram: round(macdValue.histogram, 4)
    },
    trendScore: round(clamp(trendRaw, -1, 1), 3)
  };
}
