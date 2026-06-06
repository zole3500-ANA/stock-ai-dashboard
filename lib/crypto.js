import { clamp, round } from './utils.js';

const CRYPTO_ALIASES = {
  BTC: 'BTC-USD',
  BITCOIN: 'BTC-USD',
  'BTC-USD': 'BTC-USD',
  ETH: 'ETH-USD',
  ETHEREUM: 'ETH-USD',
  'ETH-USD': 'ETH-USD',
  SOL: 'SOL-USD',
  SOLANA: 'SOL-USD',
  'SOL-USD': 'SOL-USD',
  DOGE: 'DOGE-USD',
  DOGECOIN: 'DOGE-USD',
  'DOGE-USD': 'DOGE-USD'
};

const CRYPTO_PROFILES = {
  'BTC-USD': {
    company: 'Bitcoin / BTC',
    score: 72,
    riskLevel: 'กลาง-สูง',
    thesis: 'Bitcoin เป็นสินทรัพย์หลักของตลาดคริปโต ราคาได้รับผลจาก ETF flow, macro liquidity, dollar index, risk appetite, funding rate, open interest, whale movement และกระแส social',
    assetName: 'Bitcoin',
    base: 'BTC',
    quote: 'USD'
  },
  'ETH-USD': {
    company: 'Ethereum / ETH',
    score: 66,
    riskLevel: 'กลาง-สูง',
    thesis: 'Ethereum ได้แรงหนุนจาก ecosystem, staking, L2, ETF narrative และ on-chain activity แต่ยังผันผวนตาม BTC และ funding ในตลาด derivatives',
    assetName: 'Ethereum',
    base: 'ETH',
    quote: 'USD'
  },
  'SOL-USD': {
    company: 'Solana / SOL',
    score: 62,
    riskLevel: 'สูง',
    thesis: 'Solana มีโมเมนตัม ecosystem และ social สูง แต่ผันผวนแรง ต้องจับตา volume, chain activity และ risk-on/risk-off ของตลาดคริปโต',
    assetName: 'Solana',
    base: 'SOL',
    quote: 'USD'
  },
  'DOGE-USD': {
    company: 'Dogecoin / DOGE',
    score: 52,
    riskLevel: 'สูงมาก',
    thesis: 'Dogecoin ขึ้นกับ social hype, liquidity และ momentum เป็นหลัก เหมาะกับการใช้ risk management เข้มงวดและไม่ไล่ราคา',
    assetName: 'Dogecoin',
    base: 'DOGE',
    quote: 'USD'
  }
};

export function isCryptoMode(assetType, market, symbol) {
  const a = String(assetType || '').toLowerCase();
  const m = String(market || '').toUpperCase();
  const s = String(symbol || '').toUpperCase();
  return a === 'crypto' || m === 'CRYPTO' || s.endsWith('-USD') || ['BTC', 'BITCOIN', 'ETH', 'SOL', 'DOGE'].includes(s);
}

export function normalizeCryptoSymbol(input) {
  const raw = String(input || 'BTC').trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '');
  return CRYPTO_ALIASES[raw] || (raw.includes('-') ? raw : `${raw || 'BTC'}-USD`);
}

export function cryptoTradingViewSymbol(symbol) {
  const s = normalizeCryptoSymbol(symbol);
  const base = s.replace(/-USD$/i, '').replace(/[^A-Z0-9]/g, '');
  const exchange = base === 'BTC' || base === 'ETH' || base === 'SOL' || base === 'DOGE' ? 'COINBASE' : 'BINANCE';
  return `${exchange}:${base}USD`;
}

export function cryptoProfileForSymbol(symbol) {
  const s = normalizeCryptoSymbol(symbol);
  return { ...(CRYPTO_PROFILES[s] || {
    company: `${s.replace('-USD', '')} / USD`,
    score: 55,
    riskLevel: 'สูง',
    thesis: 'คริปโตมีความผันผวนสูง ต้องวิเคราะห์ร่วมกันทั้งราคา, volume, macro, funding/open interest, whale movement, exchange flow และ social hype',
    assetName: s.replace('-USD', ''),
    base: s.replace('-USD', ''),
    quote: 'USD'
  }) };
}

