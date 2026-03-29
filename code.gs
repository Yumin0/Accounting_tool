// API 入口：index.html 放在 GitHub Pages，透過 fetch 呼叫這裡
function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  const action = p.action;

  const out = (data) => ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);

  try {
    // 讀取
    if (action === 'getTransactions') return out(getTransactions(p.month));
    if (action === 'getCategories')   return out(getCategories());
    if (action === 'getGoals')        return out(getGoals());
    if (action === 'getNoteShortcuts') return out(getNoteShortcuts());
    if (action === 'getInsights')     return out(getInsights());
    if (action === 'generateInsight') return out(generateInsight());
    if (action === 'getAll')          return out(getAllData(p.month));

    // 交易
    if (action === 'addTransaction')    return out(addTransaction(JSON.parse(p.data)));
    if (action === 'updateTransaction') return out(updateTransaction(p.id, JSON.parse(p.data)));
    if (action === 'deleteTransaction') return out(deleteTransaction(p.id));

    // 存錢目標
    if (action === 'addGoal')    return out(addGoal(JSON.parse(p.data)));
    if (action === 'updateGoal') return out(updateGoal(p.id, JSON.parse(p.data)));
    if (action === 'deleteGoal') return out(deleteGoal(p.id));
    if (action === 'addSavingsLog') return out(addSavingsLog(JSON.parse(p.data)));

    // 分類
    if (action === 'addCategory')    return out(addCategory(JSON.parse(p.data)));
    if (action === 'updateCategory') return out(updateCategory(p.id, JSON.parse(p.data)));
    if (action === 'deleteCategory') return out(deleteCategory(p.id));

    // 快捷備註
    if (action === 'addNoteShortcut')    return out(addNoteShortcut(JSON.parse(p.data)));
    if (action === 'updateNoteShortcut') return out(updateNoteShortcut(p.id, JSON.parse(p.data)));
    if (action === 'deleteNoteShortcut') return out(deleteNoteShortcut(p.id));

    return out({ status: 'ok' });
  } catch(err) {
    return out({ error: err.toString() });
  }
}

// 一次性批次讀取所有初始化所需資料（減少 API round-trip 次數）
function getAllData(month) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // transactions
  const txSheet = ss.getSheetByName('transactions');
  const txData = txSheet.getDataRange().getValues();
  const transactions = txData.slice(1)
    .filter(row => row[1].toString().startsWith(month))
    .map(row => ({ id: row[0], date: row[1], type: row[2], amount: row[3], category: row[4], note: row[5] }));

  // categories
  const catSheet = ss.getSheetByName('categories');
  const catData = catSheet.getDataRange().getValues();
  const categories = catData.slice(1).map(row => ({ id: row[0], name: row[1], icon: row[2], type: row[3] }));

  // goals
  const goalSheet = ss.getSheetByName('goals');
  const goalData = goalSheet.getDataRange().getValues();
  const goals = goalData.slice(1).map(row => ({
    id: row[0], name: row[1], target_amount: row[2],
    saved_amount: row[3], deadline: row[4], status: row[6]
  }));

  // note shortcuts
  let noteShortcuts = [];
  const nsSheet = ss.getSheetByName('note_shortcuts');
  if (nsSheet) {
    const nsData = nsSheet.getDataRange().getValues();
    noteShortcuts = nsData.slice(1).map(row => ({ id: row[0], text: row[1], category: row[2] || '' }));
  }

  return { transactions, categories, goals, noteShortcuts };
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
    id: row[0], name: row[1], target_amount: row[2],
    saved_amount: row[3], deadline: row[4], status: row[6]
  }));
}

function addGoal(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('goals');
  sheet.appendRow([data.id, data.name, data.target_amount, data.saved_amount, data.deadline, data.created_at, data.status]);
  return { success: true };
}

function updateGoal(id, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('goals');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) {
      const row = i + 1;
      if (data.name !== undefined) sheet.getRange(row, 2).setValue(data.name);
      if (data.target_amount !== undefined) sheet.getRange(row, 3).setValue(data.target_amount);
      if (data.saved_amount !== undefined) sheet.getRange(row, 4).setValue(data.saved_amount);
      if (data.deadline !== undefined) sheet.getRange(row, 5).setValue(data.deadline);
      return { success: true };
    }
  }
  return { success: false, error: '找不到 id: ' + id };
}

function deleteGoal(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('goals');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: '找不到 id: ' + id };
}

function addSavingsLog(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('savings_logs');
  if (!sheet) {
    sheet = ss.insertSheet('savings_logs');
    sheet.appendRow(['id', 'goal_id', 'goal_name', 'amount', 'saved_date']);
  }
  sheet.appendRow([data.id, data.goal_id, data.goal_name, data.amount, data.saved_date]);
  return { success: true };
}

// 分類 CRUD
function addCategory(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('categories');
  sheet.appendRow([data.id, data.name, data.icon, data.type]);
  return { success: true };
}

