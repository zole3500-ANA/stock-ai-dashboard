import { technicalSnapshot } from './indicators.js';
import { aggregateNewsSentiment } from './news.js';
import { clamp, pct, round } from './utils.js';

const DEFAULT_PROFILE = {
  score: 50,
  riskLevel: 'กลาง',
  support: null,
  resistance: null,
  stopLoss: null
};

export function profileForSymbol(symbol) {
  const t = String(symbol || '').toUpperCase();
  const profiles = {
    BURU: {
      company: 'Nuburu, Inc.', score: 38, riskLevel: 'สูง',
      thesis: 'หุ้น micro-cap มี upside จากข่าว contract แต่ความเสี่ยง dilution และ volatility สูง',
      support: null, resistance: null, stopLoss: null
    },
    IREN: {
      company: 'IREN Limited', score: 66, riskLevel: 'กลาง-สูง',
      thesis: 'ได้ sentiment จาก Bitcoin และ AI infrastructure แต่ volatility สูง ต้องรอจังหวะ',
      support: null, resistance: null, stopLoss: null
    },
    NVDA: {
      company: 'NVIDIA Corp.', score: 74, riskLevel: 'กลาง',
      thesis: 'หุ้นผู้นำกลุ่ม AI แต่ต้องระวัง valuation และแรงขายทำกำไร',
      support: null, resistance: null, stopLoss: null
    },
    AAPL: {
      company: 'Apple Inc.', score: 61, riskLevel: 'กลาง',
      thesis: 'พื้นฐานแข็ง แต่โมเมนตัมขึ้นกับ product cycle และ market sentiment',
      support: null, resistance: null, stopLoss: null
    }
  };
  return { ...DEFAULT_PROFILE, ...(profiles[t] || { company: `${t} Corp.`, thesis: 'ระบบประเมินจากราคา ข่าว และตัวชี้วัดเทคนิคแบบอัตโนมัติ' }) };
}

export function nextDayPrediction(symbol, history, articles = []) {
  const profile = profileForSymbol(symbol);
  const tech = technicalSnapshot(history);
  const levels = computeTradingLevels(history, tech);
  const tradePlan = buildTechnicalTradePlan({ tech, levels });
  const newsScore = aggregateNewsSentiment(articles);
  const last = tech.last;

  const trendComponent = tech.trendScore;
  const momentumComponent = clamp(tech.dayChange * 8 + tech.weekChange * 2, -0.75, 0.75);

  let rsiComponent = 0;
  if (tech.rsi14 < 25) rsiComponent = 0.30;
  else if (tech.rsi14 < 35) rsiComponent = 0.17;
  else if (tech.rsi14 > 78) rsiComponent = -0.32;
  else if (tech.rsi14 > 68) rsiComponent = -0.18;
  else if (tech.rsi14 >= 45 && tech.rsi14 <= 60) rsiComponent = 0.06;

  let volumeComponent = 0;
  if (tech.volRatio > 1.45 && tech.dayChange > 0) volumeComponent = 0.25;
  else if (tech.volRatio > 1.45 && tech.dayChange < 0) volumeComponent = -0.25;
  else if (tech.volRatio < 0.65) volumeComponent = -0.08;

  const macdComponent = clamp(tech.macd.histogram / Math.max(tech.last * 0.02, 0.001), -0.25, 0.25);
  const newsComponent = clamp(newsScore * 0.8, -0.8, 0.8);
  const aiScoreComponent = clamp((profile.score - 50) / 85, -0.5, 0.5);
  const riskPenalty = -Math.min(0.38, Math.max(0, tech.atrPct - 0.035) * 3.4);

  const components = {
    trend: round(trendComponent, 3),
    momentum: round(momentumComponent, 3),
    rsi: round(rsiComponent, 3),
    volume: round(volumeComponent, 3),
    macd: round(macdComponent, 3),
    news: round(newsComponent, 3),
    aiScore: round(aiScoreComponent, 3),
    riskPenalty: round(riskPenalty, 3)
  };

  const rawSignal = Object.values(components).reduce((sum, v) => sum + v, 0);
  const boundedSignal = clamp(rawSignal / 3.1, -1, 1);
  const maxMove = clamp(tech.atrPct * 0.92, 0.012, 0.095);
  const predictedReturn = boundedSignal * maxMove;
  const predictedPrice = last * (1 + predictedReturn);
  const rangeLow = Math.max(0.01, predictedPrice - tech.atr14 * 0.58);
  const rangeHigh = predictedPrice + tech.atr14 * 0.58;

  const alignedFactors = Object.values(components).filter(v => Math.sign(v) === Math.sign(rawSignal) && Math.abs(v) >= 0.08).length;
  const newsQuality = articles.some(a => a.origin !== 'fallback') ? 0.76 : 0.42;
  const dataQuality = history.length >= 70 ? 0.78 : history.length >= 35 ? 0.64 : 0.42;
  const volatilityPenalty = Math.min(0.22, tech.atrPct * 1.15);
  const confidence = Math.round(100 * clamp(dataQuality * 0.42 + newsQuality * 0.24 + alignedFactors * 0.058 - volatilityPenalty, 0.25, 0.84));

  const direction = predictedReturn > 0.006 ? 'ขึ้นเล็กน้อย' : predictedReturn < -0.006 ? 'ลงเล็กน้อย' : 'แกว่งตัว';
  const verdict = predictedReturn > 0.018 ? 'Bullish ระยะสั้น' : predictedReturn < -0.018 ? 'Bearish ระยะสั้น' : 'Neutral ระยะสั้น';

  return {
    symbol,
    profile,
    technical: tech,
    levels,
    tradePlan,
    newsSentiment: round(newsScore, 3),
    components,
    rawSignal: round(rawSignal, 3),
    boundedSignal: round(boundedSignal, 3),
    verdict,
    direction,
    lastPrice: round(last, 4),
    predictedPrice: round(predictedPrice, 4),
    predictedReturn: round(predictedReturn, 4),
    predictedReturnPct: pct(predictedReturn, 2),
    rangeLow: round(rangeLow, 4),
    rangeHigh: round(rangeHigh, 4),
    bullCase: round(predictedPrice + tech.atr14 * 0.75, 4),
    baseCase: round(predictedPrice, 4),
    bearCase: round(Math.max(0.01, predictedPrice - tech.atr14 * 0.85), 4),
    confidence,
    reasoning: buildReasoning({ profile, tech, levels, newsScore, components, rawSignal, predictedReturn, predictedPrice, rangeLow, rangeHigh, confidence, direction })
  };
}

