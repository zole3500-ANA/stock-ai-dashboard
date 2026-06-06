import { interpretScore } from './score.js';
import { clamp, round, safeNumber } from './utils.js';
import { estimateVwap, volumeRatio } from './indicators.js';

export function buildSmartMoneyAnalysis(symbol, history = [], prediction = null) {
  const bars = normalizeBars(history);
  const tech = prediction?.technical || {};
  const levels = prediction?.levels || {};
  if (bars.length < 20) return fallbackSmartMoney(symbol, bars, tech);

  const last = safeNumber(bars.at(-1).close, safeNumber(tech.last, 0));
  const atr14 = safeNumber(tech.atr14, last * 0.035);
  const atrPct = last > 0 ? atr14 / last : 0.035;
  const vwap20 = estimateVwap(bars, 20) || safeNumber(tech.vwap20, last);
  const volRatio = volumeRatio(bars, 20);
  const obvData = obv(bars);
  const adData = accumulationDistribution(bars);
  const cmf20 = chaikinMoneyFlow(bars, 20);
  const mfi14 = moneyFlowIndex(bars, 14);
  const cvd = cvdProxy(bars);
  const upDown = upDownVolume(bars, 20);
  const unusual = unusualVolume(bars, 60);
  const candle = candleQuality(bars.at(-1));
  const absorption = absorptionSignal(bars, atr14);
  const volumeProfile = volumeProfileProxy(bars, last);
  const breakout = breakoutQuality(bars, levels, tech);
  const liquidity = liquidityRisk(bars, last);
  const gap = gapRisk(bars);

  const components = {
    obv: scoreObv(obvData),
    cmf: scoreCmf(cmf20),
    mfi: scoreMfi(mfi14),
    cvd: scoreCvd(cvd),
    vwap: scoreVwap(last, vwap20, atr14),
    volumeQuality: scoreVolumeQuality({ volRatio, upDown, candle, unusual }),
    accumulation: scoreAccumulation({ adData, absorption, upDown }),
    breakout: scoreBreakout(breakout),
    liquidity: scoreLiquidity(liquidity),
    gapRisk: scoreGap(gap)
  };

  const weights = {
    obv: 0.13,
    cmf: 0.13,
    mfi: 0.10,
    cvd: 0.12,
    vwap: 0.12,
    volumeQuality: 0.12,
    accumulation: 0.11,
    breakout: 0.08,
    liquidity: 0.05,
    gapRisk: 0.04
  };
  const score = Math.round(Object.entries(components).reduce((sum, [key, value]) => sum + value * weights[key], 0));
  const interpretation = interpretScore(score, 'smartMoney');
  const verdict = score >= 70 ? 'เงินใหญ่เริ่มหนุนชัด' : score >= 55 ? 'เริ่มมีร่องรอยสะสม' : score >= 40 ? 'ยังไม่ชัดเจน' : 'ยังไม่เห็นเงินใหญ่หนุน';

  const indicatorRows = [
    indicator('OBV', components.obv, obvData.label, `OBV 5 วัน ${obvData.slope5 >= 0 ? 'เพิ่มขึ้น' : 'ลดลง'} / 20 วัน ${obvData.slope20 >= 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ใช้ดูว่าปริมาณซื้อขายสะสมไปทางซื้อหรือขาย`),
    indicator('CMF20', components.cmf, cmfLabel(cmf20), `CMF20 = ${round(cmf20, 3)} ถ้าสูงกว่า 0 แปลว่าเงินไหลเข้า ถ้าต่ำกว่า 0 แปลว่าเงินไหลออก`),
    indicator('MFI14', components.mfi, mfiLabel(mfi14), `MFI14 = ${round(mfi14, 2)} เป็น RSI แบบถ่วงด้วยปริมาณซื้อขาย ใช้วัดแรงซื้อ/แรงขายจากเงิน`),
    indicator('CVD Proxy', components.cvd, cvd.label, `CVD proxy 20 วัน = ${round(cvd.value20, 0)} ใช้ทิศทาง close up/down คูณ volume แทนข้อมูล bid/ask จริง`),
    indicator('VWAP20', components.vwap, last >= vwap20 ? 'อยู่เหนือ VWAP' : 'อยู่ใต้ VWAP', `ราคาล่าสุด ${money(last)} เทียบ VWAP20 ${money(vwap20)} ผู้ซื้อเฉลี่ย ${last >= vwap20 ? 'เริ่มได้เปรียบ' : 'ยังเสียเปรียบ'}`),
    indicator('Up/Down Volume', components.volumeQuality, upDown.label, `อัตรา Up-volume ต่อ Down-volume = ${round(upDown.ratio, 2)}x ใน 20 วันล่าสุด`),
    indicator('Accumulation/Distribution', components.accumulation, adData.label, `A/D line ระยะสั้น ${adData.slope20 >= 0 ? 'ยกตัว' : 'อ่อนตัว'} ใช้ดูการสะสม/กระจายหุ้นจากตำแหน่งปิดในแท่ง`),
    indicator('Unusual Volume', components.volumeQuality, unusual.label, `พบวัน volume ผิดปกติ ${unusual.count} วันในรอบ 60 วัน ล่าสุด volume = ${round(volRatio, 2)}x ค่าเฉลี่ย`),
    indicator('Volume Profile Proxy', components.breakout, volumeProfile.label, `ราคาปัจจุบันอยู่${volumeProfile.positionTh}โซน volume หนาแน่นโดยประมาณจากข้อมูลรายวัน`),
    indicator('Breakout Quality', components.breakout, breakout.label, breakout.explanation),
    indicator('Liquidity / Float Risk Proxy', components.liquidity, liquidity.label, liquidity.explanation),
    indicator('Gap / Trap Risk', components.gapRisk, gap.label, gap.explanation),
    indicator('Absorption / Shakeout', components.accumulation, absorption.label, absorption.explanation)
  ];

  const risks = [
    liquidity.risk,
    gap.risk,
    unusual.risk,
    absorption.risk,
    atrPct > 0.06 ? 'ATR สูงมาก มีโอกาสแกว่งแรงและเกิด shakeout ได้ง่าย' : null,
    last < vwap20 ? 'ราคายังต่ำกว่า VWAP20 แปลว่าเงินที่ซื้อเฉลี่ยล่าสุดยังไม่ได้เปรียบ' : null
  ].filter(Boolean);

  const opportunities = [
    cmf20 > 0 ? 'CMF เป็นบวก แปลว่ามีแรงเงินไหลเข้าในกรอบ 20 วัน' : null,
    obvData.slope20 > 0 ? 'OBV 20 วันยกตัว มีร่องรอย volume สะสมฝั่งซื้อ' : null,
    cvd.value20 > 0 ? 'CVD proxy เป็นบวก แปลว่า volume ไปทางวันปิดเขียวมากกว่าวันปิดแดง' : null,
    last > vwap20 ? 'ราคายืนเหนือ VWAP20 เป็นจุดเริ่มต้นที่ดีของแรงซื้อคุณภาพ' : null,
    breakout.confirmed ? 'breakout มี volume สนับสนุนมากกว่าค่าเฉลี่ย' : null
  ].filter(Boolean);

  return {
    symbol,
    score,
    interpretation,
    verdict,
    summary: `${score}/100 = ${interpretation.label}. ${interpretation.meaning}`,
    action: interpretation.action,
    risk: interpretation.risk,
    latest: {
      price: round(last, 4),
      vwap20: round(vwap20, 4),
      atr14: round(atr14, 4),
      atrPct: round(atrPct, 4),
      volumeRatio: round(volRatio, 3)
    },
    components,
    indicators: indicatorRows,
    details: {
      obv: obvData,
      cmf20: round(cmf20, 4),
      mfi14: round(mfi14, 2),
      cvd,
      upDown,
      unusual,
      candle,
      absorption,
      volumeProfile,
      breakout,
      liquidity,
      gap
    },
    risks: risks.length ? risks : ['ยังไม่มีสัญญาณความเสี่ยงเงินใหญ่อย่างเด่นชัด แต่ยังต้องตรวจ volume และข่าวทุกครั้ง'],
    opportunities: opportunities.length ? opportunities : ['ยังไม่มีสัญญาณสะสมเด่นชัด ควรรอให้หลายอินดิเคเตอร์ยืนยันพร้อมกัน'],
    limitations: [
      'ไม่มีข้อมูล order book, dark pool, block trade, institutional filing แบบ real-time จึงใช้ OHLCV และข่าวเป็น proxy',
      'CVD เป็น proxy จากแท่งรายวัน ไม่ใช่ CVD tick-by-tick จาก bid/ask จริง',
      'หุ้น micro-cap อาจถูกปั่นด้วย volume สั้น ๆ ได้ ต้องตรวจข่าว SEC และ offering ประกอบเสมอ'
    ]
  };
}

