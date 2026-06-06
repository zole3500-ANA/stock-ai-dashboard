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
  const socialSummary = social?.summary || {};
  const last = positiveNumber(tech.last, prediction.lastPrice || 0);
  const support = positiveNumber(levels.support, prediction.rangeLow || last * 0.95);
  const resistance = positiveNumber(levels.resistance, prediction.rangeHigh || last * 1.05);
  const stopLoss = positiveNumber(levels.stopLoss, Math.max(0.01, support - tech.atr14 * 0.35));
  const upside = Math.max(0, resistance - last);
  const downside = Math.max(0.0001, last - stopLoss);
  const rr = upside / downside;

  const articleText = articles.map(a => `${a.title || ''} ${a.titleOriginal || ''} ${a.titleTh || ''} ${a.snippet || ''} ${a.snippetTh || ''} ${a.eventTypeTh || ''}`).join(' ').toLowerCase();
  const dilutionRisk = keywordCount(articleText, ['offering', 'dilution', 'dilutive', 'registered direct', 'atm offering', 'public offering', 'เพิ่มทุน', 'หุ้นเพิ่มทุน', 'dilute']);
  const secRisk = keywordCount(articleText, ['sec', '8-k', 's-1', '10-q', '10-k', 'reverse split', 'delisting', 'nasdaq notice', 'going concern', 'corporate action']);
  const squeezeMentions = keywordCount(articleText, ['short interest', 'short squeeze', 'squeeze', 'float', 'borrow fee']);
  const contractMentions = keywordCount(articleText, ['contract', 'award', 'defense', 'government', 'customer win', 'partnership', 'สัญญา', 'กลาโหม']);

  const newsScore = clamp(Math.round(50 + prediction.newsSentiment * 50), 0, 100);
  const technicalScore = clamp(Math.round(50 + tech.trendScore * 60 + (tech.macd.histogram > 0 ? 8 : -8) + (tech.last > tech.vwap20 ? 8 : -8)), 0, 100);
  const volumeScore = clamp(Math.round(50 + (tech.volRatio - 1) * 35 + (tech.dayChange > 0 ? 8 : -8)), 0, 100);
  const socialScore = clamp(Math.round(50 + Number(socialSummary.sentimentScore || 0) * 50 - Number(socialSummary.hypeRisk || 0) * 0.18), 0, 100);
  const smartScore = clamp(Math.round(smartMoney?.score ?? 50), 0, 100);
  const dilutionScore = clamp(Math.round(84 - dilutionRisk * 28 - (profile.score < 45 ? 10 : 0)), 0, 100);
  const secScore = clamp(Math.round(78 - secRisk * 22), 0, 100);
  const liquidityScore = clamp(Math.round(65 + Math.min(30, Math.log10(Math.max(1, tech.volume || 1)) * 4) - (tech.atrPct > 0.06 ? 22 : tech.atrPct > 0.035 ? 10 : 0) - (last < 2 ? 15 : 0)), 0, 100);
  const squeezeScore = clamp(Math.round(45 + squeezeMentions * 12 + (tech.volRatio > 1.6 ? 12 : 0) + (tech.atrPct > 0.06 ? 8 : 0) - dilutionRisk * 10), 0, 100);
  const preMarketScore = clamp(Math.round(50 + (Math.abs(tech.dayChange) > tech.atrPct * 0.65 ? 8 : 0) - (tech.atrPct > 0.06 ? 8 : 0)), 0, 100);
  const catalystScore = clamp(Math.round(45 + contractMentions * 18 + (articles.length >= 5 ? 8 : 0) - dilutionRisk * 10), 0, 100);
  const marketRegimeScore = clamp(Math.round(50 + (prediction.components.trend || 0) * 15), 0, 100);
  const sectorScore = clamp(Math.round(50 + (prediction.components.news || 0) * 20 + (prediction.components.trend || 0) * 12), 0, 100);
  const rrScore = clamp(Math.round(35 + Math.min(55, rr * 22) - (tech.atrPct > 0.06 ? 10 : 0)), 0, 100);
  const dataQualityScore = clamp(Math.round((articles.length >= 5 ? 30 : articles.length >= 2 ? 20 : 10) + (prediction.confidence * 0.45) + (prediction.technical ? 20 : 0)), 0, 100);

  const rows = [
    makeFactor({
      dimension: 'ข่าวสำคัญ / News',
      score: newsScore,
      weight: 10,
      confidence: articles.length >= 5 ? 78 : articles.length >= 2 ? 58 : 38,
      priceImpact: newsScore >= 60 ? 'หนุนราคา' : newsScore <= 40 ? 'กดดันราคา' : 'ยังไม่ชัด',
      timeframe: '1-7 วัน',
      explanation: `คะแนนข่าวรวม ${prediction.newsSentiment} จาก -1 ถึง +1 ถ่วงน้ำหนักตามผลกระทบของข่าว ${articles.length} รายการ`,
      watch: 'ข่าว contract, earnings, analyst action, offering, dilution, delisting, lawsuit และ SEC filing',
      action: newsScore <= 40 ? 'รอข่าวชัดก่อนเพิ่มน้ำหนัก / ห้ามไล่ราคา' : newsScore >= 60 ? 'ติดตามต่อ ถ้าราคาเหนือ VWAP พร้อม volume ค่อย follow' : 'เฝ้าดูข่าวใหม่ก่อนตัดสินใจ'
    }),
    makeFactor({
      dimension: 'เทคนิค / Trend + MA + VWAP',
      score: technicalScore,
      weight: 11,
      confidence: 78,
      priceImpact: technicalScore >= 60 ? 'หนุนราคา' : technicalScore <= 40 ? 'กดดันราคา' : 'แกว่งตัว',
      timeframe: '1-5 วัน',
      explanation: `ราคา ${formatMoney(tech.last)} เทียบ MA20 ${formatMoney(tech.ma20)}, VWAP20 ${formatMoney(tech.vwap20)}, MACD histogram ${tech.macd.histogram}`,
      watch: 'ยืนเหนือ VWAP20/MA20 ได้หรือไม่ และ MACD histogram พลิกบวกหรือไม่',
      action: tech.last > tech.vwap20 ? 'ถือ/Follow ได้เฉพาะเมื่อ volume สนับสนุน' : 'รอให้ราคากลับขึ้นเหนือ VWAP ก่อน'
    }),
    makeFactor({
      dimension: 'แนวรับ / แนวต้าน / Stop-loss',
      score: rrScore,
      weight: 10,
      confidence: 80,
      priceImpact: rr >= 1.5 ? 'Risk/Reward พอใช้' : 'Risk/Reward ยังไม่คุ้ม',
      timeframe: 'ระยะสั้น',
      explanation: `แนวรับ ${formatMoney(support)} (${levels.supportSource || 'ข้อมูลราคา'}), แนวต้าน ${formatMoney(resistance)} (${levels.resistanceSource || 'ข้อมูลราคา'}), Stop-loss ${formatMoney(stopLoss)}, R/R ≈ ${rr.toFixed(2)}`,
      watch: 'ราคาหลุดแนวรับหรือหลุด stop-loss หรือไม่',
      action: rr >= 1.5 ? 'วางแผนเข้าเป็นไม้เล็กและตั้ง Stop-loss ชัดเจน' : 'ยังไม่ควรเข้าใหม่จนกว่า R/R จะดีขึ้น'
    }),
    makeFactor({
      dimension: 'Dilution / Offering Risk',
      score: dilutionScore,
      weight: 12,
      confidence: articles.length ? 70 : 40,
      priceImpact: dilutionScore < 45 ? 'กดดันราคาแรง' : 'ยังไม่พบแรงกดดันเด่น',
      timeframe: 'หลายวัน-หลายสัปดาห์',
      explanation: dilutionRisk ? `พบคำ/บริบทเกี่ยวกับ offering หรือ dilution ${dilutionRisk} จุด เป็นความเสี่ยงสำคัญของหุ้นขนาดเล็ก` : 'ยังไม่พบสัญญาณ offering/dilution เด่นจากข่าวที่ดึงได้',
      watch: 'S-1, ATM offering, registered direct offering, warrant, share issuance',
      action: dilutionScore < 45 ? 'ลดความเสี่ยงทันทีถ้ามีข่าวเพิ่มทุน / ไม่ถือข้ามข่าว' : 'ติดตาม SEC filing ต่อเนื่อง'
    }),
    makeFactor({
      dimension: 'SEC Filing / Corporate Action',
      score: secScore,
      weight: 9,
      confidence: articles.length ? 68 : 38,
      priceImpact: secScore < 45 ? 'เสี่ยงกดดันราคา' : 'ยังไม่ชัด',
      timeframe: '1 วัน-หลายสัปดาห์',
      explanation: secRisk ? `พบคำเกี่ยวกับ SEC/corporate action ${secRisk} จุด ต้องตรวจเอกสารต้นทาง` : 'ยังไม่พบสัญญาณ SEC/corporate action เด่นจากข่าวที่ดึงได้',
      watch: '8-K, 10-Q, S-1, reverse split, delisting notice, going concern',
      action: 'กดลิงก์ SEC EDGAR ตรวจเอกสารจริงก่อนถือข้ามวัน'
    }),
    makeFactor({
      dimension: 'Liquidity / Float Risk',
      score: liquidityScore,
      weight: 8,
      confidence: 62,
      priceImpact: liquidityScore < 45 ? 'เสี่ยงเหวี่ยงแรง' : 'สภาพคล่องพอใช้',
      timeframe: 'Intraday-3 วัน',
      explanation: `ใช้ราคา ${formatMoney(last)}, ATR ${(tech.atrPct * 100).toFixed(2)}%, Volume ratio ${tech.volRatio}x เป็น proxy ของสภาพคล่อง`,
      watch: 'Spread, volume แห้ง, แท่งราคากระโดด, ไส้เทียนยาว',
      action: liquidityScore < 45 ? 'ลดขนาดไม้และห้ามใช้ market order' : 'ใช้ limit order และตั้ง stop ตามแผน'
    }),
    makeFactor({
      dimension: 'Short Interest / Squeeze Risk',
      score: squeezeScore,
      weight: 7,
      confidence: squeezeMentions ? 55 : 32,
      priceImpact: squeezeScore >= 65 ? 'มีโอกาส squeeze แต่เสี่ยง trap' : 'ยังไม่เห็น squeeze ชัด',
      timeframe: 'Intraday-1 สัปดาห์',
      explanation: `ใช้ mention เรื่อง short/squeeze ${squeezeMentions} จุด + volume/ATR เป็น proxy เพราะยังไม่มีข้อมูล short interest real-time`,
      watch: 'Short interest, borrow fee, float, volume spike, ข่าว catalyst',
      action: squeezeScore >= 65 ? 'Follow เฉพาะเมื่อเบรกแนวต้านพร้อม volume สูงผิดปกติ' : 'อย่าเล่นตามกระแส squeeze โดยไม่มี volume จริง'
    }),
    makeFactor({
      dimension: 'Smart Money / เงินใหญ่',
      score: smartScore,
      weight: 11,
      confidence: 64,
      priceImpact: smartScore >= 60 ? 'เริ่มมีร่องรอยสะสม' : smartScore <= 40 ? 'เงินใหญ่ยังไม่หนุน' : 'ยังไม่ชัด',
      timeframe: '1-10 วัน',
      explanation: smartMoney ? `Smart Money ${smartMoney.score}/100 = ${smartMoney.interpretation.label}; ใช้ OBV, CMF, MFI, CVD proxy, VWAP, Volume profile และ absorption` : 'ยังไม่มีข้อมูล Smart Money',
      watch: 'OBV/CMF/MFI พลิกบวก, CVD proxy สะสม, ราคายืนเหนือ VWAP',
      action: smartScore >= 60 ? 'รอ pullback เหนือ VWAP หรือ breakout พร้อม volume เพื่อ follow' : 'รอเงินใหญ่ชัดก่อน'
    }),
    makeFactor({
      dimension: 'Social Media / กระแสตลาด',
      score: socialScore,
      weight: 6,
      confidence: socialSummary.confidence || 35,
      priceImpact: socialScore >= 60 ? 'หนุนโมเมนตัมสั้น' : socialScore <= 40 ? 'กดดัน/เสี่ยงปั่น' : 'กลาง',
      timeframe: 'Intraday-3 วัน',
      explanation: `Facebook/X/Reddit/Stocktwits/YouTube: ${socialSummary.thaiSummary || 'ข้อมูลจำกัด'} Heat ${socialSummary.heatScore || 0}/100, Hype ${socialSummary.hypeRisk || 0}/100`,
      watch: 'โพสต์ไวรัล, cashtag, pump language, ข่าวลือที่ไม่มีแหล่งยืนยัน',
      action: Number(socialSummary.hypeRisk || 0) >= 65 ? 'ระวังไล่ราคาเพราะกระแสปั่น' : 'ใช้ Social เป็นตัวประกอบ ไม่ใช้เป็นเหตุผลหลัก'
    }),
    makeFactor({
      dimension: 'Volume / Unusual Activity',
      score: volumeScore,
      weight: 7,
      confidence: 75,
      priceImpact: volumeScore >= 60 ? 'หนุนการเคลื่อนไหว' : volumeScore <= 40 ? 'แรงซื้อไม่พอ' : 'ปกติ',
      timeframe: 'Intraday-3 วัน',
      explanation: `Volume ratio = ${tech.volRatio}x เทียบค่าเฉลี่ย 20 วัน และผลตอบแทน 1 วัน ${(tech.dayChange * 100).toFixed(2)}%`,
      watch: 'Volume เข้าเหนือ 1.5x ขณะราคาเบรก หรือ volume ขายสูงเมื่อหลุดแนวรับ',
      action: tech.volRatio > 1.4 && tech.dayChange > 0 ? 'รอปิดเหนือแนวต้านเพื่อยืนยัน' : 'ยังไม่ถือว่า volume ยืนยัน'
    }),
    makeFactor({
      dimension: 'RSI / ภาวะซื้อมากขายมาก',
      score: rsiScore(tech.rsi14),
      weight: 5,
      confidence: 78,
      priceImpact: tech.rsi14 > 70 ? 'เสี่ยงพักตัว' : tech.rsi14 < 30 ? 'มีโอกาสเด้งเทคนิค' : 'สมดุล',
      timeframe: '1-5 วัน',
      explanation: `RSI14 = ${tech.rsi14}; ต่ำกว่า 30 คือขายมากเกิน สูงกว่า 70 คือเริ่มร้อนแรง`,
      watch: 'RSI divergence และการกลับมายืนเหนือ 50',
      action: tech.rsi14 > 70 ? 'ไม่ไล่ราคา รอย่อ' : tech.rsi14 < 30 ? 'รอแท่งกลับตัวก่อนเด้ง' : 'ใช้ร่วมกับ VWAP/Volume'
    }),
    makeFactor({
      dimension: 'MACD / Momentum Confirmation',
      score: clamp(Math.round(50 + (tech.macd.histogram > 0 ? 18 : -18) + clamp(tech.macd.histogram / Math.max(last * 0.01, 0.001), -20, 20)), 0, 100),
      weight: 5,
      confidence: 76,
      priceImpact: tech.macd.histogram > 0 ? 'โมเมนตัมดีขึ้น' : 'โมเมนตัมยังลบ',
      timeframe: '1-10 วัน',
      explanation: `MACD histogram = ${tech.macd.histogram}; ใช้ยืนยันว่าการเด้งมี momentum จริงหรือไม่`,
      watch: 'MACD histogram พลิกบวกต่อเนื่อง 2-3 วัน',
      action: tech.macd.histogram > 0 ? 'ใช้เป็นสัญญาณเสริม ไม่ใช่สัญญาณเข้าเดี่ยว' : 'รอ momentum พลิกกลับ'
    }),
    makeFactor({
      dimension: 'Pre-market / After-hours Risk',
      score: preMarketScore,
      weight: 4,
      confidence: 30,
      priceImpact: 'ข้อมูลจำกัด',
      timeframe: 'ก่อนตลาด/หลังตลาด',
      explanation: 'ระบบยังไม่มี pre-market/after-hours real-time จึงใช้ ATR และความแรงแท่งล่าสุดเป็น proxy',
      watch: 'ราคา pre-market, after-hours, gap up/down, ข่าวออกนอกเวลาตลาด',
      action: 'ตรวจ pre-market จาก broker/TradingView ก่อนตัดสินใจทุกครั้ง'
    }),
    makeFactor({
      dimension: 'Catalyst Calendar',
      score: catalystScore,
      weight: 5,
      confidence: articles.length ? 55 : 25,
      priceImpact: catalystScore >= 60 ? 'มีตัวเร่งราคา' : 'ยังไม่มี catalyst ชัด',
      timeframe: '1 วัน-1 เดือน',
      explanation: contractMentions ? `พบบริบท contract/partnership/award ${contractMentions} จุด` : 'ยังไม่พบ catalyst ชัดจากข่าวที่ดึงได้',
      watch: 'งบ, conference, contract, shareholder meeting, regulatory approval, product launch',
      action: 'ทำ watchlist วันที่ข่าว/งบออก และหลีกเลี่ยงถือเต็มไม้ก่อน event เสี่ยง'
    }),
    makeFactor({
      dimension: 'Market Regime / ภาวะตลาดรวม',
      score: marketRegimeScore,
      weight: 4,
      confidence: 35,
      priceImpact: 'ข้อมูลตลาดรวมจำกัด',
      timeframe: '1-5 วัน',
      explanation: 'ยังไม่ได้ต่อข้อมูล SPY/QQQ/VIX แบบ real-time จึงใช้ trend ของหุ้นเป็น proxy ชั่วคราว',
      watch: 'SPY, QQQ, Russell 2000, VIX, ดอกเบี้ย, ข่าว Fed',
      action: 'ถ้าตลาดรวม Risk-off ให้ลดขนาดไม้ แม้หุ้นเดี่ยวมีข่าวดี'
    }),
    makeFactor({
      dimension: 'Sector Strength / ความแข็งแรงกลุ่ม',
      score: sectorScore,
      weight: 4,
      confidence: 32,
      priceImpact: 'ต้องยืนยันด้วย sector ETF',
      timeframe: '1-2 สัปดาห์',
      explanation: 'ยังไม่ได้ต่อข้อมูล sector ETF จึงใช้ข่าวและ trend ของหุ้นเป็น proxy',
      watch: 'หุ้นกลุ่มเดียวกัน, sector ETF, peer comparison',
      action: 'ถ้าหุ้นอ่อนกว่ากลุ่ม ให้ระวังว่าเป็นปัญหาเฉพาะตัว'
    }),
    makeFactor({
      dimension: 'Risk/Reward',
      score: rrScore,
      weight: 8,
      confidence: 78,
      priceImpact: rr >= 2 ? 'คุ้มเสี่ยง' : rr >= 1.2 ? 'พอรับได้' : 'ยังไม่คุ้ม',
      timeframe: 'ตามแผนเทรด',
      explanation: `Upside ถึงแนวต้าน ${formatMoney(resistance)} เทียบ downside ถึง stop ${formatMoney(stopLoss)} ได้ R/R ≈ ${rr.toFixed(2)}`,
      watch: 'ถ้าแนวต้านใกล้เกินไป หรือ stop กว้างเกินไป R/R จะไม่คุ้ม',
      action: rr >= 1.5 ? 'เข้าได้เฉพาะตาม trigger และแบ่งไม้' : 'รอราคาย่อใกล้แนวรับหรือรอแนวต้านใหม่'
    }),
    makeFactor({
      dimension: 'Data Quality / คุณภาพข้อมูล',
      score: dataQualityScore,
      weight: 6,
      confidence: dataQualityScore,
      priceImpact: dataQualityScore < 50 ? 'ความเสี่ยงวิเคราะห์ผิดสูง' : 'ข้อมูลพอใช้',
      timeframe: 'ทุกกรอบเวลา',
      explanation: `ใช้ข้อมูลราคา, ข่าว ${articles.length} รายการ, Social confidence ${socialSummary.confidence || 0}%, Prediction confidence ${prediction.confidence}%`,
      watch: 'ข้อมูลขาด, API fallback, ข่าวล่าช้า, social ดึงได้ไม่ครบ',
      action: dataQualityScore < 50 ? 'ต้องตรวจข้อมูลต้นทางเองก่อนเทรด' : 'ใช้ระบบเป็นตัวช่วยและทวนสอบจากกราฟจริง'
    })
  ];

  return rows.map((row, index) => ({
    ...row,
    index: index + 1,
    symbol,
    company: profile.company
  }));
}