export function cryptoExternalLinks(symbol, query) {
  const s = normalizeCryptoSymbol(symbol);
  const base = s.replace('-USD', '');
  const name = encodeURIComponent(query || base);
  return {
    googleNews: `https://www.google.com/search?q=${encodeURIComponent(`${base} Bitcoin crypto news last 7 days`)}`,
    yahooFinance: `https://finance.yahoo.com/quote/${s}/news`,
    coinMarketCap: `https://coinmarketcap.com/currencies/${base === 'BTC' ? 'bitcoin' : base.toLowerCase()}/`,
    coingecko: `https://www.coingecko.com/en/search_redirect?id=${base.toLowerCase()}&type=coin`,
    tradingView: `https://www.tradingview.com/symbols/${base}USD/`,
    xSearch: `https://x.com/search?q=${encodeURIComponent(`${base} crypto`)}`,
    redditSearch: `https://www.reddit.com/search/?q=${encodeURIComponent(`${base} crypto`)}`,
    youtubeSearch: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${base} crypto analysis`)}`,
    googleTrends: `https://trends.google.com/trends/explore?q=${name}`
  };
}

export function buildCryptoSummary(prediction, newsFallback, priceSource) {
  const tech = prediction.technical;
  const label = prediction.predictedReturn > 0.012 ? 'คริปโตเริ่มน่าสนใจระยะสั้น' : prediction.predictedReturn < -0.012 ? 'คริปโตต้องระวังแรงขาย' : 'คริปโตรอสัญญาณยืนยัน';
  const risk = tech.atrPct > 0.055 ? 'สูง' : tech.atrPct > 0.035 ? 'กลาง-สูง' : 'กลาง';
  return {
    label,
    risk,
    headline: prediction.verdict,
    text: `โหมด Bitcoin/Crypto ใช้ราคา ${priceSource}, ข่าวคริปโต${newsFallback ? 'สำรอง/ลิงก์ตรวจสอบ' : 'สด'}, RSI, Volume, VWAP, MACD, ATR, social hype และ proxy ของ whale/smart money ประกอบ`,
    actionPlan: buildCryptoActionPlan(prediction)
  };
}

function buildCryptoActionPlan(prediction) {
  const tech = prediction.technical || {};
  const levels = prediction.levels || {};
  const support = levels.support ?? prediction.rangeLow;
  const resistance = levels.resistance ?? prediction.rangeHigh;
  const stop = levels.stopLoss ?? Math.max(0.01, support - (tech.atr14 || 0) * 0.35);
  return {
    support,
    resistance,
    stopLoss: stop,
    supportSource: levels.supportSource || 'แนวรับจากโครงสร้างราคา/ATR',
    resistanceSource: levels.resistanceSource || 'แนวต้านจากโครงสร้างราคา/ATR',
    stopLossSource: levels.stopLossSource || 'ต่ำกว่าแนวรับตาม ATR',
    latestPrice: levels.latestPrice || tech.last,
    plan: [
      `Bitcoin/Crypto ไม่ควรไล่ราคาถ้าเปิดแท่งแรงเกินกรอบ ${prediction.rangeHigh} โดยไม่มี spot volume ยืนยัน`,
      `ถ้าราคายืนเหนือ VWAP20 ${tech.vwap20} และ volume > 1.2x ให้ถือว่า momentum ระยะสั้นเริ่มดีขึ้น`,
      `ถ้าหลุดแนวรับ ${support} หรือหลุด stop-loss ${stop} ให้ลดความเสี่ยงทันที เพราะคริปโตมักเกิด liquidation cascade`,
      `จับตา funding rate, open interest, exchange inflow/outflow, whale movement, BTC dominance และข่าว ETF/macro ก่อนถือข้ามวัน`
    ]
  };
}