function normalizeBars(history) {
  return (Array.isArray(history) ? history : [])
    .map(d => ({
      date: d.date,
      open: safeNumber(d.open),
      high: safeNumber(d.high),
      low: safeNumber(d.low),
      close: safeNumber(d.close),
      volume: safeNumber(d.volume)
    }))
    .filter(d => d.close > 0 && d.high > 0 && d.low > 0);
}

function obv(bars) {
  let value = 0;
  const series = [0];
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].close > bars[i - 1].close) value += bars[i].volume;
    else if (bars[i].close < bars[i - 1].close) value -= bars[i].volume;
    series.push(value);
  }
  const slope5 = series.at(-1) - (series.at(-6) ?? series[0]);
  const slope20 = series.at(-1) - (series.at(-21) ?? series[0]);
  const label = slope20 > 0 && slope5 > 0 ? 'สะสมต่อเนื่อง' : slope20 > 0 ? 'เริ่มสะสม' : slope20 < 0 && slope5 < 0 ? 'กระจาย/ขายออก' : 'แกว่งตัว';
  return { value: round(value, 0), slope5: round(slope5, 0), slope20: round(slope20, 0), label };
}

function accumulationDistribution(bars) {
  let value = 0;
  const series = [];
  for (const d of bars) {
    const range = Math.max(d.high - d.low, 0.000001);
    const mfm = ((d.close - d.low) - (d.high - d.close)) / range;
    value += mfm * d.volume;
    series.push(value);
  }
  const slope20 = series.at(-1) - (series.at(-21) ?? series[0]);
  const label = slope20 > 0 ? 'มีแรงสะสมตาม A/D' : slope20 < 0 ? 'มีแรงกระจายตาม A/D' : 'A/D ทรงตัว';
  return { value: round(value, 0), slope20: round(slope20, 0), label };
}

