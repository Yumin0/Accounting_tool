// --- 快捷備註子視圖 ---
function renderEditorShortcutList() {
  const list = document.getElementById('editorShortcutList');
  if (!allNoteShortcuts.length) {
    list.innerHTML = '<div style="color:#9E9285;font-size:14px;margin-bottom:8px;">尚無快捷備註</div>';
    return;
  }
  // 依分類分組顯示：先顯示全域（無分類），再依各分類顯示
  const catNames = ['', ...allCategories.map(c => c.name)];
  let html = '';
  catNames.forEach(catName => {
    const items = allNoteShortcuts.filter(s => (s.category || '') === catName);
    if (!items.length) return;
    const dotColor = catName ? getCatColor(catName) : '#C7BEB1';
    const label = catName
      ? `<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#9E9285;font-weight:600;margin:8px 0 4px;"><span style="width:8px;height:8px;border-radius:50%;background:${dotColor};display:inline-block;flex-shrink:0;"></span>${catName}</div>`
      : `<div style="font-size:12px;color:#9E9285;font-weight:600;margin:0 0 4px;">全部（不限分類）</div>`;
    html += label;
    html += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px;">` +
      items.map(s =>
        `<div id="sc-row-${s.id}" style="display:inline-flex;align-items:center;gap:4px;background:#FBF7F0;border:1px solid #EDE3D5;border-radius:99px;padding:5px 10px;font-size:14px;">
          <span>${s.text}</span>
          <button onclick="editShortcut('${s.id}')" style="background:none;border:none;cursor:pointer;padding:0 2px;line-height:1;"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#9E9285" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.5l2.5 2.5-6 6H2V7.5l6-6z"/></svg></button>
          <button onclick="deleteShortcutFromEditor('${s.id}')" style="background:none;border:none;cursor:pointer;padding:0 2px;line-height:1;"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#C7BEB1" stroke-width="1.8" stroke-linecap="round"><line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/></svg></button>
        </div>`
      ).join('') + `</div>`;
  });
  list.innerHTML = html;
}

function editShortcut(id) {
  const s = allNoteShortcuts.find(s => s.id === id);
  if (!s) return;
  const row = document.getElementById('sc-row-' + id);
  row.style.cssText = 'border-radius:13px;padding:8px;background:#FBF7F0;border:1px solid #EDE3D5;display:flex;flex-direction:column;gap:6px;width:100%;';
  row.innerHTML = `
    <div style="display:flex;gap:6px;align-items:center;">
      <input id="edit-sc-text-${id}" value="${s.text}" style="flex:1;padding:6px 8px;border:1px solid #EDE3D5;border-radius:8px;font-size:14px;background:#FBF7F0;color:#3B332A;">
    </div>
    <select id="edit-sc-cat-${id}" style="padding:6px 8px;border:1px solid #EDE3D5;border-radius:8px;font-size:13px;background:#FBF7F0;color:#3B332A;"></select>
    <div style="display:flex;gap:6px;">
      <button onclick="saveShortcutEdit('${id}')" style="flex:1;padding:6px;background:#E8A33F;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:bold;">儲存</button>
      <button onclick="renderEditorShortcutList()" style="flex:1;padding:6px;background:white;color:#9E9285;border:1px solid #EDE3D5;border-radius:8px;cursor:pointer;font-size:13px;">取消</button>
    </div>`;
  populateShortcutCatSelect('edit-sc-cat-' + id, s.category || '');
}

async function saveShortcutEdit(id) {
  const text = document.getElementById('edit-sc-text-' + id).value.trim();
  const category = document.getElementById('edit-sc-cat-' + id).value;
  if (!text) return alert("請輸入快捷字詞");
  try {
    await gasAPI('updateNoteShortcut', { id, data: { text, category } });
    allNoteShortcuts = await gasAPI('getNoteShortcuts');
    renderEditorShortcutList();
  } catch(e) { alert("儲存失敗"); }
}

async function addShortcutFromEditor() {
  const text = document.getElementById('editorNewShortcutText').value.trim();
  const category = document.getElementById('editorNewShortcutCat').value;
  if (!text) return alert("請輸入快捷字詞");
  try {
    await gasAPI('addNoteShortcut', { data: { id: 'sc_' + Date.now(), text, category } });
    document.getElementById('editorNewShortcutText').value = '';
    allNoteShortcuts = await gasAPI('getNoteShortcuts');
    renderEditorShortcutList();
    populateShortcutCatSelect('editorNewShortcutCat', category);
  } catch(e) { alert("新增失敗"); }
}

async function deleteShortcutFromEditor(id) {
  try {
    await gasAPI('deleteNoteShortcut', { id });
    allNoteShortcuts = await gasAPI('getNoteShortcuts');
    renderEditorShortcutList();
  } catch(e) { alert("刪除失敗"); }
}
