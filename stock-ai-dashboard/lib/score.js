export function interpretScore(score, context = 'overall') {
  const n = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const base = scoreBand(n);
  const contextText = context === 'smartMoney'
    ? smartMoneyMeaning(n)
    : context === 'agent'
      ? agentMeaning(n)
      : overallMeaning(n);
  return {
    score: n,
    band: base.band,
    label: base.label,
    tone: base.tone,
    level: base.level,
    meaning: contextText.meaning,
    action: contextText.action,
    risk: contextText.risk,
    thaiSummary: `${n}/100 = ${base.label}: ${contextText.meaning}`
  };
}

export function scoreBand(score) {
  const n = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  if (n <= 19) return { band: '0-19', label: 'อ่อนมาก / เสี่ยงมาก', tone: 'bearish', level: 'ต่ำมาก' };
  if (n <= 39) return { band: '20-39', label: 'อ่อน / ควรระวัง', tone: 'bearish', level: 'ต่ำ' };
  if (n <= 54) return { band: '40-54', label: 'กลางลบ / ยังไม่ชัด', tone: 'neutral', level: 'กลางลบ' };
  if (n <= 69) return { band: '55-69', label: 'กลางบวก / เริ่มน่าสนใจ', tone: 'neutral', level: 'กลางบวก' };
  if (n <= 84) return { band: '70-84', label: 'แข็งแรง / น่าสนใจ', tone: 'bullish', level: 'สูง' };
  return { band: '85-100', label: 'แข็งแรงมาก / โมเมนตัมเด่น', tone: 'bullish', level: 'สูงมาก' };
}

function overallMeaning(score) {
  if (score <= 19) return {
    meaning: 'ภาพรวมเสียเปรียบมาก ทั้งโครงสร้างราคา ข่าว หรือความเสี่ยงยังไม่เอื้อ ควรหลีกเลี่ยงการไล่ราคา',
    action: 'เหมาะกับการเฝ้าดูเท่านั้น รอข่าวดีจริงและราคากลับมายืนเหนือเส้นสำคัญก่อน',
    risk: 'โอกาสถูกลากลง/ผันผวนสูงมาก'
  };
  if (score <= 39) return {
    meaning: 'สัญญาณรวมยังอ่อน ความเสี่ยงมากกว่าผลตอบแทน ต้องคุมขนาดไม้และ stop-loss ให้ชัด',
    action: 'ยังไม่ควรซื้อเต็มไม้ รอการยืนยันจาก volume, VWAP, ข่าว และ social ที่เป็นบวกจริง',
    risk: 'เสี่ยงหลุดแนวรับหรือถูกกดจากข่าวลบ'
  };
  if (score <= 54) return {
    meaning: 'ยังเป็นภาวะก้ำกึ่ง สัญญาณบวกและลบคานกัน ต้องรอ trigger ชัดเจน',
    action: 'ใช้แผนรอดูหรือเทรดสั้นตามกรอบเท่านั้น ไม่ควรไล่ราคา',
    risk: 'ถ้า volume ไม่เข้า สัญญาณ breakout อาจหลอก'
  };
  if (score <= 69) return {
    meaning: 'เริ่มมีแรงสนับสนุนบางส่วน แต่ยังไม่ใช่สัญญาณแข็งเต็มที่ ต้องดูจุดยืนยัน',
    action: 'พิจารณาเมื่อราคายืนเหนือ VWAP/MA พร้อมข่าวหรือ volume สนับสนุน',
    risk: 'ยังเสี่ยงพักตัวถ้าข่าวไม่ต่อเนื่องหรือดัชนีตลาดอ่อน'
  };
  if (score <= 84) return {
    meaning: 'ภาพรวมค่อนข้างแข็ง มีปัจจัยสนับสนุนหลายด้าน เหมาะกับการวางแผนตามแนวรับ/แนวต้าน',
    action: 'รอจุดเข้าเชิงเทคนิค และใช้ trailing stop เมื่อราคาเดินหน้า',
    risk: 'ระวัง overbought หรือแรงขายทำกำไรหลังขึ้นแรง'
  };
  return {
    meaning: 'สัญญาณรวมแข็งแรงมาก มี momentum และปัจจัยสนับสนุนเด่น แต่ต้องระวังราคาที่ร้อนเกินไป',
    action: 'ถือ/ตามได้เฉพาะเมื่อมีแผน stop และไม่ไล่ซื้อช่วง spike เกิน ATR',
    risk: 'เสี่ยงย่อแรงจากการทำกำไร ถ้า sentiment พลิกเร็ว'
  };
}

function smartMoneyMeaning(score) {
  if (score <= 19) return { meaning: 'ร่องรอยเงินใหญ่เป็นลบชัดเจน มีแรงขายหรือการกระจายหุ้นมากกว่าการสะสม', action: 'หลีกเลี่ยงการตามซื้อจนกว่าจะเห็น volume absorption หรือ reclaim VWAP', risk: 'เสี่ยงถูกขายใส่เมื่อเด้ง' };
  if (score <= 39) return { meaning: 'ยังไม่เห็นเงินใหญ่เข้าหนุนอย่างจริงจัง หรือมีสัญญาณขายแฝงใน volume', action: 'รอให้ OBV/CMF/MFI พลิกขึ้นและราคาปิดเหนือ VWAP ก่อน', risk: 'แรงซื้ออาจเป็นรายย่อยหรือเด้งสั้น' };
  if (score <= 54) return { meaning: 'Smart money ยังกลาง ๆ ไม่มีฝ่ายใดชนะชัด ต้องดูแท่งยืนยันและ volume breakout', action: 'เทรดตามกรอบ ลดความเสี่ยงเมื่อหลุดแนวรับ', risk: 'สัญญาณสะสมอาจยังไม่เพียงพอ' };
  if (score <= 69) return { meaning: 'เริ่มมีร่องรอยการสะสมหรือแรงซื้อคุณภาพ แต่ยังต้องการ confirmation', action: 'ติดตามการยืนเหนือ VWAP/แนวต้านพร้อม volume มากกว่าค่าเฉลี่ย', risk: 'ถ้า breakout volume ต่ำอาจเป็น false move' };
  if (score <= 84) return { meaning: 'Smart money ค่อนข้างหนุน มี accumulation, OBV/CMF หรือ volume quality ดีขึ้น', action: 'ใช้แผน follow เมื่อปิดเหนือแนวต้านและคุม stop ใต้แนวรับ', risk: 'ระวัง chasing หลัง volume spike' };
  return { meaning: 'สัญญาณเงินใหญ่แข็งมาก หลายอินดิเคเตอร์บ่งชี้การสะสม/ไล่ซื้อพร้อมกัน', action: 'ตามได้เฉพาะตามระบบและใช้ trailing stop เพราะ volatility อาจสูง', risk: 'เสี่ยง shakeout เพื่อไล่รายย่อยก่อนเดินต่อ' };
}

function agentMeaning(score) {
  const overall = overallMeaning(score);
  return {
    meaning: overall.meaning,
    action: overall.action,
    risk: overall.risk
  };
}