function chaikinMoneyFlow(bars, period = 20) {
  const slice = bars.slice(-period);
  let mfv = 0;
  let vol = 0;
  for (const d of slice) {
    const range = Math.max(d.high - d.low, 0.000001);
    const mfm = ((d.close - d.low) - (d.high - d.close)) / range;
    mfv += mfm * d.volume;
    vol += d.volume;
  }
  return vol ? mfv / vol : 0;
}

function moneyFlowIndex(bars, period = 14) {
  if (bars.length <= period) return 50;
  let pos = 0;
  let neg = 0;
  for (let i = bars.length - period; i < bars.length; i++) {
    const typical = (bars[i].high + bars[i].low + bars[i].close) / 3;
    const prevTypical = (bars[i - 1].high + bars[i - 1].low + bars[i - 1].close) / 3;
    const flow = typical * bars[i].volume;
    if (typical >= prevTypical) pos += flow;
    else neg += flow;
  }
  if (neg === 0 && pos === 0) return 50;
  if (neg === 0) return 100;
  const ratio = pos / neg;
  return 100 - 100 / (1 + ratio);
}

function cvdProxy(bars) {
  const calc = (period) => bars.slice(-period).reduce((sum, d, idx, arr) => {
    const prev = idx === 0 ? bars[bars.length - period - 1] : arr[idx - 1];
    const sign = !prev ? 0 : d.close > prev.close ? 1 : d.close < prev.close ? -1 : 0;
    return sum + sign * d.volume;
  }, 0);
  const value20 = calc(Math.min(20, bars.length));
  const value60 = calc(Math.min(60, bars.length));
  const label = value20 > 0 && value60 > 0 ? 'ซื้อสุทธิแบบ proxy' : value20 < 0 && value60 < 0 ? 'ขายสุทธิแบบ proxy' : 'ยังไม่ชัด';
  return { value20: round(value20, 0), value60: round(value60, 0), label };
}