function updateCategory(id, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('categories');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) {
      const row = i + 1;
      if (data.name !== undefined) sheet.getRange(row, 2).setValue(data.name);
      if (data.icon !== undefined) sheet.getRange(row, 3).setValue(data.icon);
      return { success: true };
    }
  }
  return { success: false, error: '找不到 id: ' + id };
}

function deleteCategory(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('categories');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: '找不到 id: ' + id };
}

// 快捷備註 CRUD
function getNoteShortcuts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('note_shortcuts');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).map(row => ({
    id: row[0], text: row[1], category: row[2] || ''
  }));
}

function addNoteShortcut(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('note_shortcuts');
  if (!sheet) {
    sheet = ss.insertSheet('note_shortcuts');
    sheet.appendRow(['id', 'text', 'category']);
  }
  sheet.appendRow([data.id, data.text, data.category || '']);
  return { success: true };
}

function updateNoteShortcut(id, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('note_shortcuts');
  if (!sheet) return { success: false };
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) {
      const row = i + 1;
      if (data.text !== undefined) sheet.getRange(row, 2).setValue(data.text);
      if (data.category !== undefined) sheet.getRange(row, 3).setValue(data.category);
      return { success: true };
    }
  }
  return { success: false, error: '找不到 id: ' + id };
}

function deleteNoteShortcut(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('note_shortcuts');
  if (!sheet) return { success: false };
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: '找不到 id: ' + id };
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

// ========================
// 每日洞察功能
// ========================

// 【初始設定】在 GAS 編輯器執行這個函式一次，設定每天早上 8 點自動產生洞察
// 執行方式：在編輯器上方選 setupDailyTrigger → 點「▶ 執行」
function setupDailyTrigger() {
  // 清除舊的 generateInsight trigger 避免重複
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'generateInsight')
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('generateInsight')
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .inTimezone('Asia/Taipei')
    .create();

  Logger.log('已設定每天早上 8 點自動產生洞察');
}

