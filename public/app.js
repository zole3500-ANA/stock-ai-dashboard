const $ = (id) => document.getElementById(id);

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  if (n < 10) return `$${n.toFixed(2)}`;
  if (n < 100) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(0)}`;
}

function percent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;
}

function badgeClass(text) {
  const s = String(text || '').toLowerCase();
  if (s.includes('bull') || s.includes('positive') || s.includes('above') || s.includes('น่าสนใจ') || s.includes('แข็ง') || s.includes('บวก') || s.includes('ดีขึ้น') || s.includes('เหนือ')) return 'bullish';
  if (s.includes('bear') || s.includes('negative') || s.includes('below') || s.includes('weak') || s.includes('risk') || s.includes('ระวัง') || s.includes('ลบ') || s.includes('อ่อน') || s.includes('ใต้') || s.includes('เสี่ยง')) return 'bearish';
  return 'neutral';
}

function setBadge(el, text, extra = '') {
  el.textContent = text;
  el.className = `badge ${extra || badgeClass(text)}`;
}

function scoreMeaning(score) {
  const n = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  if (n <= 19) return { label: 'อ่อนมาก / เสี่ยงมาก', detail: 'สัญญาณรวมเสียเปรียบมาก ควรหลีกเลี่ยงการไล่ราคาและรอข้อมูลยืนยันใหม่', cls: 'bearish' };
  if (n <= 39) return { label: 'อ่อน / ควรระวัง', detail: 'ความเสี่ยงมากกว่าผลตอบแทน เหมาะกับการเฝ้าดูหรือเทรดสั้นแบบมี Stop-loss เท่านั้น', cls: 'bearish' };
  if (n <= 54) return { label: 'กลางลบ / ยังไม่ชัด', detail: 'ปัจจัยบวกและลบยังคานกัน ต้องรอ trigger จากราคา ข่าว และ volume', cls: 'neutral' };
  if (n <= 69) return { label: 'กลางบวก / เริ่มน่าสนใจ', detail: 'เริ่มมีสัญญาณหนุนบางส่วน แต่ยังต้องรอจุดยืนยันก่อนเพิ่มน้ำหนัก', cls: 'neutral' };
  if (n <= 84) return { label: 'แข็งแรง / น่าสนใจ', detail: 'หลายปัจจัยเริ่มเข้าทาง สามารถวางแผนตามแนวรับแนวต้านและบริหารกำไร', cls: 'bullish' };
  return { label: 'แข็งแรงมาก / โมเมนตัมเด่น', detail: 'สัญญาณรวมเด่นมาก แต่ต้องระวังราคาเริ่มร้อนและแรงขายทำกำไร', cls: 'bullish' };
}

function scoreMeaningFromBackend(obj, fallbackScore) {
  if (obj?.label || obj?.meaning) return obj;
  const m = scoreMeaning(fallbackScore);
  return { label: m.label, meaning: m.detail, tone: m.cls, thaiSummary: `${fallbackScore}/100 = ${m.label}: ${m.detail}` };
}

function statusIconInfo(status, score) {
  const s = String(status || '').toLowerCase();
  const n = Number(score || 0);
  if (s.includes('แข็งแรงมาก') || n >= 85) return { icon: '🚀', label: 'แข็งแรงมาก', cls: 'very-bullish' };
  if (s.includes('แข็งแรง') || n >= 70) return { icon: '✅', label: 'แข็งแรง', cls: 'bullish' };
  if (s.includes('กลางบวก') || n >= 55) return { icon: '🟢', label: 'กลางบวก', cls: 'mild-bullish' };
  if (s.includes('กลาง') || s.includes('รอดู') || n >= 40) return { icon: '🟡', label: 'กลาง / รอดู', cls: 'neutral' };
  if (s.includes('อ่อนมาก') || s.includes('เสี่ยงสูง') || n < 20) return { icon: '🛑', label: 'อ่อนมาก / เสี่ยงสูง', cls: 'very-bearish' };
  if (s.includes('อ่อน') || s.includes('ระวัง') || n < 40) return { icon: '⚠️', label: 'อ่อน / ควรระวัง', cls: 'bearish' };
  return { icon: '⚪', label: status || 'ยังไม่ชัด', cls: 'neutral' };
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[m]));
}

function setAgentMood(root, score) {
  if (!root) return;
  const tone = scoreTone(Number(score || 0));
  root.dataset.mood = tone;
  root.classList.remove('is-bullish', 'is-neutral', 'is-bearish');
  root.classList.add(`is-${tone}`);
}

function initShellControls() {
  const shell = $('dashboardShell');
  const sidebarToggle = $('sidebarToggle');
  const mobileToggle = $('mobileMenuToggle');
  const scrollTopBtn = $('scrollTopBtn');
  if (!shell) return;

  const stored = localStorage.getItem('stock-ai-sidebar-collapsed') === '1';
  if (stored && window.innerWidth > 1120) shell.classList.add('sidebar-collapsed');
  updateSidebarToggleLabel();

  sidebarToggle?.addEventListener('click', () => {
    shell.classList.toggle('sidebar-collapsed');
    localStorage.setItem('stock-ai-sidebar-collapsed', shell.classList.contains('sidebar-collapsed') ? '1' : '0');
    updateSidebarToggleLabel();
  });

  mobileToggle?.addEventListener('click', () => {
    shell.classList.toggle('sidebar-open');
    mobileToggle.textContent = shell.classList.contains('sidebar-open') ? '×' : '☰';
    mobileToggle.setAttribute('aria-label', shell.classList.contains('sidebar-open') ? 'ปิดเมนู' : 'เปิดเมนู');
  });

  document.addEventListener('click', (e) => {
    if (!shell.classList.contains('sidebar-open')) return;
    const inSidebar = e.target.closest('.sidebar');
    const inToggle = e.target.closest('#mobileMenuToggle');
    const isNav = e.target.closest('.nav-link');
    if ((!inSidebar && !inToggle) || isNav) {
      shell.classList.remove('sidebar-open');
      if (mobileToggle) {
        mobileToggle.textContent = '☰';
        mobileToggle.setAttribute('aria-label', 'เปิดเมนู');
      }
    }
  });

  scrollTopBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () => {
    if (!scrollTopBtn) return;
    scrollTopBtn.classList.toggle('show', window.scrollY > 520);
    updateActiveNavByScroll();
  }, { passive: true });

  updateActiveNavByScroll();
}

function updateSidebarToggleLabel() {
  const shell = $('dashboardShell');
  const btn = $('sidebarToggle');
  if (!shell || !btn) return;
  const collapsed = shell.classList.contains('sidebar-collapsed');
  btn.textContent = collapsed ? '⇥' : '⇤';
  btn.title = collapsed ? 'ขยายเมนู' : 'ยุบเมนู';
  btn.setAttribute('aria-label', collapsed ? 'ขยายเมนู' : 'ยุบเมนู');
}

function updateActiveNavByScroll() {
  const links = [...document.querySelectorAll('.nav-link[href^="#"]')];
  if (!links.length) return;
  let active = links[0];
  const y = window.scrollY + 130;
  for (const link of links) {
    const section = document.querySelector(link.getAttribute('href'));
    if (section && section.offsetTop <= y) active = link;
  }
  links.forEach(a => a.classList.toggle('active', a === active));
}

function animateRefreshPulse() {
  document.body.classList.add('refresh-pulse');
  window.setTimeout(() => document.body.classList.remove('refresh-pulse'), 950);
}


async function analyze() {
  const symbol = $('tickerInput').value.trim().toUpperCase() || 'BURU';
  const market = $('marketSelect').value;
  setBadge($('updatedBadge'), 'กำลังวิเคราะห์...', 'info');
  animateRefreshPulse();
  $('analyseBtn').disabled = true;

  try {
    const res = await fetch(`/api/analyze?symbol=${encodeURIComponent(symbol)}&market=${encodeURIComponent(market)}&days=90&newsDays=7`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    render(data);
  } catch (error) {
    setBadge($('updatedBadge'), 'โหลดข้อมูลไม่สำเร็จ', 'bearish');
    $('newsList').innerHTML = `<div class="news-item"><div class="danger">เกิดข้อผิดพลาด: ${escapeHtml(error.message)}</div><p class="small">ตรวจสอบว่า server รันอยู่ที่ <span class="mono">npm start</span></p></div>`;
  } finally {
    $('analyseBtn').disabled = false;
  }
}

function render(data) {
  const { symbol, profile, summary, prediction } = data;
  const d = new Date(data.generatedAt);
  setBadge($('updatedBadge'), `อัปเดต: ${d.toLocaleString('th-TH')}`, 'info');

  $('tickerText').textContent = symbol;
  $('companyText').textContent = profile.company;
  $('scoreText').textContent = `${profile.score}/100`;
  const scoreInfo = scoreMeaningFromBackend(data.scoreInterpretation || profile.scoreInterpretation, profile.score);
  $('scoreInterpretationText').textContent = `${scoreInfo.label}: ${scoreInfo.meaning}`;
  $('dialScore').textContent = profile.score;
  $('biasText').textContent = prediction.verdict;
  $('riskText').textContent = summary.risk;
  setBadge($('decisionBadge'), summary.label);
  $('summaryHeadline').textContent = summary.headline;
  $('summaryText').textContent = summary.text;
  $('thesisBox').innerHTML = `<strong>แกนวิเคราะห์:</strong> ${escapeHtml(profile.thesis)}`;
  $('supportText').textContent = money(summary.actionPlan.support);
  $('resistanceText').textContent = money(summary.actionPlan.resistance);
  $('stopText').textContent = money(summary.actionPlan.stopLoss);
  $('supportText').title = summary.actionPlan.supportSource || 'คำนวณจากข้อมูลราคา';
  $('resistanceText').title = summary.actionPlan.resistanceSource || 'คำนวณจากข้อมูลราคา';
  $('stopText').title = summary.actionPlan.stopLossSource || 'คำนวณจากข้อมูลราคา';
  $('symbolBadge').textContent = data.tradingViewSymbol;
  setAgentMood(document.body, profile.score);
  renderSidebar(data);
  renderAgentRoom(data);

  renderTradingView(data.tradingViewSymbol);
  renderLinks(data.externalLinks);
  renderAgents(data.agents || []);
  renderSmartMoney(data.smartMoney);
  renderSocial(data.social);
  renderNews(data.news, data.dataSources);
  renderPrediction(prediction, data.dataSources);
  renderFactors(data.factors);
}



function renderSidebar(data) {
  const profile = data.profile || {};
  const prediction = data.prediction || {};
  const smart = data.smartMoney || {};
  const socialSummary = data.social?.summary || {};
  const updated = data.generatedAt ? new Date(data.generatedAt).toLocaleString('th-TH') : 'ล่าสุด';
  if ($('sideTicker')) $('sideTicker').textContent = data.symbol || '-';
  if ($('sideCompany')) $('sideCompany').textContent = profile.company || '-';
  if ($('sideScore')) $('sideScore').textContent = `${profile.score ?? '-'} / 100`;
  if ($('sideBias')) $('sideBias').textContent = prediction.verdict || '-';
  if ($('sideRisk')) $('sideRisk').textContent = data.summary?.risk || '-';
  if ($('sideSmart')) $('sideSmart').textContent = `${smart.score ?? '-'} / 100`;
  if ($('sideSocial')) $('sideSocial').textContent = socialSummary.dominantTone || socialSummary.buzzLevel || '-';
  if ($('sideUpdated')) $('sideUpdated').textContent = `อัปเดต ${updated}`;

  const pills = $('sidebarAgentPills');
  if (pills) {
    const roster = buildSidebarRoster(data);
    pills.innerHTML = roster.map(item => `
      <div class="side-pill tone-${item.tone}">
        <div class="side-pill-avatar">${pixelAvatarSvg(item.avatar, 'xs')}</div>
        <div class="side-pill-text">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.status)}</span>
        </div>
      </div>
    `).join('');
  }
}

function buildSidebarRoster(data) {
  const agents = data.agents || [];
  const smart = data.smartMoney || {};
  const socialSummary = data.social?.summary || {};
  const smartTone = scoreTone(Number(smart.score || 0));
  const socialScore = clampNum(Math.round(50 + Number(socialSummary.sentimentScore || 0) * 50 - Number(socialSummary.hypeRisk || 0) * 0.18), 0, 100);
  return [
    { name: 'โบ้', avatar: 'bo', status: agents[0]?.verdict || 'พื้นฐาน', tone: scoreTone(Number(agents[0]?.score || 0)) },
    { name: 'Grok', avatar: 'grok', status: agents[1]?.verdict || 'โมเมนตัม', tone: scoreTone(Number(agents[1]?.score || 0)) },
    { name: 'ป๊อก', avatar: 'pok', status: agents[2]?.verdict || 'เทคนิค', tone: scoreTone(Number(agents[2]?.score || 0)) },
    { name: 'Smart', avatar: 'smart', status: smart.action || smart.verdict || 'เงินใหญ่', tone: smartTone },
    { name: 'Social', avatar: 'social', status: socialSummary.dominantTone || 'กระแสตลาด', tone: scoreTone(socialScore) },
    { name: 'Data', avatar: 'data', status: data.summary?.headline || 'ตัดสินใจรวม', tone: scoreTone(Number(data.profile?.score || 0)) }
  ];
}

function avatarTypeFromId(id) {
  const raw = String(id || '').toLowerCase();
  if (raw.includes('bo')) return 'bo';
  if (raw.includes('grok')) return 'grok';
  if (raw.includes('pok')) return 'pok';
  if (raw.includes('smart')) return 'smart';
  if (raw.includes('social')) return 'social';
  return 'data';
}

function pixelAvatarSvg(type = 'bo', size = 'md') {
  const maps = {
    bo: {
      skin:'#f0c29b', hair:'#7a4a24', eye:'#111827', shirt:'#4da6ff', accent:'#b4e0ff',
      grid:['000111110000','001122221100','012222222210','012322223210','123222222321','123402204321','123222222321','012233332210','001455554100','014444444410','144464446441','100000000001']
    },
    grok: {
      skin:'#d9a97c', hair:'#ff5263', eye:'#111827', shirt:'#ff8a3d', accent:'#ffd0b0',
      grid:['000111110000','001222222100','012222222210','012233332210','123222222321','123402204321','123222222321','012255552210','001366663100','013333333310','133363336331','100000000001']
    },
    pok: {
      skin:'#f4d3b0', hair:'#35d07f', eye:'#0b1320', shirt:'#25d8ff', accent:'#c9fff0',
      grid:['000111110000','001222222100','012222222210','012233332210','123222222321','123402204321','123222222321','012255552210','001366663100','013333333310','133363336331','100000000001']
    },
    smart: {
      skin:'#e9c7a8', hair:'#a879ff', eye:'#111827', shirt:'#7c5cff', accent:'#e4d8ff',
      grid:['000111110000','001222222100','012222222210','012233332210','123222222321','123402204321','123222222321','012255552210','001366663100','013333333310','133363336331','100000000001']
    },
    social: {
      skin:'#efc29c', hair:'#ffc857', eye:'#111827', shirt:'#ff5263', accent:'#fff1bf',
      grid:['000111110000','001222222100','012222222210','012233332210','123222222321','123402204321','123222222321','012255552210','001366663100','013333333310','133363336331','100000000001']
    },
    data: {
      skin:'#d6d9e8', hair:'#4b5770', eye:'#111827', shirt:'#8897b3', accent:'#d9e8ff',
      grid:['000111110000','001222222100','012222222210','012233332210','123222222321','123402204321','123222222321','012255552210','001366663100','013333333310','133363336331','100000000001']
    }
  };
  const cfg = maps[type] || maps.bo;
  const cell = size === 'xs' ? 5 : size === 'sm' ? 6 : size === 'lg' ? 9 : 7;
  const grid = cfg.grid;
  let rects = '';
  grid.forEach((row, y) => {
    [...row].forEach((v, x) => {
      const color = ({'1':cfg.hair,'2':cfg.skin,'3':cfg.eye,'4':cfg.accent,'5':cfg.shirt,'6':cfg.accent})[v];
      if (color) rects += `<rect x="${x*cell}" y="${y*cell}" width="${cell}" height="${cell}" fill="${color}"/>`;
    });
  });
  const w = grid[0].length * cell;
  const h = grid.length * cell;
  return `<svg class="pixel-svg-avatar ${type}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}


