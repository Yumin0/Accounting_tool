function openModal(dateStr) {
  editingId = null;
  materializingRecurringId = null;
  document.getElementById('modalTitle').textContent = '新增記錄';
  document.getElementById('txDate').value = dateStr || formatDate(new Date());
  document.getElementById('txAmount').value = '';
  document.getElementById('txNote').value = '';
  document.querySelectorAll('#noteChips .note-chip').forEach(b => b.classList.remove('active'));
  document.getElementById('modalOverlay').classList.add('show');
  document.getElementById('modal').classList.add('show');
  setType('expense');
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
  document.getElementById('modalOverlay').classList.remove('show');
  materializingRecurringId = null;
}

function setType(type) {
  currentTxType = type;
  document.getElementById('tabExpense').className = 'type-tab' + (type === 'expense' ? ' active-expense' : '');
  document.getElementById('tabIncome').className = 'type-tab' + (type === 'income' ? ' active-income' : '');
  updateCategorySelect();
}

function updateCategorySelect(selectedName) {
  const container = document.getElementById('txCategory');
  const cats = allCategories.filter(c => c.type === currentTxType);
  container.innerHTML = cats.map((c, i) =>
    `<button class="cat-btn${(!selectedName && i === 0) || c.name === selectedName ? ' active' : ''}" onclick="selectCategory(this)" data-value="${c.name}">${c.icon} ${c.name}</button>`
  ).join('');
  // 依當前選中分類刷新快捷字詞
  const activeCat = selectedName || cats[0]?.name || '';
  renderNoteChips(activeCat);
}

function selectCategory(btn) {
  document.querySelectorAll('#txCategory .cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // 清空備註並依新分類更新快捷字詞
  document.getElementById('txNote').value = '';
  renderNoteChips(btn.dataset.value);
}

async function submitTransaction() {
  const amount = document.getElementById('txAmount').value;
  if (!amount) return alert("請輸入金額");

  const data = {
    id: editingId || Date.now().toString(),
    date: document.getElementById('txDate').value,
    type: currentTxType,
    category: document.querySelector('#txCategory .cat-btn.active')?.dataset.value || '',
    amount: amount,
    note: document.getElementById('txNote').value
  };
  if (!editingId && materializingRecurringId) data.recurring_id = materializingRecurringId;

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.innerText = "傳送中...";

  try {
    if (editingId) {
      await gasAPI('updateTransaction', { id: editingId, data });
    } else {
      await gasAPI('addTransaction', { data });
    }
    closeModal();
    await loadAll();
  } catch (err) {
    alert("儲存失敗");
  } finally {
    btn.disabled = false;
    btn.innerText = "確認記錄";
  }
}

async function editItem(id) {
  const tx = allTxData.find(t => t.id == id);
  if (!tx) return;
  editingId = id;
  materializingRecurringId = null;
  document.getElementById('modalTitle').textContent = tx.recurring_id ? '編輯記錄（來自固定收支）' : '編輯記錄';
  document.getElementById('txDate').value = tx.date;
  document.getElementById('txAmount').value = tx.amount;
  document.getElementById('txNote').value = tx.note;
  document.querySelectorAll('#noteChips .note-chip').forEach(b => b.classList.remove('active'));
  setType(tx.type);
  updateCategorySelect(tx.category);
  document.getElementById('modalOverlay').classList.add('show');
  document.getElementById('modal').classList.add('show');
}

async function deleteItem(id) {
  if (!confirm("確定刪除？")) return;
  try {
    await gasAPI('deleteTransaction', { id });
    document.getElementById('detailPanel').innerHTML = '';
    await loadAll();
  } catch (err) {
    alert("刪除失敗");
  }
}

// === 快捷備註 ===
function renderNoteChips(catName) {
  const container = document.getElementById('noteChips');
  if (!container) return;
  // 顯示：符合當前分類 OR 未綁定分類（category 為空）的快捷字詞
  const filtered = allNoteShortcuts.filter(s => !s.category || s.category === catName);
  container.innerHTML = filtered.map(s =>
    `<button class="note-chip" onclick="selectNoteChip(this,'${s.text.replace(/'/g, "\\'")}')">${s.text}</button>`
  ).join('');
}

function selectNoteChip(btn, text) {
  const noteInput = document.getElementById('txNote');
  if (btn.classList.contains('active')) {
    btn.classList.remove('active');
    noteInput.value = '';
  } else {
    document.querySelectorAll('#noteChips .note-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    noteInput.value = text;
  }
}
