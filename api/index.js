const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const p = req.query || {};
  const action = p.action;
  const out = (data) => res.status(200).json(data);

  try {

    // ── 批次讀取 ──────────────────────────────────────────────────
    if (action === 'getAll') {
      const month = p.month || '';
      const today = taiwanTodayStr();
      await materializeDueRecurring(today);

      const [txRows, catRows, goalRows, nsRows, recurringRows] = await Promise.all([
        sql`SELECT id, date, type, amount::float AS amount, category, note, recurring_id FROM transactions WHERE date LIKE ${month + '%'} ORDER BY date`,
        sql`SELECT id, name, icon, type FROM categories ORDER BY sort_order NULLS LAST, id`,
        sql`SELECT id, name, target_amount::float AS target_amount, saved_amount::float AS saved_amount, deadline, status FROM goals`,
        sql`SELECT id, text, category FROM note_shortcuts`,
        sql`SELECT id, type, amount::float AS amount, category, note, day_of_month, start_date, end_date, status FROM recurring_transactions ORDER BY id`
      ]);

      const projectedTransactions = projectRecurringForMonth(recurringRows, txRows, month, today);
      return out({ transactions: txRows, projectedTransactions, categories: catRows, goals: goalRows, noteShortcuts: nsRows, recurringTransactions: recurringRows });
    }

    if (action === 'getTransactions') {
      const month = p.month || '';
      const rows = await sql`SELECT id, date, type, amount::float AS amount, category, note FROM transactions WHERE date LIKE ${month + '%'} ORDER BY date`;
      return out(rows);
    }

    if (action === 'getCategories') {
      const rows = await sql`SELECT id, name, icon, type FROM categories ORDER BY sort_order NULLS LAST, id`;
      return out(rows);
    }

    if (action === 'getGoals') {
      const rows = await sql`SELECT id, name, target_amount::float AS target_amount, saved_amount::float AS saved_amount, deadline, status FROM goals`;
      return out(rows);
    }

    if (action === 'getNoteShortcuts') {
      const rows = await sql`SELECT id, text, category FROM note_shortcuts`;
      return out(rows);
    }

    if (action === 'getRecurringTransactions') {
      const rows = await sql`SELECT id, type, amount::float AS amount, category, note, day_of_month, start_date, end_date, status FROM recurring_transactions ORDER BY id`;
      return out(rows);
    }

    if (action === 'getInsights') {
      const rows = await sql`SELECT timestamp, insight FROM insights ORDER BY timestamp DESC`;
      return out(rows);
    }

    // ── 交易 ──────────────────────────────────────────────────────
    if (action === 'addTransaction') {
      const data = JSON.parse(p.data);
      const now = new Date();
      const id = String(Date.now());
      const createdAt = now.toISOString().replace('T', ' ').substring(0, 19);
      await sql`INSERT INTO transactions (id, date, type, amount, category, note, created_at, recurring_id) VALUES (${id}, ${data.date}, ${data.type}, ${data.amount}, ${data.category}, ${data.note || null}, ${createdAt}, ${data.recurring_id || null})`;
      return out({ success: true, id });
    }

    if (action === 'updateTransaction') {
      const data = JSON.parse(p.data);
      await sql`UPDATE transactions SET date=${data.date}, type=${data.type}, amount=${data.amount}, category=${data.category}, note=${data.note || null} WHERE id=${p.id}`;
      return out({ success: true });
    }

    if (action === 'deleteTransaction') {
      await sql`DELETE FROM transactions WHERE id=${p.id}`;
      return out({ success: true });
    }

    // ── 存錢目標 ──────────────────────────────────────────────────
    if (action === 'addGoal') {
      const data = JSON.parse(p.data);
      await sql`INSERT INTO goals (id, name, target_amount, saved_amount, deadline, created_at, status) VALUES (${data.id}, ${data.name}, ${data.target_amount}, ${data.saved_amount || 0}, ${data.deadline}, ${data.created_at || null}, ${data.status || 'active'})`;
      return out({ success: true });
    }

    if (action === 'updateGoal') {
      const data = JSON.parse(p.data);
      if (data.name !== undefined)          await sql`UPDATE goals SET name=${data.name} WHERE id=${p.id}`;
      if (data.target_amount !== undefined)  await sql`UPDATE goals SET target_amount=${data.target_amount} WHERE id=${p.id}`;
      if (data.saved_amount !== undefined)   await sql`UPDATE goals SET saved_amount=${data.saved_amount} WHERE id=${p.id}`;
      if (data.deadline !== undefined)       await sql`UPDATE goals SET deadline=${data.deadline} WHERE id=${p.id}`;
      if (data.status !== undefined)         await sql`UPDATE goals SET status=${data.status} WHERE id=${p.id}`;
      return out({ success: true });
    }

    if (action === 'deleteGoal') {
      await sql`DELETE FROM goals WHERE id=${p.id}`;
      return out({ success: true });
    }

    if (action === 'addSavingsLog') {
      const data = JSON.parse(p.data);
      await sql`INSERT INTO savings_logs (id, goal_id, goal_name, amount, saved_date) VALUES (${data.id}, ${data.goal_id}, ${data.goal_name}, ${data.amount}, ${data.saved_date})`;
      return out({ success: true });
    }

    // ── 分類 ──────────────────────────────────────────────────────
    if (action === 'addCategory') {
      const data = JSON.parse(p.data);
      await sql`INSERT INTO categories (id, name, icon, type) VALUES (${data.id}, ${data.name}, ${data.icon}, ${data.type})`;
      return out({ success: true });
    }

    if (action === 'updateCategory') {
      const data = JSON.parse(p.data);
      if (data.name !== undefined) await sql`UPDATE categories SET name=${data.name} WHERE id=${p.id}`;
      if (data.icon !== undefined) await sql`UPDATE categories SET icon=${data.icon} WHERE id=${p.id}`;
      return out({ success: true });
    }

    if (action === 'deleteCategory') {
      await sql`DELETE FROM categories WHERE id=${p.id}`;
      return out({ success: true });
    }

    // ── 快捷備註 ──────────────────────────────────────────────────
    if (action === 'addNoteShortcut') {
      const data = JSON.parse(p.data);
      await sql`INSERT INTO note_shortcuts (id, text, category) VALUES (${data.id}, ${data.text}, ${data.category || ''})`;
      return out({ success: true });
    }

    if (action === 'updateNoteShortcut') {
      const data = JSON.parse(p.data);
      if (data.text !== undefined)     await sql`UPDATE note_shortcuts SET text=${data.text} WHERE id=${p.id}`;
      if (data.category !== undefined) await sql`UPDATE note_shortcuts SET category=${data.category} WHERE id=${p.id}`;
      return out({ success: true });
    }

    if (action === 'deleteNoteShortcut') {
      await sql`DELETE FROM note_shortcuts WHERE id=${p.id}`;
      return out({ success: true });
    }

    // ── 固定收支範本 ──────────────────────────────────────────────
    if (action === 'addRecurringTransaction') {
      const data = JSON.parse(p.data);
      const createdAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await sql`INSERT INTO recurring_transactions (id, type, amount, category, note, day_of_month, start_date, end_date, status, created_at) VALUES (${data.id}, ${data.type}, ${data.amount}, ${data.category}, ${data.note || null}, ${data.day_of_month}, ${data.start_date}, ${data.end_date || null}, ${data.status || 'active'}, ${createdAt})`;
      return out({ success: true, id: data.id });
    }

    if (action === 'updateRecurringTransaction') {
      const data = JSON.parse(p.data);
      if (data.type !== undefined)         await sql`UPDATE recurring_transactions SET type=${data.type} WHERE id=${p.id}`;
      if (data.amount !== undefined)       await sql`UPDATE recurring_transactions SET amount=${data.amount} WHERE id=${p.id}`;
      if (data.category !== undefined)     await sql`UPDATE recurring_transactions SET category=${data.category} WHERE id=${p.id}`;
      if (data.note !== undefined)         await sql`UPDATE recurring_transactions SET note=${data.note} WHERE id=${p.id}`;
      if (data.day_of_month !== undefined) await sql`UPDATE recurring_transactions SET day_of_month=${data.day_of_month} WHERE id=${p.id}`;
      if (data.start_date !== undefined)   await sql`UPDATE recurring_transactions SET start_date=${data.start_date} WHERE id=${p.id}`;
      if (data.end_date !== undefined)     await sql`UPDATE recurring_transactions SET end_date=${data.end_date} WHERE id=${p.id}`;
      if (data.status !== undefined)       await sql`UPDATE recurring_transactions SET status=${data.status} WHERE id=${p.id}`;
      return out({ success: true });
    }

    if (action === 'deleteRecurringTransaction') {
      await sql`DELETE FROM recurring_transactions WHERE id=${p.id}`;
      return out({ success: true });
    }

    // ── 洞察 ──────────────────────────────────────────────────────
    if (action === 'generateInsight') {
      const result = await generateInsight();
      return out(result);
    }

    return out({ status: 'ok' });

  } catch (e) {
    console.error(e);
    return res.status(200).json({ error: e.toString() });
  }
};

