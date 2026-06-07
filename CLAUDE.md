# CLAUDE.md

本檔案提供給 Claude Code（claude.ai/code）在這個倉庫中工作時參考。

## 專案簡介

這是一個個人記帳／預算管理 PWA（記帳工具），介面語言為繁體中文，單人使用，部署在 Vercel。沒有 build 流程 — 純粹是靜態前端（`index.html` + `js/*.js`）加上一支 serverless API 函式（`api/index.js`），資料庫用 Neon Postgres。

## 常用指令

這個專案沒有 build / lint / test 工具鏈 — `package.json` 只宣告了執行期相依套件（`@neondatabase/serverless`）。

- **本機執行**：`vercel dev`（需要 `DATABASE_URL` 環境變數 — 存在 `.env.local`，已被 gitignore；`vercel dev` 需要先把它匯出到環境變數中，例如 `export $(grep -v '^#' .env.local | xargs) && vercel dev`）
- **部署**：推送到已連結的 GitHub repo 會觸發 Vercel 自動部署（專案已透過 `.vercel/` 連結）
- **重新產生種子資料**：`node generate_seed.js` 會讀取 `Accounting Tool - *.csv` 匯出檔（已被 gitignore，是個人財務資料）並重新產生 `seed.sql`，可以拿去對 Neon 資料庫執行來（重新）填入資料

## 架構說明

### 前端：傳統全域作用域 script，沒有打包工具、沒有框架

`index.html` 放了所有 HTML 結構與 CSS（單一個 `<style>` 區塊，用 CSS 自訂屬性做出暖色調「蜂蜜金」設計系統）。所有 JavaScript 都放在 `js/*.js`，透過一般的 `<script src="js/...">` 標籤**依特定順序**載入（不是 ES module — 每個檔案共用同一個全域作用域，所以 `index.html` 裡的載入順序仍然重要，即使函式宣告本身會被 hoist）：

1. `js/state.js` — 全域狀態（`currentYear`、`allTxData`、`allCategories` 等）、`gasAPI()`（fetch 包裝函式 — 雖然名字裡有 gas，但現在打的是 Vercel API，不是 Google Apps Script 了）、`loadAll()`（stale-while-revalidate：先從 `localStorage` 快取立即畫面渲染，再背景重新抓資料並重繪）、日期/格式工具函式
2. `js/calendar.js` — 月曆格子渲染、點擊日期開啟明細面板、把「預計」的固定收支提前轉為正式入帳
3. `js/transactions.js` — 新增/編輯/刪除交易的 Modal、快捷備註 chip
4. `js/goals.js` — 存錢目標（卡片 + 編輯子視圖）
5. `js/editor.js` — 「管理資料」底部彈窗的外殼，負責切換 存錢目標／分類管理／快捷備註／固定收支 四個子視圖
6. `js/recurring.js` — 固定收支範本：CRUD + 新增表單的顯示切換
7. `js/categories.js` — 分類管理（也定義了 `getCatColor`，分類管理和快捷備註頁面都會用到）
8. `js/shortcuts.js` — 快捷備註管理
9. `js/analysis.js` — 消費／收入分析 Modal：甜甜圈圖 + 圖例 + Top 5（手刻 SVG，沒有用圖表套件）、近 6 個月趨勢折線圖
10. `js/insights.js` — AI 每日洞察卡片 + 歷史紀錄 Modal
11. `js/main.js` — 啟動程式；只呼叫 `loadAll()`（特意放在最後，確保上面所有函式/常數都已經定義完成）

之後如果要加新功能區塊，建立新的 `js/<功能>.js`，並在 `main.js` **之前**加上對應的 `<script src>`（函式宣告的順序其實不影響執行正確性，只有頂層的 `const`/`let` 需要在被存取前先執行 — 而整個頁面唯一會主動執行的程式碼就是 `main.js` 裡的 `loadAll()`）。

### 後端：單一個 Vercel serverless function，用 action 分派

