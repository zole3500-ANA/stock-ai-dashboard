import { pct } from './utils.js';

export function buildAgentAnalyses({ symbol, profile, prediction, factors = [], articles = [], market = 'AMEX' }) {
  return [
    buildBoGemini({ symbol, profile, prediction, factors, articles, market }),
    buildGrokRacing({ symbol, profile, prediction, articles, market }),
    buildPokTechnical({ symbol, profile, prediction, articles, market })
  ];
}

function buildBoGemini(ctx) {
  const { symbol, profile, prediction, articles } = ctx;
  const tech = prediction.technical;
  const news = prediction.newsSentiment;
  const qualityScore = clampScore(profile.score + news * 18 + (tech.last > tech.ma20 ? 6 : -6) - (tech.atrPct > 0.06 ? 8 : 0));
  const verdict = qualityScore >= 68 ? 'พื้นฐานและข่าวเริ่มหนุน' : qualityScore >= 48 ? 'พอมีประเด็น แต่ยังต้องรอความชัดเจน' : 'พื้นฐาน/ข่าวยังเสี่ยง ต้องระวังเป็นพิเศษ';
  const important = topArticles(articles, 3);

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
        title: '3) มุมมองเชิงตรรก',
        points: [
          `News Sentiment รวม = ${prediction.newsSentiment} ถ้าค่าติดลบมาก แปลว่าข่าวกดดันมีน้ำหนักมากกว่าข่าวบวก`,
          `ราคาเทียบ MA20: ${tech.last > tech.ma20 ? 'อยู่เหนือ MA20 จึงเริ่มมีภาพฟื้น' : 'ยังต่ำกว่า MA20 จึงยังไม่ยืนยันการกลับตัว'}`,
          `ราคาเทียบ VWAP20: ${tech.last > tech.vwap20 ? 'ผู้ซื้อเฉลี่ยเริ่มได้เปรียบ' : 'ผู้ซื้อเฉลี่ยยังเสียเปรียบ ราคายังต้องพิสูจน์ตัวเอง'}`,
          `กรอบคิดของโบ้คือไม่ไล่ราคา ถ้าข่าวยังไม่ชัดและราคาไม่ยืนเหนือเส้นสำคัญพร้อม volume`
        ]
      },
      {
        title: '4) เงื่อนไขที่จะเปลี่ยนมุมมอง',
        points: [
          `เปลี่ยนเป็นบวกมากขึ้น: มีข่าวสัญญา/รายได้/กำไรชัดเจน + ราคายืนเหนือ ${formatMoney(tech.vwap20)} พร้อม volume มากกว่าค่าเฉลี่ย`,
          `เปลี่ยนเป็นลบมากขึ้น: มีข่าวเพิ่มทุน/ลดสัดส่วน/ถูกเตือนจากตลาด + ราคาหลุด ${formatMoney(profile.stopLoss || prediction.bearCase)}`,
          `จุดที่ต้องตรวจทุกครั้ง: SEC filing, ข่าว offering, ข่าว contract, earnings, analyst action และ short interest`
        ]
      }
    ]
  };
}

function buildGrokRacing(ctx) {
  const { symbol, profile, prediction, articles } = ctx;
  const tech = prediction.technical;
  const squeezeScore = clampScore(50 + tech.volRatio * 12 + Math.abs(tech.dayChange) * 260 + prediction.newsSentiment * 18 + (tech.atrPct > 0.055 ? 8 : -2));
  const verdict = squeezeScore >= 72 ? 'มีเชื้อไฟสายซิ่ง แต่ต้องรอ trigger' : squeezeScore >= 52 ? 'มีแรงเก็งกำไรเป็นช่วง ๆ แต่ยังไม่ใช่สัญญาณเต็มตัว' : 'ยังไม่มีแรงซิ่งชัดเจน';
  const hotNews = topArticles(articles, 4);

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
        title: '3) แผนแบบสายซิ่ง',
        points: [
          `สัญญาณเข้าแบบเสี่ยงต่ำกว่า: ราคาทะลุ ${formatMoney(tech.vwap20)} แล้วไม่หลุดกลับ พร้อม volume > 1.2x`,
          `สัญญาณซิ่ง: ราคาทะลุแนวต้าน ${formatMoney(profile.resistance || prediction.bullCase)} พร้อมข่าวบวกและ volume > 1.5x`,
          `สัญญาณหนี: หลุด ${formatMoney(profile.stopLoss || prediction.bearCase)} หรือมีข่าวเพิ่มทุน/dilution/reverse split`,
          `ห้ามไล่ราคาเมื่อแท่งขึ้นแรงแต่ volume ไม่ยืนยัน เพราะเสี่ยงเป็น bull trap`
        ]
      },
      {
        title: '4) สรุปภาษาสายซิ่ง',
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
  const { symbol, profile, prediction } = ctx;
  const tech = prediction.technical;
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
        title: '3) แผนจุดเข้า จุดออก และ Stop-loss',
        points: [
          `จุดรอดู: ให้ราคายืนเหนือ VWAP20 ${formatMoney(tech.vwap20)} อย่างน้อย 1 แท่งพร้อม volume เพิ่ม`,
          `จุด follow: ถ้าทะลุแนวต้าน ${formatMoney(profile.resistance || prediction.bullCase)} พร้อม volume สูง มีโอกาสไปต่อ`,
          `จุดลดความเสี่ยง: ถ้าหลุดแนวรับ ${formatMoney(profile.support || prediction.bearCase)} ต้องระวังแรงขายต่อ`,
          `Stop-loss ที่ใช้ในระบบ = ${formatMoney(profile.stopLoss || prediction.bearCase)}`
        ]
      },
      {
        title: '4) มุมมองวันถัดไป',
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