export function buildCryptoFactors(symbol, prediction, articles = [], social = null, smartMoney = null) {
  const tech = prediction.technical || {};
  const profile = cryptoProfileForSymbol(symbol);
  const socialSummary = social?.summary || {};
  const smartScore = Math.round(Number(smartMoney?.score ?? 50));
  const newsText = articles.map(a => `${a.title || ''} ${a.titleTh || ''} ${a.snippet || ''} ${a.snippetTh || ''}`).join(' ').toLowerCase();

  const macroMentions = keywordCount(newsText, ['fed', 'inflation', 'dollar', 'rates', 'yield', 'liquidity', 'macro', 'cpi', 'fomc', 'etf']);
  const regulationMentions = keywordCount(newsText, ['sec', 'regulation', 'lawsuit', 'ban', 'approval', 'etf', 'court']);
  const exchangeRiskMentions = keywordCount(newsText, ['exchange', 'hack', 'outflow', 'inflow', 'binance', 'coinbase', 'ftx', 'liquidation']);

  const technicalScore = clampScore(50 + (tech.trendScore || 0) * 55 + ((tech.macd?.histogram || 0) > 0 ? 8 : -8) + (tech.last > tech.vwap20 ? 8 : -8));
  const momentumScore = clampScore(50 + (tech.dayChange || 0) * 450 + (tech.weekChange || 0) * 110 + ((tech.volRatio || 1) - 1) * 18);
  const socialScore = clampScore(50 + Number(socialSummary.sentimentScore || 0) * 50 - Number(socialSummary.hypeRisk || 0) * 0.16);
  const whaleScore = smartScore;
  const exchangeFlowScore = clampScore(50 + (tech.last > tech.vwap20 ? 10 : -10) + ((tech.volRatio || 1) > 1.25 && (tech.dayChange || 0) > 0 ? 12 : 0) - exchangeRiskMentions * 12);
  const fundingScore = clampScore(55 - ((tech.atrPct || 0) > 0.065 ? 18 : 0) - (Math.abs(tech.dayChange || 0) > 0.06 ? 10 : 0));
  const liquidationScore = clampScore(65 - Math.min(42, (tech.atrPct || 0) * 520) - (Math.abs(tech.dayChange || 0) > 0.055 ? 12 : 0));
  const dominanceScore = clampScore(50 + (profile.base === 'BTC' ? 8 : -2) + (tech.weekChange > 0 ? 5 : -5));
  const macroScore = clampScore(50 + macroMentions * 5 + (tech.weekChange > 0 ? 6 : -6) - ((tech.atrPct || 0) > 0.06 ? 8 : 0));
  const regulationScore = clampScore(62 - regulationMentions * 10);
  const stablecoinScore = clampScore(52 + ((tech.volRatio || 1) > 1.1 ? 6 : -4) + (tech.dayChange > 0 ? 5 : -5));
  const rrScore = riskRewardScore(prediction);
  const dataQuality = clampScore(62 + (articles.length >= 5 ? 14 : articles.length >= 2 ? 7 : -4) + (prediction.confidence || 40) * 0.22);

  const rows = [
    factor('โครงสร้างราคา / Trend + VWAP', technicalScore, 12, 78, technicalScore >= 60 ? 'หนุนราคา' : technicalScore <= 40 ? 'กดดันราคา' : 'ยังไม่ชัด', '1-7 วัน',
      `ราคาเทียบ VWAP20 ${money(tech.vwap20)}, MA20 ${money(tech.ma20)}, MACD histogram ${tech.macd?.histogram ?? '-'}`,
      'ยืนเหนือ VWAP20/MA20 ได้หรือไม่ และ MACD พลิกบวกต่อเนื่องไหม',
      tech.last > tech.vwap20 ? 'ถือ/Follow ได้เฉพาะเมื่อ volume หนุน' : 'รอ reclaim VWAP ก่อน'),
    factor('Momentum / Volume Spike', momentumScore, 10, 76, momentumScore >= 60 ? 'หนุนโมเมนตัม' : 'ยังไม่ยืนยัน', 'Intraday-3 วัน',
      `Volume ratio ${tech.volRatio}x, 1D ${(tech.dayChange * 100).toFixed(2)}%, 5D ${(tech.weekChange * 100).toFixed(2)}%`,
      'Volume spike พร้อม breakout หรือ volume ขายเมื่อหลุดแนวรับ',
      momentumScore >= 60 ? 'Follow เฉพาะเมื่อเบรกพร้อม volume' : 'รอ volume ยืนยัน'),
    factor('Whale / Smart Money Proxy', whaleScore, 11, 62, whaleScore >= 60 ? 'มีร่องรอยสะสม' : whaleScore <= 40 ? 'ยังไม่หนุน' : 'ยังไม่ชัด', '1-10 วัน',
      smartMoney ? `Smart Money ${smartMoney.score}/100 ใช้ OBV, CMF, MFI, CVD proxy และ VWAP` : 'ยังไม่มีข้อมูล whale จริง ใช้ OHLCV proxy',
      'OBV/CMF/MFI/CVD proxy และการยืนเหนือ VWAP',
      whaleScore >= 60 ? 'รอ pullback เหนือ VWAP หรือ breakout' : 'รอสัญญาณสะสมชัดขึ้น'),
    factor('Exchange Inflow / Outflow Proxy', exchangeFlowScore, 8, 42, exchangeFlowScore >= 60 ? 'spot demand ดีขึ้น' : exchangeFlowScore <= 40 ? 'เสี่ยงขายเข้า exchange' : 'กลาง', '1-5 วัน',
      'ยังไม่มี on-chain exchange flow real-time จึงใช้ volume + trend + ข่าว exchange เป็น proxy',
      'เงินไหลเข้า exchange, ข่าว hack, exchange reserve, spot volume',
      'ตรวจ Glassnode/CryptoQuant/Coinglass เพิ่มก่อนถือข้ามข่าว'),
    factor('Funding Rate / Futures Bias Proxy', fundingScore, 7, 35, fundingScore < 45 ? 'เสี่ยง crowded trade' : 'ยังไม่ร้อนเกินไป', 'Intraday-3 วัน',
      'ยังไม่มี funding rate real-time จึงใช้ ATR และการวิ่งแรงระยะสั้นเป็น proxy',
      'funding rate, open interest, long/short ratio',
      fundingScore < 45 ? 'ลด leverage / ห้ามไล่ราคา' : 'ใช้ spot หรือขนาดไม้เล็กกว่า'),
    factor('Open Interest / Liquidation Risk Proxy', liquidationScore, 8, 36, liquidationScore < 45 ? 'เสี่ยง liquidation cascade' : 'ยังรับได้', 'Intraday-2 วัน',
      `ATR ${(tech.atrPct * 100).toFixed(2)}% และ day change ${(tech.dayChange * 100).toFixed(2)}% ใช้ประเมินความเสี่ยง squeeze/liquidation`,
      'OI เพิ่มเร็วผิดปกติ, funding สูง, แท่งไส้ยาว',
      liquidationScore < 45 ? 'ลดขนาดไม้และตั้ง stop เคร่งครัด' : 'รอ trigger ตามแผน'),
    factor('BTC Dominance / Market Regime', dominanceScore, 6, 35, dominanceScore >= 55 ? 'ตลาดคริปโตพอหนุน' : 'ยังไม่ชัด', '1-2 สัปดาห์',
      profile.base === 'BTC' ? 'Bitcoin เป็นตัวนำตลาดโดยตรง' : 'เหรียญ alt ต้องดู BTC dominance และ BTC trend ประกอบ',
      'BTC dominance, ETH/BTC, TOTAL2, TOTAL3',
      'ถ้า BTC อ่อนและ dominance เปลี่ยนเร็ว ให้ลดความเสี่ยง altcoin'),
    factor('Macro / ETF / Liquidity', macroScore, 9, articles.length ? 55 : 30, macroScore >= 60 ? 'macro เริ่มหนุน' : macroScore <= 40 ? 'macro กดดัน' : 'กลาง',
      '1 วัน-1 เดือน', `ข่าว macro/ETF/liquidity พบ ${macroMentions} จุด`, 'Fed, CPI, DXY, bond yield, BTC ETF flow, risk-on/risk-off',
      'ตรวจ calendar macro ก่อนถือข้าม event'),
    factor('Regulation / Policy Risk', regulationScore, 7, articles.length ? 58 : 30, regulationScore < 45 ? 'เสี่ยงกดดัน' : 'ยังไม่เด่น',
      'หลายวัน-หลายเดือน', `ข่าว regulation/SEC/ETF/court พบ ${regulationMentions} จุด`, 'SEC, ETF decision, court ruling, exchange rules',
      regulationScore < 45 ? 'ลด exposure จนข่าวชัด' : 'ติดตามข่าว regulation ต่อ'),
    factor('Stablecoin Liquidity Proxy', stablecoinScore, 5, 30, stablecoinScore >= 55 ? 'liquidity พอใช้' : 'liquidity ยังไม่เด่น',
      '1-2 สัปดาห์', 'ยังไม่มี stablecoin flow real-time จึงใช้ volume และ trend เป็น proxy', 'USDT/USDC supply, exchange stablecoin inflow',
      'ถ้า stablecoin liquidity ไม่หนุน ให้ลดการไล่ราคา'),
    factor('Social Hype / Crypto Narrative', socialScore, 8, socialSummary.confidence || 35, socialScore >= 60 ? 'กระแสหนุนสั้น' : socialScore <= 40 ? 'กระแสเสี่ยง/ลบ' : 'กลาง',
      'Intraday-3 วัน', `Social heat ${socialSummary.heatScore || 0}/100, Hype ${socialSummary.hypeRisk || 0}/100`, 'X, Reddit, YouTube, Google Trends, pump language',
      Number(socialSummary.hypeRisk || 0) >= 65 ? 'ห้ามใช้ social เป็นเหตุผลหลัก' : 'ใช้ social เป็นตัวเสริมเท่านั้น'),
    factor('Risk/Reward', rrScore, 10, 78, rrScore >= 60 ? 'คุ้มเสี่ยงพอใช้' : 'ยังไม่คุ้ม', 'ตามแผนเทรด',
      `แนวรับ ${money(prediction.levels?.support)}, แนวต้าน ${money(prediction.levels?.resistance)}, stop ${money(prediction.levels?.stopLoss)}`,
      'ถ้าแนวต้านใกล้เกินหรือ stop กว้างเกิน R/R จะไม่ดี',
      rrScore >= 60 ? 'เข้าเฉพาะตาม trigger และแบ่งไม้' : 'รอราคาย่อหรือรอแนวต้านใหม่'),
    factor('Data Quality / ข้อจำกัดข้อมูล Crypto', dataQuality, 7, dataQuality, dataQuality >= 60 ? 'ข้อมูลพอใช้' : 'ต้องทวนสอบเพิ่ม', 'ทุกกรอบเวลา',
      `ราคา ${prediction.confidence}% confidence, ข่าว ${articles.length} รายการ, social confidence ${socialSummary.confidence || 0}%`,
      'ไม่มี on-chain/funding/OI real-time ถ้าไม่ได้ต่อ API เพิ่ม',
      dataQuality < 55 ? 'ต้องตรวจ Coinglass/Glassnode/CryptoQuant เพิ่ม' : 'ใช้เป็นระบบช่วยตัดสินใจได้ แต่ต้องทวนสอบ')
  ];

  return rows.map((row, index) => ({ ...row, index: index + 1, symbol: normalizeSymbol(symbol), company: profile.company }));
}

