// === 統一資料管理 Editor ===
function openSheetEditor() {
  showEditorView('menu');
  document.getElementById('sheetEditorOverlay').classList.add('show');
  document.getElementById('sheetEditorModal').classList.add('show');
  lockBodyScroll();
}

function closeSheetEditor() {
  document.getElementById('sheetEditorModal').classList.remove('show');
  document.getElementById('sheetEditorOverlay').classList.remove('show');
  unlockBodyScroll();
}

function showEditorView(view) {
  const views = ['menu', 'goals', 'categories', 'shortcuts', 'recurring'];
  views.forEach(v => {
    const el = document.getElementById('editorView' + v.charAt(0).toUpperCase() + v.slice(1));
    if (el) el.style.display = 'none';
  });

  const backBtn = document.getElementById('sheetEditorBack');
  backBtn.style.display = view === 'menu' ? 'none' : 'block';

  const titles = { menu: '管理資料', goals: '存錢目標', categories: '分類管理', shortcuts: '快捷備註', recurring: '固定收支' };
  document.getElementById('sheetEditorTitle').textContent = titles[view] || '管理資料';

  const target = document.getElementById('editorView' + view.charAt(0).toUpperCase() + view.slice(1));
  if (target) target.style.display = '';

  if (view === 'goals') renderEditorGoalsList();
  if (view === 'categories') { currentEditorCatTab = 'expense'; switchEditorCatTab('expense'); }
  if (view === 'shortcuts') {
    renderEditorShortcutList();
    populateShortcutCatSelect('editorNewShortcutCat', '');
  }
  if (view === 'recurring') {
    renderEditorRecurringList();
    toggleRecurAddForm(false);
  }
}

function populateShortcutCatSelect(selectId, selectedValue) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = `<option value="">全部（不限分類）</option>` +
    allCategories.map(c =>
      `<option value="${c.name}" ${c.name === selectedValue ? 'selected' : ''}>${c.icon} ${c.name}</option>`
    ).join('');
}