function renderAgentRoom(data) {
  const rosterEl = $('agentRoster');
  const roomEl = $('agentCommandRoom');
  const timelineEl = $('roomTimeline');
  const narrativeEl = $('roomNarrative');
  const overallEl = $('roomOverallStatus');
  if (!rosterEl || !roomEl || !timelineEl || !narrativeEl || !overallEl) return;

  const agents = data.agents || [];
  const prediction = data.prediction || {};
  const tech = prediction.technical || {};
  const socialSummary = data.social?.summary || {};
  const smart = data.smartMoney || {};
  const factors = data.factors || [];
  const dataQuality = factors.find(f => String(f.dimension || '').toLowerCase().includes('data quality'));
  const dilutionRisk = factors.find(f => String(f.dimension || '').toLowerCase().includes('dilution'));
  const rrFactor = factors.find(f => String(f.dimension || '').toLowerCase().includes('risk/reward'));
  const worstFactors = [...factors].sort((a, b) => Number(a.score || 0) - Number(b.score || 0)).slice(0, 3);

  const bo = agents[0] || {};
  const grok = agents[1] || {};
  const pok = agents[2] || {};

  const socialDerivedScore = clampNum(Math.round(50 + Number(socialSummary.sentimentScore || 0) * 50 - Number(socialSummary.hypeRisk || 0) * 0.18), 0, 100);
  const roster = [
    makeRosterAgent('BO', 'โบ้', 'สายพื้นฐาน', Number(bo.score || 0), bo.verdict || 'กำลังประเมินพื้นฐาน', bo.role || 'พื้นฐาน + ข่าว + ความเสี่ยง'),
    makeRosterAgent('GK', 'Grok', 'สายซิ่ง', Number(grok.score || 0), grok.verdict || 'กำลังสแกนโมเมนตัม', grok.role || 'โมเมนตัม + Volume'),
    makeRosterAgent('PK', 'ป๊อก', 'สายเทคนิค', Number(pok.score || 0), pok.verdict || 'กำลังคำนวณจุดเข้าออก', pok.role || 'แนวรับ แนวต้าน Stop-loss'),
    makeRosterAgent('SM', 'มาร์ค', 'Smart Money', Number(smart.score || 0), smart.action || 'กำลังอ่านเงินใหญ่', 'OBV / CMF / MFI / CVD proxy'),
    makeRosterAgent('SO', 'โซเชียล', 'Social Radar', socialDerivedScore, socialSummary.thaiSummary || socialSummary.dominantTone || 'กำลังอ่านกระแส', 'X / Reddit / Facebook / Stocktwits'),
    makeRosterAgent('DT', 'ดาต้า', 'Data Ops', Number(dataQuality?.score || prediction.confidence || 50), dataQuality?.action || 'ทวนสอบคุณภาพข้อมูล', 'ราคา / ข่าว / API / ความมั่นใจ')
  ];

  rosterEl.innerHTML = roster.map(item => `
    <div class="pixel-roster-card tone-${item.tone}">
      <div class="pixel-avatar-wrap">${pixelAvatarSvg(item.avatar, 'sm')}</div>
      <div class="pixel-roster-text">
        <div class="pixel-roster-name">${escapeHtml(item.name)} <span>${escapeHtml(item.track)}</span></div>
        <div class="pixel-roster-role">${escapeHtml(item.role)}</div>
        <div class="pixel-roster-meta">
          <span class="badge ${item.tone}">${escapeHtml(item.status)}</span>
          <span class="pixel-mini-score">${item.score}/100</span>
        </div>
      </div>
    </div>
  `).join('');

  const stations = [
    {
      code: 'BO',
      title: 'โต๊ะพื้นฐาน + ข่าว',
      avatar: 'bo',
      owner: 'โบ้',
      tone: scoreTone(Number(bo.score || 0)),
      status: bo.verdict || 'ทวนสอบข่าว/พื้นฐาน',
      task: bo.summary || 'กำลังประเมินคุณภาพธุรกิจ ข่าวสำคัญ และความเสี่ยงโครงสร้าง',
      bubble: dilutionRisk?.score && dilutionRisk.score < 45 ? '⚠ พบความเสี่ยง dilution ต้องเฝ้าระวังเป็นพิเศษ' : '📰 เฝ้าดูข่าว contract, earnings และ corporate action',
      metrics: [
        `พื้นฐาน ${Number(bo.score || 0)}/100`,
        `ข่าวรวม ${prediction.newsSentiment ?? 0}`,
        `AI Score ${data.profile?.score ?? '-'}`
      ]
    },
    {
      code: 'GK',
      title: 'โต๊ะแรงซิ่ง / โมเมนตัม',
      avatar: 'grok',
      owner: 'Grok',
      tone: scoreTone(Number(grok.score || 0)),
      status: grok.verdict || 'สแกนโมเมนตัม',
      task: grok.summary || 'กำลังสแกนความแรงของราคา, volume spike และ volatility',
      bubble: (tech.volRatio || 0) > 1.4 ? '🚀 Volume เริ่มเด่น ต้องดูว่าราคาผ่านแนวต้านพร้อมแรงซื้อจริงไหม' : '⏳ Volume ยังไม่ยืนยันมากพอ ระวัง false breakout',
      metrics: [
        `Volume ${Number(tech.volRatio || 0).toFixed(2)}x`,
        `ATR ${(Number(tech.atrPct || 0) * 100).toFixed(2)}%`,
        `1D ${percent(Number(tech.dayChange || 0))}`
      ]
    },
    {
      code: 'PK',
      title: 'โต๊ะเทคนิค / แผนเทรด',
      avatar: 'pok',
      owner: 'ป๊อก',
      tone: scoreTone(Number(pok.score || 0)),
      status: pok.verdict || 'วางจุดเข้าออก',
      task: pok.summary || 'กำลังประเมิน MA, VWAP, RSI, MACD และจุดเข้าออก',
      bubble: `🎯 Follow เหนือ ${money(prediction.levels?.resistance)} | คุมเสี่ยงใต้ ${money(prediction.levels?.stopLoss)}`,
      metrics: [
        `RSI ${Number(tech.rsi14 || 0).toFixed(1)}`,
        `VWAP ${money(tech.vwap20)}`,
        `Stop ${money(prediction.levels?.stopLoss)}`
      ]
    },
    {
      code: 'SM',
      title: 'โต๊ะ Smart Money',
      avatar: 'smart',
      owner: 'มาร์ค',
      tone: scoreTone(Number(smart.score || 0)),
      status: smart.action || smart.verdict || 'อ่านรอยเท้าเงินใหญ่',
      task: smart.summary || smart.overview || 'กำลังอ่านการสะสม/กระจายจาก OBV, CMF, MFI และ CVD proxy',
      bubble: `💼 ${smart.interpretation?.meaning || 'เช็กว่าเงินใหญ่กำลังสะสมหรือกระจายหุ้น'}`,
      metrics: [
        `SM ${Number(smart.score || 0)}/100`,
        `OBV ${metricValue(smart, 'OBV')}`,
        `CMF ${metricValue(smart, 'CMF20')}`
      ]
    },
    {
      code: 'SO',
      title: 'โต๊ะ Social Radar',
      avatar: 'social',
      owner: 'โซเชียล',
      tone: scoreTone(socialDerivedScore),
      status: socialSummary.thaiSummary || socialSummary.dominantTone || 'อ่านกระแสผู้คน',
      task: `กำลังประมวลผล Facebook, X, Reddit, Stocktwits, YouTube และแหล่งกระแสอื่น ๆ`,
      bubble: Number(socialSummary.hypeRisk || 0) >= 65 ? '📣 กระแสแรงแต่เสี่ยงปั่น ห้ามใช้ Social เป็นเหตุผลหลักในการเข้า' : '🧭 ใช้ Social เป็นตัวเสริม ตรวจที่มาของกระแสทุกครั้ง',
      metrics: [
        `Heat ${Number(socialSummary.heatScore || 0)}/100`,
        `Hype ${Number(socialSummary.hypeRisk || 0)}/100`,
        `Conf ${Number(socialSummary.confidence || 0)}%`
      ]
    },
    {
      code: 'DT',
      title: 'โต๊ะ Decision Matrix',
      avatar: 'data',
      owner: 'ดาต้า',
      tone: scoreTone(Number(dataQuality?.score || prediction.confidence || 50)),
      status: dataQuality?.status || 'ทวนสอบข้อมูล',
      task: `สรุปจากตารางหลายมิติ ${factors.length} มิติ เพื่อสร้างแผนตัดสินใจที่ใช้งานได้จริง`,
      bubble: worstFactors.length ? `🧠 จุดอ่อนหลักวันนี้: ${worstFactors.map(x => x.dimension).join(' / ')}` : '🧠 กำลังรวบรวมคะแนนรายมิติ',
      metrics: [
        `Data ${Number(dataQuality?.score || prediction.confidence || 50)}/100`,
        `R/R ${rrFactor?.scoreText || '-'}`,
        `มั่นใจ ${prediction.confidence || '-'}%`
      ]
    }
  ];

  roomEl.innerHTML = stations.map(st => `
    <article class="pixel-station tone-${st.tone}">
      <div class="pixel-station-top">
        <div class="pixel-avatar-wrap large">${pixelAvatarSvg(st.avatar || 'data', 'md')}</div>
        <div>
          <div class="pixel-station-title">${escapeHtml(st.title)}</div>
          <div class="pixel-station-owner">ผู้รับผิดชอบ: ${escapeHtml(st.owner)}</div>
        </div>
        <span class="badge ${st.tone}">${escapeHtml(st.status)}</span>
      </div>
      <div class="pixel-task">${escapeHtml(st.task)}</div>
      <div class="pixel-bubble">${escapeHtml(st.bubble)}</div>
      <div class="pixel-metrics">
        ${st.metrics.map(m => `<span>${escapeHtml(m)}</span>`).join('')}
      </div>
    </article>
  `).join('');

  const roomTone = scoreTone(Number(data.profile?.score || 0) + (prediction.direction === 'ขึ้น' ? 5 : prediction.direction === 'ลง' ? -5 : 0));
  setBadge(overallEl, `${data.symbol} • ${summaryLabel(data.summary)} • ${prediction.verdict}`, roomTone);

  narrativeEl.innerHTML = `<strong>ภาพรวม:</strong> ห้องวิเคราะห์ของ ${escapeHtml(data.symbol)} กำลังชี้ว่า “${escapeHtml(prediction.verdict || '-') }” โดยโบ้จับตาข่าวและความเสี่ยงพื้นฐาน, Grok จับตาโมเมนตัมและแรงเก็งกำไร, ป๊อกทวนสอบจุดเข้า/ออก, โต๊ะ Smart Money ตรวจแรงสะสม, Social Radar กรองกระแส และดาต้าสรุปทั้งหมดลงใน Decision Matrix เพื่อช่วยตัดสินใจ`;

  const steps = [
    { label: '1) ราคา/Volume', detail: `OHLCV ${data.dataSources?.price || '-'}`, tone: 'neutral' },
    { label: '2) ข่าว', detail: `${(data.news || []).length} ข่าว • ${data.dataSources?.news || '-'}`, tone: scoreTone(Math.round(50 + Number(prediction.newsSentiment || 0) * 50)) },
    { label: '3) Social', detail: `${socialSummary.dominantTone || 'ข้อมูลจำกัด'} • Heat ${Number(socialSummary.heatScore || 0)}`, tone: scoreTone(socialDerivedScore) },
    { label: '4) Smart Money', detail: `${Number(smart.score || 0)}/100`, tone: scoreTone(Number(smart.score || 0)) },
    { label: '5) คำตัดสิน', detail: `${prediction.verdict || '-'} • มั่นใจ ${prediction.confidence || '-'}%`, tone: scoreTone(Number(data.profile?.score || 0)) }
  ];

  timelineEl.innerHTML = steps.map(step => `
    <div class="pixel-step tone-${step.tone}">
      <div class="pixel-step-label">${escapeHtml(step.label)}</div>
      <div class="pixel-step-detail">${escapeHtml(step.detail)}</div>
    </div>
  `).join('');
}