export function computeTradingLevels(history, tech) {
  const bars = Array.isArray(history) ? history.filter(d => Number.isFinite(Number(d.close))) : [];
  const last = Number(tech?.last) || Number(bars.at(-1)?.close) || 0;
  const atr14 = Number(tech?.atr14) || Math.max(last * 0.035, 0.01);
  const minGap = Math.max(last * 0.006, atr14 * 0.12, 0.005);

  if (!last || bars.length < 5) {
    const support = Math.max(0.01, last - atr14);
    const resistance = last + atr14;
    return {
      support: round(support, 4),
      resistance: round(resistance, 4),
      stopLoss: round(Math.max(0.01, support - atr14 * 0.45), 4),
      supportSource: 'ข้อมูลราคาไม่พอ ใช้ ATR ประมาณการ',
      resistanceSource: 'ข้อมูลราคาไม่พอ ใช้ ATR ประมาณการ',
      stopLossSource: 'ต่ำกว่าแนวรับประมาณ 0.45 ATR'
    };
  }

  const recent20 = bars.slice(-20);
  const recent60 = bars.slice(-Math.min(60, bars.length));
  const lows20 = recent20.map(d => Number(d.low)).filter(Number.isFinite);
  const highs20 = recent20.map(d => Number(d.high)).filter(Number.isFinite);
  const lows60 = recent60.map(d => Number(d.low)).filter(Number.isFinite);
  const highs60 = recent60.map(d => Number(d.high)).filter(Number.isFinite);
  const closes = bars.map(d => Number(d.close)).filter(Number.isFinite);

  const swingLows = [];
  const swingHighs = [];
  for (let i = Math.max(2, bars.length - 45); i < bars.length - 2; i++) {
    const low = Number(bars[i].low);
    const high = Number(bars[i].high);
    if (Number.isFinite(low) && low <= Number(bars[i - 1].low) && low <= Number(bars[i - 2].low) && low <= Number(bars[i + 1].low) && low <= Number(bars[i + 2].low)) {
      swingLows.push(low);
    }
    if (Number.isFinite(high) && high >= Number(bars[i - 1].high) && high >= Number(bars[i - 2].high) && high >= Number(bars[i + 1].high) && high >= Number(bars[i + 2].high)) {
      swingHighs.push(high);
    }
  }

  const supportCandidates = [];
  const resistanceCandidates = [];
  const addSupport = (value, source, weight = 1) => {
    const v = Number(value);
    if (Number.isFinite(v) && v > 0 && v < last - minGap) supportCandidates.push({ value: v, source, weight });
  };
  const addResistance = (value, source, weight = 1) => {
    const v = Number(value);
    if (Number.isFinite(v) && v > last + minGap) resistanceCandidates.push({ value: v, source, weight });
  };

  addSupport(Math.min(...lows20), 'จุดต่ำสุด 20 วัน', 1.35);
  addSupport(Math.min(...lows60), 'จุดต่ำสุด 60 วัน', 1.05);
  addSupport(Math.min(...swingLows), 'swing low ล่าสุด', 1.25);
  addSupport(tech.ma20, 'MA20', 0.85);
  addSupport(tech.ma50, 'MA50', 0.75);
  addSupport(tech.vwap20, 'VWAP20', 0.9);
  addSupport(last - atr14 * 0.8, 'ATR ใต้ราคาล่าสุด', 0.6);
  addSupport(last - atr14 * 1.25, 'ATR risk band', 0.5);

  addResistance(Math.max(...highs20), 'จุดสูงสุด 20 วัน', 1.35);
  addResistance(Math.max(...highs60), 'จุดสูงสุด 60 วัน', 1.05);
  addResistance(Math.max(...swingHighs), 'swing high ล่าสุด', 1.25);
  addResistance(tech.ma20, 'MA20', 0.85);
  addResistance(tech.ma50, 'MA50', 0.75);
  addResistance(tech.vwap20, 'VWAP20', 0.9);
  addResistance(last + atr14 * 0.8, 'ATR เหนือราคาล่าสุด', 0.6);
  addResistance(last + atr14 * 1.25, 'ATR upside band', 0.5);

  const nearestBelow = supportCandidates
    .map(c => ({ ...c, distance: Math.abs(last - c.value) / Math.max(last, 0.01) }))
    .sort((a, b) => (a.distance / a.weight) - (b.distance / b.weight))[0];
  const nearestAbove = resistanceCandidates
    .map(c => ({ ...c, distance: Math.abs(c.value - last) / Math.max(last, 0.01) }))
    .sort((a, b) => (a.distance / a.weight) - (b.distance / b.weight))[0];

  const supportValue = nearestBelow?.value ?? Math.max(0.01, last - atr14 * 0.9);
  const resistanceValue = nearestAbove?.value ?? (last + atr14 * 0.9);
  const stopByAtr = supportValue - atr14 * 0.45;
  const stopByPercent = supportValue * (last < 5 ? 0.94 : 0.97);
  const stopLoss = Math.max(0.01, Math.min(stopByAtr, stopByPercent));

  return {
    support: round(supportValue, 4),
    resistance: round(resistanceValue, 4),
    stopLoss: round(stopLoss, 4),
    supportSource: nearestBelow?.source || 'ATR ใต้ราคาล่าสุด',
    resistanceSource: nearestAbove?.source || 'ATR เหนือราคาล่าสุด',
    stopLossSource: 'ต่ำกว่าแนวรับโดยใช้ ATR และเปอร์เซ็นต์ความเสี่ยง',
    latestPrice: round(last, 4),
    atr14: round(atr14, 4)
  };
}


