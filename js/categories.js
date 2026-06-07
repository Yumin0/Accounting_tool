function getCatColor(catName) {
  const idx = allCategories.findIndex(c => c.name === catName);
  return ANALYSIS_COLORS[idx >= 0 ? idx % ANALYSIS_COLORS.length : 0];
}

// --- 分類管理子視圖 ---
function switchEditorCatTab(tab) {
  currentEditorCatTab = tab;
  document.getElementById('editorCatTabExpense').className = 'editor-cat-tab ' + (tab === 'expense' ? 'active-expense' : 'inactive');
  document.getElementById('editorCatTabIncome').className = 'editor-cat-tab ' + (tab === 'income' ? 'active-income' : 'inactive');
  renderEditorCatList();
}

function renderEditorCatList() {
  const list = document.getElementById('editorCatList');
  const cats = allCategories.filter(c => c.type === currentEditorCatTab);
  if (!cats.length) {
    list.innerHTML = '<div style="color:#9E9285;font-size:14px;margin-bottom:8px;">尚無分類</div>';
    return;
  }
  list.innerHTML = cats.map(c => {
    const dotColor = getCatColor(c.name);
    return `<div id="cat-row-${c.id}" style="border:1px solid #EDE3D5;border-radius:13px;margin-bottom:8px;background:white;overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;">
        <span style="display:flex;align-items:center;gap:8px;font-size:15px;">
          <span style="width:9px;height:9px;border-radius:50%;background:${dotColor};flex-shrink:0;display:inline-block;"></span>
          ${c.icon} ${c.name}
        </span>
        <div style="display:flex;gap:6px;">
          <button onclick="editCategory('${c.id}')" style="background:none;border:none;cursor:pointer;padding:4px;line-height:1;"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#9E9285" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2l3 3-8 8H3v-3l8-8z"/></svg></button>
          <button onclick="deleteCategory('${c.id}')" style="background:none;border:none;cursor:pointer;padding:4px;line-height:1;"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#C9624E" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 5 14 5"/><path d="M4 5V3h8v2"/><rect x="3" y="5" width="10" height="9" rx="1.5"/><line x1="6" y1="8" x2="6" y2="11"/><line x1="10" y1="8" x2="10" y2="11"/></svg></button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function editCategory(id) {
  const c = allCategories.find(c => c.id === id);
  if (!c) return;
  const row = document.getElementById('cat-row-' + id);
  row.innerHTML = `
    <div style="padding:10px 12px;">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
        <input id="edit-cat-icon-${id}" value="${c.icon}" placeholder="😀" style="width:52px;padding:8px;border:1px solid #EDE3D5;border-radius:10px;font-size:18px;text-align:center;background:#FBF7F0;color:#3B332A;">
        <input id="edit-cat-name-${id}" value="${c.name}" placeholder="分類名稱" style="flex:1;padding:8px;border:1px solid #EDE3D5;border-radius:10px;font-size:14px;background:#FBF7F0;color:#3B332A;">
      </div>
      <div style="display:flex;gap:6px;">
        <button onclick="saveCategoryEdit('${id}')" style="flex:1;padding:8px;background:#E8A33F;color:white;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:bold;">儲存</button>
        <button onclick="renderEditorCatList()" style="flex:1;padding:8px;background:#FBF7F0;color:#9E9285;border:none;border-radius:10px;cursor:pointer;font-size:13px;">取消</button>
      </div>
    </div>`;
}

async function saveCategoryEdit(id) {
  const icon = document.getElementById('edit-cat-icon-' + id).value.trim() || '📦';
  const name = document.getElementById('edit-cat-name-' + id).value.trim();
  if (!name) return alert("請輸入分類名稱");
  try {
    await gasAPI('updateCategory', { id, data: { icon, name } });
    allCategories = await gasAPI('getCategories');
    updateCategorySelect();
    renderEditorCatList();
  } catch(e) { alert("儲存失敗"); }
}

async function addCategory() {
  const icon = document.getElementById('editorCatIcon').value.trim() || '📦';
  const name = document.getElementById('editorCatName').value.trim();
  if (!name) return alert("請輸入分類名稱");
  const data = { id: 'cat_' + Date.now(), name, type: currentEditorCatTab, icon };
  try {
    await gasAPI('addCategory', { data });
    document.getElementById('editorCatIcon').value = '';
    document.getElementById('editorCatName').value = '';
    allCategories = await gasAPI('getCategories');
    updateCategorySelect();
    renderEditorCatList();
  } catch(e) { alert("新增失敗"); }
}

async function deleteCategory(id) {
  if (!confirm("確定刪除此分類？")) return;
  try {
    await gasAPI('deleteCategory', { id });
    allCategories = await gasAPI('getCategories');
    updateCategorySelect();
    renderEditorCatList();
  } catch(e) { alert("刪除失敗"); }
}
