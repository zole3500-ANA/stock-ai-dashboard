import { fetchNews } from './news.js';
import { fetchPriceHistory } from './stockData.js';
import { buildFactors, nextDayPrediction, profileForSymbol } from './prediction.js';
import { marketSymbol, normalizeTicker } from './utils.js';
import { buildAgentAnalyses } from './agents.js';
import { fetchSocialAnalysis } from './social.js';
import { buildSmartMoneyAnalysis } from './smartMoney.js';
import { interpretScore } from './score.js';

export async function analyzeSymbol({ symbol = 'BURU', market = 'AMEX', days = 90, newsDays = 7 } = {}) {
  const ticker = normalizeTicker(symbol);
  const [historyResult, newsResult, socialResult] = await Promise.all([
    fetchPriceHistory(ticker, days),
    fetchNews(ticker, newsDays),
    fetchSocialAnalysis(ticker, newsDays)
  ]);

  const prediction = nextDayPrediction(ticker, historyResult.history, newsResult.articles);
  const smartMoney = buildSmartMoneyAnalysis(ticker, historyResult.history, prediction);
  const factors = buildFactors(ticker, prediction, newsResult.articles, socialResult, smartMoney);
  const profile = profileForSymbol(ticker);
  const summary = buildSummary(prediction, factors, newsResult.fallback, historyResult.source);
  const agents = buildAgentAnalyses({
    symbol: ticker,
    market,
    profile,
    prediction,
    factors,
    articles: newsResult.articles,
    social: socialResult,
    history: historyResult.history,
    smartMoney
  });

  return {
    symbol: ticker,
    market: String(market || 'AMEX').toUpperCase(),
    tradingViewSymbol: marketSymbol(market, ticker),
    generatedAt: new Date().toISOString(),
    profile: { ...profile, scoreInterpretation: interpretScore(profile.score, 'overall') },
    scoreInterpretation: interpretScore(profile.score, 'overall'),
    summary,
    dataSources: {
      price: historyResult.source,
      news: newsResult.source,
      newsFallback: newsResult.fallback,
      social: socialResult.summary
    },
    history: historyResult.history,
    news: newsResult.articles,
    prediction,
    factors,
    social: socialResult,
    smartMoney,
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
  const levels = prediction.levels || {};
  const support = levels.support ?? prediction.rangeLow;
  const resistance = levels.resistance ?? prediction.rangeHigh;
  const stop = levels.stopLoss ?? Math.max(0.01, support - tech.atr14 * 0.35);
  return {
    support,
    resistance,
    stopLoss: stop,
    supportSource: levels.supportSource || 'คำนวณจากกรอบราคา',
    resistanceSource: levels.resistanceSource || 'คำนวณจากกรอบราคา',
    stopLossSource: levels.stopLossSource || 'ต่ำกว่าแนวรับตาม ATR',
    latestPrice: levels.latestPrice || tech.last,
    plan: [
      `ไม่ไล่ซื้อถ้าราคาเปิดกระโดดเกินกรอบ ${prediction.rangeHigh} โดยไม่มี volume สนับสนุน`,
      `กรณีราคายืนเหนือ VWAP20 ${tech.vwap20} และ volume > 1.2x ให้พิจารณาเป็นสัญญาณฟื้นระยะสั้น`,
      `แนวรับ ${support} มาจาก ${levels.supportSource || 'ข้อมูลราคา'} และแนวต้าน ${resistance} มาจาก ${levels.resistanceSource || 'ข้อมูลราคา'}`,
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
    stocktwits: `https://stocktwits.com/symbol/${ticker}`,
    xSearch: `https://x.com/search?q=%24${ticker}&src=typed_query&f=live`,
    facebookSearch: `https://www.facebook.com/search/posts/?q=${encodeURIComponent(`${ticker} stock`)}`,
    redditSearch: `https://www.reddit.com/search/?q=${encodeURIComponent(`${ticker} stock`)}`,
    youtubeSearch: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${ticker} stock analysis`)}`
  };
}
