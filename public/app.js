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
  if (s.includes('bull') || s.includes('positive') || s.includes('above') || s.includes('น่าสนใจ') || s.includes('แข็ง')) return 'bullish';
  if (s.includes('bear') || s.includes('negative') || s.includes('below') || s.includes('weak') || s.includes('risk') || s.includes('ระวัง') || s.includes('ลบ')) return 'bearish';
  return 'neutral';
}

function setBadge(el, text, extra = '') {
  el.textContent = text;
  el.className = `badge ${extra || badgeClass(text)}`;
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
  $('dialScore').textContent = profile.score;
  $('biasText').textContent = prediction.verdict;
  $('riskText').textContent = summary.risk;
  setBadge($('decisionBadge'), summary.label);
  $('summaryHeadline').textContent = summary.headline;
  $('summaryText').textContent = summary.text;
  $('thesisBox').innerHTML = `<strong>Thesis:</strong> ${escapeHtml(profile.thesis)}`;
  $('supportText').textContent = money(summary.actionPlan.support);
  $('resistanceText').textContent = money(summary.actionPlan.resistance);
  $('stopText').textContent = money(summary.actionPlan.stopLoss);
  $('symbolBadge').textContent = data.tradingViewSymbol;

  renderTradingView(data.tradingViewSymbol);
  renderLinks(data.externalLinks);
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
    const label = ({ googleNews:'Google Search', yahooFinance:'Yahoo Finance', nasdaqNews:'Nasdaq News', secEdgar:'SEC EDGAR', stocktwits:'Stocktwits' })[name] || name;
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}</a>`;
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
          <a class="news-title" href="${escapeHtml(a.url)}" target="_blank" rel="noopener">${i + 1}. ${escapeHtml(a.title)}</a>
          <div class="news-meta">${escapeHtml(a.source)} • ${published} • Impact ${a.impactScore}/100 • Sentiment ${a.sentimentScore}</div>
        </div>
        <span class="badge ${cls}">${label}</span>
      </div>
      <p class="news-snippet">${escapeHtml(a.snippet || 'ไม่มีคำอธิบายจากแหล่งข่าวนี้')}</p>
    </div>`;
  }).join('');
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
  $('baseCaseText').textContent = 'กรณีหลักคำนวณจาก trend, momentum, RSI, volume, MACD, news และ risk penalty';
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
  return ({ trend:'Trend / MA / VWAP', momentum:'Momentum', rsi:'RSI', volume:'Volume', macd:'MACD', news:'News Sentiment', aiScore:'AI Score', riskPenalty:'Risk Penalty' })[key] || key;
}

function renderFactors(factors) {
  $('factorBody').innerHTML = factors.map(f => `<tr><td>${f.index}</td><td><strong>${escapeHtml(f.dimension)}</strong></td><td><span class="badge ${badgeClass(f.status)}">${escapeHtml(f.status)}</span></td><td>${escapeHtml(f.explanation)}</td></tr>`).join('');
}

$('analyseBtn').addEventListener('click', analyze);
$('tickerInput').addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); });
analyze();