function upDownVolume(bars, period = 20) {
  let up = 0, down = 0;
  const slice = bars.slice(-period);
  for (let i = 0; i < slice.length; i++) {
    const prev = i === 0 ? bars[bars.length - period - 1] : slice[i - 1];
    if (!prev) continue;
    if (slice[i].close >= prev.close) up += slice[i].volume;
    else down += slice[i].volume;
  }
  const ratio = down > 0 ? up / down : up > 0 ? 9.99 : 1;
  const label = ratio > 1.4 ? 'up-volume ชนะ' : ratio < 0.72 ? 'down-volume ชนะ' : 'สมดุล';
  return { up: round(up, 0), down: round(down, 0), ratio: round(ratio, 3), label };
}

function unusualVolume(bars, period = 60) {
  const slice = bars.slice(-period);
  const vols = slice.map(d => d.volume).filter(Number.isFinite);
  const avg = vols.reduce((a, b) => a + b, 0) / Math.max(vols.length, 1);
  const unusualDays = slice.filter(d => d.volume > avg * 2);
  const lastRatio = avg > 0 ? bars.at(-1).volume / avg : 1;
  const label = unusualDays.length >= 4 ? 'มี volume ผิดปกติหลายวัน' : unusualDays.length > 0 ? 'มี volume spike บางวัน' : 'volume ปกติ';
  const risk = unusualDays.length >= 4 ? 'พบ volume spike หลายวัน ต้องแยกว่าเป็นการสะสมจริงหรือการปั่นรอบสั้น' : null;
  return { count: unusualDays.length, averageVolume: round(avg, 0), lastRatio: round(lastRatio, 3), label, risk };
}

function candleQuality(bar) {
  const range = Math.max(bar.high - bar.low, 0.000001);
  const closeLocation = (bar.close - bar.low) / range;
  const body = Math.abs(bar.close - bar.open) / range;
  const label = closeLocation > 0.72 ? 'ปิดใกล้ high' : closeLocation < 0.28 ? 'ปิดใกล้ low' : 'ปิดกลางแท่ง';
  return { closeLocation: round(closeLocation, 3), body: round(body, 3), label };
}

function absorptionSignal(bars, atr14) {
  const last = bars.at(-1);
  const volAvg = bars.slice(-21, -1).reduce((s, d) => s + d.volume, 0) / 20;
  const range = last.high - last.low;
  const highVol = volAvg > 0 && last.volume > volAvg * 1.45;
  const narrow = atr14 > 0 && range < atr14 * 0.75;
  const closeHigh = (last.close - last.low) / Math.max(range, 0.000001) > 0.62;
  const label = highVol && narrow && closeHigh ? 'อาจมี absorption ฝั่งซื้อ' : highVol && narrow ? 'มี absorption แต่ทิศทางยังไม่ชัด' : 'ยังไม่พบ absorption เด่น';
  const risk = highVol && narrow && !closeHigh ? 'Volume สูงแต่ราคาไม่ไปต่อ อาจเป็นแรงขายซ่อนหรือการกระจายหุ้น' : null;
  return { highVol, narrowRange: narrow, closeHigh, label, explanation: `${label}: volume ${round(last.volume / Math.max(volAvg, 1), 2)}x และ range เทียบ ATR`, risk };
}

