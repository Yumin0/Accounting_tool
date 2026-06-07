// === 存錢目標 ===
function renderGoals() {
  const list = document.getElementById('goalsList');
  const active = allGoals
    .filter(g => g.status === 'active')
    .sort((a, b) => {
      const pctA = Number(a.saved_amount) / (Number(a.target_amount) || 1);
      const pctB = Number(b.saved_amount) / (Number(b.target_amount) || 1);
      const doneA = pctA >= 1 ? 1 : 0;
      const doneB = pctB >= 1 ? 1 : 0;
      return doneA - doneB;
    });
  const badge = document.getElementById('goalsCountBadge');
  if (badge) { badge.textContent = active.length + ' 個進行中'; badge.style.display = active.length > 0 ? '' : 'none'; }
  if (active.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;">尚無存錢目標，點右上角設定新增</div>';
    return;
  }
  list.innerHTML = active.map(g => {
    const saved = Number(g.saved_amount) || 0;
    const target = Number(g.target_amount) || 1;
    const pct = Math.min(100, Math.round(saved / target * 100));
    const done = pct >= 100;
    return `<div class="goal-card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
        <div class="goal-name">${g.name}</div>
        <div class="goal-deadline">${g.deadline}</div>
      </div>
      <div class="goal-progress-wrap">
        <div class="goal-progress-bar${done ? ' done' : ''}" style="width:${pct}%"></div>
      </div>
      <div class="goal-amounts">
        <span>已存 $${saved.toLocaleString()}</span>
        <span>${pct}% · $${target.toLocaleString()}</span>
      </div>
      ${done
        ? '<div style="text-align:center;color:#6F9E6E;font-weight:800;padding:6px 0;font-size:15px;">目標達成</div>'
        : `<button class="goal-deposit-btn" onclick="openDepositModal('${g.id}','${g.name}',${saved})">本月存入</button>`
      }
    </div>`;
  }).join('');
}

function openDepositModal(goalId, goalName, currentSaved) {
  depositingGoalId = goalId;
  document.getElementById('depositGoalName').textContent = `目標：${goalName}（已存 $${Number(currentSaved).toLocaleString()}）`;
  document.getElementById('depositAmount').value = '';
  document.getElementById('depositOverlay').classList.add('show');
  document.getElementById('depositModal').classList.add('show');
  lockBodyScroll();
}

function closeDepositModal() {
  document.getElementById('depositModal').classList.remove('show');
  document.getElementById('depositOverlay').classList.remove('show');
  unlockBodyScroll();
  depositingGoalId = null;
}

async function submitDeposit() {
  const amount = Number(document.getElementById('depositAmount').value);
  if (!amount || amount <= 0) return alert("請輸入有效金額");
  const goal = allGoals.find(g => g.id === depositingGoalId);
  if (!goal) return;
  const newSaved = (Number(goal.saved_amount) || 0) + amount;
  const btn = document.getElementById('depositSubmitBtn');
  btn.disabled = true; btn.innerText = "傳送中...";
  try {
    await gasAPI('updateGoal', { id: depositingGoalId, data: { saved_amount: newSaved } });
    await gasAPI('addSavingsLog', { data: {
      id: 'log_' + Date.now(),
      goal_id: depositingGoalId,
      goal_name: goal.name,
      amount: amount,
      saved_date: formatDate(new Date())
    }});
    closeDepositModal();
    allGoals = await gasAPI('getGoals');
    renderGoals();
  } catch (err) {
    alert("儲存失敗");
  } finally {
    btn.disabled = false; btn.innerText = "確認存入";
  }
}