function makeRosterAgent(code, name, track, score, status, role) {
  const cleanScore = clampNum(Number(score || 0), 0, 100);
  return {
    code,
    name,
    track,
    score: cleanScore,
    status,
    role,
    avatar: avatarTypeFromId(name || code),
    tone: scoreTone(cleanScore)
  };
}

function metricValue(smart, name) {
  const arr = smart?.indicators || [];
  const found = arr.find(x => String(x.name || '').toUpperCase() === String(name).toUpperCase());
  if (!found) return '-';
  const n = Number(found.value);
  return Number.isFinite(n) ? n.toFixed(2) : (found.value ?? '-');
}

function clampNum(v, min, max) {
  return Math.max(min, Math.min(max, Number(v) || 0));
}

function scoreTone(score) {
  const s = Number(score) || 0;
  if (s >= 70) return 'bullish';
  if (s >= 40) return 'neutral';
  return 'bearish';
}

function summaryLabel(summary) {
  if (!summary) return '-';
  return summary.label || summary.headline || summary.risk || '-';
}


function renderTradingView(symbol) {
  const container = $('tv_chart');
  container.innerHTML = '';
  const id = `tv_${Math.random().toString(36).slice(2)}`;
  const div = document.createElement('div');
  div.id = id;
  div.style.height = '100%';
  container.appendChild(div);

  if (!window.TradingView) {
    container.innerHTML = '<div style="padding:24px;color:#93a4b8">TradingView ยังโหลดไม่สำเร็จ กรุณาต่ออินเทอร์เน็ต</div>';
    return;
  }

  new window.TradingView.widget({
    autosize: true,
    symbol,
    interval: 'D',
    timezone: 'exchange',
    theme: 'dark',
    style: '1',
    locale: 'th',
    toolbar_bg: '#111d2e',
    hide_side_toolbar: false,
    allow_symbol_change: true,
    container_id: id
  });
}