// ── 固定收支：日期運算與投影/入帳 ────────────────────────────────
function taiwanTodayStr() {
  const tw = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return tw.toISOString().substring(0, 10);
}

// 將「每月 N 號」換算成指定月份的實際日期；當月天數不足時取該月最後一天（例如 31 號 → 2 月 28/29 號）
function occurrenceDateForMonth(yearMonth, dayOfMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const day = Math.min(dayOfMonth, lastDay);
  return `${yearMonth}-${String(day).padStart(2, '0')}`;
}

function monthsBetween(startYM, endYM) {
  const result = [];
  let [y, m] = startYM.split('-').map(Number);
  const [ey, em] = endYM.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    result.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return result;
}

// 補產生「已經到期但尚未正式入帳」的固定收支交易（含補登過去未開啟 App 期間錯過的月份）
async function materializeDueRecurring(today) {
  const currentYM = today.substring(0, 7);
  const templates = await sql`SELECT id, type, amount::float AS amount, category, note, day_of_month, start_date, end_date FROM recurring_transactions WHERE status = 'active'`;

  for (const tpl of templates) {
    if (!tpl.start_date) continue;
    const startYM = tpl.start_date.substring(0, 7);
    let endYM = currentYM;
    if (tpl.end_date && tpl.end_date.substring(0, 7) < endYM) endYM = tpl.end_date.substring(0, 7);
    if (startYM > endYM) continue;

    for (const ym of monthsBetween(startYM, endYM)) {
      const occDate = occurrenceDateForMonth(ym, tpl.day_of_month);
      if (occDate > today) continue;
      if (occDate < tpl.start_date) continue;
      if (tpl.end_date && occDate > tpl.end_date) continue;

      const existing = await sql`SELECT id FROM transactions WHERE recurring_id = ${tpl.id} AND date LIKE ${ym + '%'} LIMIT 1`;
      if (existing.length > 0) continue;

      const id = String(Date.now()) + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      const createdAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await sql`INSERT INTO transactions (id, date, type, amount, category, note, created_at, recurring_id) VALUES (${id}, ${occDate}, ${tpl.type}, ${tpl.amount}, ${tpl.category}, ${tpl.note}, ${createdAt}, ${tpl.id})`;
    }
  }
}