// --- 存錢目標子視圖 ---
function renderEditorGoalsList() {
  const list = document.getElementById('editorGoalsList');
  const active = allGoals.filter(g => g.status === 'active');
  if (!active.length) {
    list.innerHTML = '<div style="color:#9E9285;font-size:14px;margin-bottom:8px;">尚無存錢目標</div>';
    return;
  }
  list.innerHTML = active.map(g => {
    const saved = Number(g.saved_amount) || 0;
    const target = Number(g.target_amount) || 1;
    const pct = Math.min(100, Math.round(saved / target * 100));
    return `<div id="goal-row-${g.id}" style="border:1px solid #EDE3D5;border-radius:13px;margin-bottom:8px;background:white;overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;">
        <div>
          <div style="font-weight:bold;font-size:14px;">${g.name}</div>
          <div style="font-size:12px;color:#9E9285;">已存 $${saved.toLocaleString()} / $${target.toLocaleString()} (${pct}%) · ${g.deadline}</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button onclick="editGoal('${g.id}')" style="background:none;border:none;cursor:pointer;padding:4px;line-height:1;"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#9E9285" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2l3 3-8 8H3v-3l8-8z"/></svg></button>
          <button onclick="deleteGoal('${g.id}')" style="background:none;border:none;cursor:pointer;padding:4px;line-height:1;"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#C9624E" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 5 14 5"/><path d="M4 5V3h8v2"/><rect x="3" y="5" width="10" height="9" rx="1.5"/><line x1="6" y1="8" x2="6" y2="11"/><line x1="10" y1="8" x2="10" y2="11"/></svg></button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function editGoal(id) {
  const g = allGoals.find(g => g.id === id);
  if (!g) return;
  const row = document.getElementById('goal-row-' + id);
  row.innerHTML = `
    <div style="padding:10px 12px;">
      <div style="display:flex;flex-direction:column;gap:6px;">
        <input id="edit-goal-name-${id}" value="${g.name}" placeholder="目標名稱" style="padding:8px;border:1px solid #EDE3D5;border-radius:10px;font-size:14px;width:100%;background:#FBF7F0;color:#3B332A;">
        <div style="display:flex;gap:6px;">
          <input id="edit-goal-target-${id}" type="number" value="${g.target_amount}" placeholder="目標金額" style="flex:1;padding:8px;border:1px solid #EDE3D5;border-radius:10px;font-size:14px;background:#FBF7F0;color:#3B332A;">
          <input id="edit-goal-deadline-${id}" type="date" value="${g.deadline}" style="flex:1;padding:8px;border:1px solid #EDE3D5;border-radius:10px;font-size:14px;background:#FBF7F0;color:#3B332A;">
        </div>
        <div style="display:flex;gap:6px;">
          <button onclick="saveGoalEdit('${id}')" style="flex:1;padding:8px;background:#E8A33F;color:white;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:bold;">儲存</button>
          <button onclick="renderEditorGoalsList()" style="flex:1;padding:8px;background:#FBF7F0;color:#9E9285;border:none;border-radius:10px;cursor:pointer;font-size:13px;">取消</button>
        </div>
      </div>
    </div>`;
}

async function saveGoalEdit(id) {
  const name = document.getElementById('edit-goal-name-' + id).value.trim();
  const target = document.getElementById('edit-goal-target-' + id).value;
  const deadline = document.getElementById('edit-goal-deadline-' + id).value;
  if (!name || !target || !deadline) return alert("請填寫所有欄位");
  try {
    await gasAPI('updateGoal', { id, data: { name, target_amount: target, deadline } });
    allGoals = await gasAPI('getGoals');
    renderGoals();
    renderEditorGoalsList();
  } catch(e) { alert("儲存失敗"); }
}

async function submitGoalFromEditor() {
  const name = document.getElementById('editorGoalName').value.trim();
  const target = document.getElementById('editorGoalTarget').value;
  const deadline = document.getElementById('editorGoalDeadline').value;
  if (!name) return alert("請輸入目標名稱");
  if (!target) return alert("請輸入目標金額");
  if (!deadline) return alert("請選擇目標日期");
  const data = {
    id: 'goal_' + Date.now(),
    name,
    target_amount: target,
    saved_amount: 0,
    deadline,
    created_at: formatDate(new Date()),
    status: 'active'
  };
  const btn = document.getElementById('editorGoalSubmitBtn');
  btn.disabled = true; btn.innerText = "傳送中...";
  try {
    await gasAPI('addGoal', { data });
    document.getElementById('editorGoalName').value = '';
    document.getElementById('editorGoalTarget').value = '';
    document.getElementById('editorGoalDeadline').value = '';
    allGoals = await gasAPI('getGoals');
    renderGoals();
    renderEditorGoalsList();
  } catch (err) {
    alert("建立失敗");
  } finally {
    btn.disabled = false; btn.innerText = "確認建立";
  }
}

async function deleteGoal(id) {
  if (!confirm("確定刪除此目標？")) return;
  try {
    await gasAPI('deleteGoal', { id });
    allGoals = await gasAPI('getGoals');
    renderGoals();
    renderEditorGoalsList();
  } catch(e) { alert("刪除失敗"); }
}