function renderLinks(links) {
  $('externalSearchLinks').innerHTML = Object.entries(links).map(([name, url]) => {
    const label = ({ googleNews:'ค้นข่าว Google', yahooFinance:'ข่าว Yahoo Finance', nasdaqNews:'ข่าว Nasdaq', secEdgar:'เอกสาร SEC', stocktwits:'Stocktwits', xSearch:'ค้นหา X', facebookSearch:'ค้นหา Facebook', redditSearch:'ค้นหา Reddit', youtubeSearch:'ค้นหา YouTube' })[name] || name;
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}</a>`;
  }).join('');
}


function renderSmartMoney(smart) {
  if (!smart) {
    setBadge($('smartMoneyStatus'), 'ยังไม่มีข้อมูล Smart Money', 'neutral');
    $('smartIndicators').innerHTML = '<div class="smart-card"><div class="warn">ยังไม่มีข้อมูล Smart Money</div></div>';
    return;
  }
  const interp = scoreMeaningFromBackend(smart.interpretation, smart.score);
  setBadge($('smartMoneyStatus'), `${smart.score}/100 • ${interp.label}`, interp.tone || badgeClass(interp.label));
  $('smartScoreText').textContent = `${smart.score}/100`;
  $('smartScoreMeaning').textContent = `${interp.label}: ${interp.meaning}`;
  $('smartVerdictText').textContent = smart.verdict || interp.label;
  $('smartActionText').textContent = smart.action || interp.action || '-';
  $('smartPriceText').textContent = money(smart.latest?.price);
  $('smartDataText').textContent = `VWAP20 ${money(smart.latest?.vwap20)} • ATR ${(Number(smart.latest?.atrPct || 0) * 100).toFixed(2)}% • Volume ${Number(smart.latest?.volumeRatio || 0).toFixed(2)}x`;
  $('smartSummaryText').innerHTML = `<strong>สรุป Smart Money:</strong> ${escapeHtml(smart.summary || interp.thaiSummary || '-')}`;
  $('smartRisks').innerHTML = (smart.risks || []).map(x => `<li>${escapeHtml(x)}</li>`).join('') || '<li>ยังไม่มีความเสี่ยงเด่นชัด</li>';
  $('smartOpportunities').innerHTML = (smart.opportunities || []).map(x => `<li>${escapeHtml(x)}</li>`).join('') || '<li>ยังไม่มีสัญญาณสะสมเด่นชัด</li>';
  $('smartLimitations').innerHTML = `<strong>ข้อจำกัดข้อมูล:</strong> ${(smart.limitations || []).map(escapeHtml).join(' • ')}`;
  $('smartIndicators').innerHTML = (smart.indicators || []).map(ind => {
    const m = scoreMeaning(ind.score);
    return `<article class="smart-card">
      <div class="smart-head">
        <div><h3>${escapeHtml(ind.name)}</h3><div class="small">${escapeHtml(ind.status || '-')}</div></div>
        <div class="smart-score ${m.cls}">${Number(ind.score || 0)}/100</div>
      </div>
      <p class="news-snippet"><strong>แปลผล:</strong> ${escapeHtml(m.label)} — ${escapeHtml(ind.explanation || '')}</p>
    </article>`;
  }).join('') || '<div class="smart-card"><div class="warn">ไม่มีรายการอินดิเคเตอร์</div></div>';
}

function renderSocial(social) {
  if (!social || !social.summary) {
    setBadge($('socialStatus'), 'ยังไม่มีข้อมูล Social', 'neutral');
    $('socialPlatforms').innerHTML = '<div class="social-platform-card"><div class="warn">ยังไม่มีข้อมูล Social Media</div></div>';
    return;
  }

  const sum = social.summary;
  setBadge($('socialStatus'), `${sum.dominantTone} • ${sum.buzzLevel}`, badgeClass(sum.dominantTone));
  $('socialToneText').textContent = sum.dominantTone || '-';
  $('socialScoreText').textContent = `Sentiment ${Number(sum.sentimentScore || 0).toFixed(3)} จาก -1 ถึง +1`;
  $('socialHeatText').textContent = sum.buzzLevel || '-';
  $('socialHeatScoreText').textContent = `Heat ${sum.heatScore || 0}/100`;
  $('socialHypeText').textContent = sum.manipulationRisk || '-';
  $('socialConfidenceText').textContent = `Hype risk ${sum.hypeRisk || 0}/100 • ความมั่นใจ ${sum.confidence || 0}%`;
  $('socialSummaryText').innerHTML = `<strong>สรุป Social:</strong> ${escapeHtml(sum.thaiSummary || '-')}`;
  $('socialRisks').innerHTML = (sum.risks || []).map(x => `<li>${escapeHtml(x)}</li>`).join('') || '<li>ยังไม่มีความเสี่ยงเด่นชัด</li>';
  $('socialOpportunities').innerHTML = (sum.opportunities || []).map(x => `<li>${escapeHtml(x)}</li>`).join('') || '<li>ยังไม่มีโอกาสเด่นชัด</li>';

  $('socialPlatforms').innerHTML = (social.platforms || []).map(platform => {
    const links = (platform.links || []).map(link => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`).join('');
    const samples = (platform.sampleMentions || []).length
      ? platform.sampleMentions.map(m => `
        <li>
          <a href="${escapeHtml(m.url || '#')}" target="_blank" rel="noopener">${escapeHtml(m.textTh || m.text)}</a>
          <div class="small">${escapeHtml(m.source || m.author || platform.name)} • ${escapeHtml(m.sentimentLabelTh || '-')} • Heat ${m.heatScore || 0}/100 • ${escapeHtml(m.keyReasonTh || '')}</div>
        </li>`).join('')
      : '<li>ยังไม่พบข้อความสาธารณะที่ดึงได้โดยตรง ให้กดลิงก์เพื่อตรวจสอบโพสต์จริง</li>';
    return `
      <article class="social-platform-card">
        <div class="social-platform-head">
          <div>
            <span class="badge info">${escapeHtml(platform.badge || 'Social')}</span>
            <h3>${escapeHtml(platform.name)}</h3>
            <div class="small">พบ ${platform.mentionCount || 0} รายการ • ความมั่นใจข้อมูล ${platform.confidence || 0}%</div>
          </div>
          <div class="social-score ${badgeClass(platform.status)}">${escapeHtml(platform.status || '-')}</div>
        </div>
        <div class="social-metrics">
          <span>Sentiment ${Number(platform.sentimentScore || 0).toFixed(3)}</span>
          <span>Heat ${platform.heatScore || 0}/100</span>
          <span>Hype ${platform.hypeRisk || 0}/100</span>
        </div>
        <p class="news-snippet"><strong>วิเคราะห์:</strong> ${escapeHtml(platform.analysisTh || '-')}</p>
        <p class="news-original"><strong>ข้อจำกัด:</strong> ${escapeHtml(platform.limitation || '-')}</p>
        <ul class="social-mentions">${samples}</ul>
        <div class="tool-links">${links}</div>
      </article>`;
  }).join('');
}