function factor(dimension, score, weight, confidence, priceImpact, timeframe, explanation, watch, action) {
  const s = clampScore(score);
  return {
    dimension,
    score: s,
    scoreText: `${s}/100`,
    status: factorStatus(s),
    weight: `${weight}%`,
    weightValue: weight,
    confidence: confidenceLabel(confidence),
    confidenceScore: clampScore(confidence),
    priceImpact,
    timeframe,
    explanation,
    watch,
    action
  };
}

export function buildCryptoAgentAnalyses({ symbol, profile, prediction, factors = [], articles = [], social = null, smartMoney = null }) {
  const tech = prediction.technical || {};
  const socialSummary = social?.summary || {};
  const smartScore = Number(smartMoney?.score || 50);
  const macroFactor = findFactor(factors, 'Macro') || {};
  const whaleFactor = findFactor(factors, 'Whale') || {};
  const riskFactor = findFactor(factors, 'Liquidation') || {};
  const rrFactor = findFactor(factors, 'Risk/Reward') || {};

  return [
    {
      id: 'bo-gemini',
      name: 'โบ้ (Crypto Macro)',
      role: 'สาย Macro + ETF + Regulation + On-chain narrative',
      badge: 'คริปโตภาพใหญ่',
      score: clampScore((profile.score || 55) * 0.45 + (macroFactor.score || 50) * 0.35 + (whaleFactor.score || 50) * 0.2),
      verdict: macroFactor.status || 'รอภาพใหญ่ยืนยัน',
      summary: `${profile.company} ถูกประเมินจาก macro liquidity, ETF/regulation, whale proxy และข่าวคริปโต สรุปคือ ${macroFactor.status || 'ยังต้องรอข้อมูลยืนยัน'}`,
      sections: [
        { title: '1) ภาพใหญ่ของคริปโต', points: [
          `${profile.thesis}`,
          `Crypto Score พื้นฐาน = ${profile.score}/100 ระดับความเสี่ยง ${profile.riskLevel}`,
          `Macro/ETF/Liquidity = ${macroFactor.scoreText || '-'}; Regulation risk = ${(findFactor(factors, 'Regulation') || {}).scoreText || '-'}`,
          'ถ้า Fed/DXY/Yield กดดัน ตลาดคริปโตมัก risk-off แม้กราฟสั้นจะดูดี'
        ]},
        { title: '2) Whale / On-chain Proxy', points: [
          `Whale/Smart Money = ${whaleFactor.scoreText || '-'}`,
          smartMoney?.summary || 'ยังไม่มี on-chain whale real-time จึงใช้ OBV/CMF/MFI/CVD proxy',
          'ควรตรวจ exchange inflow/outflow และ whale transfer จากแหล่ง on-chain เพิ่มก่อนถือข้ามวัน'
        ]},
        { title: '3) ข่าวและความเสี่ยง', points: articles.slice(0,3).map(a => `${a.sentimentLabelTh || 'ข่าว'}: ${a.titleTh || a.title}` ).concat([
          'ข่าว ETF, regulation, exchange hack, stablecoin, liquidation และ macro event มีผลต่อ BTC มาก'
        ]).slice(0,4)}
      ]
    },
    {
      id: 'grok-racing',
      name: 'Grok (Crypto สายซิ่ง)',
      role: 'สาย Momentum + Social Hype + Squeeze/Liquidation',
      badge: 'คริปโตสายซิ่ง',
      score: clampScore((findFactor(factors, 'Momentum')?.score || 50) * 0.36 + (socialSummary.heatScore || 0) * 0.28 + (100 - (riskFactor.score || 50)) * 0.18 + (tech.volRatio || 1) * 8),
      verdict: (findFactor(factors, 'Momentum') || {}).status || 'รอ volume ยืนยัน',
      summary: `Grok มอง ${profile.company} ผ่านแรงโมเมนตัม, social heat, funding/OI proxy และ liquidation risk`,
      sections: [
        { title: '1) เชื้อไฟของราคา', points: [
          `Volume ratio = ${tech.volRatio}x, ATR = ${(tech.atrPct * 100).toFixed(2)}%, 1D = ${(tech.dayChange * 100).toFixed(2)}%`,
          `Momentum = ${(findFactor(factors, 'Momentum') || {}).scoreText || '-'}`,
          `Liquidation risk proxy = ${riskFactor.scoreText || '-'}`,
          'ถ้า volume spike + social heat สูง + ราคาเบรกแนวต้าน อาจวิ่งแรง แต่ถ้า funding/OI crowded เสี่ยงโดน long squeeze'
        ]},
        { title: '2) Social และ Narrative', points: [
          `Social tone = ${socialSummary.dominantTone || '-'}, Heat = ${socialSummary.heatScore || 0}/100, Hype = ${socialSummary.hypeRisk || 0}/100`,
          'X/Reddit/YouTube มีผลกับคริปโตมาก แต่ต้องแยก narrative จริงออกจาก pump language',
          Number(socialSummary.hypeRisk || 0) >= 65 ? 'Hype สูง: ห้ามไล่ราคาโดยไม่มี volume และแนวรับชัด' : 'Hype ยังไม่ร้อนมาก ใช้เป็นตัวเสริม'
        ]},
        { title: '3) Trigger สายซิ่ง', points: [
          `Follow เมื่อปิดเหนือแนวต้าน ${money(prediction.levels?.resistance)} พร้อม volume > 1.2-1.5x`,
          `หนีถ้าหลุด ${money(prediction.levels?.stopLoss)} หรือหลุด VWAP แล้ว volume ขายสูง`,
          'เลี่ยง leverage สูง เพราะ crypto สามารถ wick/clear liquidation ได้แรง'
        ]}
      ]
    },
    {
      id: 'pok-technical',
      name: 'ป๊อก (Crypto เทคนิค)',
      role: 'สาย Chart + VWAP + RSI + MACD + จุดเข้าออก',
      badge: 'คริปโตเทคนิค',
      score: clampScore((findFactor(factors, 'โครงสร้างราคา')?.score || 50) * 0.5 + (rrFactor.score || 50) * 0.25 + (findFactor(factors, 'Momentum')?.score || 50) * 0.25),
      verdict: findFactor(factors, 'โครงสร้างราคา')?.status || 'รอกราฟยืนยัน',
      summary: `ป๊อกอ่าน ${profile.company} จาก VWAP/MA/RSI/MACD/ATR พร้อมแผนแนวรับ แนวต้าน และ stop-loss`,
      sections: [
        { title: '1) โครงสร้างกราฟ', points: [
          `ราคาล่าสุด = ${money(tech.last)}`,
          `VWAP20 = ${money(tech.vwap20)} ราคาอยู่${tech.last > tech.vwap20 ? 'เหนือ' : 'ใต้'} VWAP20`,
          `MA20 = ${money(tech.ma20)} / RSI14 = ${tech.rsi14} / MACD histogram = ${tech.macd?.histogram ?? '-'}`,
          `Trend score = ${tech.trendScore}`
        ]},
        { title: '2) แผนเทรด', points: [
          `แนวรับ = ${money(prediction.levels?.support)} (${prediction.levels?.supportSource || '-'})`,
          `แนวต้าน = ${money(prediction.levels?.resistance)} (${prediction.levels?.resistanceSource || '-'})`,
          `Stop-loss = ${money(prediction.levels?.stopLoss)}`,
          `Risk/Reward = ${rrFactor.scoreText || '-'}`
        ]},
        { title: '3) มุมมองวันถัดไป', points: [
          `โมเดลคาด ${prediction.direction}, เป้ากลาง ${money(prediction.predictedPrice)}, กรอบ ${money(prediction.rangeLow)} - ${money(prediction.rangeHigh)}`,
          'ถ้าเปิด gap ขึ้นแต่กลับลงต่ำกว่า VWAP ให้ระวัง bull trap',
          'ถ้าเปิด gap ลงแต่ไม่หลุดแนวรับและ volume ขายแห้ง อาจเกิด technical rebound'
        ]}
      ]
    }
  ];
}