function volumeProfileProxy(bars, last) {
  const slice = bars.slice(-60);
  const min = Math.min(...slice.map(d => d.low));
  const max = Math.max(...slice.map(d => d.high));
  const buckets = Array.from({ length: 8 }, (_, i) => ({ i, volume: 0, low: min + (max - min) * i / 8, high: min + (max - min) * (i + 1) / 8 }));
  for (const d of slice) {
    const typical = (d.high + d.low + d.close) / 3;
    const idx = Math.max(0, Math.min(7, Math.floor(((typical - min) / Math.max(max - min, 0.000001)) * 8)));
    buckets[idx].volume += d.volume;
  }
  const poc = [...buckets].sort((a, b) => b.volume - a.volume)[0];
  const currentIdx = Math.max(0, Math.min(7, Math.floor(((last - min) / Math.max(max - min, 0.000001)) * 8)));
  const positionTh = currentIdx > poc.i ? 'เหนือ' : currentIdx < poc.i ? 'ใต้' : 'ใน';
  const label = `${positionTh}โซน POC proxy`;
  return { label, positionTh, pocLow: round(poc.low, 4), pocHigh: round(poc.high, 4), currentBucket: currentIdx };
}

function breakoutQuality(bars, levels, tech) {
  const last = bars.at(-1);
  const resistance = Number(levels?.resistance);
  const volRatio = Number(tech?.volRatio) || volumeRatio(bars, 20);
  const confirmed = Number.isFinite(resistance) && last.close > resistance && volRatio > 1.2;
  const nearResistance = Number.isFinite(resistance) && Math.abs(last.close - resistance) / Math.max(last.close, 0.01) < 0.025;
  const label = confirmed ? 'breakout มี volume ยืนยัน' : nearResistance ? 'ใกล้จุด breakout' : 'ยังไม่ breakout';
  const explanation = confirmed
    ? `ราคาปิดเหนือแนวต้าน ${money(resistance)} พร้อม volume ${round(volRatio, 2)}x`
    : nearResistance
      ? `ราคาใกล้แนวต้าน ${money(resistance)} ต้องรอปิดเหนือพร้อม volume`
      : `ยังไม่ผ่านแนวต้านหลัก ต้องรอสัญญาณยืนยัน`;
  return { confirmed, nearResistance, label, explanation };
}

function liquidityRisk(bars, last) {
  const avgVol20 = bars.slice(-20).reduce((s, d) => s + d.volume, 0) / 20;
  const dollarVol = avgVol20 * last;
  const label = dollarVol < 750000 ? 'สภาพคล่องต่ำมาก' : dollarVol < 3000000 ? 'สภาพคล่องต่ำ/กลาง' : 'สภาพคล่องพอใช้';
  const explanation = `มูลค่าซื้อขายเฉลี่ย 20 วันโดยประมาณ ${money(dollarVol)} ต่อวัน ใช้เป็น proxy ความเสี่ยง slippage`;
  const risk = dollarVol < 3000000 ? 'สภาพคล่องไม่สูง อาจเกิดไส้เทียนแรงและ bid/ask กว้าง โดยเฉพาะหุ้นเล็ก' : null;
  return { avgVolume20: round(avgVol20, 0), dollarVolume20: round(dollarVol, 0), label, explanation, risk };
}

