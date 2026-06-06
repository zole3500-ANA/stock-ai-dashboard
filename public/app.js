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

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[m]));
}

async function analyze() {
  const symbol = $('tickerInput').value.trim().toUpperCase() || 'BURU';
  const market = $('marketSelect').value;
  setBadge($('updatedBadge'), 'กำลังวิเคราะห์...', 'info');
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

  renderTradingView(data.tradingViewSymbol);
  renderLinks(data.externalLinks);
  renderAgents(data.agents || []);
  renderSmartMoney(data.smartMoney);
  renderSocial(data.social);
  renderNews(data.news, data.dataSources);
  renderPrediction(prediction, data.dataSources);
  renderFactors(data.factors);
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
  $('factorBody').innerHTML = factors.map(f => `<tr><td>${f.index}</td><td><strong>${escapeHtml(f.dimension)}</strong></td><td><span class="badge ${badgeClass(f.status)}">${escapeHtml(f.status)}</span></td><td>${escapeHtml(f.explanation)}</td></tr>`).join('');
}

$('analyseBtn').addEventListener('click', analyze);
$('tickerInput').addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); });
analyze();