function renderNews(news, sources) {
  setBadge($('newsStatus'), sources.newsFallback ? 'ใช้ข่าวสำรอง/ลิงก์ตรวจสอบ' : `พบข่าว ${news.length} รายการ`, sources.newsFallback ? 'neutral' : 'bullish');
  $('newsList').innerHTML = news.map((a, i) => {
    const cls = a.label === 'positive' ? 'bullish' : a.label === 'negative' ? 'bearish' : 'neutral';
    const label = a.label === 'positive' ? 'ข่าวบวก' : a.label === 'negative' ? 'ข่าวลบ' : 'กลาง';
    const published = a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('th-TH') : '-';
    return `<div class="news-item">
      <div class="news-head">
        <div>
          <a class="news-title" href="${escapeHtml(a.url)}" target="_blank" rel="noopener">${i + 1}. ${escapeHtml(a.titleTh || a.title)}</a>
          <div class="news-meta">${escapeHtml(a.source)} • ${published} • ผลกระทบ ${a.impactScore}/100 • คะแนนข่าว ${a.sentimentScore}</div>
        </div>
        <span class="badge ${cls}">${escapeHtml(a.sentimentLabelTh || label)}</span>
      </div>
      <p class="news-snippet"><strong>สรุปข่าวภาษาไทย:</strong> ${escapeHtml(a.snippetTh || 'ไม่มีคำอธิบายจากแหล่งข่าวนี้')}</p>
      <p class="news-snippet"><strong>เหตุผลผลกระทบ:</strong> ${escapeHtml(a.impactReasonTh || 'ต้องตรวจข่าวต้นทางเพิ่มเติม')}</p>
      <p class="news-snippet"><strong>ประเภทข่าว:</strong> ${escapeHtml(a.eventTypeTh || 'ข่าวทั่วไป')}</p>
      <details class="news-original"><summary>ดูหัวข่าวต้นฉบับภาษาอังกฤษ</summary>${escapeHtml(a.titleOriginal || a.title)}</details>
    </div>`;
  }).join('');
}

