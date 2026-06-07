// === 每日洞察 ===
async function generateTodayInsight() {
  const btn = document.getElementById('insightBtn');
  btn.disabled = true;
  btn.textContent = '✨ 產生中...';
  try {
    const result = await gasAPI('generateInsight');
    if (result.success) {
      document.getElementById('insightText').textContent = result.insight;
      document.getElementById('insightTime').textContent = result.timestamp.replace('T', ' ');
      document.getElementById('insightCard').style.display = 'block';
    } else {
      alert(result.error || '產生失敗，請稍後再試');
    }
  } catch (err) {
    alert('載入失敗，請稍後再試');
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ 產生洞察';
  }
}

async function showInsightHistory() {
  const list = document.getElementById('insightHistoryList');
  list.innerHTML = '<div style="text-align:center;color:#aaa;padding:20px;">載入中...</div>';
  document.getElementById('insightHistoryOverlay').classList.add('show');
  document.getElementById('insightHistoryModal').classList.add('show');
  lockBodyScroll();
  try {
    const insights = await gasAPI('getInsights');
    if (!insights.length) {
      list.innerHTML = '<div style="text-align:center;color:#aaa;padding:20px;">尚無洞察紀錄</div>';
      return;
    }
    list.innerHTML = insights.map(item => `
      <div class="insight-history-item">
        <div class="insight-history-date">${item.timestamp.replace('T', ' ')}</div>
        <div class="insight-history-text">${item.insight}</div>
      </div>`).join('');
  } catch (err) {
    list.innerHTML = '<div style="text-align:center;color:#aaa;padding:20px;">載入失敗</div>';
  }
}

function closeInsightHistory() {
  document.getElementById('insightHistoryModal').classList.remove('show');
  document.getElementById('insightHistoryOverlay').classList.remove('show');
  unlockBodyScroll();
}
