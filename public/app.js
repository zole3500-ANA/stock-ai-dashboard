let latestDashboardData = null;
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
  if (s.includes('กลางบวก') || n >= 55) return { icon: '↗️', label: 'กลางบวก', cls: 'mild-bullish' };
  if (s.includes('กลาง') || s.includes('รอดู') || n >= 40) return { icon: '⏳', label: 'กลาง / รอดู', cls: 'neutral' };
  if (s.includes('อ่อนมาก') || s.includes('เสี่ยงสูง') || n < 20) return { icon: '🛑', label: 'อ่อนมาก / เสี่ยงสูง', cls: 'very-bearish' };
  if (s.includes('อ่อน') || s.includes('ระวัง') || n < 40) return { icon: '⚠️', label: 'อ่อน / ควรระวัง', cls: 'bearish' };
  return { icon: '⚪', label: status || 'ยังไม่ชัด', cls: 'neutral' };
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[m]));
}

function normalizeCryptoInput(value) {
  const v = String(value || 'BTC').trim().toUpperCase();
  const map = {
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
  return map[v] || (v.includes('-') ? v : `${v || 'BTC'}-USD`);
}

function applyAssetTypeUi() {
  const proAsset = $('proAssetTypeSelect');
  const legacyAsset = $('assetTypeSelect');
  const assetType = proAsset?.value || legacyAsset?.value || 'stock';
  const tickerInput = $('tickerInput');
  const marketSelect = $('marketSelect');
  const proTicker = $('proTickerInput');
  const proMarket = $('proMarketSelect');
  if (legacyAsset) legacyAsset.value = assetType;

  const activeTicker = proTicker?.value || tickerInput?.value || '';
  if (assetType === 'crypto') {
    const next = (!activeTicker || ['BURU','IREN','NVDA','AAPL'].includes(String(activeTicker).toUpperCase())) ? 'BTC' : activeTicker;
    if (proTicker) {
      proTicker.value = next;
      proTicker.placeholder = 'BTC, ETH, SOL, DOGE';
    }
    if (tickerInput) {
      tickerInput.value = next;
      tickerInput.placeholder = 'พิมพ์เหรียญ เช่น BTC, ETH, SOL, DOGE';
    }
    if (marketSelect) {
      marketSelect.value = 'CRYPTO';
      marketSelect.disabled = true;
      marketSelect.title = 'โหมดคริปโตใช้ข้อมูล Yahoo Finance และกราฟ TradingView คู่ USD';
    }
    if (proMarket) {
      proMarket.value = 'CRYPTO';
      proMarket.disabled = true;
    }
    if ($('proAssetHint')) $('proAssetHint').textContent = 'Crypto Mode';
  } else {
    const next = (String(activeTicker).toUpperCase().endsWith('-USD') || ['BTC','ETH','SOL','DOGE'].includes(String(activeTicker).toUpperCase())) ? 'BURU' : (activeTicker || 'BURU');
    if (proTicker) {
      proTicker.value = next;
      proTicker.placeholder = 'BURU, IREN, NVDA, AAPL';
    }
    if (tickerInput) {
      tickerInput.value = next;
      tickerInput.placeholder = 'พิมพ์ Ticker เช่น BURU, IREN, NVDA, AAPL';
    }
    if (marketSelect) {
      marketSelect.disabled = false;
      if (marketSelect.value === 'CRYPTO') marketSelect.value = 'AMEX';
      marketSelect.title = 'ตลาดหุ้น';
    }
    if (proMarket) {
      proMarket.disabled = false;
      if (proMarket.value === 'CRYPTO') proMarket.value = marketSelect?.value || 'AMEX';
    }
    if ($('proAssetHint')) $('proAssetHint').textContent = 'Stock AI';
  }
}

function syncProInputsToLegacy() {
  if ($('assetTypeSelect') && $('proAssetTypeSelect')) $('assetTypeSelect').value = $('proAssetTypeSelect').value;
  if ($('tickerInput') && $('proTickerInput')) $('tickerInput').value = $('proTickerInput').value;
  if ($('marketSelect') && $('proMarketSelect') && $('proAssetTypeSelect')?.value !== 'crypto') $('marketSelect').value = $('proMarketSelect').value;
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
  syncProInputsToLegacy();
  const assetType = $('proAssetTypeSelect')?.value || $('assetTypeSelect')?.value || 'stock';
  const rawSymbol = ($('proTickerInput')?.value || $('tickerInput')?.value || '').trim().toUpperCase();
  const symbol = assetType === 'crypto' ? normalizeCryptoInput(rawSymbol || 'BTC') : (rawSymbol || 'BURU');
  const market = assetType === 'crypto' ? 'CRYPTO' : ($('proMarketSelect')?.value || $('marketSelect')?.value || 'AMEX');
  setBadge($('updatedBadge'), assetType === 'crypto' ? 'กำลังวิเคราะห์ Bitcoin/Crypto...' : 'กำลังวิเคราะห์หุ้น...', 'info');
  animateRefreshPulse();
  if ($('analyseBtn')) $('analyseBtn').disabled = true;
  if ($('proAnalyseBtn')) $('proAnalyseBtn').disabled = true;

  try {
    const res = await fetch(`/api/analyze?symbol=${encodeURIComponent(symbol)}&market=${encodeURIComponent(market)}&assetType=${encodeURIComponent(assetType)}&days=120&newsDays=7`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    render(data);
  } catch (error) {
    setBadge($('updatedBadge'), 'โหลดข้อมูลไม่สำเร็จ', 'bearish');
    $('newsList').innerHTML = `<div class="news-item"><div class="danger">เกิดข้อผิดพลาด: ${escapeHtml(error.message)}</div><p class="small">ตรวจสอบว่า server รันอยู่ที่ <span class="mono">npm start</span></p></div>`;
  } finally {
    if ($('analyseBtn')) $('analyseBtn').disabled = false;
    if ($('proAnalyseBtn')) $('proAnalyseBtn').disabled = false;
  }
}

function render(data) {
  latestDashboardData = data;
  renderProDashboard(data);
  const { symbol, profile, summary, prediction } = data;
  const d = new Date(data.generatedAt);
  setBadge($('updatedBadge'), `อัปเดต: ${d.toLocaleString('th-TH')}`, 'info');

  $('tickerText').textContent = symbol;
  $('companyText').textContent = profile.company;
  if ($('assetTypeText')) $('assetTypeText').textContent = data.assetLabel || (data.assetType === 'crypto' ? 'Bitcoin / Crypto' : 'หุ้นอเมริกา');
  document.body.classList.toggle('asset-crypto', data.assetType === 'crypto');
  document.body.classList.toggle('asset-stock', data.assetType !== 'crypto');
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




const WATCHLIST_KEY = 'stock-ai-dashboard-watchlist-v1';

function readWatchlist() {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    const rows = JSON.parse(raw || '[]');
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function saveWatchlist(rows) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(rows.slice(0, 100)));
}

function watchlistKey(data) {
  return `${data.assetType || 'stock'}:${data.symbol || ''}`;
}

function isInWatchlist(data) {
  const key = watchlistKey(data);
  return readWatchlist().some(item => item.key === key);
}

function toggleWatchlist(data) {
  if (!data?.symbol) return;
  const key = watchlistKey(data);
  const current = readWatchlist();
  const exists = current.some(item => item.key === key);
  let next;
  if (exists) {
    next = current.filter(item => item.key !== key);
    showProToast(`นำ ${data.symbol} ออกจาก Watchlist แล้ว`, 'negative');
  } else {
    next = [
      {
        key,
        symbol: data.symbol,
        assetType: data.assetType || 'stock',
        assetLabel: data.assetLabel || (data.assetType === 'crypto' ? 'Bitcoin / Crypto' : 'หุ้น'),
        market: data.market || '-',
        company: data.profile?.company || '-',
        score: data.profile?.score ?? null,
        verdict: data.prediction?.verdict || '-',
        lastPrice: data.prediction?.lastPrice ?? null,
        updatedAt: new Date().toISOString()
      },
      ...current
    ];
    showProToast(`เพิ่ม ${data.symbol} เข้า Watchlist แล้ว`, 'positive');
  }
  saveWatchlist(next);
  updateWatchlistButton(data);
}

function updateWatchlistButton(data) {
  const btn = document.querySelector('[data-detail="watchlist"]');
  if (!btn || !data) return;
  const active = isInWatchlist(data);
  btn.classList.toggle('watchlist-active', active);
  btn.innerHTML = active ? '★ อยู่ใน WATCHLIST' : '⭐ WATCHLIST';
  btn.title = active ? 'กดเพื่อนำออกจาก Watchlist' : 'กดเพื่อเพิ่มเข้า Watchlist';
}

function showProToast(message, tone = 'neutral') {
  let toast = $('proToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'proToast';
    toast.className = 'pro-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `pro-toast show ${tone}`;
  window.clearTimeout(window.__proToastTimer);
  window.__proToastTimer = window.setTimeout(() => {
    toast.classList.remove('show');
  }, 2300);
}

function watchlistDetailContent() {
  const rows = readWatchlist();
  if (!rows.length) {
    return {
      title: 'Watchlist',
      html: `<div class="detail-card"><h3>ยังไม่มีรายการใน Watchlist</h3><p>กดปุ่ม ⭐ WATCHLIST บนสินทรัพย์ที่ต้องการติดตาม เพื่อบันทึกไว้ในเครื่องนี้</p></div>`
    };
  }

  return {
    title: `Watchlist (${rows.length} รายการ)`,
    html: `<div class="watchlist-detail-list">
      ${rows.map(item => {
        const tone = scoreTone(Number(item.score || 0));
        return `<div class="watchlist-item tone-${tone}">
          <div>
            <h3>${escapeHtml(item.symbol)} <span>${escapeHtml(item.assetLabel || '')}</span></h3>
            <p>${escapeHtml(item.company || '-')}</p>
            <small>${escapeHtml(item.market || '-')} • เพิ่มเมื่อ ${formatDateTimeShort(item.updatedAt)}</small>
          </div>
          <div class="watchlist-meta">
            <strong>${item.score ?? '-'}/100</strong>
            <span>${escapeHtml(item.verdict || '-')}</span>
            <span>${item.lastPrice != null ? money(item.lastPrice) : '-'}</span>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="detail-card"><p>หมายเหตุ: Watchlist นี้เก็บด้วย localStorage ในเครื่อง/เบราว์เซอร์ที่ใช้อยู่ หากเปิดคนละเครื่องหรือเคลียร์ cache รายการอาจหายได้</p></div>`
  };
}

function formatDateTimeShort(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('th-TH', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
}



function proToneByScore(score) {
  const n = Number(score || 0);
  if (n >= 60) return 'positive';
  if (n <= 40) return 'negative';
  return 'neutral';
}

function proToneByChange(change) {
  const n = Number(change || 0);
  if (n > 0.005) return 'positive';
  if (n < -0.005) return 'negative';
  return 'neutral';
}

function setProCardTone(selector, tone) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.classList.remove('tone-positive', 'tone-neutral', 'tone-negative');
  el.classList.add(`tone-${tone || 'neutral'}`);
}

function toneText(tone) {
  if (tone === 'positive') return 'ดี / บวก';
  if (tone === 'negative') return 'เสี่ยง / ลบ';
  return 'กลาง / รอดู';
}


function renderProDashboard(data) {
  if (!$('overview-pro')) return;
  const { symbol, profile, prediction, summary } = data;
  const tech = prediction.technical || {};
  const scoreInfo = scoreMeaningFromBackend(data.scoreInterpretation || profile.scoreInterpretation, profile.score);
  const d = new Date(data.generatedAt);
  const change = Number(tech.dayChange || 0);
  const scoreToneValue = proToneByScore(profile.score);
  const confidenceToneValue = proToneByScore(prediction.confidence);
  const priceToneValue = proToneByChange(change);

  setProCardTone('.pro-interpret-card', scoreToneValue);
  setProCardTone('.pro-confidence-card', confidenceToneValue);
  setProCardTone('.pro-last-card', priceToneValue);

  setText('proTickerTitle', symbol);
  setText('proCompanyMini', profile.company);
  setText('proLastPrice', money(prediction.lastPrice));
  setText('proChangeText', `${change >= 0 ? '+' : ''}${money(Math.abs((prediction.lastPrice || 0) * change)).replace('$', '$')} (${percent(change)})`);
  $('proChangeText')?.classList.toggle('up', change >= 0);
  $('proChangeText')?.classList.toggle('down', change < 0);
  setText('proUpdatedMini', `${data.assetLabel || 'Stock AI'} • ${d.toLocaleString('th-TH')}`);
  setText('proMarketRegime', data.assetType === 'crypto' ? 'CRYPTO' : (change >= 0 ? 'RISK-ON' : 'RISK-OFF'));
  setText('proSectorMood', data.assetType === 'crypto' ? 'BTC/Crypto' : (summary.risk || '-'));
  setText('proScoreText', profile.score);
  setText('proScoreLabel', scoreInfo.label || '-');
  setText('proScoreMeaning', scoreInfo.meaning || profile.thesis || '-');
  setText('proScoreExplain', `${toneText(scoreToneValue)} • ${scoreInfo.label || '-'}: ${scoreInfo.meaning || '-'} ${profile.thesis || ''}`);
  setText('proBiasText', prediction.verdict);
  setText('proBiasExplain', prediction.direction || '-');
  setText('proConfidenceText', `${prediction.confidence}%`);
  setText('proConfidenceLevel', `${toneText(confidenceToneValue)} • ${prediction.confidence >= 70 ? 'น่าเชื่อถือสูง' : prediction.confidence >= 50 ? 'ปานกลาง' : 'ข้อมูลจำกัด'}`);
  setText('proClosePrice', money(prediction.lastPrice));
  setText('proRangeMini', `${toneText(priceToneValue)} • ช่วง ${money(prediction.rangeLow)} - ${money(prediction.rangeHigh)}`);

  const proDonut = document.querySelector('.pro-donut');
  if (proDonut) proDonut.style.setProperty('--score', `${Math.max(0, Math.min(100, profile.score))}%`);

  renderProAgents(data);
  renderProFactors(data.factors || []);
  renderProBottom(data);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value ?? '-';
}

function renderProAgents(data) {
  const grid = $('proAgentCards');
  if (!grid) return;
  const agents = data.agents || [];
  const smart = data.smartMoney || {};
  const social = data.social?.summary || {};
  const profile = data.profile || {};
  const cards = [
    { type:'agent-0', avatar:'pok', name: agents[2]?.name || 'ป๊อก (สายเทคนิค)', role:'Technical Analysis', trend: agents[2]?.verdict || data.prediction?.verdict, detail:'RSI / MACD / VWAP / แนวรับแนวต้าน', score: agents[2]?.score || profile.score },
    { type:'agent-1', avatar:'bo', name: agents[0]?.name || 'โบ้ (สายพื้นฐาน)', role:data.assetType === 'crypto' ? 'Crypto Macro Analysis' : 'Fundamental Analysis', trend: agents[0]?.verdict || '-', detail: agents[0]?.summary || '-', score: agents[0]?.score || profile.score },
    { type:'agent-2', avatar:'grok', name: agents[1]?.name || 'Grok (สายซิ่ง)', role:data.assetType === 'crypto' ? 'Momentum & Social Hype' : 'News / Momentum', trend: agents[1]?.verdict || '-', detail: agents[1]?.summary || '-', score: agents[1]?.score || profile.score },
    { type:'smart', avatar:'smart', name:'มาร์ค (สาย Smart Money)', role:'Smart Money Analysis', trend: smart.interpretation?.label || smart.action || '-', detail: smart.summary || smart.overview || 'OBV / CMF / MFI / CVD proxy', score: smart.score || 50 },
    { type:'social', avatar:'social', name:'โซเชียล (สายกระแส)', role:'Social Sentiment', trend: social.dominantTone || social.thaiSummary || '-', detail: `Heat ${social.heatScore || 0}/100 • Hype ${social.hypeRisk || 0}/100`, score: Math.round(50 + Number(social.sentimentScore || 0) * 50) },
    { type:'data', avatar:'data', name:'ดาต้า (สายสถิติ)', role:'Quant & Data', trend:data.prediction?.verdict || '-', detail:`Confidence ${data.prediction?.confidence || 0}% • Factors ${(data.factors || []).length}`, score: data.prediction?.confidence || 50 }
  ];

  grid.innerHTML = cards.map(card => {
    const tone = scoreTone(Number(card.score || 0));
    return `<article class="pro-agent-card tone-${tone}" data-detail="${card.type}">
      <div class="pro-agent-head">
        <div class="pixel-avatar-wrap">${pixelAvatarSvg(card.avatar, 'xs')}</div>
        <div>
          <h3>${escapeHtml(card.name)}</h3>
          <small>${escapeHtml(card.role)}</small>
        </div>
      </div>
      <div class="pro-agent-status">แนวโน้ม: <strong>${escapeHtml(card.trend || '-')}</strong></div>
      <div class="pro-agent-mini-chart ${tone}"></div>
      <p>${escapeHtml(card.detail || '-')}</p>
      <button class="pro-detail-btn full" type="button" data-detail="${card.type}">ดูรายละเอียด</button>
    </article>`;
  }).join('');
}

function renderProFactors(factors) {
  const body = $('proFactorBody');
  if (!body) return;
  body.innerHTML = (factors || []).slice(0, 12).map(f => {
    const info = statusIconInfo(f.status, f.score);
    return `<tr data-detail="factor-${f.index}">
      <td>${f.index}</td>
      <td><strong>${escapeHtml(f.dimension)}</strong></td>
      <td>${escapeHtml(f.scoreText || `${f.score}/100`)}</td>
      <td><span class="status-symbol ${info.cls}" title="${escapeHtml(info.label)}">${info.icon}</span></td>
      <td>${escapeHtml(String(f.weight || '-').replace('%',''))}</td>
      <td>${escapeHtml(f.confidence || '-')}</td>
      <td class="${badgeClass(f.priceImpact)}">${escapeHtml(f.priceImpact || '-')}</td>
      <td>${escapeHtml(f.timeframe || '-')}</td>
      <td>${escapeHtml(f.explanation || '-')}</td>
      <td>${escapeHtml(f.watch || '-')}</td>
      <td><strong>${escapeHtml(f.action || '-')}</strong></td>
    </tr>`;
  }).join('');
}


function insightToneFromText(text = '', score = null) {
  const t = String(text || '').toLowerCase();
  const n = Number(score);
  if (Number.isFinite(n)) {
    if (n >= 60) return 'positive';
    if (n <= 40) return 'negative';
  }
  if (/(positive|bullish|ดี|บวก|หนุน|แข็งแรง|สะสม|ไหลเข้า|ฟื้น|กำไร|เพิ่มขึ้น|ผ่าน|ยืนยัน)/i.test(t)) return 'positive';
  if (/(negative|bearish|ลบ|กดดัน|เสี่ยง|อ่อน|ขาย|ไหลออก|ลดลง|ขาดทุน|หลุด|ระวัง|dilution|offering)/i.test(t)) return 'negative';
  return 'neutral';
}

function insightToneLabel(tone) {
  if (tone === 'positive') return 'ข่าวดี';
  if (tone === 'negative') return 'ข่าวไม่ดี';
  return 'ข่าวกลาง';
}

function insightToneIcon(tone) {
  if (tone === 'positive') return '●';
  if (tone === 'negative') return '●';
  return '●';
}

function newsTone(newsItem = {}) {
  const raw = `${newsItem.sentimentLabelTh || ''} ${newsItem.eventTypeTh || ''} ${newsItem.titleTh || newsItem.title || ''} ${newsItem.snippetTh || newsItem.snippet || ''}`;
  if (/บวก|positive|ดี|หนุน|ชนะ|สัญญา|กำไร|เพิ่มขึ้น|อนุมัติ/i.test(raw)) return 'positive';
  if (/ลบ|negative|ไม่ดี|เสี่ยง|ฟ้อง|ลดลง|ขาดทุน|offering|dilution|เพิ่มทุน|delisting|ขาย/i.test(raw)) return 'negative';
  return 'neutral';
}

function socialToneFromPlatform(platform = {}) {
  const heat = Number(platform.heatScore || 0);
  const hype = Number(platform.hypeRisk || 0);
  const sentiment = Number(platform.sentimentScore || 0);
  if (sentiment > 0.12 || (heat >= 60 && hype < 60)) return 'positive';
  if (sentiment < -0.12 || hype >= 70) return 'negative';
  return 'neutral';
}

function coloredInsightRow(label, value, tone = 'neutral', extra = '') {
  return `<div class="colored-insight-row ${tone}">
    <span class="insight-dot">${insightToneIcon(tone)}</span>
    <span class="insight-label">${escapeHtml(label)}</span>
    <strong class="insight-value">${escapeHtml(value)}</strong>
    ${extra ? `<small>${escapeHtml(extra)}</small>` : ''}
  </div>`;
}



function buildCatalystEvents(data) {
  const isCrypto = data.assetType === 'crypto';
  const news = data.news || [];
  const factors = data.factors || [];
  const prediction = data.prediction || {};
  const social = data.social?.summary || {};
  const tech = prediction.technical || {};
  const events = [];

  events.push({
    when: 'วันนี้',
    label: 'ตรวจสัญญาณราคา/Volume',
    detail: `ราคา ${money(prediction.lastPrice)} • VWAP ${money(tech.vwap20)} • Volume ${Number(tech.volRatio || 0).toFixed(2)}x`,
    tone: tech.last > tech.vwap20 && Number(tech.volRatio || 0) >= 1.2 ? 'positive' : tech.last < tech.vwap20 ? 'negative' : 'neutral',
    source: 'Price / Technical'
  });

  events.push({
    when: '24 ชม.',
    label: isCrypto ? 'Social / Funding / Liquidation Watch' : 'Social / ข่าว / Pre-market Watch',
    detail: isCrypto
      ? `Heat ${social.heatScore || 0}/100 • Hype Risk ${social.hypeRisk || 0}/100 • ตรวจ funding/OI เพิ่ม`
      : `Heat ${social.heatScore || 0}/100 • Hype Risk ${social.hypeRisk || 0}/100 • ตรวจ pre-market และข่าวใหม่`,
    tone: Number(social.hypeRisk || 0) >= 65 ? 'negative' : Number(social.heatScore || 0) >= 60 ? 'positive' : 'neutral',
    source: 'Social / Market Watch'
  });

  for (const item of news.slice(0, 8)) {
    const text = `${item.titleTh || item.title || ''} ${item.snippetTh || item.snippet || ''} ${item.eventTypeTh || ''}`.toLowerCase();
    let label = item.eventTypeTh || 'ข่าวสำคัญ';
    if (/earning|งบ|results|quarter|revenue/.test(text)) label = 'Earnings / งบการเงิน';
    else if (/offering|dilution|เพิ่มทุน|warrant|s-1/.test(text)) label = 'Offering / Dilution';
    else if (/sec|8-k|10-q|filing|nasdaq|delisting/.test(text)) label = 'SEC / Corporate Action';
    else if (/contract|award|partnership|สัญญา|ลูกค้า/.test(text)) label = 'Contract / Partnership';
    else if (/etf|fed|cpi|fomc|inflation|dxy|yield/.test(text)) label = isCrypto ? 'Macro / ETF Event' : 'Macro / Market Event';
    else if (/hack|exchange|liquidation|funding|whale|on-chain/.test(text)) label = 'Crypto Market Event';

    const tone = newsTone(item);
    events.push({
      when: formatDateShort(item.publishedAt) || 'สัปดาห์นี้',
      label,
      detail: item.titleTh || item.title || '-',
      tone,
      source: item.source || 'News',
      url: item.url || ''
    });
  }

  const watchedFactors = factors
    .filter(f => /catalyst|sec|dilution|offering|macro|regulation|smart|social|risk|volume|funding|liquidation|exchange/i.test(`${f.dimension} ${f.watch} ${f.action}`))
    .slice(0, 5);

  watchedFactors.forEach(f => {
    events.push({
      when: 'ต้องจับตา',
      label: f.dimension || 'Factor Watch',
      detail: f.watch || f.action || f.explanation || '-',
      tone: Number(f.score || 0) >= 60 ? 'positive' : Number(f.score || 0) <= 40 ? 'negative' : 'neutral',
      source: 'Decision Matrix'
    });
  });

  if (isCrypto) {
    events.push({
      when: 'สัปดาห์นี้',
      label: 'Crypto External Check',
      detail: 'ตรวจ Coinglass / CryptoQuant / Glassnode / ETF Flow เพิ่ม เพราะระบบยังใช้ proxy บางส่วน',
      tone: 'neutral',
      source: 'Crypto Data Quality'
    });
  } else {
    events.push({
      when: 'สัปดาห์นี้',
      label: 'SEC / Earnings Calendar Check',
      detail: 'ตรวจ SEC EDGAR, Earnings calendar และข่าว company-specific เพิ่มก่อนถือข้ามวัน',
      tone: 'neutral',
      source: 'Manual Verification'
    });
  }

  const seen = new Set();
  return events.filter(e => {
    const key = `${e.when}|${e.label}|${e.detail}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 14);
}

function catalystRow(event) {
  const tone = event.tone || 'neutral';
  const source = event.source ? ` • ${event.source}` : '';
  const link = event.url ? ` data-url="${escapeHtml(event.url)}"` : '';
  return `<div class="catalyst-row ${tone}"${link}>
    <span class="catalyst-when">${escapeHtml(event.when || '-')}</span>
    <div class="catalyst-main">
      <strong>${escapeHtml(event.label || '-')}</strong>
      <p>${escapeHtml(event.detail || '-')}</p>
      <small>${insightToneLabel(tone)}${escapeHtml(source)}</small>
    </div>
  </div>`;
}


function renderProBottom(data) {
  const p = data.prediction || {};
  const plan = p.tradePlan || {};
  const smart = data.smartMoney || {};
  const news = data.news || [];
  const social = data.social?.summary || {};
  setHtml('proTradePlan', `
    <ul class="pro-bullet-list trade-plan-color-list">
      <li><span class="trade-label entry">จุดเข้า</span><strong class="trade-price entry">${money(plan.confirmationLevel || p.levels?.resistance)}</strong></li>
      <li><span class="trade-label follow">จุด Follow</span><strong class="trade-price follow">${money(plan.followLevel || p.levels?.resistance)}</strong></li>
      <li><span class="trade-label reduce">ลดความเสี่ยง</span><strong class="trade-price reduce">${money(plan.reduceRiskLevel || p.levels?.support)}</strong></li>
      <li><span class="trade-label stop">Stop-loss</span><strong class="trade-price stop">${money(plan.stopLoss || p.levels?.stopLoss)}</strong></li>
    </ul>`);
  const smartTone = insightToneFromText(`${smart.interpretation?.label || ''} ${smart.interpretation?.meaning || ''} ${smart.summary || ''} ${smart.action || ''}`, smart.score);
  setHtml('proSmartSummary', `
    <div class="pro-mini-score ${scoreTone(smart.score || 0)}">${smart.score || '-'}<small>/100</small></div>
    <div class="colored-insight-block">
      ${coloredInsightRow('สถานะเงินใหญ่', smart.interpretation?.label || smart.action || '-', smartTone)}
      ${coloredInsightRow('สรุป', smart.interpretation?.meaning || smart.summary || smart.overview || '-', smartTone)}
      ${coloredInsightRow('สิ่งที่ต้องจับตา', smart.watch || 'OBV / CMF / MFI / CVD proxy', smartTone)}
    </div>`);
  setHtml('proNewsSummary', `
    <div class="colored-insight-block news-color-list">
      ${news.slice(0,4).map(n => {
        const tone = newsTone(n);
        return coloredInsightRow(`${formatDateShort(n.publishedAt)} • ${insightToneLabel(tone)}`, n.titleTh || n.title || '-', tone, n.source || '');
      }).join('') || coloredInsightRow('ข่าว', 'ยังไม่มีข่าว', 'neutral')}
    </div>`);
  const socialTone = insightToneFromText(`${social.thaiSummary || ''} ${social.dominantTone || ''}`, 50 + Number(social.sentimentScore || 0) * 50);
  setHtml('proSocialSummary', `
    <div class="pro-mini-score ${scoreTone(50 + Number(social.sentimentScore || 0) * 50)}">${social.heatScore || 0}<small>%</small></div>
    <div class="colored-insight-block">
      ${coloredInsightRow('ภาพรวม Social', social.thaiSummary || social.dominantTone || '-', socialTone)}
      ${coloredInsightRow('Heat', `${social.heatScore || 0}/100`, Number(social.heatScore || 0) >= 60 ? 'positive' : Number(social.heatScore || 0) <= 35 ? 'negative' : 'neutral')}
      ${coloredInsightRow('Hype Risk', `${social.hypeRisk || 0}/100`, Number(social.hypeRisk || 0) >= 65 ? 'negative' : Number(social.hypeRisk || 0) <= 35 ? 'positive' : 'neutral')}
    </div>`);
  const catalysts = buildCatalystEvents(data);
  setHtml('proCatalystSummary', `
    <div class="catalyst-list compact">
      ${catalysts.slice(0, 4).map(catalystRow).join('') || '<div class="catalyst-row neutral"><span class="catalyst-when">-</span><div class="catalyst-main"><strong>ยังไม่พบ Catalyst</strong><p>ยังไม่มีข่าวหรือเหตุการณ์ที่ระบบระบุได้</p></div></div>'}
    </div>`);
}

function setHtml(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

function formatDateShort(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', { day:'2-digit', month:'2-digit' });
}

function openProDetail(type) {
  const data = latestDashboardData;
  if (!data) return;
  const title = $('proModalTitle');
  const body = $('proModalBody');
  const modal = $('proDetailModal');
  if (!title || !body || !modal) return;

  const content = buildDetailContent(type, data);
  title.textContent = content.title;
  body.innerHTML = content.html;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeProDetail() {
  const modal = $('proDetailModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function buildDetailContent(type, data) {
  const agents = data.agents || [];
  if (type === 'watchlist-list') return watchlistDetailContent();
  if (type === 'score' || type === 'interpretation') {
    const scoreInfo = scoreMeaningFromBackend(data.scoreInterpretation || data.profile?.scoreInterpretation, data.profile?.score);
    return { title:'รายละเอียดคะแนน AI', html:`<div class="detail-grid">
      <div class="detail-card"><h3>${data.profile.score}/100 = ${escapeHtml(scoreInfo.label)}</h3><p>${escapeHtml(scoreInfo.meaning || '')}</p></div>
      <div class="detail-card"><h3>แกนวิเคราะห์</h3><p>${escapeHtml(data.profile.thesis || '-')}</p></div>
      <div class="detail-card"><h3>คำตัดสิน</h3><p>${escapeHtml(data.summary?.headline || '-')}</p><p>${escapeHtml(data.summary?.text || '-')}</p></div>
    </div>` };
  }
  if (type?.startsWith('agent-')) {
    const idx = Number(type.split('-')[1]);
    return agentDetail(agents[idx], `รายละเอียด ${agents[idx]?.name || 'Agent'}`);
  }
  if (type === 'smart') {
    const sm = data.smartMoney || {};
    return { title:'รายละเอียด Smart Money', html:`<div class="detail-card"><h3>${sm.score || '-'} / 100</h3>
        <div class="colored-insight-block">
          ${coloredInsightRow('สถานะเงินใหญ่', sm.interpretation?.label || sm.action || '-', insightToneFromText(`${sm.interpretation?.label || ''} ${sm.action || ''}`, sm.score))}
          ${coloredInsightRow('ความหมาย', sm.interpretation?.meaning || sm.summary || '-', insightToneFromText(`${sm.interpretation?.meaning || ''} ${sm.summary || ''}`, sm.score))}
        </div>
      </div>
      <div class="detail-grid">${(sm.indicators || []).map(i => {
        const tone = insightToneFromText(`${i.status || ''} ${i.explanation || ''}`, null);
        return `<div class="detail-card colored-detail ${tone}"><h3>${escapeHtml(i.name || '-')}</h3><p><strong>${escapeHtml(i.value ?? '-')}</strong></p><p>${escapeHtml(i.explanation || i.status || '-')}</p></div>`;
      }).join('')}</div>`};
  }
  if (type === 'social') {
    const platforms = data.social?.platforms || [];
    return { title:'รายละเอียด Social Media', html:`<div class="detail-grid">${platforms.map(p => {
      const tone = socialToneFromPlatform(p);
      return `<div class="detail-card colored-detail ${tone}"><h3>${escapeHtml(p.name)} • ${p.mentionCountLabel || p.mentionCount || 0}</h3><p>${escapeHtml(p.analysisTh || '-')}</p>
        <div class="colored-insight-block">
          ${coloredInsightRow('Heat', `${p.heatScore || 0}/100`, Number(p.heatScore || 0) >= 60 ? 'positive' : Number(p.heatScore || 0) <= 35 ? 'negative' : 'neutral')}
          ${coloredInsightRow('Hype Risk', `${p.hypeRisk || 0}/100`, Number(p.hypeRisk || 0) >= 65 ? 'negative' : Number(p.hypeRisk || 0) <= 35 ? 'positive' : 'neutral')}
          ${coloredInsightRow('Confidence', `${p.confidence || 0}%`, Number(p.confidence || 0) >= 60 ? 'positive' : Number(p.confidence || 0) <= 35 ? 'negative' : 'neutral')}
        </div></div>`;
    }).join('')}</div>`};
  }
  if (type === 'news') {
    return { title:'ข่าวสำคัญทั้งหมด', html:`<div class="detail-list">${(data.news || []).map(n => {
      const tone = newsTone(n);
      return `<a class="detail-news colored-detail ${tone}" href="${escapeHtml(n.url)}" target="_blank" rel="noopener"><strong>${escapeHtml(n.titleTh || n.title || '-')}</strong><span>${escapeHtml(n.source || '')} • ${formatDateShort(n.publishedAt)} • ${escapeHtml(n.sentimentLabelTh || insightToneLabel(tone))}</span><p>${escapeHtml(n.snippetTh || n.snippet || '')}</p></a>`;
    }).join('')}</div>` };
  }
  if (type === 'trade' || type === 'prediction' || type === 'price') {
    const p = data.prediction || {};
    const plan = p.tradePlan || {};
    return { title:'แผนราคา / จุดเข้าออก / Prediction', html:`<div class="detail-grid">
      <div class="detail-card"><h3>ราคาล่าสุด</h3><p>${money(p.lastPrice)}</p></div>
      <div class="detail-card"><h3>คาดการณ์</h3><p>${money(p.predictedPrice)} (${percent(p.predictedReturn)})</p></div>
      <div class="detail-card"><h3>กรอบราคา</h3><p>${money(p.rangeLow)} - ${money(p.rangeHigh)}</p></div>
      <div class="detail-card"><h3>Trade Plan</h3>
        <ul class="pro-bullet-list trade-plan-color-list">
          <li><span class="trade-label entry">จุดเข้า</span><strong class="trade-price entry">${money(plan.confirmationLevel || p.levels?.resistance)}</strong></li>
          <li><span class="trade-label follow">จุด Follow</span><strong class="trade-price follow">${money(plan.followLevel || p.levels?.resistance)}</strong></li>
          <li><span class="trade-label reduce">ลดความเสี่ยง</span><strong class="trade-price reduce">${money(plan.reduceRiskLevel || p.levels?.support)}</strong></li>
          <li><span class="trade-label stop">Stop-loss</span><strong class="trade-price stop">${money(plan.stopLoss || p.levels?.stopLoss)}</strong></li>
        </ul>
        <ul>${Object.entries(plan.rules || {}).map(([k,v]) => `<li>${escapeHtml(v)}</li>`).join('')}</ul>
      </div>
    </div><ol class="logic-list">${(p.reasoning || []).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ol>`};
  }
  if (type === 'catalyst') {
    const catalysts = buildCatalystEvents(data);
    return { title:'Catalyst / ปฏิทินเหตุการณ์', html:`<div class="detail-card"><p>ระบบสรุป Catalyst จากข่าวล่าสุด, Decision Matrix, Social, Volume และปัจจัยเฉพาะสินทรัพย์ เพื่อใช้เป็นรายการที่ต้องตรวจต่อ ไม่ใช่ปฏิทินทางการแบบ real-time</p></div>
      <div class="catalyst-list detail">${catalysts.map(catalystRow).join('')}</div>
      <div class="detail-card"><h3>ควรตรวจเพิ่มจากแหล่งจริง</h3><ul>
        <li>${data.assetType === 'crypto' ? 'Coinglass / CryptoQuant / Glassnode / ETF Flow / Funding Rate' : 'SEC EDGAR / Earnings Calendar / Nasdaq / Company IR'}</li>
        <li>ตรวจข่าวล่าสุดก่อนตลาดเปิดหรือก่อนถือข้ามวัน</li>
        <li>ถ้า Catalyst เป็นข่าวลือจาก Social ให้รอแหล่งข่าวยืนยันก่อน</li>
      </ul></div>` };
  }
  if (type === 'matrix') {
    return { title:'Decision Matrix ทั้งหมด', html:`<div class="detail-grid">${(data.factors || []).map(f => `<div class="detail-card"><h3>${f.index}. ${escapeHtml(f.dimension)}</h3><p><strong>${escapeHtml(f.scoreText)} • ${escapeHtml(f.status)}</strong></p><p>${escapeHtml(f.explanation)}</p><p><strong>จับตา:</strong> ${escapeHtml(f.watch)}</p><p><strong>Action:</strong> ${escapeHtml(f.action)}</p></div>`).join('')}</div>`};
  }
  if (type?.startsWith('factor-')) {
    const idx = Number(type.split('-')[1]);
    const f = (data.factors || []).find(x => x.index === idx);
    return { title: f?.dimension || 'รายละเอียดมิติ', html: f ? `<div class="detail-card"><h3>${escapeHtml(f.scoreText)} • ${escapeHtml(f.status)}</h3><p>${escapeHtml(f.explanation)}</p><p><strong>น้ำหนัก:</strong> ${escapeHtml(f.weight)} • <strong>ความมั่นใจ:</strong> ${escapeHtml(f.confidence)}</p><p><strong>ผลต่อราคา:</strong> ${escapeHtml(f.priceImpact)} • <strong>ระยะเวลา:</strong> ${escapeHtml(f.timeframe)}</p><p><strong>สิ่งที่ต้องจับตา:</strong> ${escapeHtml(f.watch)}</p><p><strong>Action:</strong> ${escapeHtml(f.action)}</p></div>` : '<p>ไม่พบข้อมูล</p>'};
  }
  if (type === 'data') {
    return { title:'คุณภาพข้อมูล', html:`<div class="detail-card"><p>ราคา: ${escapeHtml(data.dataSources?.price || '-')}</p><p>ข่าว: ${escapeHtml(data.dataSources?.news || '-')}</p><p>Social confidence: ${escapeHtml(String(data.social?.summary?.confidence || 0))}%</p><p>Prediction confidence: ${escapeHtml(String(data.prediction?.confidence || 0))}%</p></div>`};
  }
  return { title:'รายละเอียด', html:`<div class="detail-card"><p>เลือกการ์ดหรือแถวเพื่อดูรายละเอียดเชิงลึก</p></div>`};
}

function agentDetail(agent, title='รายละเอียด Agent') {
  if (!agent) return { title, html:'<p>ไม่พบข้อมูล Agent</p>' };
  return { title, html:`<div class="detail-card"><h3>${escapeHtml(agent.name)} • ${escapeHtml(agent.score ?? '-')} / 100</h3><p>${escapeHtml(agent.summary || agent.verdict || '-')}</p></div>
    ${(agent.sections || []).map(s => `<div class="detail-card"><h3>${escapeHtml(s.title || '-')}</h3><ul>${(s.points || []).map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul></div>`).join('')}` };
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
    const label = ({ googleNews:'ค้นข่าว Google', yahooFinance:'ข่าว Yahoo Finance', nasdaqNews:'ข่าว Nasdaq', secEdgar:'เอกสาร SEC', stocktwits:'Stocktwits', xSearch:'ค้นหา X', facebookSearch:'ค้นหา Facebook', redditSearch:'ค้นหา Reddit', youtubeSearch:'ค้นหา YouTube', coinMarketCap:'CoinMarketCap', coingecko:'CoinGecko', tradingView:'TradingView', googleTrends:'Google Trends' })[name] || name;
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
            <div class="small">สถานะข้อมูล: ${escapeHtml(platform.mentionCountLabel || String(platform.mentionCount || 0))} • ความมั่นใจข้อมูล ${platform.confidence || 0}%</div>
          </div>
          <div class="social-score ${badgeClass(platform.status)}">${escapeHtml(platform.status || '-')}</div>
        </div>
        <div class="social-metrics">
          <span>Sentiment ${Number(platform.sentimentScore || 0).toFixed(3)}</span>
          <span>Heat ${platform.heatScore || 0}/100</span>
          <span>Hype ${platform.hypeRisk || 0}/100</span>
        </div>
        <p class="news-snippet"><strong>วิเคราะห์:</strong> ${escapeHtml(platform.analysisTh || '-')}</p>
        <p class="news-original"><strong>สถานะการเชื่อมต่อ:</strong> ${escapeHtml(platform.accessLabel?.detail || '-')}</p>
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

  const isCrypto = document.body.classList.contains('asset-crypto');
  $('bullCaseTitle').textContent = `เป้า ${money(p.bullCase)}`;
  $('bullCaseText').textContent = isCrypto
    ? 'เกิดเมื่อราคาเหนือ VWAP/MA5 พร้อม spot volume, social ไม่ร้อนเกินไป และไม่มีแรงขายจาก macro/funding/OI'
    : 'เกิดเมื่อข่าวบวกหนุน ราคาเหนือ VWAP/MA5 และ volume เข้าเหนือค่าเฉลี่ย';
  $('baseCaseTitle').textContent = `เป้า ${money(p.baseCase)}`;
  $('baseCaseText').textContent = isCrypto
    ? 'กรณีหลักคำนวณจาก trend, momentum, RSI, volume, MACD, ข่าวคริปโต, social hype และ risk penalty'
    : 'กรณีหลักคำนวณจากแนวโน้ม โมเมนตัม RSI ปริมาณซื้อขาย MACD คะแนนข่าว และการหักคะแนนความเสี่ยง';
  $('bearCaseTitle').textContent = `เป้า ${money(p.bearCase)}`;
  $('bearCaseText').textContent = isCrypto
    ? 'เกิดเมื่อราคาเสีย VWAP/แนวรับ, funding/OI crowded, มี liquidation cascade หรือ macro risk-off'
    : 'เกิดเมื่อข่าวลบกดดัน ราคาหลุดแนวรับ หรือ volume ขายสูงผิดปกติ';

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
applyAssetTypeUi();
$('assetTypeSelect')?.addEventListener('change', () => {
  if ($('proAssetTypeSelect')) $('proAssetTypeSelect').value = $('assetTypeSelect').value;
  applyAssetTypeUi();
  analyze();
});
$('proAssetTypeSelect')?.addEventListener('change', () => {
  applyAssetTypeUi();
  analyze();
});
$('proMarketSelect')?.addEventListener('change', () => {
  if ($('marketSelect')) $('marketSelect').value = $('proMarketSelect').value;
});
$('proAnalyseBtn')?.addEventListener('click', analyze);
$('proTickerInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); });
$('analyseBtn')?.addEventListener('click', analyze);
$('tickerInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); });
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-detail]');
  const detail = target?.getAttribute('data-detail');
  if (detail) {
    e.preventDefault();
    if (detail === 'watchlist') {
      if (latestDashboardData) toggleWatchlist(latestDashboardData);
      return;
    }
    if (detail === 'share') {
      if (navigator.share && latestDashboardData) {
        navigator.share({ title: `Stock AI Dashboard ${latestDashboardData.symbol}`, text: `${latestDashboardData.symbol}: ${latestDashboardData.prediction?.verdict || ''}`, url: location.href }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(location.href).then(() => showProToast('คัดลอกลิงก์แล้ว', 'positive')).catch(() => showProToast('คัดลอกลิงก์ไม่สำเร็จ', 'negative'));
      }
      return;
    }
    openProDetail(detail);
  }
  if (e.target.closest('[data-close-detail]')) closeProDetail();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeProDetail(); });
document.addEventListener('dblclick', (e) => { if (e.target.closest('[data-detail="watchlist"]')) openProDetail('watchlist-list'); });
analyze();
