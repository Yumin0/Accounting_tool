// === 固定收支範本 ===
function toggleRecurAddForm(show) {
  document.getElementById('recurListWrap').style.display = show ? 'none' : '';
  document.getElementById('recurAddFormWrap').style.display = show ? '' : 'none';
  if (show) {
    document.getElementById('recurAmount').value = '';
    document.getElementById('recurNote').value = '';
    document.getElementById('recurStartDate').value = '';
    document.getElementById('recurEndDate').value = '';
    setRecurType('expense');
    populateRecurDayOfMonthSelect('recurDayOfMonth', 25);
  }
}

function setRecurType(type) {
  currentRecurType = type;
  document.getElementById('recurTabExpense').className = 'type-tab' + (type === 'expense' ? ' active-expense' : '');
  document.getElementById('recurTabIncome').className  = 'type-tab' + (type === 'income'  ? ' active-income'  : '');
  updateRecurCategorySelect();
}

function updateRecurCategorySelect(selectedName) {
  const sel = document.getElementById('recurCategory');
  if (!sel) return;
  const cats = allCategories.filter(c => c.type === currentRecurType);
  sel.innerHTML = cats.map(c =>
    `<option value="${c.name}" ${c.name === selectedName ? 'selected' : ''}>${c.icon} ${c.name}</option>`
  ).join('');
  renderRecurNoteChips(sel.value);
}

function renderRecurNoteChips(catName) {
  const container = document.getElementById('recurNoteChips');
  if (!container) return;
  // 顯示：符合當前分類 OR 未綁定分類（category 為空）的快捷字詞
  const filtered = allNoteShortcuts.filter(s => !s.category || s.category === catName);
  container.innerHTML = filtered.map(s =>
    `<button class="note-chip" onclick="selectRecurNoteChip(this,'${s.text.replace(/'/g, "\\'")}')">${s.text}</button>`
  ).join('');
}

function selectRecurNoteChip(btn, text) {
  const noteInput = document.getElementById('recurNote');
  if (btn.classList.contains('active')) {
    btn.classList.remove('active');
    noteInput.value = '';
  } else {
    document.querySelectorAll('#recurNoteChips .note-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    noteInput.value = text;
  }
}

function populateRecurDayOfMonthSelect(selectId, selectedValue) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  let html = '';
  for (let d = 1; d <= 31; d++) html += `<option value="${d}" ${d === selectedValue ? 'selected' : ''}>${d} 號</option>`;
  sel.innerHTML = html;
}

function formatRecurSchedule(tpl) {
  let s = `每月 ${tpl.day_of_month} 號`;
  if (tpl.start_date) s += ` · ${tpl.start_date.substring(0, 7)} 起`;
  if (tpl.end_date) s += ` 至 ${tpl.end_date.substring(0, 7)}`;
  return s;
}

