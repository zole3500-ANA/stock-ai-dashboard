import { fetchNews } from './news.js';
import { fetchPriceHistory } from './stockData.js';
import { buildFactors, nextDayPrediction, profileForSymbol } from './prediction.js';
import { marketSymbol, normalizeTicker } from './utils.js';
import { buildAgentAnalyses } from './agents.js';

export async function analyzeSymbol({ symbol = 'BURU', market = 'AMEX', days = 90, newsDays = 7 } = {}) {
  const ticker = normalizeTicker(symbol);
  const [historyResult, newsResult] = await Promise.all([
    fetchPriceHistory(ticker, days),
    fetchNews(ticker, newsDays)
  ]);

  const prediction = nextDayPrediction(ticker, historyResult.history, newsResult.articles);
  const factors = buildFactors(ticker, prediction, newsResult.articles);
  const profile = profileForSymbol(ticker);
  const summary = buildSummary(prediction, factors, newsResult.fallback, historyResult.source);
  const agents = buildAgentAnalyses({
    symbol: ticker,
    market,
    profile,
    prediction,
    factors,
    articles: newsResult.articles,
    history: historyResult.history
  });

  return {
    symbol: ticker,
    market: String(market || 'AMEX').toUpperCase(),
    tradingViewSymbol: marketSymbol(market, ticker),
    generatedAt: new Date().toISOString(),
    profile,
    summary,
    dataSources: {
      price: historyResult.source,
      news: newsResult.source,
      newsFallback: newsResult.fallback
    },
    history: historyResult.history,
    news: newsResult.articles,
    prediction,
    factors,
    agents,
    externalLinks: externalLinks(ticker, newsResult.query)
  };
}

function buildSummary(prediction, factors, newsFallback, priceSource) {
  const label = prediction.predictedReturn > 0.012 ? 'น่าสนใจระยะสั้น' : prediction.predictedReturn < -0.012 ? 'ต้องระวัง' : 'รอสัญญาณยืนยัน';
  const risk = prediction.technical.atrPct > 0.06 ? 'สูง' : prediction.technical.atrPct > 0.035 ? 'กลาง-สูง' : 'กลาง';
  return {
    label,
    risk,
    headline: prediction.verdict,
    text: `ระบบมองว่าแนวโน้มวันถัดไปคือ ${prediction.direction} โดยใช้ราคา ${priceSource}, ข่าว${newsFallback ? 'สำรอง/ลิงก์ตรวจสอบ' : 'สด'}, RSI, Volume, VWAP, MACD และ ATR ประกอบ`,
    actionPlan: buildActionPlan(prediction)
  };
}

function buildActionPlan(prediction) {
  const tech = prediction.technical;
  const support = prediction.profile.support || prediction.rangeLow;
  const resistance = prediction.profile.resistance || prediction.rangeHigh;
  const stop = prediction.profile.stopLoss || Math.max(0.01, support - tech.atr14 * 0.35);
  return {
    support,
    resistance,
    stopLoss: stop,
    plan: [
      `ไม่ไล่ซื้อถ้าราคาเปิดกระโดดเกินกรอบ ${prediction.rangeHigh} โดยไม่มี volume สนับสนุน`,
      `กรณีราคายืนเหนือ VWAP20 ${tech.vwap20} และ volume > 1.2x ให้พิจารณาเป็นสัญญาณฟื้นระยะสั้น`,
      `ถ้าหลุดแนวรับ ${support} หรือหลุด stop-loss ${stop} ให้ลดความเสี่ยงทันที`,
      `ตรวจข่าวก่อนตลาดเปิด โดยเฉพาะ offering, dilution, SEC filing, contract, analyst action และ delisting notice`
    ]
  };
}

function externalLinks(ticker, companyQuery) {
  const q1 = encodeURIComponent(`${ticker} stock news last 7 days`);
  const q2 = encodeURIComponent(`${companyQuery} stock SEC filing offering dilution`);
  return {
    googleNews: `https://www.google.com/search?q=${q1}`,
    yahooFinance: `https://finance.yahoo.com/quote/${ticker}/news`,
    nasdaqNews: `https://www.nasdaq.com/market-activity/stocks/${ticker.toLowerCase()}/news-headlines`,
    secEdgar: `https://www.sec.gov/edgar/search/#/q=${q2}`,
    stocktwits: `https://stocktwits.com/symbol/${ticker}`
  };
}
