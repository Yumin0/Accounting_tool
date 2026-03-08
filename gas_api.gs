/**
 * Google Apps Script - SheetDB 替代方案
 *
 * 設定步驟：
 * 1. 開啟你的 Google 試算表
 * 2. 點選「擴充功能」>「Apps Script」
 * 3. 將此檔案的內容貼入編輯器（取代原有內容）
 * 4. 將下方 SPREADSHEET_ID 替換成你的試算表 ID
 *    （試算表網址中 /d/ 和 /edit 之間的那段字串）
 * 5. 點選「部署」>「新增部署作業」
 *    - 類型：網頁應用程式
 *    - 執行身分：我（你的 Google 帳號）
 *    - 存取權限：任何人
 * 6. 複製產生的「網頁應用程式網址」
 * 7. 將 index.html 裡的 API_BASE 換成該網址
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // ← 替換成你的試算表 ID

// ── GET 請求：讀取整個分頁 ──────────────────────────────────────────────────
function doGet(e) {
  try {
    const sheet = e.parameter.sheet;
    if (!sheet) return jsonResponse({ error: 'sheet parameter required' });

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const ws = ss.getSheetByName(sheet);
    if (!ws) return jsonResponse([]);

    return jsonResponse(sheetToJson(ws));
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ── POST 請求：新增 / 修改 / 刪除 ─────────────────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const method  = (payload._method || 'POST').toUpperCase();
    const sheet   = payload.sheet;

    if (!sheet) return jsonResponse({ error: 'sheet required' });

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const ws = ss.getSheetByName(sheet);
    if (!ws) return jsonResponse({ error: 'sheet not found: ' + sheet });

    if (method === 'POST') {
      const rows = Array.isArray(payload.data) ? payload.data : [payload.data];
      rows.forEach(row => appendRow(ws, row));
      return jsonResponse({ created: rows.length });
    }

    if (method === 'PATCH') {
      updateRow(ws, payload.id, payload.data);
      return jsonResponse({ updated: 1 });
    }

    if (method === 'DELETE') {
      deleteRow(ws, payload.id);
      return jsonResponse({ deleted: 1 });
    }

    return jsonResponse({ error: 'Unknown method: ' + method });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ── 工具函式 ────────────────────────────────────────────────────────────────

function sheetToJson(ws) {
  const values = ws.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function appendRow(ws, rowData) {
  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  const row = headers.map(h => (rowData[h] !== undefined ? rowData[h] : ''));
  ws.appendRow(row);
}

function updateRow(ws, id, data) {
  const values  = ws.getDataRange().getValues();
  const headers = values[0];
  const idCol   = headers.indexOf('id');
  if (idCol < 0) return;

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      Object.keys(data).forEach(key => {
        const col = headers.indexOf(key);
        if (col >= 0) ws.getRange(i + 1, col + 1).setValue(data[key]);
      });
      return;
    }
  }
}

function deleteRow(ws, id) {
  const values  = ws.getDataRange().getValues();
  const headers = values[0];
  const idCol   = headers.indexOf('id');
  if (idCol < 0) return;

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      ws.deleteRow(i + 1);
      return;
    }
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
