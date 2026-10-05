/**
 * @file dev-inspector.ui.ts
 * @description Geliştirici HTTP Trafik ve LLM Stream İzleyicisi için interaktif test web arayüzü HTML şablonu.
 */

export function renderDevInspectorHtml(): string {
  return `<!DOCTYPE html>
<html lang="tr" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chotonack AI Dev Inspector | Canlı Trafik ve Stream İzleyici</title>
  <style>
    :root {
      --bg-base: #090d16;
      --bg-card: #0f172a;
      --bg-card-hover: #1e293b;
      --bg-input: #1e293b;
      --border-color: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --brand: #6366f1;
      --brand-hover: #4f46e5;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #f43f5e;
      --cyan: #06b6d4;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-base);
      color: var(--text-main);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    header {
      background-color: var(--bg-card);
      border-bottom: 1px solid var(--border-color);
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo {
      font-weight: 700;
      font-size: 16px;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .logo-badge {
      background: linear-gradient(135deg, var(--brand), var(--cyan));
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      text-transform: uppercase;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
      background-color: rgba(16, 185, 129, 0.1);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    .status-pill.disconnected {
      background-color: rgba(244, 63, 94, 0.1);
      color: var(--danger);
      border-color: rgba(244, 63, 94, 0.2);
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: currentColor;
      box-shadow: 0 0 8px currentColor;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    button {
      background-color: var(--bg-card-hover);
      color: var(--text-main);
      border: 1px solid var(--border-color);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    button:hover {
      background-color: #334155;
      border-color: #475569;
    }
    button.primary {
      background-color: var(--brand);
      border-color: var(--brand);
      color: white;
    }
    button.primary:hover {
      background-color: var(--brand-hover);
    }
    .toolbar {
      background-color: #0c1220;
      border-bottom: 1px solid var(--border-color);
      padding: 10px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .search-box {
      flex: 1;
      min-width: 200px;
    }
    .search-box input {
      width: 100%;
      background-color: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 6px 12px;
      color: var(--text-main);
      font-size: 12px;
      outline: none;
    }
    .search-box input:focus {
      border-color: var(--brand);
    }
    .filter-group {
      display: flex;
      gap: 4px;
    }
    .filter-btn {
      padding: 4px 8px;
      font-size: 11px;
    }
    .filter-btn.active {
      background-color: var(--brand);
      border-color: var(--brand);
      color: white;
    }
    .stats-info {
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      gap: 12px;
    }
    .stats-info span strong {
      color: var(--text-main);
    }
    .main-layout {
      flex: 1;
      display: flex;
      overflow: hidden;
    }
    .list-pane {
      flex: 1;
      min-width: 320px;
      max-width: 550px;
      border-right: 1px solid var(--border-color);
      overflow-y: auto;
      background-color: var(--bg-card);
    }
    .traffic-item {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.5);
      cursor: pointer;
      transition: background 0.15s ease;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .traffic-item:hover {
      background-color: var(--bg-card-hover);
    }
    .traffic-item.active {
      background-color: rgba(99, 102, 241, 0.15);
      border-left: 3px solid var(--brand);
    }
    .item-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .item-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .method-badge {
      font-weight: 700;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .method-GET { background-color: rgba(6, 182, 212, 0.15); color: var(--cyan); }
    .method-POST { background-color: rgba(16, 185, 129, 0.15); color: var(--success); }
    .method-PUT { background-color: rgba(245, 158, 11, 0.15); color: var(--warning); }
    .method-DELETE { background-color: rgba(244, 63, 94, 0.15); color: var(--danger); }
    .status-badge {
      font-weight: 700;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .status-2xx { color: var(--success); background-color: rgba(16, 185, 129, 0.1); }
    .status-3xx { color: var(--warning); background-color: rgba(245, 158, 11, 0.1); }
    .status-4xx { color: var(--warning); background-color: rgba(245, 158, 11, 0.15); }
    .status-5xx { color: var(--danger); background-color: rgba(244, 63, 94, 0.15); }
    .item-url {
      font-family: monospace;
      font-size: 12px;
      color: var(--text-main);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .item-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-muted);
    }
    .stream-tag {
      background-color: rgba(99, 102, 241, 0.15);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 10px;
    }
    .detail-pane {
      flex: 1.5;
      overflow-y: auto;
      padding: 20px;
      background-color: var(--bg-base);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--text-muted);
      font-size: 13px;
      gap: 8px;
    }
    .card {
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }
    .card-header {
      background-color: #162032;
      padding: 10px 16px;
      font-size: 12px;
      font-weight: 600;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-body {
      padding: 14px 16px;
      font-size: 12px;
    }
    pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background-color: #060910;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 12px;
      color: #e2e8f0;
      line-height: 1.5;
      max-height: 400px;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <header>
    <div class="header-left">
      <div class="logo">
        <span class="logo-badge">Dev</span>
        <span>Chotonack AI Traffic Inspector</span>
      </div>
      <div id="connectionStatus" class="status-pill">
        <span class="pulse-dot"></span>
        <span id="connectionText">Bağlanıyor...</span>
      </div>
    </div>
    <div class="header-actions">
      <button type="button" id="btnTestHealth">⚡ Test Ping (/health)</button>
      <button type="button" id="btnTestPrompts">⚡ Test Prompts (/api/prompts)</button>
      <button type="button" id="btnTestError">⚡ Test Hata (422)</button>
      <button type="button" id="btnClearLogs">🗑️ Temizle</button>
      <button type="button" id="btnAutoScroll" class="primary">⬇️ Otomatik Kaydır: Açık</button>
    </div>
  </header>

  <div class="toolbar">
    <div class="search-box">
      <input type="text" id="searchInput" placeholder="URL, metot veya içerik filtrele (örn: /chat, 422, POST)...">
    </div>
    <div class="filter-group">
      <button type="button" class="filter-btn active" data-method="ALL">Tümü</button>
      <button type="button" class="filter-btn" data-method="GET">GET</button>
      <button type="button" class="filter-btn" data-method="POST">POST</button>
      <button type="button" class="filter-btn" data-method="PUT">PUT</button>
      <button type="button" class="filter-btn" data-method="DELETE">DELETE</button>
    </div>
    <div class="stats-info">
      <span>Toplam: <strong id="statTotal">0</strong></span>
      <span>Hatalar: <strong id="statErrors" style="color:var(--danger)">0</strong></span>
      <span>Ort. Süre: <strong id="statAvg">0ms</strong></span>
    </div>
  </div>

  <div class="main-layout">
    <div class="list-pane" id="trafficList">
      <div class="empty-state">Trafik bekleniyor... Yeni bir istek yapıldığında buraya akacaktır.</div>
    </div>
    <div class="detail-pane" id="trafficDetail">
      <div class="empty-state">Detayları görmek için soldaki listeden bir istek seçin.</div>
    </div>
  </div>

  <script>
    let entries = [];
    let selectedId = null;
    let autoScroll = true;
    let currentMethodFilter = 'ALL';
    let currentSearch = '';

    const listEl = document.getElementById('trafficList');
    const detailEl = document.getElementById('trafficDetail');
    const statusEl = document.getElementById('connectionStatus');
    const statusTextEl = document.getElementById('connectionText');
    const searchInput = document.getElementById('searchInput');

    function escapeHtml(str) {
      if (typeof str !== 'string') return String(str);
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function formatJson(val) {
      if (val === undefined || val === null) return '<boş>';
      if (typeof val === 'string') return escapeHtml(val);
      return escapeHtml(JSON.stringify(val, null, 2));
    }

    function getStatusClass(status) {
      if (status < 300) return 'status-2xx';
      if (status < 400) return 'status-3xx';
      if (status < 500) return 'status-4xx';
      return 'status-5xx';
    }

    function updateStats() {
      const total = entries.length;
      const errors = entries.filter(e => e.status >= 400).length;
      const totalDur = entries.reduce((acc, e) => acc + (e.durationMs || 0), 0);
      const avg = total > 0 ? Math.round(totalDur / total) : 0;

      document.getElementById('statTotal').textContent = total;
      document.getElementById('statErrors').textContent = errors;
      document.getElementById('statAvg').textContent = avg + 'ms';
    }

    function renderList() {
      const filtered = entries.filter(e => {
        if (currentMethodFilter !== 'ALL' && e.method !== currentMethodFilter) return false;
        if (currentSearch) {
          const s = currentSearch.toLowerCase();
          const matchUrl = (e.url || '').toLowerCase().includes(s);
          const matchMethod = (e.method || '').toLowerCase().includes(s);
          const matchStatus = String(e.status).includes(s);
          const matchBody = JSON.stringify(e.request?.body || '').toLowerCase().includes(s);
          if (!matchUrl && !matchMethod && !matchStatus && !matchBody) return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        listEl.innerHTML = '<div class="empty-state">Eşleşen kayıt bulunamadı.</div>';
        return;
      }

      listEl.innerHTML = '';
      filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'traffic-item' + (item.id === selectedId ? ' active' : '');
        div.dataset.id = item.id;

        const timeStr = new Date(item.timestamp).toLocaleTimeString('tr-TR');
        const statusCls = getStatusClass(item.status);
        const streamBadge = item.response?.isStream ? '<span class="stream-tag">🤖 LLM Stream</span>' : '';

        div.innerHTML = \`
          <div class="item-top">
            <div class="item-left">
              <span class="method-badge method-\${item.method}">\${item.method}</span>
              <span class="status-badge \${statusCls}">\${item.status}</span>
              <span class="item-url" title="\${escapeHtml(item.url)}">\${escapeHtml(item.url)}</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted)">\${item.durationMs}ms</div>
          </div>
          <div class="item-meta">
            <span>\${timeStr} \${item.clientIp ? '• ' + item.clientIp : ''}</span>
            \${streamBadge}
          </div>
        \`;

        div.onclick = () => selectItem(item.id);
        listEl.appendChild(div);
      });

      if (autoScroll && listEl.firstElementChild) {
        listEl.scrollTop = 0;
      }
    }

    function selectItem(id) {
      selectedId = id;
      document.querySelectorAll('.traffic-item').forEach(el => {
        el.classList.toggle('active', el.dataset.id === id);
      });

      const item = entries.find(e => e.id === id);
      if (!item) {
        detailEl.innerHTML = '<div class="empty-state">Kayıt bulunamadı.</div>';
        return;
      }

      const statusCls = getStatusClass(item.status);
      const timeStr = new Date(item.timestamp).toLocaleString('tr-TR');

      let responseContent = '';
      if (item.response?.isStream) {
        responseContent = \`
          <div style="margin-bottom:8px;font-size:11px;color:#a5b4fc">
            <strong>🤖 Stream Bilgisi:</strong> \${escapeHtml(item.response.streamSummary || 'Aktif akış')}
          </div>
          <pre>\${escapeHtml(item.response.body || '')}</pre>
        \`;
      } else {
        responseContent = \`<pre>\${formatJson(item.response?.body)}</pre>\`;
      }

      detailEl.innerHTML = \`
        <div class="card">
          <div class="card-header">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="method-badge method-\${item.method}">\${item.method}</span>
              <span class="status-badge \${statusCls}">\${item.status}</span>
              <strong style="font-family:monospace;font-size:13px">\${escapeHtml(item.url)}</strong>
            </div>
            <div style="color:var(--text-muted);font-size:11px">
              Süre: <strong>\${item.durationMs}ms</strong> • \${timeStr}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span>Giden İstek (Request)</span>
            <span style="color:var(--text-muted);font-size:11px">\${item.clientIp ? 'IP: ' + item.clientIp : ''}</span>
          </div>
          <div class="card-body">
            <div style="margin-bottom:10px">
              <strong style="color:var(--text-muted);display:block;margin-bottom:4px">Headers:</strong>
              <pre style="max-height:160px">\${formatJson(item.request?.headers)}</pre>
            </div>
            \${item.request?.query && Object.keys(item.request.query).length > 0 ? \`
              <div style="margin-bottom:10px">
                <strong style="color:var(--text-muted);display:block;margin-bottom:4px">Query Parametreleri:</strong>
                <pre style="max-height:120px">\${formatJson(item.request.query)}</pre>
              </div>
            \` : ''}
            <div>
              <strong style="color:var(--text-muted);display:block;margin-bottom:4px">Body (Gövde):</strong>
              <pre>\${formatJson(item.request?.body)}</pre>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span>Gelen Yanıt (Response)</span>
            <span class="status-badge \${statusCls}">HTTP \${item.status}</span>
          </div>
          <div class="card-body">
            \${responseContent}
          </div>
        </div>
      \`;
    }

    // SSE Canlı Bağlantısı
    function connectSse() {
      const sse = new EventSource('/api/dev/inspector/events');

      sse.onopen = () => {
        statusEl.className = 'status-pill';
        statusTextEl.textContent = 'Canlı Akış (SSE: Bağlı)';
      };

      sse.onmessage = (event) => {
        try {
          const entry = JSON.parse(event.data);
          if (entry && entry.id) {
            entries.unshift(entry);
            if (entries.length > 100) entries.pop();
            updateStats();
            renderList();
          }
        } catch (err) {
          console.warn('SSE Parse Hatası:', err);
        }
      };

      sse.addEventListener('clear', () => {
        entries = [];
        selectedId = null;
        updateStats();
        renderList();
        detailEl.innerHTML = '<div class="empty-state">Detayları görmek için soldaki listeden bir istek seçin.</div>';
      });

      sse.onerror = () => {
        statusEl.className = 'status-pill disconnected';
        statusTextEl.textContent = 'Bağlantı Kesildi (Yeniden deneniyor...)';
      };
    }

    // İlk geçmişi API'den yükle
    async function loadInitialHistory() {
      try {
        const res = await fetch('/api/dev/inspector/logs');
        if (res.ok) {
          const data = await res.json();
          entries = data.logs || [];
          updateStats();
          renderList();
          if (entries.length > 0) {
            selectItem(entries[0].id);
          }
        }
      } catch (err) {
        console.warn('Geçmiş yüklenemedi:', err);
      }
    }

    // Buton Eylemleri
    document.getElementById('btnTestHealth').onclick = () => fetch('/health');
    document.getElementById('btnTestPrompts').onclick = () => fetch('/api/prompts');
    document.getElementById('btnTestError').onclick = () => fetch('/api/roles/invalid-id/set-default', { method: 'PUT' });
    document.getElementById('btnClearLogs').onclick = async () => {
      await fetch('/api/dev/inspector/logs', { method: 'DELETE' });
    };

    document.getElementById('btnAutoScroll').onclick = (e) => {
      autoScroll = !autoScroll;
      e.target.textContent = autoScroll ? '⬇️ Otomatik Kaydır: Açık' : '⏸️ Otomatik Kaydır: Kapalı';
      e.target.className = autoScroll ? 'primary' : '';
    };

    // Filtre butonları
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMethodFilter = btn.dataset.method;
        renderList();
      };
    });

    searchInput.oninput = (e) => {
      currentSearch = e.target.value.trim();
      renderList();
    };

    // Başlat
    loadInitialHistory();
    connectSse();
  </script>
</body>
</html>`;
}