// 計算指定月份中「尚未發生、也尚未入帳」的固定收支投影（不寫入資料庫，僅供前端預覽顯示）
function projectRecurringForMonth(templates, txRows, month, today) {
  const materializedIds = new Set(txRows.filter(r => r.recurring_id).map(r => r.recurring_id));
  const projections = [];

  for (const tpl of templates) {
    if (tpl.status !== 'active') continue;
    if (materializedIds.has(tpl.id)) continue;
    if (tpl.start_date && tpl.start_date.substring(0, 7) > month) continue;
    if (tpl.end_date && tpl.end_date.substring(0, 7) < month) continue;

    const occDate = occurrenceDateForMonth(month, tpl.day_of_month);
    if (occDate <= today) continue;
    if (tpl.start_date && occDate < tpl.start_date) continue;
    if (tpl.end_date && occDate > tpl.end_date) continue;

    projections.push({
      id: 'proj_' + tpl.id + '_' + month,
      date: occDate,
      type: tpl.type,
      amount: tpl.amount,
      category: tpl.category,
      note: tpl.note,
      recurring_id: tpl.id,
      projected: true
    });
  }
  return projections;
}

// ── generateInsight（移植自 GAS）──────────────────────────────────
async function generateInsight() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { success: false, error: '請在 Vercel 環境變數設定 GEMINI_API_KEY' };

  const now = new Date();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // 決定起始日期：上次洞察以來 or 最近 7 天
  let sinceDate;
  let periodLabel;
  const lastRows = await sql`SELECT timestamp FROM insights ORDER BY timestamp DESC LIMIT 1`;
  if (lastRows.length > 0 && lastRows[0].timestamp) {
    sinceDate = String(lastRows[0].timestamp).substring(0, 10);
    periodLabel = '自 ' + sinceDate + ' 以來';
  } else {
    const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    sinceDate = d.toISOString().substring(0, 10);
    periodLabel = '最近 7 天';
  }

  const txRows = await sql`SELECT date, type, amount::float AS amount, category, note FROM transactions WHERE date >= ${sinceDate} ORDER BY date`;
  if (txRows.length === 0) return { success: false, error: periodLabel + '沒有新的交易，先記幾筆帳再來看看吧！' };

  const goalRows = await sql`SELECT name, target_amount::float AS target_amount, saved_amount::float AS saved_amount, deadline FROM goals WHERE status='active'`;
  const goalsStr = goalRows.length > 0
    ? '\n\n目前存錢目標：' + goalRows.map(g => `${g.name}（目標 $${g.target_amount}，已存 $${g.saved_amount}，截止 ${g.deadline}）`).join('、')
    : '';

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
  const selectedAngles = angles.sort(() => Math.random() - 0.5).slice(0, 2);

  const hour = now.getUTCHours() + 8; // Taiwan UTC+8
  const timeOfDay = hour >= 6 && hour < 12 ? '早上' : hour >= 12 && hour < 18 ? '下午' : hour >= 18 ? '晚上' : '深夜';

  const totalExp = txRows.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const totalInc = txRows.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);

  let dataSummary = `${periodLabel}的交易（共 ${txRows.length} 筆）：\n總支出 $${totalExp}，總收入 $${totalInc}\n\n明細：\n`;
  for (const r of txRows) {
    const d = new Date(r.date);
    const dow = weekDays[d.getDay()];
    dataSummary += `${r.date}（週${dow}）${r.type === 'expense' ? '支出' : '收入'} $${r.amount} [${r.category}]${r.note ? ' ' + r.note : ''}\n`;
  }
  dataSummary += goalsStr;

  const prompt = `你是個很了解這個人的朋友，不是理財顧問。用繁體中文，輕鬆口吻，像在聊天一樣，不評判，不說教。

現在是${timeOfDay}。

${dataSummary}

請從以下角度觀察：${selectedAngles.join('、')}

分享 2 個有趣現象或小發現，每個一句話。語氣像朋友說「欸我發現你...」或「你最近...」之類的。`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 200, temperature: 0.9 }
    })
  });

  const json = await resp.json();
  if (json.error) return { success: false, error: 'Gemini 錯誤：' + json.error.message };

  const insightText = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '今天沒有特別的發現，繼續保持吧';
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

  await sql`INSERT INTO insights (timestamp, insight) VALUES (${timestamp}, ${insightText})`;
  return { success: true, insight: insightText, timestamp };
}