export function buildTechnicalTradePlan({ tech, levels }) {
  const last = positiveNumber(tech?.last, 0);
  const atr14 = positiveNumber(tech?.atr14, Math.max(last * 0.035, 0.01));
  const vwap20 = positiveNumber(tech?.vwap20, last);
  const ma5 = positiveNumber(tech?.ma5, last);
  const ma20 = positiveNumber(tech?.ma20, last);

  const rawSupport = positiveNumber(levels?.support, Math.max(0.01, last - atr14));
  const rawResistance = positiveNumber(levels?.resistance, last + atr14);

  const support = rawSupport < last ? rawSupport : Math.max(0.01, Math.min(vwap20, ma20, last - atr14 * 0.45));
  const resistance = rawResistance > last ? rawResistance : last + atr14 * 0.75;

  const reduceRiskLevel = round(Math.max(0.01, support), 4);
  const stopCandidate = positiveNumber(levels?.stopLoss, support - atr14 * 0.55);
  const maxAllowedStop = Math.min(reduceRiskLevel - Math.max(atr14 * 0.18, last * 0.004), last - Math.max(atr14 * 0.45, last * 0.01));
  const stopLoss = round(Math.max(0.01, Math.min(stopCandidate, maxAllowedStop)), 4);

  const reclaimLevel = round(Math.max(vwap20, ma5), 4);
  const confirmationLevel = round(Math.max(reclaimLevel, Math.min(resistance, last + atr14 * 0.35)), 4);
  const followLevel = round(resistance, 4);
  const takeProfit1 = round(resistance, 4);
  const takeProfit2 = round(Math.max(resistance + atr14 * 0.8, last + atr14 * 1.35), 4);
  const noTradeBelow = round(Math.min(vwap20, ma20), 4);

  const riskPerShare = Math.max(0, last - stopLoss);
  const rewardToTp1 = Math.max(0, takeProfit1 - last);
  const rrToTp1 = riskPerShare > 0 ? round(rewardToTp1 / riskPerShare, 2) : null;

  return {
    latestPrice: round(last, 4),
    reclaimLevel,
    confirmationLevel,
    followLevel,
    reduceRiskLevel,
    stopLoss,
    takeProfit1,
    takeProfit2,
    noTradeBelow,
    atr14: round(atr14, 4),
    rrToTp1,
    rules: {
      wait: `รอให้ราคายืนเหนือ ${formatMoney(reclaimLevel)} ซึ่งเป็นโซนยืนยันจาก VWAP20/MA5 ก่อน ไม่ไล่ราคาถ้าราคาอยู่ต่ำกว่าเส้นนี้`,
      entry: `จุดเข้าเชิงเทคนิคให้รอราคายืนเหนือ ${formatMoney(confirmationLevel)} พร้อม Volume มากกว่าค่าเฉลี่ย หรือย่อแล้วไม่หลุด ${formatMoney(reduceRiskLevel)}`,
      follow: `จุด Follow คือการปิดเหนือ ${formatMoney(followLevel)} พร้อม Volume อย่างน้อย 1.2-1.5 เท่าของค่าเฉลี่ย ถ้าทะลุด้วย Volume ต่ำให้ถือว่ายังไม่ยืนยัน`,
      reduce: `จุดลดความเสี่ยงคือถ้าราคาปิดต่ำกว่า ${formatMoney(reduceRiskLevel)} หรือหลุดแนวรับพร้อม Volume ขายสูง ให้ลดพอร์ต/ไม่เพิ่มไม้`,
      stop: `Stop-loss ที่ทวนสอบแล้ว = ${formatMoney(stopLoss)} ต้องต่ำกว่าทั้งราคาล่าสุดและแนวรับหลัก เพื่อไม่ให้ stop อยู่ผิดด้านของราคา`,
      exit: `จุดออกทำกำไรแบ่งเป็น TP1 ${formatMoney(takeProfit1)} และ TP2 ${formatMoney(takeProfit2)} ถ้าชน TP1 แล้ว Volume เริ่มแห้งให้ทยอยล็อกกำไร`,
      invalid: `ถ้าราคากลับลงต่ำกว่า ${formatMoney(noTradeBelow)} หลัง breakout ให้ถือว่าสัญญาณ follow ล้มเหลว ต้องกลับไปโหมดรอดู`
    },
    sources: {
      support: levels?.supportSource || 'แนวรับจากราคา/ATR',
      resistance: levels?.resistanceSource || 'แนวต้านจากราคา/ATR',
      stopLoss: levels?.stopLossSource || 'ต่ำกว่าแนวรับโดยใช้ ATR'
    }
  };
}

