import { pct } from './utils.js';

export function buildAgentAnalyses({ symbol, profile, prediction, factors = [], articles = [], social = null, smartMoney = null, market = 'AMEX' }) {
  return [
    buildBoGemini({ symbol, profile, prediction, factors, articles, social, smartMoney, market }),
    buildGrokRacing({ symbol, profile, prediction, articles, social, smartMoney, market }),
    buildPokTechnical({ symbol, profile, prediction, articles, social, smartMoney, market })
  ];
}

function buildBoGemini(ctx) {
  const { symbol, profile, prediction, articles, social, smartMoney } = ctx;
  const tech = prediction.technical;
  const news = prediction.newsSentiment;
  const qualityScore = clampScore(profile.score + news * 18 + (tech.last > tech.ma20 ? 6 : -6) - (tech.atrPct > 0.06 ? 8 : 0));
  const verdict = qualityScore >= 68 ? 'พื้นฐานและข่าวเริ่มหนุน' : qualityScore >= 48 ? 'พอมีประเด็น แต่ยังต้องรอความชัดเจน' : 'พื้นฐาน/ข่าวยังเสี่ยง ต้องระวังเป็นพิเศษ';
  const important = topArticles(articles, 3);
  const socialSummary = social?.summary;

  return {
    id: 'bo-gemini',
    name: 'โบ้ (Gemini)',
    role: 'สายพื้นฐาน + ข่าวใหญ่ + เหตุผลรอบด้าน',
    badge: 'วิเคราะห์พื้นฐาน',
    score: qualityScore,
    verdict,
    summary: `${symbol} ถูกประเมินจากคุณภาพธุรกิจ ข่าวสำคัญ ความเสี่ยงเพิ่มทุน และความสามารถในการยืนเหนือค่าเฉลี่ยหลัก สรุปคือ “${verdict}”`,
    sections: [
      {
        title: '1) ภาพรวมพื้นฐาน',
        points: [
          `${profile.company}: ${profile.thesis}`,
          `AI Score พื้นฐานปัจจุบัน = ${profile.score}/100 จัดเป็นระดับ ${profile.score >= 70 ? 'แข็งแรง' : profile.score >= 50 ? 'กลาง' : 'เปราะบาง/ต้องคุมความเสี่ยง'}`,
          `ระดับความเสี่ยงหลัก = ${profile.riskLevel} โดยเฉพาะหุ้นที่ ATR สูงจะถูกลดน้ำหนักการทำนายบวก`,
          `ถ้าบริษัทมีข่าวเพิ่มทุน, dilution, reverse split หรือ going concern โมเดลจะมองเป็นความเสี่ยงพื้นฐานทันที`
        ]
      },
      {
        title: '2) ข่าวและ Catalyst ที่ต้องจับตา',
        points: important.length ? important.map(a => `${a.sentimentLabelTh || 'ข่าว'}: ${a.titleTh || a.title} — ${a.impactReasonTh || 'ต้องตรวจข่าวต้นทางเพิ่ม'}`) : [
          'ยังไม่พบข่าวคุณภาพสูงจากแหล่งข้อมูลสาธารณะ จึงควรตรวจ Yahoo Finance / SEC / Nasdaq News ก่อนตัดสินใจ'
        ]
      },
      {
        title: '3) กระแส Social Media ที่กระทบพื้นฐาน/ข่าว',
        points: [
          socialSummary ? `ภาพรวม Social: ${socialSummary.thaiSummary}` : 'ยังไม่มีข้อมูล Social ที่ดึงได้ชัดเจน',
          socialSummary ? `ความเสี่ยงกระแสปั่น: ${socialSummary.manipulationRisk}; ความร้อนแรง: ${socialSummary.buzzLevel}; ความมั่นใจข้อมูล ${socialSummary.confidence}%` : 'Facebook/X ต้องใช้ API หรือกดลิงก์ตรวจสอบโพสต์จริงเพิ่มเติม',
          ...(socialSummary?.risks || []).slice(0, 2),
          ...(socialSummary?.opportunities || []).slice(0, 2)
        ]
      },
      {
        title: '4) มุมมอง Smart Money',
        points: smartMoney ? [
          `คะแนน Smart Money = ${smartMoney.score}/100 (${smartMoney.interpretation.label})`,
          `ความหมาย: ${smartMoney.interpretation.meaning}`,
          `OBV/CMF/MFI/CVD/VWAP ถูกใช้ประเมินว่ามีการสะสมหรือกระจายหุ้นมากกว่า`,
          ...(smartMoney.opportunities || []).slice(0, 2),
          ...(smartMoney.risks || []).slice(0, 2)
        ] : ['ยังไม่มีข้อมูล Smart Money ที่คำนวณได้'],
      },
      {
        title: '5) มุมมองเชิงตรรก',
        points: [
          `News Sentiment รวม = ${prediction.newsSentiment} ถ้าค่าติดลบมาก แปลว่าข่าวกดดันมีน้ำหนักมากกว่าข่าวบวก`,
          `ราคาเทียบ MA20: ${tech.last > tech.ma20 ? 'อยู่เหนือ MA20 จึงเริ่มมีภาพฟื้น' : 'ยังต่ำกว่า MA20 จึงยังไม่ยืนยันการกลับตัว'}`,
          `ราคาเทียบ VWAP20: ${tech.last > tech.vwap20 ? 'ผู้ซื้อเฉลี่ยเริ่มได้เปรียบ' : 'ผู้ซื้อเฉลี่ยยังเสียเปรียบ ราคายังต้องพิสูจน์ตัวเอง'}`,
          `กรอบคิดของโบ้คือไม่ไล่ราคา ถ้าข่าวยังไม่ชัดและราคาไม่ยืนเหนือเส้นสำคัญพร้อม volume`
        ]
      },
      {
        title: '6) เงื่อนไขที่จะเปลี่ยนมุมมอง',
        points: [
          `เปลี่ยนเป็นบวกมากขึ้น: มีข่าวสัญญา/รายได้/กำไรชัดเจน + ราคายืนเหนือ ${formatMoney(tech.vwap20)} พร้อม volume มากกว่าค่าเฉลี่ย`,
          `เปลี่ยนเป็นลบมากขึ้น: มีข่าวเพิ่มทุน/ลดสัดส่วน/ถูกเตือนจากตลาด + ราคาหลุด ${formatMoney(prediction.levels?.stopLoss || prediction.bearCase)}`,
          `จุดที่ต้องตรวจทุกครั้ง: SEC filing, ข่าว offering, ข่าว contract, earnings, analyst action และ short interest`
        ]
      }
    ]
  };
}