function renderEditorRecurringList() {
  const list = document.getElementById('editorRecurringList');
  if (!allRecurring.length) {
    list.innerHTML = '<div style="color:#9E9285;font-size:14px;margin-bottom:8px;">尚無固定收支項目</div>';
    return;
  }
  const catMap = {};
  allCategories.forEach(c => { catMap[c.name] = c.icon; });
  list.innerHTML = allRecurring.map(r => {
    const icon = catMap[r.category] || '📦';
    const paused = r.status === 'paused';
    return `<div id="recur-row-${r.id}" style="border:1px solid #EDE3D5;border-radius:13px;margin-bottom:8px;background:white;overflow:hidden;${paused ? 'opacity:0.55;' : ''}">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;gap:8px;">
        <div style="display:flex;align-items:center;gap:10px;min-width:0;">
          <div style="font-size:20px;">${icon}</div>
          <div style="min-width:0;">
            <div style="font-weight:bold;font-size:14px;">${r.category}${r.note ? ' · ' + r.note : ''}${paused ? '（已暫停）' : ''}</div>
            <div style="font-size:12px;color:#9E9285;">${formatRecurSchedule(r)}</div>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div class="di-amt ${r.type === 'income' ? 'income' : ''}" style="font-size:14px;">$${Number(r.amount).toLocaleString()}</div>
          <div style="margin-top:4px;display:flex;gap:6px;justify-content:flex-end;">
            <button class="btn-sm" onclick="toggleRecurringStatus('${r.id}')">${paused ? '恢復' : '暫停'}</button>
            <button class="btn-sm" onclick="editRecurring('${r.id}')">改</button>
            <button class="btn-sm" style="color:red" onclick="deleteRecurring('${r.id}')">刪</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function editRecurring(id) {
  const r = allRecurring.find(x => x.id === id);
  if (!r) return;
  const row = document.getElementById('recur-row-' + id);
  const cats = allCategories.filter(c => c.type === r.type);
  const catOptions = cats.map(c => `<option value="${c.name}" ${c.name === r.category ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('');
  let dayOptions = '';
  for (let d = 1; d <= 31; d++) dayOptions += `<option value="${d}" ${d === r.day_of_month ? 'selected' : ''}>${d} 號</option>`;
  row.innerHTML = `
    <div style="padding:10px 12px;">
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div style="display:flex;gap:6px;">
          <input id="edit-recur-amount-${id}" type="number" value="${r.amount}" placeholder="金額" style="flex:1;padding:8px;border:1px solid #EDE3D5;border-radius:10px;font-size:14px;background:#FBF7F0;color:#3B332A;">
          <select id="edit-recur-category-${id}" style="flex:1;padding:8px;border:1px solid #EDE3D5;border-radius:10px;font-size:14px;background:#FBF7F0;color:#3B332A;">${catOptions}</select>
        </div>
        <input id="edit-recur-note-${id}" value="${r.note || ''}" placeholder="備註" style="padding:8px;border:1px solid #EDE3D5;border-radius:10px;font-size:14px;width:100%;background:#FBF7F0;color:#3B332A;">
        <div style="display:flex;gap:6px;">
          <select id="edit-recur-day-${id}" style="flex:1;padding:8px;border:1px solid #EDE3D5;border-radius:10px;font-size:14px;background:#FBF7F0;color:#3B332A;">${dayOptions}</select>
          <input id="edit-recur-end-${id}" type="month" value="${r.end_date ? r.end_date.substring(0,7) : ''}" style="flex:1;padding:8px;border:1px solid #EDE3D5;border-radius:10px;font-size:14px;background:#FBF7F0;color:#3B332A;">
        </div>
        <div style="font-size:11px;color:#9E9285;">結束月份留空代表長期有效；開始月份與類型建立後不可修改</div>
        <div style="display:flex;gap:6px;">
          <button onclick="saveRecurringEdit('${id}')" style="flex:1;padding:8px;background:#E8A33F;color:white;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:bold;">儲存</button>
          <button onclick="renderEditorRecurringList()" style="flex:1;padding:8px;background:#FBF7F0;color:#9E9285;border:none;border-radius:10px;cursor:pointer;font-size:13px;">取消</button>
        </div>
      </div>
    </div>`;
}

async function saveRecurringEdit(id) {
  const amount = document.getElementById('edit-recur-amount-' + id).value;
  const category = document.getElementById('edit-recur-category-' + id).value;
  const note = document.getElementById('edit-recur-note-' + id).value.trim();
  const day_of_month = Number(document.getElementById('edit-recur-day-' + id).value);
  const endMonth = document.getElementById('edit-recur-end-' + id).value;
  if (!amount) return alert("請輸入金額");
  try {
    await gasAPI('updateRecurringTransaction', { id, data: {
      amount, category, note, day_of_month,
      end_date: endMonth ? endMonth + '-01' : null
    }});
    allRecurring = await gasAPI('getRecurringTransactions');
    renderEditorRecurringList();
    await loadAll();
  } catch(e) { alert("儲存失敗"); }
}

async function toggleRecurringStatus(id) {
  const r = allRecurring.find(x => x.id === id);
  if (!r) return;
  const newStatus = r.status === 'paused' ? 'active' : 'paused';
  try {
    await gasAPI('updateRecurringTransaction', { id, data: { status: newStatus } });
    allRecurring = await gasAPI('getRecurringTransactions');
    renderEditorRecurringList();
    await loadAll();
  } catch(e) { alert("操作失敗"); }
}

async function deleteRecurring(id) {
  if (!confirm("確定刪除此固定收支項目？\n（已經產生過的交易紀錄不會被刪除）")) return;
  try {
    await gasAPI('deleteRecurringTransaction', { id });
    allRecurring = await gasAPI('getRecurringTransactions');
    renderEditorRecurringList();
    await loadAll();
  } catch(e) { alert("刪除失敗"); }
}

async function submitRecurringFromEditor() {
  const amount = document.getElementById('recurAmount').value;
  const category = document.querySelector('#recurCategory').value;
  const note = document.getElementById('recurNote').value.trim();
  const day_of_month = Number(document.getElementById('recurDayOfMonth').value);
  const startMonth = document.getElementById('recurStartDate').value;
  const endMonth = document.getElementById('recurEndDate').value;
  if (!amount) return alert("請輸入金額");
  if (!category) return alert("請先建立對應的分類");
  if (!startMonth) return alert("請選擇開始月份");
  if (endMonth && endMonth < startMonth) return alert("結束月份不能早於開始月份");

  const data = {
    id: 'recur_' + Date.now(),
    type: currentRecurType,
    amount, category, note, day_of_month,
    start_date: startMonth + '-01',
    end_date: endMonth ? endMonth + '-01' : null,
    status: 'active'
  };
  const btn = document.getElementById('recurSubmitBtn');
  btn.disabled = true; btn.innerText = "傳送中...";
  try {
    await gasAPI('addRecurringTransaction', { data });
    allRecurring = await gasAPI('getRecurringTransactions');
    renderEditorRecurringList();
    toggleRecurAddForm(false);
    await loadAll();
  } catch (err) {
    alert("建立失敗");
  } finally {
    btn.disabled = false; btn.innerText = "確認建立";
  }
}