function renderAgents(agents) {
  const grid = $('agentsGrid');
  if (!grid) return;
  if (!agents.length) {
    grid.innerHTML = '<div class="agent-card"><div class="warn">ยังไม่มีข้อมูล Agent</div></div>';
    return;
  }

  grid.innerHTML = agents.map(agent => `
    <article class="agent-card ${escapeHtml(agent.id || '')}">
      <div class="agent-head">
        <div>
          <span class="badge info">${escapeHtml(agent.badge || 'Agent')}</span>
          <h3>${escapeHtml(agent.name)}</h3>
          <div class="small">${escapeHtml(agent.role)}</div>
        </div>
        <div class="agent-score"><div>${Number(agent.score || 0)}/100</div><small>${escapeHtml(scoreMeaning(agent.score || 0).label)}</small></div>
      </div>
      <div class="thesis"><strong>สรุป:</strong> ${escapeHtml(agent.summary || agent.verdict || '-')}</div>
      <div class="agent-sections">
        ${(agent.sections || []).map(section => `
          <section class="agent-section">
            <h4>${escapeHtml(section.title)}</h4>
            <ul>${(section.points || []).map(point => `<li>${escapeHtml(point)}</li>`).join('')}</ul>
          </section>
        `).join('')}
      </div>
    </article>
  `).join('');
}

