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
      support: 1.20, resistance: 1.70, stopLoss: 1.15
    },
    IREN: {
      company: 'IREN Limited', score: 66, riskLevel: 'กลาง-สูง',
      thesis: 'ได้ sentiment จาก Bitcoin และ AI infrastructure แต่ volatility สูง ต้องรอจังหวะ',
      support: 9.80, resistance: 13.50, stopLoss: 9.20
    },
    NVDA: {
      company: 'NVIDIA Corp.', score: 74, riskLevel: 'กลาง',
      thesis: 'หุ้นผู้นำกลุ่ม AI แต่ต้องระวัง valuation และแรงขายทำกำไร',
      support: 118, resistance: 145, stopLoss: 112
    },
    AAPL: {
      company: 'Apple Inc.', score: 61, riskLevel: 'กลาง',
      thesis: 'พื้นฐานแข็ง แต่โมเมนตัมขึ้นกับ product cycle และ market sentiment',
      support: 190, resistance: 215, stopLoss: 184
    }
  };
  return { ...DEFAULT_PROFILE, ...(profiles[t] || { company: `${t} Corp.`, thesis: 'ระบบประเมินจากราคา ข่าว และตัวชี้วัดเทคนิคแบบอัตโนมัติ' }) };
}

export function nextDayPrediction(symbol, history, articles = []) {
  const profile = profileForSymbol(symbol);
  const tech = technicalSnapshot(history);
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
    reasoning: buildReasoning({ profile, tech, newsScore, components, rawSignal, predictedReturn, predictedPrice, rangeLow, rangeHigh, confidence, direction })
  };
}

export function buildFactors(symbol, prediction, articles = []) {
  const tech = prediction.technical;
  const profile = prediction.profile;
  const newsLabel = prediction.newsSentiment > 0.2 ? 'ข่าวบวก' : prediction.newsSentiment < -0.2 ? 'ข่าวลบ' : 'ข่าวกลาง';

  return [
    ['ข่าว', newsLabel, `คะแนนข่าวรวม ${prediction.newsSentiment} จาก -1 ถึง +1 โดยถ่วงน้ำหนักตามผลกระทบของข่าว`],
    ['สถานการณ์ราคา', prediction.verdict, `ราคา ${formatMoney(tech.last)} เทียบ MA20 ${formatMoney(tech.ma20)} และ VWAP ${formatMoney(tech.vwap20)}`],
    ['กระแสข่าวออนไลน์', articles.length ? 'ติดตามได้' : 'ข้อมูลจำกัด', `ใช้คะแนน sentiment จากหัวข่าวและข่าว ${articles.length} รายการ`],
    ['รายใหญ่ / Big Money', tech.volRatio > 1.4 ? 'เริ่มเคลื่อนไหว' : 'ยังเงียบ', `Volume ล่าสุด ${tech.volRatio}x ของค่าเฉลี่ย 20 วัน`],
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
  const { profile, tech, newsScore, components, rawSignal, predictedReturn, predictedPrice, rangeLow, rangeHigh, confidence, direction } = ctx;
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