function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function buildFactors(symbol, prediction, articles = [], social = null, smartMoney = null) {
  const tech = prediction.technical;
  const profile = prediction.profile;
  const levels = prediction.levels || {};
  const newsLabel = prediction.newsSentiment > 0.2 ? 'ข่าวบวก' : prediction.newsSentiment < -0.2 ? 'ข่าวลบ' : 'ข่าวกลาง';
  const socialSummary = social?.summary || {};
  const socialTone = socialSummary.dominantTone || 'ยังไม่ชัด';
  const socialHeat = socialSummary.buzzLevel || 'ข้อมูลจำกัด';
  const socialRisk = socialSummary.manipulationRisk || 'ยังประเมินไม่ได้';

  return [
    ['ข่าว', newsLabel, `คะแนนข่าวรวม ${prediction.newsSentiment} จาก -1 ถึง +1 โดยถ่วงน้ำหนักตามผลกระทบของข่าว`],
    ['สถานการณ์ราคา', prediction.verdict, `ราคา ${formatMoney(tech.last)} เทียบ MA20 ${formatMoney(tech.ma20)} และ VWAP ${formatMoney(tech.vwap20)}`],
    ['แนวรับ/แนวต้าน', 'คำนวณจากข้อมูลราคา', `แนวรับ ${formatMoney(levels.support)} จาก ${levels.supportSource || 'ข้อมูลราคา'} / แนวต้าน ${formatMoney(levels.resistance)} จาก ${levels.resistanceSource || 'ข้อมูลราคา'} / จุดตัดขาดทุน ${formatMoney(levels.stopLoss)}`],
    ['กระแส Social Media', socialTone, `Facebook/X/Reddit/Stocktwits/อื่น ๆ: ${socialSummary.thaiSummary || 'ยังมีข้อมูลจำกัด'} ความร้อนแรง ${socialHeat}; ความเสี่ยงกระแสปั่น: ${socialRisk}`],
    ['กระแสข่าวออนไลน์', articles.length ? 'ติดตามได้' : 'ข้อมูลจำกัด', `ใช้คะแนน sentiment จากหัวข่าวและข่าว ${articles.length} รายการ`],
    ['รายใหญ่ / Big Money', tech.volRatio > 1.4 ? 'เริ่มเคลื่อนไหว' : 'ยังเงียบ', `Volume ล่าสุด ${tech.volRatio}x ของค่าเฉลี่ย 20 วัน`],
    ['Smart Money', smartMoney?.interpretation?.label || 'ยังไม่ชัด', smartMoney ? `คะแนน Smart Money ${smartMoney.score}/100 = ${smartMoney.interpretation.label}. ${smartMoney.interpretation.meaning}` : 'ยังไม่มีข้อมูล Smart Money'],
    ['ปริมาณซื้อขาย', tech.volRatio > 1.2 ? 'สูง' : tech.volRatio < 0.75 ? 'ต่ำ' : 'ปกติ', `Volume ratio = ${tech.volRatio}`],
    ['Koncorde', 'ยังไม่ได้เชื่อมต่อ', 'เตรียมช่องต่อ indicator เฉพาะทางภายหลัง'],
    ['MACD', tech.macd.histogram > 0 ? 'บวก' : 'ลบ', `Histogram = ${tech.macd.histogram}`],
    ['RSI', tech.rsi14 > 70 ? 'ร้อนแรง/เสี่ยงพัก' : tech.rsi14 < 30 ? 'ขายมากเกิน' : 'กลาง', `RSI14 = ${tech.rsi14}`],
    ['ความเสี่ยง / ATR', tech.atrPct > 0.06 ? 'เสี่ยงสูง' : 'ปกติ', `ATR = ${(tech.atrPct * 100).toFixed(2)}% ของราคา`],
    ['โครงสร้างแนวโน้ม', tech.trendScore > 0.2 ? 'ดีขึ้น' : tech.trendScore < -0.2 ? 'อ่อน' : 'แกว่งตัว', `Trend score = ${tech.trendScore}`],
    ['VWAP', tech.last > tech.vwap20 ? 'เหนือ VWAP' : 'ใต้ VWAP', `ราคาปัจจุบัน ${tech.last > tech.vwap20 ? 'อยู่เหนือ' : 'อยู่ใต้'} VWAP20`]
  ].map(([dimension, status, explanation], index) => ({ index: index + 1, dimension, status, explanation, symbol, company: profile.company }));
}