function renderPrediction(p, sources) {
  setBadge($('predictionStatus'), p.verdict);
  $('lastPriceText').textContent = money(p.lastPrice);
  $('predictedPriceText').textContent = money(p.predictedPrice);
  $('predictedReturnText').textContent = `${percent(p.predictedReturn)} จากราคาล่าสุด • ${p.direction}`;
  $('predictedRangeText').textContent = `${money(p.rangeLow)} - ${money(p.rangeHigh)}`;
  $('confidenceText').textContent = `ความมั่นใจ ${p.confidence}%`;
  $('dataQualityText').textContent = `ราคา: ${sources.price} • RSI ${p.technical.rsi14} • ATR ${(p.technical.atrPct * 100).toFixed(2)}% • Volume ${p.technical.volRatio}x`;

  $('bullCaseTitle').textContent = `เป้า ${money(p.bullCase)}`;
  $('bullCaseText').textContent = 'เกิดเมื่อข่าวบวกหนุน ราคาเหนือ VWAP/MA5 และ volume เข้าเหนือค่าเฉลี่ย';
  $('baseCaseTitle').textContent = `เป้า ${money(p.baseCase)}`;
  $('baseCaseText').textContent = 'กรณีหลักคำนวณจากแนวโน้ม โมเมนตัม RSI ปริมาณซื้อขาย MACD คะแนนข่าว และการหักคะแนนความเสี่ยง';
  $('bearCaseTitle').textContent = `เป้า ${money(p.bearCase)}`;
  $('bearCaseText').textContent = 'เกิดเมื่อข่าวลบกดดัน ราคาหลุดแนวรับ หรือ volume ขายสูงผิดปกติ';

  $('predictionBars').innerHTML = Object.entries(p.components).map(([key, value]) => {
    const n = Number(value);
    const w = Math.min(50, Math.abs(n) * 50);
    const cls = n >= 0 ? 'pos' : 'neg';
    return `<div class="bar-row"><div class="bar-label">${componentName(key)}</div><div class="bar-track"><div class="bar-fill ${cls}" style="width:${w}%"></div></div><div class="${n >= 0 ? 'success' : 'danger'} mono">${n >= 0 ? '+' : ''}${n.toFixed(2)}</div></div>`;
  }).join('');

  $('predictionLogic').innerHTML = p.reasoning.map(x => `<li>${escapeHtml(x)}</li>`).join('');
}

