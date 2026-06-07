async function gasAPI(action, params = {}) {
  // 用 URL constructor + location.href 保證在任何環境（Safari/PWA/WKWebView）都能產生合法絕對 URL
  const base = new URL('/api', location.href);
  base.searchParams.set('action', action);
  for (const [k, v] of Object.entries(params)) {
    base.searchParams.set(k, (typeof v === 'object' && v !== null) ? JSON.stringify(v) : String(v));
  }
  const res = await fetch(base.href);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let allCategories = [];
let allTxData = [];
let allGoals = [];
let allNoteShortcuts = [];
let allRecurring = [];
let allProjectedTx = [];
let editingId = null;
let currentTxType = 'expense';
let depositingGoalId = null;
let currentEditorCatTab = 'expense';
let currentRecurType = 'expense';
let materializingRecurringId = null;

// 開啟底部彈出 Modal/Sheet 時鎖住背景頁面捲動，避免 iOS 觸控把捲動穿透到底層首頁
// （用計數器處理理論上可能疊開多層 Modal 的情況，最後一層關閉才解鎖並還原捲動位置）
let bodyScrollLockCount = 0;
let bodyScrollLockY = 0;
function lockBodyScroll() {
  if (bodyScrollLockCount++ > 0) return;
  bodyScrollLockY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${bodyScrollLockY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
}
function unlockBodyScroll() {
  if (bodyScrollLockCount === 0 || --bodyScrollLockCount > 0) return;
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  window.scrollTo(0, bodyScrollLockY);
}

function getMonthStr() { return currentYear + '-' + String(currentMonth).padStart(2, '0'); }
function formatDate(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function fmtAmt(n) { return n >= 10000 ? Math.round(n / 1000) + 'k' : n.toLocaleString(); }

// 本地快取 key
function cacheKey() { return 'acct_cache_' + getMonthStr(); }

// 初始化載入
async function loadAll() {
  const monthStr = getMonthStr();
  document.getElementById('monthLabel').textContent = currentYear + '年 ' + currentMonth + '月';

  // 1. 立即從 localStorage 顯示快取（stale-while-revalidate）
  try {
    const cached = localStorage.getItem(cacheKey());
    if (cached) {
      const d = JSON.parse(cached);
      allCategories    = d.categories    || [];
      allTxData        = d.transactions  || [];
      allGoals         = d.goals         || [];
      allNoteShortcuts = d.noteShortcuts || [];
      allRecurring     = d.recurringTransactions || [];
      allProjectedTx   = d.projectedTransactions || [];
      updateCategorySelect();
      updateSummary();
      renderMonthView();
      renderGoals();
      renderNoteChips();
    }
  } catch(e) { /* 快取損壞就忽略 */ }

  // 2. 背景抓取最新資料（單次 API 呼叫取代原本 4 次）
  try {
    const data = await gasAPI('getAll', { month: monthStr });
    allCategories    = data.categories    || [];
    allTxData        = data.transactions  || [];
    allGoals         = data.goals         || [];
    allNoteShortcuts = data.noteShortcuts || [];
    allRecurring     = data.recurringTransactions || [];
    allProjectedTx   = data.projectedTransactions || [];

    // 存回快取
    localStorage.setItem(cacheKey(), JSON.stringify(data));

    updateCategorySelect();
    updateSummary();
    renderMonthView();
    renderGoals();
    renderNoteChips();
  } catch (err) {
    console.error("載入失敗", err);
    const errBanner = document.getElementById('apiBanner');
    if (errBanner) {
      const ctx = 'href=' + location.href + ' standalone=' + (window.navigator.standalone ?? 'n/a');
      errBanner.textContent = '⚠ ' + (err.message || String(err)) + ' | ' + ctx;
      errBanner.style.display = 'block';
    }
  }
}

function updateSummary() {
  let exp = 0, inc = 0;
  allTxData.concat(allProjectedTx).forEach(tx => {
    if (tx.type === 'expense') exp += Number(tx.amount);
    else inc += Number(tx.amount);
  });
  document.getElementById('totalExpense').textContent = '$' + exp.toLocaleString();
  document.getElementById('totalIncome').textContent  = '$' + inc.toLocaleString();
  document.getElementById('totalSaving').textContent  = '$' + (inc - exp).toLocaleString();
}