// 產生每日洞察（呼叫 Gemini API）
// 由 Trigger 觸發執行，不從 Web App 直接呼叫（避免 OAuth 授權問題）
function generateInsight() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('transactions');
  if (!sheet) return { success: false, error: '找不到 transactions 分頁' };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, error: '尚無交易資料，先記幾筆帳再來看看吧！' };

  const now = new Date();

  // 決定資料範圍：自上次洞察以來，若無歷史則用最近 7 天
  let sinceDate = null;
  let periodLabel = '';
  const insightSheet0 = ss.getSheetByName('洞察紀錄');
  if (insightSheet0 && insightSheet0.getLastRow() > 1) {
    const lastRow = insightSheet0.getDataRange().getValues();
    const lastTimestampRaw = lastRow[lastRow.length - 1][0];
    // Google Sheets 可能把存入的時間字串自動轉成 Date 物件，需要用 formatDate 轉回
    if (lastTimestampRaw instanceof Date) {
      sinceDate = Utilities.formatDate(lastTimestampRaw, 'Asia/Taipei', 'yyyy-MM-dd');
    } else {
      sinceDate = lastTimestampRaw.toString().substring(0, 10);
    }
    periodLabel = '自 ' + sinceDate + ' 以來';
  } else {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    sinceDate = Utilities.formatDate(sevenDaysAgo, 'Asia/Taipei', 'yyyy-MM-dd');
    periodLabel = '最近 7 天';
  }

  const filterRows = (fromDate) => data.slice(1).filter(row => {
    const dateStr = row[1] ? row[1].toString().replace(/^'/, '') : '';
    return dateStr >= fromDate && dateStr.length === 10;
  }).map(row => ({
    date: row[1].toString().replace(/^'/, ''),
    type: row[2],
    amount: Number(row[3]),
    category: row[4] || '',
    note: row[5] || ''
  }));

  let recentRows = filterRows(sinceDate);

  // 若資料不足 3 筆，自動擴展到最近 14 天
  if (recentRows.length < 3) {
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const fallbackDate = Utilities.formatDate(fourteenDaysAgo, 'Asia/Taipei', 'yyyy-MM-dd');
    recentRows = filterRows(fallbackDate);
    periodLabel = '最近 14 天';
  }

  if (recentRows.length === 0) {
    return { success: false, error: '最近沒有交易紀錄，先記幾筆帳再來看看吧！' };
  }

  // 讀取存錢目標
  let goalsStr = '';
  try {
    const goalsSheet = ss.getSheetByName('goals');
    if (goalsSheet) {
      const goalsData = goalsSheet.getDataRange().getValues();
      const activeGoals = goalsData.slice(1)
        .filter(r => r[6] === 'active')
        .map(r => `${r[1]}（目標 $${r[2]}，已存 $${r[3]}，截止 ${r[4]}）`);
      if (activeGoals.length > 0) {
        goalsStr = '\n\n目前存錢目標：' + activeGoals.join('、');
      }
    }
  } catch (e) {}

  // 隨機選 1-2 個分析角度
  const angles = [
    '花錢最多是星期幾，有沒有規律',
    '月初 vs 月底消費差異',
    '哪個類別最能代表這段時間的生活狀態',
    '娛樂放鬆類（按摩/洗頭/指甲等）的消費間隔頻率',
    '副業收入和薪水的比例',
    '距離存錢目標還剩幾個月',
    '哪天支出最異常',
    '某個備註關鍵字是否頻繁出現'
  ];

  const shuffled = angles.slice().sort(() => Math.random() - 0.5);
  const selectedAngles = shuffled.slice(0, 2);

  // 時間段
  const hour = parseInt(Utilities.formatDate(now, 'Asia/Taipei', 'H'));
  let timeOfDay;
  if (hour >= 6 && hour < 12) timeOfDay = '早上';
  else if (hour >= 12 && hour < 18) timeOfDay = '下午';
  else if (hour >= 18) timeOfDay = '晚上';
  else timeOfDay = '深夜';

  // 整理資料摘要
  const expenseRows = recentRows.filter(r => r.type === 'expense');
  const incomeRows = recentRows.filter(r => r.type === 'income');
  const totalExp = expenseRows.reduce((s, r) => s + r.amount, 0);
  const totalInc = incomeRows.reduce((s, r) => s + r.amount, 0);
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  let dataSummary = `${periodLabel}的交易（共 ${recentRows.length} 筆）：\n`;
  dataSummary += `總支出 $${totalExp}，總收入 $${totalInc}\n\n明細：\n`;
  recentRows.forEach(r => {
    const d = new Date(r.date);
    const dow = weekDays[d.getDay()];
    dataSummary += `${r.date}（週${dow}）${r.type === 'expense' ? '支出' : '收入'} $${r.amount} [${r.category}]${r.note ? ' ' + r.note : ''}\n`;
  });
  dataSummary += goalsStr;

  const prompt = `你是個很了解這個人的朋友，不是理財顧問。用繁體中文，輕鬆口吻，像在聊天一樣，不評判，不說教。

以下是這個人的帳務資料：

${dataSummary}

請針對「${selectedAngles.join('」和「')}」這兩個角度，各分享一句有趣的觀察。語氣像朋友說「欸我發現你...」或「你最近...」。（現在是${timeOfDay}，請讓語氣符合當下時段，但不要直接提到時間）`;

  // 呼叫 Gemini API
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return { success: false, error: '請先在 GAS Script Properties 設定 GEMINI_API_KEY' };
  }

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.9 }
      }),
      muteHttpExceptions: true
    });

    const resultJson = JSON.parse(response.getContentText());

    if (resultJson.error) {
      return { success: false, error: 'Gemini 錯誤：' + resultJson.error.message };
    }

    const insightText = (resultJson.candidates &&
      resultJson.candidates[0] &&
      resultJson.candidates[0].content &&
      resultJson.candidates[0].content.parts &&
      resultJson.candidates[0].content.parts[0] &&
      resultJson.candidates[0].content.parts[0].text &&
      resultJson.candidates[0].content.parts[0].text.trim())
      || '今天沒有特別的發現，繼續保持吧 😊';

    // 儲存到「洞察紀錄」分頁
    let insightSheet = ss.getSheetByName('洞察紀錄');
    if (!insightSheet) {
      insightSheet = ss.insertSheet('洞察紀錄');
      insightSheet.appendRow(['時間戳記', '洞察內容']);
    }

    const timestamp = Utilities.formatDate(now, 'Asia/Taipei', "yyyy-MM-dd'T'HH:mm:ss");
    insightSheet.appendRow([timestamp, insightText]);

    return { success: true, insight: insightText, timestamp: timestamp };

  } catch (e) {
    return { success: false, error: '呼叫失敗：' + e.toString() };
  }
}

// ========================
// Keep-Warm：防止 GAS 冷啟動
// ========================

// 【設定方式】在 GAS 編輯器執行 setupKeepWarmTrigger 一次
// 會每 5 分鐘自動 ping 一次 Web App，維持執行環境熱度
function keepWarm() {
  // 輕量操作：只存取 SpreadsheetApp 確認連線，不讀取任何資料
  SpreadsheetApp.getActiveSpreadsheet().getName();
}

function setupKeepWarmTrigger() {
  // 清除舊的 keepWarm trigger 避免重複
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'keepWarm')
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('keepWarm')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('已設定每 5 分鐘自動 keep-warm');
}

// 讀取所有洞察紀錄（最新的在前）
function getInsights() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const insightSheet = ss.getSheetByName('洞察紀錄');
  if (!insightSheet) return [];

  const data = insightSheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1).reverse().map(row => ({
    timestamp: row[0] instanceof Date
      ? Utilities.formatDate(row[0], 'Asia/Taipei', "yyyy-MM-dd'T'HH:mm:ss")
      : (row[0] ? row[0].toString() : ''),
    insight: row[1] ? row[1].toString() : ''
  }));
}
