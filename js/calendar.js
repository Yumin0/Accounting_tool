async function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth > 12) { currentMonth = 1; currentYear++; }
  if (currentMonth < 1)  { currentMonth = 12; currentYear--; }
  document.getElementById('detailPanel').innerHTML = '';
  await loadAll();
}

function renderMonthView() {
  const today = formatDate(new Date());
  const firstDay = new Date(currentYear, currentMonth - 1, 1);
  const lastDay  = new Date(currentYear, currentMonth, 0);
  const offset = (firstDay.getDay() === 0) ? 6 : firstDay.getDay() - 1;

  let html = '';
  let cells = [];

  for (let i = 0; i < offset; i++) cells.push('<div class="month-day empty-cell"><div class="d-num"></div></div>');

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = getMonthStr() + '-' + String(day).padStart(2,'0');
    const isToday = dateStr === today;
    const dayTx = allTxData.filter(tx => tx.date === dateStr);
    const dayProj = allProjectedTx.filter(tx => tx.date === dateStr);
    const dayExp = dayTx.filter(tx => tx.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const dayInc = dayTx.filter(tx => tx.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const dayProjExp = dayProj.filter(tx => tx.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const dayProjInc = dayProj.filter(tx => tx.type === 'income').reduce((s, t) => s + Number(t.amount), 0);

    let cls = 'month-day' + (isToday ? ' today' : '');
    let cell = `<div class="${cls}" onclick="handleDayClick('${dateStr}')">
      <div class="d-num">${day}</div>
      <div class="d-content">
        ${dayExp > 0 ? `<div class="d-exp">${fmtAmt(dayExp)}</div>` : ''}
        ${dayInc > 0 ? `<div class="d-inc">${fmtAmt(dayInc)}</div>` : ''}
        ${dayProjExp > 0 ? `<div class="d-exp projected">${fmtAmt(dayProjExp)}</div>` : ''}
        ${dayProjInc > 0 ? `<div class="d-inc projected">${fmtAmt(dayProjInc)}</div>` : ''}
      </div>
    </div>`;
    cells.push(cell);
  }

  cells.forEach((c, idx) => {
    if (idx > 0 && idx % 7 === 0) html += '<div class="week-row-line"></div>';
    html += c;
  });
  document.getElementById('monthGrid').innerHTML = html;
}

function handleDayClick(dateStr) {
  const dayTx = allTxData.filter(tx => tx.date === dateStr);
  const dayProj = allProjectedTx.filter(tx => tx.date === dateStr);
  if (dayTx.length === 0 && dayProj.length === 0) openModal(dateStr);
  else showDayDetail(dateStr, dayTx, dayProj);
}

function showDayDetail(dateStr, dayTx, dayProj) {
  dayProj = dayProj || [];
  const panel = document.getElementById('detailPanel');
  const catMap = {};
  allCategories.forEach(c => { catMap[c.name] = c.icon; });

  let html = `<div class="detail-panel">
    <div class="detail-header">
      <div style="font-weight:bold">📅 ${dateStr}</div>
      <div>
        <button class="btn-sm" onclick="openModal('${dateStr}')">＋ 新增</button>
        <button class="btn-sm" onclick="document.getElementById('detailPanel').innerHTML=''">✕</button>
      </div>
    </div>`;

  dayTx.forEach(tx => {
    const icon = catMap[tx.category] || '📦';
    html += `<div class="detail-item">
      <div class="di-icon">${icon}</div>
      <div class="di-info">
        <div class="di-cat">${tx.category}</div>
        <div class="di-meta">${tx.note || ''}</div>
      </div>
      <div style="text-align:right">
        <div class="di-amt ${tx.type==='income'?'income':''}">$${tx.amount}</div>
        <div style="margin-top:4px">
          <button class="btn-sm" onclick="editItem('${tx.id}')">改</button>
          <button class="btn-sm" style="color:red" onclick="deleteItem('${tx.id}')">刪</button>
        </div>
      </div>
    </div>`;
  });

  dayProj.forEach(tx => {
    const icon = catMap[tx.category] || '📦';
    html += `<div class="detail-item projected">
      <div class="di-icon">${icon}</div>
      <div class="di-info">
        <div class="di-cat">${tx.category}<span class="projected-badge">預計</span></div>
        <div class="di-meta">${tx.note || ''}</div>
      </div>
      <div style="text-align:right">
        <div class="di-amt ${tx.type==='income'?'income':''}">$${tx.amount}</div>
        <div style="margin-top:4px">
          <button class="btn-sm" onclick="materializeProjected('${tx.id}')">提前記錄</button>
          <button class="btn-sm" onclick="editRecurringFromProjection('${tx.recurring_id}')">編輯範本</button>
        </div>
      </div>
    </div>`;
  });
  panel.innerHTML = html + '</div>';
  panel.scrollIntoView({ behavior: 'smooth' });
}

// 點擊「預計」項目→「提前記錄」：把這一筆提早正式入帳，可在送出前調整金額/日期/備註，僅影響這一次，範本本身不變
function materializeProjected(projId) {
  const proj = allProjectedTx.find(p => p.id === projId);
  if (!proj) return;
  document.getElementById('detailPanel').innerHTML = '';
  openModal(proj.date);
  document.getElementById('txAmount').value = proj.amount;
  document.getElementById('txNote').value = proj.note || '';
  setType(proj.type);
  updateCategorySelect(proj.category);
  materializingRecurringId = proj.recurring_id;
  document.getElementById('modalTitle').textContent = '提前記錄固定收支（僅此次）';
}

// 點擊「預計」項目→「編輯範本」：直接修改範本本身，會影響此項目之後所有月份的投影
function editRecurringFromProjection(recurringId) {
  document.getElementById('detailPanel').innerHTML = '';
  openSheetEditor();
  showEditorView('recurring');
  setTimeout(() => editRecurring(recurringId), 0);
}
