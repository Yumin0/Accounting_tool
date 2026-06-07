// === 消費分析 ===
const ANALYSIS_COLORS = ['#E8A33F','#CC6F4E','#7BA05B','#C9889F','#6E8FB0','#D2A24C','#B07A5B','#A0927C','#8FA88F','#C4A882'];
let currentAnalysisTab = 'share';
let currentAnalysisType = 'expense';
let trendDataCache = null;
let currentTrendCat = '';

function openExpenseAnalysis() { openAnalysis('expense'); }
function openIncomeAnalysis()  { openAnalysis('income');  }

function openAnalysis(type) {
  currentAnalysisType = type;
  document.getElementById('analysisTitle').textContent = type === 'expense' ? '消費分析' : '收入分析';
  document.getElementById('analysisMonthLabel').textContent = getMonthStr();
  trendDataCache = null;
  currentTrendCat = '';
  switchAnalysisTab('share');
  document.getElementById('analysisOverlay').classList.add('show');
  document.getElementById('analysisModal').classList.add('show');
}

function closeExpenseAnalysis() {
  document.getElementById('analysisModal').classList.remove('show');
  document.getElementById('analysisOverlay').classList.remove('show');
}

function switchAnalysisTab(tab) {
  currentAnalysisTab = tab;
  document.getElementById('analysisTabShare').className = 'analysis-tab' + (tab === 'share' ? ' active' : '');
  document.getElementById('analysisTabTrend').className = 'analysis-tab' + (tab === 'trend' ? ' active' : '');
  document.getElementById('analysisPanelShare').style.display = tab === 'share' ? '' : 'none';
  document.getElementById('analysisPanelTrend').style.display = tab === 'trend' ? '' : 'none';
  if (tab === 'share') renderShareView();
  else loadAndRenderTrend();
}

