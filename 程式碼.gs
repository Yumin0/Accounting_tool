// 1. 頁面進入點，回傳 HTML 給瀏覽器
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index.html')
    .setTitle('記帳工具')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 2. 讀取指定月份的收支記錄
// month 格式：'2026-03'
function getTransactions(month) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('transactions');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const rows = data.slice(1);

  return rows
    .filter(row => row[0] && String(row[1]).startsWith(month))
    .map(row => ({
      id:       String(row[0]),
      date:     String(row[1]).replace(/^'/, ''),
      type:     row[2],
      amount:   Number(row[3]),
      category: row[4],
      note:     row[5] || ''
    }));
}

// 3. 讀取所有分類
function getCategories() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('categories');
  if (!sheet) return getDefaultCategories();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return getDefaultCategories();
  return data.slice(1)
    .filter(row => row[0])
    .map(row => ({
      id:   String(row[0]),
      name: row[1],
      icon: row[2],
      type: row[3]
    }));
}

// 預設分類（若試算表尚未設定分類頁）
function getDefaultCategories() {
  return [
    { id: 'c1',  name: '餐飲',   icon: '🍱', type: 'expense' },
    { id: 'c2',  name: '交通',   icon: '🚌', type: 'expense' },
    { id: 'c3',  name: '購物',   icon: '🛍️', type: 'expense' },
    { id: 'c4',  name: '娛樂',   icon: '🎬', type: 'expense' },
    { id: 'c5',  name: '醫療',   icon: '🏥', type: 'expense' },
    { id: 'c6',  name: '住宿',   icon: '🏠', type: 'expense' },
    { id: 'c7',  name: '教育',   icon: '📚', type: 'expense' },
    { id: 'c8',  name: '其他支出', icon: '📦', type: 'expense' },
    { id: 'c9',  name: '薪資',   icon: '💼', type: 'income' },
    { id: 'c10', name: '獎金',   icon: '🎁', type: 'income' },
    { id: 'c11', name: '投資',   icon: '📈', type: 'income' },
    { id: 'c12', name: '其他收入', icon: '💰', type: 'income' },
  ];
}

// 4. 新增記錄
function addTransaction(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('transactions');

  // 若試算表不存在則自動建立
  if (!sheet) {
    sheet = ss.insertSheet('transactions');
    sheet.appendRow(['id', 'date', 'type', 'amount', 'category', 'note', 'createdAt']);
  }

  const now     = new Date();
  const dateStr = Utilities.formatDate(now, 'Asia/Taipei', 'yyyyMMdd');
  const seq     = String(sheet.getLastRow()).padStart(4, '0');
  const id      = 'tx_' + dateStr + '_' + seq;
  const createdAt = Utilities.formatDate(now, 'Asia/Taipei', "yyyy-MM-dd'T'HH:mm:ss");

  sheet.appendRow([
    id,
    data.date,
    data.type,
    data.amount,
    data.category,
    data.note || '',
    createdAt
  ]);

  return { success: true, id: id };
}

// 5. 更新記錄
function updateTransaction(id, data) {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const sheet  = ss.getSheetByName('transactions');
  if (!sheet) return { success: false, error: '找不到 transactions 頁' };

  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      const row = i + 1;
      sheet.getRange(row, 2).setValue(data.date);
      sheet.getRange(row, 3).setValue(data.type);
      sheet.getRange(row, 4).setValue(data.amount);
      sheet.getRange(row, 5).setValue(data.category);
      sheet.getRange(row, 6).setValue(data.note || '');
      return { success: true };
    }
  }
  return { success: false, error: '找不到 id: ' + id };
}

// 6. 刪除記錄
function deleteTransaction(id) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('transactions');
  if (!sheet) return { success: false, error: '找不到 transactions 頁' };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: '找不到 id: ' + id };
}

// 7. 整合回傳月曆所需資料（一次 call 減少 round-trip）
function getMonthData(month) {
  const transactions = getTransactions(month);
  const calendarData = buildCalendarData(transactions);
  return { transactions: transactions, calendarData: calendarData };
}

// 將交易列表轉成 { 'yyyy-MM-dd': { totalExp, totalInc } } 格式
function buildCalendarData(txList) {
  const result = {};
  txList.forEach(tx => {
    if (!result[tx.date]) result[tx.date] = { totalExp: 0, totalInc: 0 };
    if (tx.type === 'expense') result[tx.date].totalExp += tx.amount;
    else                       result[tx.date].totalInc += tx.amount;
  });
  return result;
}

// 初始化試算表結構（第一次使用時執行）
function initSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // transactions 頁
  if (!ss.getSheetByName('transactions')) {
    const s = ss.insertSheet('transactions');
    s.appendRow(['id', 'date', 'type', 'amount', 'category', 'note', 'createdAt']);
    s.setFrozenRows(1);
  }

  // categories 頁
  if (!ss.getSheetByName('categories')) {
    const s = ss.insertSheet('categories');
    s.appendRow(['id', 'name', 'icon', 'type']);
    getDefaultCategories().forEach(c => s.appendRow([c.id, c.name, c.icon, c.type]));
    s.setFrozenRows(1);
  }

  return '初始化完成！';
}