function buildReasoning(ctx) {
  const { profile, tech, levels, newsScore, components, rawSignal, predictedReturn, predictedPrice, rangeLow, rangeHigh, confidence, direction } = ctx;
  return [
    `ราคาล่าสุดที่ใช้คำนวณคือ ${formatMoney(tech.last)} โดย ATR14 อยู่ที่ ${formatMoney(tech.atr14)} หรือ ${(tech.atrPct * 100).toFixed(2)}% ของราคา จึงใช้ ATR เป็นกรอบความผันผวนหลัก ไม่เดาเกินกรอบธรรมชาติของหุ้น`,
    `ด้านแนวโน้ม ราคาอยู่ ${tech.last > tech.ma5 ? 'เหนือ' : 'ใต้'} MA5 (${formatMoney(tech.ma5)}), ${tech.last > tech.ma20 ? 'เหนือ' : 'ใต้'} MA20 (${formatMoney(tech.ma20)}), ${tech.last > tech.vwap20 ? 'เหนือ' : 'ใต้'} VWAP20 (${formatMoney(tech.vwap20)}) และ MACD histogram = ${tech.macd.histogram}; จึงให้คะแนน trend = ${components.trend}`,
    `Momentum ระยะสั้น: ผลตอบแทน 1 วัน = ${(tech.dayChange * 100).toFixed(2)}% และ 5 วัน = ${(tech.weekChange * 100).toFixed(2)}% ถ้าราคาลงต่อเนื่องโมเดลจะหักคะแนน แต่ถ้าเริ่มทำ higher low จะได้คะแนนเพิ่ม`,
    `RSI14 = ${tech.rsi14}; ถ้าต่ำกว่า 30 จะมองว่ามีโอกาสเด้งทางเทคนิค แต่ถ้าสูงกว่า 70 จะเริ่มเสี่ยงพักตัว คะแนน RSI รอบนี้ = ${components.rsi}`,
    `Volume ratio = ${tech.volRatio} เท่าของค่าเฉลี่ย 20 วัน หากราคาขึ้นพร้อม volume สูงถือเป็นแรงยืนยัน แต่ถ้าราคาลงพร้อม volume สูงถือเป็นแรงขายจริง คะแนน volume = ${components.volume}`,
    `ข่าวล่าสุดให้คะแนน sentiment รวม ${newsScore}; ข่าวอย่าง contract, earnings beat, upgrade จะเป็นบวก ส่วน offering, dilution, delisting, lawsuit, downgrade จะเป็นลบ คะแนน news = ${components.news}`,
    `AI Score พื้นฐานของ ${profile.company} = ${profile.score}/100 แปลงเป็นคะแนนถ่วงดุล ${components.aiScore}; หุ้นที่พื้นฐานอ่อนจะไม่ให้โมเดลทำนายบวกเกินจริง แม้กราฟจะมีเด้งสั้น`,
    `Risk penalty = ${components.riskPenalty} เพราะหุ้นที่ ATR สูงหรือมีความเสี่ยงข่าวลบต้องลดความมั่นใจ เพื่อบังคับให้ระบบคิดแบบบริหารความเสี่ยงก่อนผลตอบแทน`,
    `สัญญาณรวมดิบ = ${rawSignal.toFixed(2)} เมื่อนำไปจำกัดไม่ให้สุดโต่งและคูณด้วยกรอบ ATR ได้ข้อสรุปว่าราคาวันถัดไปมีแนวโน้ม “${direction}”`,
    `แนวรับ/แนวต้านไม่ได้ใช้ค่าคงที่ แต่คำนวณจากข้อมูลราคา ล่าสุดแนวรับอยู่ที่ ${formatMoney(levels.support)} (${levels.supportSource}) แนวต้านอยู่ที่ ${formatMoney(levels.resistance)} (${levels.resistanceSource}) และจุดตัดขาดทุน ${formatMoney(levels.stopLoss)}`,
    `Base case คาดไว้ที่ ${formatMoney(predictedPrice)} หรือ ${(predictedReturn * 100).toFixed(2)}% จากราคาล่าสุด กรอบที่เป็นไปได้คือ ${formatMoney(rangeLow)} - ${formatMoney(rangeHigh)} ความมั่นใจ ${confidence}%`
  ];
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  if (n < 10) return `$${n.toFixed(2)}`;
  if (n < 100) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(0)}`;
}