`api/index.js` 是單一個 handler，匯出 `module.exports = async (req, res) => {...}`。沒有路由器 — 全部靠 `req.query.action` 做扁平的 `if (action === 'xxx')` 鏈式判斷，並透過 `@neondatabase/serverless` 的 tagged-template `sql` 語法操作 Postgres。CORS 是完全開放的（`Access-Control-Allow-Origin: *`），因為這是單人使用的工具。

要新增 API 動作：在最後的 `return out({ status: 'ok' })` 之前加一段新的 `if (action === '...')` 分支即可。

前端透過 `gasAPI(action, params)`（定義在 `js/state.js`）呼叫後端，這個函式會組出 `/api?action=...&...` 並把物件參數做 JSON 字串化。

後端最不直觀、值得特別留意的邏輯 — **固定收支（recurring transactions）**：
- `materializeDueRecurring(today)` 在每次 `getAll` 呼叫時都會執行。它會把所有「已經到期但尚未正式入帳」的項目（包含使用者一段時間沒開 App、錯過好幾個月份的補登）直接寫進 `transactions` 表，並標記 `recurring_id`。
- `projectRecurringForMonth(...)` 則是即時計算指定月份「尚未發生」的未來項目 — 這些**不會被寫入資料庫**，只會以 `projectedTransactions` 回傳，純粹用於月曆／月摘要的預覽顯示（前端用虛線樣式呈現，使用者也可以點「提前記錄」把它提早正式入帳）。
- `occurrenceDateForMonth` 會把「每月幾號」夾在當月最後一天內（例如 31 號在二月會自動變成 28 或 29 號）。

**generateInsight()** 會呼叫 Gemini API（`GEMINI_API_KEY` 環境變數），把最近的交易紀錄＋進行中的存錢目標組成 prompt，請 AI 用「朋友語氣」、繁體中文產出輕鬆的觀察心得，結果會存進 `insights` 表快取。觸發方式有兩種：使用者手動按「✨ 產生洞察」，或是 `vercel.json` 裡設定的每日 Vercel cron（`0 0 * * *` → `/api?action=generateInsight`）。

### 資料庫（Neon Postgres）

`api/index.js` 中用到的資料表：`transactions`、`categories`、`goals`、`note_shortcuts`、`recurring_transactions`、`savings_logs`、`insights`。`seed.sql`（由 `generate_seed.js` 從已被 gitignore 的 CSV 匯出檔產生）是目前最接近 schema 參考／範例資料的東西 — 裡面用 `ON CONFLICT (id) DO NOTHING` 做 upsert。

### 舊版遺跡：`code.gs`

這是後端還是 Google Sheets + GAS（Google Apps Script）時期的程式碼（當時前端放在 GitHub Pages，透過 `fetch` 呼叫它）。專案後來已經遷移到 Vercel + Neon Postgres（`api/index.js` 是對應遷移後的等價版本，動作集合幾乎一致）。`code.gs` 純粹當作歷史參考即可 — 不要把前端接回去呼叫它。

### PWA

`index.html` 中有 `apple-touch-icon` / `icon-192.png` / `icon-512.png` 的連結與 `apple-mobile-web-app-*` meta 標籤，用於 iOS「加入主畫面」。`gasAPI` 裡那段用 `new URL('/api', location.href)` 而不是相對路徑的註解，是當初為了修正 iOS 獨立模式（standalone/PWA）下 fetch 失敗問題而刻意這樣寫的（可參考 git 歷史中跟 「iOS PWA」相關的提交）。

## 值得知道的慣例

- 所有 UI 文字與程式碼註解都是繁體中文（zh-TW）；新增使用者可見文字或註解時請維持這個風格。
- 前端永遠不會直接連 Postgres — 所有資料存取都透過 `gasAPI` 走 API。
- 「已入帳（materialized）」vs「預計（projected）」是貫穿前後端的一個重要區分：已入帳 = `transactions` 表中的真實一筆資料（有 id，可編輯/刪除）；預計 = 即時計算出來的預覽（`id` 開頭是 `proj_`、帶有 `projected: true`、不存在資料庫裡，前端會用虛線/淡化樣式呈現）。