function componentName(key) {
  return ({ trend:'แนวโน้ม / MA / VWAP', momentum:'โมเมนตัม', rsi:'RSI', volume:'ปริมาณซื้อขาย', macd:'MACD', news:'คะแนนข่าว', aiScore:'คะแนน AI', riskPenalty:'หักคะแนนความเสี่ยง' })[key] || key;
}

function renderFactors(factors) {
  $('factorBody').innerHTML = factors.map(f => {
    const score = Number(f.score || 0);
    const scoreCls = score >= 70 ? 'bullish' : score >= 40 ? 'neutral' : 'bearish';
    return `<tr>
      <td>${f.index}</td>
      <td><strong>${escapeHtml(f.dimension)}</strong></td>
      <td><span class="factor-score ${scoreCls}">${escapeHtml(f.scoreText || `${score}/100`)}</span></td>
      <td>${(() => {
        const info = statusIconInfo(f.status, f.score);
        return `<span class="status-symbol ${info.cls}" title="${escapeHtml(info.label)}" aria-label="${escapeHtml(info.label)}">${info.icon}</span>`;
      })()}</td>
      <td>${escapeHtml(f.weight || '-')}</td>
      <td>${escapeHtml(f.confidence || '-')}</td>
      <td>${escapeHtml(f.priceImpact || '-')}</td>
      <td>${escapeHtml(f.timeframe || '-')}</td>
      <td>${escapeHtml(f.explanation || '-')}</td>
      <td>${escapeHtml(f.watch || '-')}</td>
      <td><strong>${escapeHtml(f.action || '-')}</strong></td>
    </tr>`;
  }).join('');
}


document.addEventListener('click', (e) => {
  const link = e.target.closest('.nav-link');
  if (!link) return;
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
  link.classList.add('active');
});

initShellControls();
$('analyseBtn').addEventListener('click', analyze);
$('tickerInput').addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); });
analyze();