function buildGrokRacing(ctx) {
  const { symbol, profile, prediction, articles, social, smartMoney } = ctx;
  const tech = prediction.technical;
  const squeezeScore = clampScore(50 + tech.volRatio * 12 + Math.abs(tech.dayChange) * 260 + prediction.newsSentiment * 18 + (tech.atrPct > 0.055 ? 8 : -2));
  const verdict = squeezeScore >= 72 ? 'มีเชื้อไฟสายซิ่ง แต่ต้องรอ trigger' : squeezeScore >= 52 ? 'มีแรงเก็งกำไรเป็นช่วง ๆ แต่ยังไม่ใช่สัญญาณเต็มตัว' : 'ยังไม่มีแรงซิ่งชัดเจน';
  const hotNews = topArticles(articles, 4);
  const socialSummary = social?.summary;
  const hotPlatforms = (social?.platforms || []).filter(p => p.heatScore > 40 || p.hypeRisk > 40).slice(0, 3);

  return {
    id: 'grok-racing',
    name: 'Grok (สายซิ่ง)',
    role: 'สาย momentum + ข่าวไว + โอกาสวิ่งแรง',
    badge: 'จับแรงซิ่ง',
    score: squeezeScore,
    verdict,
    summary: `Grok มอง ${symbol} ผ่านมุม “มีแรงวิ่งหรือยัง” โดยเน้น volume, volatility, ข่าวแรง และโอกาสเกิด momentum burst สรุปคือ “${verdict}”`,
    sections: [
      {
        title: '1) เชื้อไฟของราคา',
        points: [
          `Volume ล่าสุด = ${tech.volRatio}x ของค่าเฉลี่ย 20 วัน ${tech.volRatio > 1.4 ? 'เริ่มมีแรงผิดปกติ ต้องจับตา' : 'ยังไม่แรงพอสำหรับการวิ่งใหญ่'}`,
          `ATR14 = ${(tech.atrPct * 100).toFixed(2)}% แปลว่าหุ้นแกว่ง ${tech.atrPct > 0.06 ? 'แรงมาก เหมาะกับสายซิ่งแต่เสี่ยงสูง' : 'ระดับปานกลาง'}`,
          `ผลตอบแทน 1 วัน = ${(tech.dayChange * 100).toFixed(2)}% และ 5 วัน = ${(tech.weekChange * 100).toFixed(2)}%`,
          `ถ้าข่าวบวกมากระทบหุ้น float ต่ำ/volume เบา ราคาอาจกระโดดแรง แต่ถ้าข่าวลบจะร่วงแรงเช่นกัน`
        ]
      },
      {
        title: '2) ข่าวที่อาจทำให้วิ่งหรือร่วง',
        points: hotNews.length ? hotNews.map(a => `${a.sentimentLabelTh || 'ข่าว'} • Impact ${a.impactScore}/100: ${a.titleTh || a.title}`) : [
          'ยังไม่มีข่าวแรงพอให้เกิด momentum burst ควรรอข่าวใหม่หรือ volume spike'
        ]
      },
      {
        title: '3) Social สายซิ่ง',
        points: [
          socialSummary ? `Social heat = ${socialSummary.heatScore}/100 (${socialSummary.buzzLevel}) และ hype risk = ${socialSummary.hypeRisk}/100 (${socialSummary.manipulationRisk})` : 'ยังไม่มี Social heat ที่ชัดเจน',
          ...hotPlatforms.map(p => `${p.name}: ${p.analysisTh}`),
          'ถ้า social ร้อนแรงแต่ราคาไม่ยืนเหนือ VWAP/Volume ไม่เข้า ให้ระวังเป็นกระแสหลอกหรือ pump ระยะสั้น',
          'ถ้า social บวกพร้อมข่าวจริงและ volume ยืนยัน จึงค่อยถือว่า momentum มีน้ำหนักมากขึ้น'
        ]
      },
      {
        title: '4) แผนแบบสายซิ่ง',
        points: [
          `สัญญาณเข้าแบบเสี่ยงต่ำกว่า: ราคาทะลุ ${formatMoney(tech.vwap20)} แล้วไม่หลุดกลับ พร้อม volume > 1.2x`,
          `สัญญาณซิ่ง: ราคาทะลุแนวต้าน ${formatMoney(prediction.levels?.resistance || prediction.bullCase)} พร้อมข่าวบวกและ volume > 1.5x`,
          `สัญญาณหนี: หลุด ${formatMoney(prediction.levels?.stopLoss || prediction.bearCase)} หรือมีข่าวเพิ่มทุน/dilution/reverse split`,
          `ห้ามไล่ราคาเมื่อแท่งขึ้นแรงแต่ volume ไม่ยืนยัน เพราะเสี่ยงเป็น bull trap`
        ]
      },
      {
        title: '5) สรุปภาษาสายซิ่ง',
        points: [
          `โอกาสวิ่งแรงมีได้ถ้า catalyst มา แต่ตอนนี้โมเดลให้ verdict = ${prediction.verdict}`,
          `Base case วันถัดไป = ${formatMoney(prediction.baseCase)} กรอบ ${formatMoney(prediction.rangeLow)} - ${formatMoney(prediction.rangeHigh)}`,
          `ความมั่นใจ ${prediction.confidence}% หมายความว่ายังต้องใช้ stop-loss และไม่ควร all-in`
        ]
      }
    ]
  };
}