function gapRisk(bars) {
  const slice = bars.slice(-20);
  let gaps = 0;
  for (let i = 1; i < slice.length; i++) {
    const prevClose = slice[i - 1].close;
    const gap = Math.abs(slice[i].open - prevClose) / Math.max(prevClose, 0.01);
    if (gap > 0.04) gaps += 1;
  }
  const label = gaps >= 4 ? 'gap risk สูง' : gaps > 0 ? 'มี gap บางวัน' : 'gap ต่ำ';
  const explanation = `พบ gap > 4% จำนวน ${gaps} วันใน 20 วันล่าสุด`;
  const risk = gaps >= 4 ? 'หุ้นมีประวัติเปิดกระโดด/รูดแรง ต้องระวัง stop-loss โดนข้ามราคา' : null;
  return { count: gaps, label, explanation, risk };
}

function scoreObv(d) { return d.slope20 > 0 && d.slope5 > 0 ? 78 : d.slope20 > 0 ? 62 : d.slope20 < 0 && d.slope5 < 0 ? 25 : 46; }
function scoreCmf(v) { return Math.round(clamp(50 + v * 180, 10, 90)); }
function scoreMfi(v) { if (v > 80) return 58; if (v >= 55) return 72; if (v >= 45) return 52; if (v >= 30) return 38; return 44; }
function scoreCvd(d) { return d.value20 > 0 && d.value60 > 0 ? 76 : d.value20 > 0 ? 61 : d.value20 < 0 && d.value60 < 0 ? 27 : 48; }
function scoreVwap(last, vwap, atr) { const diff = (last - vwap) / Math.max(atr, 0.0001); return Math.round(clamp(50 + diff * 18, 15, 85)); }
function scoreVolumeQuality({ volRatio, upDown, candle, unusual }) { return Math.round(clamp(45 + (volRatio - 1) * 18 + (upDown.ratio - 1) * 16 + (candle.closeLocation - 0.5) * 35 - Math.max(0, unusual.count - 4) * 3, 15, 88)); }
function scoreAccumulation({ adData, absorption, upDown }) { return Math.round(clamp(45 + (adData.slope20 > 0 ? 15 : -15) + (absorption.closeHigh ? 8 : 0) + (upDown.ratio - 1) * 12, 10, 86)); }
function scoreBreakout(b) { return b.confirmed ? 78 : b.nearResistance ? 58 : 45; }
function scoreLiquidity(l) { return l.dollarVolume20 > 3000000 ? 65 : l.dollarVolume20 > 750000 ? 47 : 30; }
function scoreGap(g) { return g.count >= 4 ? 28 : g.count > 0 ? 45 : 58; }

function indicator(name, score, status, explanation) { return { name, score: Math.round(score), status, explanation }; }
function cmfLabel(v) { return v > 0.12 ? 'เงินไหลเข้าเด่น' : v > 0 ? 'เงินไหลเข้าเล็กน้อย' : v < -0.12 ? 'เงินไหลออกเด่น' : v < 0 ? 'เงินไหลออกเล็กน้อย' : 'กลาง'; }
function mfiLabel(v) { return v > 80 ? 'ร้อนมาก/เสี่ยงพัก' : v > 60 ? 'แรงซื้อดี' : v > 40 ? 'กลาง' : v > 20 ? 'แรงขายนำ' : 'ขายมากเกิน'; }
function fallbackSmartMoney(symbol, bars, tech) { const score = 45; const interpretation = interpretScore(score, 'smartMoney'); return { symbol, score, interpretation, verdict: 'ข้อมูลไม่พอ', summary: interpretation.thaiSummary, action: interpretation.action, risk: interpretation.risk, latest: { price: safeNumber(tech.last, 0) }, components: {}, indicators: [], details: {}, risks: ['ข้อมูลราคาน้อยกว่า 20 วัน จึงยังวิเคราะห์ Smart Money ไม่สมบูรณ์'], opportunities: [], limitations: ['ต้องมีข้อมูล OHLCV อย่างน้อย 20 วัน'] }; }
function money(value) { const n = Number(value); if (!Number.isFinite(n)) return '-'; if (n < 10) return `$${n.toFixed(2)}`; if (n < 100) return `$${n.toFixed(2)}`; return `$${Math.round(n).toLocaleString('en-US')}`; }