function findFactor(factors, keyword) {
  const k = String(keyword || '').toLowerCase();
  return (factors || []).find(f => String(f.dimension || '').toLowerCase().includes(k));
}

function riskRewardScore(prediction) {
  const last = Number(prediction.lastPrice || prediction.technical?.last || 0);
  const resistance = Number(prediction.levels?.resistance || prediction.rangeHigh || 0);
  const stop = Number(prediction.levels?.stopLoss || prediction.rangeLow || 0);
  const risk = Math.max(0.0001, last - stop);
  const reward = Math.max(0, resistance - last);
  return clampScore(35 + Math.min(55, (reward / risk) * 22));
}

function factorStatus(score) {
  const s = Number(score) || 0;
  if (s >= 85) return 'แข็งแรงมาก';
  if (s >= 70) return 'แข็งแรง';
  if (s >= 55) return 'กลางบวก';
  if (s >= 40) return 'กลาง/รอดู';
  if (s >= 20) return 'อ่อน/ควรระวัง';
  return 'อ่อนมาก/เสี่ยงสูง';
}

function confidenceLabel(score) {
  const s = clampScore(score);
  if (s >= 75) return `สูง ${s}%`;
  if (s >= 50) return `กลาง ${s}%`;
  return `ต่ำ ${s}%`;
}

function keywordCount(text, keywords) {
  const t = String(text || '').toLowerCase();
  return keywords.reduce((n, kw) => n + (t.includes(kw) ? 1 : 0), 0);
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  if (n >= 1000) return `$${Math.round(n).toLocaleString('en-US')}`;
  if (n >= 10) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function normalizeSymbol(symbol) {
  return normalizeCryptoSymbol(symbol);
}