function makeFactor({ dimension, score, weight, confidence, priceImpact, timeframe, explanation, watch, action }) {
  const s = clamp(Math.round(Number(score) || 0), 0, 100);
  const c = clamp(Math.round(Number(confidence) || 0), 0, 100);
  return {
    dimension,
    score: s,
    scoreText: `${s}/100`,
    status: factorStatus(s),
    weight: `${weight}%`,
    weightValue: weight,
    confidence: confidenceLabel(c),
    confidenceScore: c,
    priceImpact,
    timeframe,
    explanation,
    watch,
    action
  };
}

function factorStatus(score) {
  if (score >= 85) return 'แข็งแรงมาก';
  if (score >= 70) return 'แข็งแรง';
  if (score >= 55) return 'กลางบวก';
  if (score >= 40) return 'กลาง/รอดู';
  if (score >= 20) return 'อ่อน/ควรระวัง';
  return 'อ่อนมาก/เสี่ยงสูง';
}

function confidenceLabel(score) {
  if (score >= 75) return `สูง ${score}%`;
  if (score >= 50) return `กลาง ${score}%`;
  return `ต่ำ ${score}%`;
}

function keywordCount(text, keywords) {
  const t = String(text || '').toLowerCase();
  return keywords.reduce((count, keyword) => count + (t.includes(keyword.toLowerCase()) ? 1 : 0), 0);
}

function rsiScore(value) {
  const r = Number(value);
  if (!Number.isFinite(r)) return 50;
  if (r < 20) return 42;
  if (r < 30) return 58;
  if (r <= 60) return 62;
  if (r <= 70) return 55;
  if (r <= 80) return 38;
  return 24;
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