function renderTop5Notes() {
  const el = document.getElementById('analysisTop5Notes');
  const isExpense = currentAnalysisType === 'expense';
  const noteTotals = {};
  let total = 0;
  allTxData.forEach(tx => {
    if (tx.type !== currentAnalysisType) return;
    const key = tx.note || tx.category || '（無備註）';
    noteTotals[key] = (noteTotals[key] || 0) + Number(tx.amount);
    total += Number(tx.amount);
  });
  const items = Object.entries(noteTotals)
    .map(([note, amount]) => ({ note, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  if (!items.length || total === 0) { el.innerHTML = ''; return; }
  const title = isExpense ? '本月支出 Top 5 明細' : '本月收入 Top 5 明細';
  const amtColor = isExpense ? '#C9624E' : '#6F9E6E';
  let html = `<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--hairline);">
    <div style="font-size:14px;font-weight:800;color:var(--ink);margin-bottom:8px;">${title}</div>`;
  items.forEach((item, i) => {
    const pct = Math.round(item.amount / total * 100);
    const amt = item.amount >= 10000 ? Math.round(item.amount / 1000) + 'k' : item.amount.toLocaleString();
    html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #EDE3D5;font-size:14px;">
      <span style="width:20px;text-align:center;font-weight:bold;color:#9E9285;">${i + 1}</span>
      <span style="flex:1;color:#3B332A;">${item.note}</span>
      <span style="font-weight:bold;color:${amtColor};">$${amt}</span>
      <span style="color:#9E9285;font-size:13px;min-width:38px;text-align:right;">${pct}%</span>
    </div>`;
  });
  html += '</div>';
  el.innerHTML = html;
}

function renderShareView() {
  const catTotals = {};
  allTxData.forEach(tx => {
    if (tx.type !== currentAnalysisType) return;
    catTotals[tx.category] = (catTotals[tx.category] || 0) + Number(tx.amount);
  });
  const total = Object.values(catTotals).reduce((s, v) => s + v, 0);
  const items = Object.entries(catTotals)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
  if (!items.length || total === 0) {
    document.getElementById('analysisEmpty').textContent = currentAnalysisType === 'expense' ? '本月無支出紀錄' : '本月無收入紀錄';
    document.getElementById('analysisEmpty').style.display = 'block';
    document.getElementById('analysisChartArea').style.display = 'none';
  } else {
    document.getElementById('analysisEmpty').style.display = 'none';
    document.getElementById('analysisChartArea').style.display = 'flex';
    renderDonutChart(items, total);
    renderAnalysisLegend(items, total);
  }
  renderTop5Notes();
}

function renderDonutChart(items, total) {
  const svg = document.getElementById('analysisChart');
  const cx = 70, cy = 70, r = 52, strokeW = 22;
  const circ = 2 * Math.PI * r;
  let html = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#EDE3D5" stroke-width="${strokeW}"/>`;
  let accumulated = 0;
  items.forEach((item, i) => {
    const dash = (item.amount / total) * circ;
    const color = ANALYSIS_COLORS[i % ANALYSIS_COLORS.length];
    html += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${strokeW}"
      stroke-dasharray="${dash} ${circ - dash}"
      stroke-dashoffset="${-accumulated}"
      transform="rotate(-90 ${cx} ${cy})"/>`;
    accumulated += dash;
  });
  const totalLabel = total >= 10000 ? Math.round(total / 1000) + 'k' : total.toLocaleString();
  const centerLabel = currentAnalysisType === 'expense' ? '支出' : '收入';
  html += `<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="12" fill="#9E9285">${centerLabel}</text>
    <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="15" font-weight="bold" fill="#3B332A">$${totalLabel}</text>`;
  svg.innerHTML = html;
}

function renderAnalysisLegend(items, total) {
  document.getElementById('analysisLegend').innerHTML = items.map((item, i) => {
    const color = ANALYSIS_COLORS[i % ANALYSIS_COLORS.length];
    const pct = Math.round(item.amount / total * 100);
    const amt = item.amount >= 10000 ? Math.round(item.amount / 1000) + 'k' : item.amount.toLocaleString();
    return `<div class="analysis-legend-item">
      <div class="analysis-legend-dot" style="background:${color}"></div>
      <span class="analysis-legend-name">${item.name}</span>
      <span class="analysis-legend-amt">$${amt}</span>
      <span class="analysis-legend-pct">${pct}%</span>
    </div>`;
  }).join('');
}

function getRecentMonths(n) {
  const months = [];
  let y = currentYear, m = currentMonth;
  for (let i = 0; i < n; i++) {
    months.unshift(y + '-' + String(m).padStart(2, '0'));
    m--;
    if (m < 1) { m = 12; y--; }
  }
  return months;
}

async function loadAndRenderTrend() {
  if (trendDataCache) { renderTrendView(); return; }
  document.getElementById('trendLoading').style.display = 'block';
  document.getElementById('trendCatRow').innerHTML = '';
  document.getElementById('trendChart').innerHTML = '';
  document.getElementById('trendEmpty').style.display = 'none';
  const months = getRecentMonths(6);
  try {
    const results = await Promise.all(months.map(m => gasAPI('getTransactions', { month: m })));
    const byCategory = {};
    results.forEach((txList, idx) => {
      (txList || []).forEach(tx => {
        if (tx.type !== currentAnalysisType) return;
        if (!byCategory[tx.category]) byCategory[tx.category] = Array(6).fill(0);
        byCategory[tx.category][idx] += Number(tx.amount);
      });
    });
    trendDataCache = { months, byCategory };
    const sorted = Object.keys(byCategory).sort((a, b) =>
      byCategory[b].reduce((s, v) => s + v, 0) - byCategory[a].reduce((s, v) => s + v, 0));
    currentTrendCat = sorted[0] || '';
  } catch (e) {
    trendDataCache = { months, byCategory: {} };
    currentTrendCat = '';
  }
  document.getElementById('trendLoading').style.display = 'none';
  renderTrendView();
}

function renderTrendView() {
  if (!trendDataCache) return;
  const { months, byCategory } = trendDataCache;
  const catMap = {};
  allCategories.forEach(c => { catMap[c.name] = c.icon; });
  const sortedCats = Object.keys(byCategory).sort((a, b) =>
    byCategory[b].reduce((s, v) => s + v, 0) - byCategory[a].reduce((s, v) => s + v, 0));
  document.getElementById('trendCatRow').innerHTML = sortedCats.map(name => {
    const icon = catMap[name] || '';
    return `<button class="trend-cat-btn${name === currentTrendCat ? ' active' : ''}" onclick="selectTrendCat('${name.replace(/'/g, "\\'")}')">${icon} ${name}</button>`;
  }).join('');
  if (!sortedCats.length) {
    document.getElementById('trendEmpty').textContent = currentAnalysisType === 'expense' ? '近 6 個月無支出紀錄' : '近 6 個月無收入紀錄';
    document.getElementById('trendEmpty').style.display = 'block';
    document.getElementById('trendChart').innerHTML = '';
    return;
  }
  document.getElementById('trendEmpty').style.display = 'none';
  renderTrendChart(byCategory[currentTrendCat] || Array(6).fill(0), months);
}

function selectTrendCat(name) {
  currentTrendCat = name;
  renderTrendView();
}

function renderTrendChart(amounts, months) {
  const svg = document.getElementById('trendChart');
  const W = 300, H = 170, padL = 44, padR = 10, padT = 22, padB = 28;
  const cW = W - padL - padR, cH = H - padT - padB;
  const n = amounts.length;
  const maxVal = Math.max(...amounts, 1);
  const mag = Math.pow(10, Math.floor(Math.log10(maxVal)));
  const niceMax = Math.ceil(maxVal / mag) * mag;
  const toX = i => padL + (n > 1 ? i * cW / (n - 1) : cW / 2);
  const toY = v => padT + cH - (v / niceMax) * cH;
  const pts = amounts.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const baseY = (padT + cH).toFixed(1);

  let html = `<defs><linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#E8A33F" stop-opacity="0.2"/>
    <stop offset="100%" stop-color="#E8A33F" stop-opacity="0"/>
  </linearGradient></defs>`;

  [0.5, 1].forEach(frac => {
    const y = toY(niceMax * frac).toFixed(1);
    const val = Math.round(niceMax * frac);
    const lbl = val >= 10000 ? Math.round(val / 1000) + 'k' : val.toLocaleString();
    html += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#EDE3D5" stroke-width="1"/>
      <text x="${padL - 4}" y="${(parseFloat(y) + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#C7BEB1">${lbl}</text>`;
  });
  html += `<line x1="${padL}" y1="${baseY}" x2="${W - padR}" y2="${baseY}" stroke="#EDE3D5" stroke-width="1"/>`;
  html += `<polygon points="${toX(0).toFixed(1)},${baseY} ${pts} ${toX(n - 1).toFixed(1)},${baseY}" fill="url(#trendGrad)"/>`;
  html += `<polyline points="${pts}" fill="none" stroke="#E8A33F" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  months.forEach((m, i) => {
    html += `<text x="${toX(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#9E9285">${parseInt(m.slice(5))}月</text>`;
  });
  amounts.forEach((v, i) => {
    const cx = toX(i).toFixed(1), cy = toY(v).toFixed(1);
    html += `<circle cx="${cx}" cy="${cy}" r="3.5" fill="white" stroke="#E8A33F" stroke-width="2"/>`;
    if (v > 0) {
      const lbl = v >= 10000 ? Math.round(v / 1000) + 'k' : v.toLocaleString();
      html += `<text x="${cx}" y="${(parseFloat(cy) - 7).toFixed(1)}" text-anchor="middle" font-size="10" fill="#E8A33F" font-weight="bold">${lbl}</text>`;
    }
  });
  svg.innerHTML = html;
}