function buildPokTechnical(ctx) {
  const { symbol, profile, prediction, social, smartMoney } = ctx;
  const tech = prediction.technical;
  const socialSummary = social?.summary;
  const plan = prediction.tradePlan || {};
  const technicalScore = clampScore(50 + tech.trendScore * 35 + prediction.components.momentum * 18 + prediction.components.macd * 24 + prediction.components.volume * 18 + prediction.components.rsi * 15);
  const verdict = technicalScore >= 66 ? 'กราฟเริ่มเข้าทางฝั่งซื้อ' : technicalScore >= 46 ? 'กราฟยังกลาง ต้องรอ break ยืนยัน' : 'กราฟยังอ่อน ฝั่งขายยังคุมเกม';

  return {
    id: 'pok-technical',
    name: 'ป๊อก (สายเทคนิค)',
    role: 'สายกราฟ + อินดิเคเตอร์ + จุดเข้าออก',
    badge: 'อ่านกราฟละเอียด',
    score: technicalScore,
    verdict,
    summary: `ป๊อกอ่านกราฟ ${symbol} จาก MA5/MA20/VWAP/RSI/MACD/ATR/Volume สรุปคือ “${verdict}”`,
    sections: [
      {
        title: '1) โครงสร้างราคา',
        points: [
          `ราคาล่าสุด = ${formatMoney(tech.last)}`,
          `MA5 = ${formatMoney(tech.ma5)} ราคาอยู่${tech.last > tech.ma5 ? 'เหนือ' : 'ใต้'} MA5`,
          `MA20 = ${formatMoney(tech.ma20)} ราคาอยู่${tech.last > tech.ma20 ? 'เหนือ' : 'ใต้'} MA20`,
          `VWAP20 = ${formatMoney(tech.vwap20)} ราคาอยู่${tech.last > tech.vwap20 ? 'เหนือ' : 'ใต้'} VWAP20`,
          `Trend Score = ${tech.trendScore} แปลว่าโครงสร้าง ${tech.trendScore > 0.2 ? 'เริ่มดีขึ้น' : tech.trendScore < -0.2 ? 'ยังอ่อน' : 'แกว่งตัว/รอยืนยัน'}`
        ]
      },
      {
        title: '2) Momentum และแรงซื้อขาย',
        points: [
          `RSI14 = ${tech.rsi14} อยู่ในโซน ${tech.rsi14 > 70 ? 'ร้อนแรง/เสี่ยงพักตัว' : tech.rsi14 < 30 ? 'ขายมากเกิน/อาจเด้งเทคนิค' : 'กลาง'}`,
          `MACD histogram = ${tech.macd.histogram} ${tech.macd.histogram > 0 ? 'ฝั่งซื้อเริ่มได้เปรียบ' : 'ฝั่งขายยังได้เปรียบ'}`,
          `Volume ratio = ${tech.volRatio}x ${tech.volRatio > 1.4 ? 'มีแรงผิดปกติ' : tech.volRatio < 0.7 ? 'ตลาดยังไม่สนใจมาก' : 'ปกติ'}`,
          `ATR14 = ${formatMoney(tech.atr14)} หรือ ${(tech.atrPct * 100).toFixed(2)}% ของราคา ใช้ประเมินกรอบเหวี่ยงและจุด stop`
        ]
      },
      {
        title: '3) แผนจุดเข้า จุด Follow จุดลดความเสี่ยง และ Stop-loss (ทวนสอบแล้ว)',
        points: [
          plan.rules?.wait || `จุดรอดู: ให้ราคายืนเหนือ VWAP20 ${formatMoney(tech.vwap20)} อย่างน้อย 1 แท่งพร้อม volume เพิ่ม`,
          plan.rules?.entry || `จุดเข้า: รอราคายืนเหนือ ${formatMoney(Math.max(tech.vwap20, tech.ma5))} พร้อม volume เพิ่ม`,
          plan.rules?.follow || `จุด Follow: ถ้าทะลุแนวต้าน ${formatMoney(prediction.levels?.resistance || prediction.bullCase)} พร้อม volume สูง มีโอกาสไปต่อ`,
          plan.rules?.reduce || `จุดลดความเสี่ยง: ถ้าหลุดแนวรับ ${formatMoney(prediction.levels?.support || prediction.bearCase)} ต้องระวังแรงขายต่อ`,
          plan.rules?.stop || `Stop-loss ที่ใช้ในระบบ = ${formatMoney(prediction.levels?.stopLoss || prediction.bearCase)}`,
          plan.rules?.exit || `จุดออกทำกำไร: แบ่งขายบริเวณ ${formatMoney(prediction.bullCase)} และยก stop ตามเมื่อราคาวิ่งไปต่อ`,
          plan.rules?.invalid || 'ถ้าทะลุแล้วกลับลงต่ำกว่า VWAP ให้ถือว่าสัญญาณ breakout ล้มเหลว',
          `ทวนสอบราคา: ราคาล่าสุด ${formatMoney(plan.latestPrice || tech.last)} / แนวรับ ${formatMoney(plan.reduceRiskLevel || prediction.levels?.support)} (${plan.sources?.support || prediction.levels?.supportSource || 'ข้อมูลราคา'}) / แนวต้าน ${formatMoney(plan.followLevel || prediction.levels?.resistance)} (${plan.sources?.resistance || prediction.levels?.resistanceSource || 'ข้อมูลราคา'}) / ATR14 ${formatMoney(plan.atr14 || tech.atr14)}`,
          plan.rrToTp1 ? `Risk/Reward ถึง TP1 ประมาณ ${plan.rrToTp1}:1 หากเข้าที่ราคาล่าสุดและใช้ Stop-loss ตามระบบ` : 'Risk/Reward ยังประเมินไม่ได้ เพราะข้อมูลราคาไม่ครบ'
        ]
      },
      {
        title: '4) Smart Money Confirmation',
        points: smartMoney ? [
          `Smart Money Score = ${smartMoney.score}/100 (${smartMoney.interpretation.label})`,
          `ถ้าสายซิ่งจะ Follow ต้องการให้ CVD proxy, OBV, CMF และ Volume Quality หนุนพร้อมกัน`,
          `สถานะหลัก: ${smartMoney.verdict}; ${smartMoney.summary}`,
          ...(smartMoney.indicators || []).slice(0, 4).map(i => `${i.name}: ${i.status} (${i.score}/100) — ${i.explanation}`)
        ] : ['ยังไม่มีข้อมูล Smart Money สำหรับยืนยันแรงซิ่ง'],
      },
      {
        title: '5) Social Confirmation สำหรับกราฟ',
        points: [
          socialSummary ? `โทน Social โดยรวม = ${socialSummary.dominantTone}; ความร้อนแรง = ${socialSummary.buzzLevel}; ความเสี่ยงปั่น = ${socialSummary.manipulationRisk}` : 'ยังไม่มีข้อมูล Social ที่ใช้ยืนยันกราฟได้มากพอ',
          'ถ้ากราฟ breakout แต่ social มีแต่ hype และไม่มีข่าวจริง ให้ลดน้ำหนักสัญญาณ',
          'ถ้า Reddit/Stocktwits เริ่มพูดถึงมากขึ้นพร้อม volume สูง เป็นสัญญาณยืนยัน momentum ระยะสั้น',
          'Facebook/X ใช้เป็นตัวจับกระแสเร็ว แต่ต้องตรวจโพสต์จริงเพราะข้อมูลอาจถูกปั่นได้ง่าย'
        ]
      },
      {
        title: '6) มุมมองวันถัดไป',
        points: [
          `โมเดลคาดการณ์ ${prediction.direction} เป้ากลาง ${formatMoney(prediction.predictedPrice)} (${pct(prediction.predictedReturn, 2)}%)`,
          `กรอบคาดการณ์ = ${formatMoney(prediction.rangeLow)} - ${formatMoney(prediction.rangeHigh)}`,
          `ถ้าเปิด gap ขึ้นแต่กลับลงต่ำกว่า VWAP ให้ระวังแรงขายทำกำไร`,
          `ถ้าเปิด gap ลงแต่ไม่หลุดแนวรับและ volume ขายแห้ง อาจมี technical rebound`
        ]
      }
    ]
  };
}

function topArticles(articles, limit) {
  return [...(articles || [])]
    .sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0))
    .slice(0, limit);
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  if (n < 10) return `$${n.toFixed(2)}`;
  if (n < 100) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(0)}`;
}
