// 1. 頁面進入點，回傳 HTML 給瀏覽器
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index.html');
}

// 2. 讀取指定月份的收支記錄
// month 格式：'2026-03'
function getTransactions(month) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('transactions');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];  // 第一列是欄位名稱
  const rows = data.slice(1);  // 從第二列開始是資料

  return rows
    .filter(row => row[1].toString().startsWith(month))  // 篩選月份
    .map(row => ({
      id: row[0], date: row[1], type: row[2],
      amount: row[3], category: row[4], note: row[5]
    }));
}

// 3. 讀取所有分類
function getCategories() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('categories');
  const data = sheet.getDataRange().getValues();
  return data.slice(1).map(row => ({
    id: row[0], name: row[1], icon: row[2], type: row[3]
  }));
}

// 讀取存錢目標
function getGoals() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('goals');
  const data = sheet.getDataRange().getValues();
  return data.slice(1).map(row => ({
    id: row[0], name: row[1], targetAmount: row[2],
    savedAmount: row[3], deadline: row[4], status: row[6]
  }));
}

// 讀取所有分類
function getCategories() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('categories');
  const data = sheet.getDataRange().getValues();
  return data.slice(1).map(row => ({
    id: row[0], name: row[1], icon: row[2], type: row[3]
  }));
}

function addTransaction(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('transactions');

  const now = new Date();
  const dateStr = Utilities.formatDate(now, 'Asia/Taipei', 'yyyyMMdd');
  const seq = String(sheet.getLastRow()).padStart(3, '0');
  const id = 'tx_' + dateStr + '_' + seq;
  const createdAt = Utilities.formatDate(now, 'Asia/Taipei', "yyyy-MM-dd'T'HH:mm:ss");

  sheet.appendRow([
    id,
    "'" + data.date, // 加單引號強制純文字
    data.type,
    data.amount,
    data.category,
    data.note,
    createdAt
  ]);

  return { success: true, id: id };
}

function deleteTransaction(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('transactions');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: '找不到 id: ' + id };
}
function updateTransaction(id, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('transactions');
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) {
      const row = i + 1;
      sheet.getRange(row, 2).setValue("'" + data.date);
      sheet.getRange(row, 3).setValue(data.type);
      sheet.getRange(row, 4).setValue(data.amount);
      sheet.getRange(row, 5).setValue(data.category);
      sheet.getRange(row, 6).setValue(data.note);
      return { success: true };
    }
  }
  return { success: false, error: '找不到 id: ' + id };
}

function getDailyCalendarData(month) {
  const txList = getTransactions(month);
  const catList = getCategories();
  
  // 建立分類名稱對應 icon 的查詢表
  const catMap = {};
  catList.forEach(c => { catMap[c.name] = c.icon; });

  const result = {};
  txList.forEach(tx => {
    if (tx.type !== 'expense') return;
    if (!result[tx.date]) result[tx.date] = { total: 0, icons: [] };
    result[tx.date].total += Number(tx.amount);
    const icon = catMap[tx.category] || '📦';
    if (!result[tx.date].icons.includes(icon)) {
      result[tx.date].icons.push(icon);
    }
  });
  return result;
}

// ... 上面是 getDailyCalendarData

function getMonthData(month) {
  const transactions = getTransactions(month);
  const calendarData = getDailyCalendarData(month);
  return { transactions: transactions, calendarData: calendarData };
}

function testCalendar() {
  const result = getDailyCalendarData('2026-03');
  Logger.log(JSON.stringify(result));
}

function testCalendar() {
  const result = getDailyCalendarData('2026-03');
  Logger.log(JSON.stringify(result));
}

