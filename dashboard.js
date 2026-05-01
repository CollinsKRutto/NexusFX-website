/* =============================================
   NexusFX — Dashboard / Analytics Logic
   (with Free/Pro plan gating + affiliate)
   ============================================= */

let grChart = null, distChart = null;

function loadDashboard() {
  const state = AppState.get();
  const trades = state.closedTrades || [];
  const liveEq = state.liveEquity || [10000];
  const btEq = state.btEquity || [];
  renderKPIs(trades, state.bal || 10000, state.sessionStart);
  renderGrowthChart(liveEq, btEq);
  renderDistChart(trades);
  renderJournal(trades);
  renderPlanBadge();
  renderAffiliatePanel();
}

function renderKPIs(trades, bal, sessionStart) {
  const balEl = document.getElementById('d-bal');
  if (balEl) { balEl.textContent = '$' + bal.toFixed(2); balEl.style.color = bal >= 10000 ? 'var(--g)' : 'var(--r)'; }

  if (sessionStart) {
    const mins = Math.floor((Date.now() - sessionStart) / 60000);
    const durEl = document.getElementById('d-dur');
    const durSub = document.getElementById('d-dur-sub');
    if (durEl) durEl.textContent = mins < 60 ? mins + 'm' : Math.floor(mins/60) + 'h ' + (mins%60) + 'm';
    if (durSub) durSub.textContent = 'Started ' + new Date(sessionStart).toLocaleTimeString();
  }

  if (!trades.length) return;

  const wins = trades.filter(t => t.won);
  const losses = trades.filter(t => !t.won);
  const totalPnl = trades.reduce((a,t) => a + t.pnl, 0);
  const wr = (wins.length / trades.length) * 100;
  const gw = wins.reduce((a,t) => a + t.pnl, 0);
  const gl = Math.abs(losses.reduce((a,t) => a + t.pnl, 0));
  const pf = gl > 0 ? (gw/gl).toFixed(2) : '∞';
  const exp = (totalPnl / trades.length).toFixed(2);
  const liveEq = AppState.get().liveEquity || [10000];
  let peak = 10000, mdd = 0;
  liveEq.forEach(v => { if (v > peak) peak = v; const dd = peak-v; if (dd > mdd) mdd = dd; });
  const mddPct = peak > 0 ? ((mdd/peak)*100).toFixed(2) : '0.00';
  const best = Math.max(...trades.map(t => t.pnl));
  const worst = Math.min(...trades.map(t => t.pnl));

  const set = (id, val, color) => { const el = document.getElementById(id); if (!el) return; el.textContent = val; if (color) el.style.color = color; };

  set('d-pnl', (totalPnl >= 0 ? '+$' : '-$') + Math.abs(totalPnl).toFixed(2), totalPnl >= 0 ? 'var(--g)' : 'var(--r)');
  set('d-wr', wr.toFixed(1) + '%', wr >= 50 ? 'var(--g)' : 'var(--r)');
  set('d-wr-s', wins.length + ' W / ' + losses.length + ' L');
  set('d-pf', pf, parseFloat(pf) >= 1 ? 'var(--g)' : 'var(--r)');
  set('d-mdd', mddPct + '%', 'var(--r)');
  set('d-exp', (parseFloat(exp) >= 0 ? '+$' : '-$') + Math.abs(parseFloat(exp)).toFixed(2), parseFloat(exp) >= 0 ? 'var(--g)' : 'var(--r)');
  set('d-tot', trades.length);
  set('d-tot-s', wins.length + ' Wins / ' + losses.length + ' Losses');
  set('d-best', '+$' + Math.abs(best).toFixed(2), 'var(--g)');
  set('d-worst', '-$' + Math.abs(Math.min(worst,0)).toFixed(2), 'var(--r)');

  const wrBar = document.getElementById('wr-bar');
  const wrLbl = document.getElementById('wr-pct-lbl');
  if (wrBar) { wrBar.style.width = Math.min(wr,100) + '%'; wrBar.style.background = wr >= 50 ? 'var(--g)' : 'var(--r)'; }
  if (wrLbl) { wrLbl.textContent = wr.toFixed(1) + '%'; wrLbl.style.color = wr >= 50 ? 'var(--g)' : 'var(--r)'; }
}

function renderGrowthChart(liveEq, btEq) {
  const liveNorm = liveEq.map(v => ((v - 10000) / 10000) * 100);
  const btNorm = btEq.length ? btEq.map((v,i,a) => ((v-a[0])/a[0])*100) : [];
  const maxLen = Math.max(liveNorm.length, btNorm.length, 2);
  const labels = Array.from({ length: maxLen }, (_, i) => i);

  if (grChart) grChart.destroy();
  grChart = new Chart(document.getElementById('gr-ch').getContext('2d'), {
    type: 'line',
    data: { labels, datasets: [
      { label: 'Live', data: liveNorm, borderColor: '#00e5b0', borderWidth: 2, fill: true, backgroundColor: 'rgba(0,229,176,.05)', pointRadius: 0, tension: 0.3 },
      { label: 'Backtest', data: btNorm, borderColor: '#a78bfa', borderWidth: 2, fill: false, pointRadius: 0, tension: 0.3, borderDash: [5, 3] }
    ]},
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { labels: { color: '#4d6e88', font: { family: 'JetBrains Mono', size: 10 } } }, tooltip: { backgroundColor: '#111a24', borderColor: '#1c2d3e', borderWidth: 1, callbacks: { label: c => c.dataset.label + ': ' + (c.raw >= 0 ? '+' : '') + c.raw.toFixed(2) + '%' } } },
      scales: { x: { display: false }, y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#4d6e88', font: { family: 'JetBrains Mono', size: 10 }, callback: v => v.toFixed(1) + '%' } } }
    }
  });
}

function renderDistChart(trades) {
  const wins = trades.filter(t => t.won).length;
  const losses = trades.length - wins;
  if (distChart) distChart.destroy();
  distChart = new Chart(document.getElementById('dist-ch').getContext('2d'), {
    type: 'bar',
    data: { labels: ['Wins', 'Losses'], datasets: [{ data: [wins, losses], backgroundColor: ['rgba(0,229,176,.7)', 'rgba(255,61,107,.7)'], borderColor: ['#00e5b0', '#ff3d6b'], borderWidth: 1, borderRadius: 6 }] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false }, ticks: { color: '#4d6e88', font: { family: 'JetBrains Mono', size: 12 } } }, y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#4d6e88', font: { family: 'JetBrains Mono', size: 10 }, stepSize: 1 } } }
    }
  });
}

function renderJournal(trades) {
  const tbody = document.getElementById('jnl-body');
  if (!trades.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--t3);padding:24px;">No trades yet. <a href="terminal.html" style="color:var(--g);">&#9658; Go to Terminal</a></td></tr>';
    return;
  }
  tbody.innerHTML = trades.slice().reverse().map((t, i) => {
    const ts = new Date(t.openTime);
    const isBuy = t.type === 'rise' || t.type === 'call';
    return `<tr>
      <td style="color:var(--t3);">${trades.length - i}</td>
      <td>${ts.toLocaleTimeString()}</td>
      <td>${t.asset}</td>
      <td style="color:${isBuy ? 'var(--g)' : 'var(--r)'};">${t.type.toUpperCase()}</td>
      <td>$${t.stake.toFixed(2)}</td>
      <td>${t.entry ? t.entry.toFixed(5) : '—'}</td>
      <td>${t.exit ? t.exit.toFixed(5) : '—'}</td>
      <td style="color:${t.pnl >= 0 ? 'var(--g)' : 'var(--r)'};">${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}</td>
      <td><span class="badge ${t.won ? 'bg' : 'br'}">${t.won ? 'WON' : 'LOST'}</span></td>
    </tr>`;
  }).join('');
}

function renderAffiliatePanel() {
  const panel = document.getElementById('affiliate-panel');
  if (!panel) return;
  panel.innerHTML = `
    <div class="d-ph" style="border-bottom:1px solid var(--border);">
      <span class="pt">Deriv Affiliate Commission</span>
      <span class="badge bg" style="margin-left:auto;">EARN PASSIVE INCOME</span>
    </div>
    <div style="padding:16px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:14px;">
        <div style="font-size:9px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--t3);margin-bottom:6px;">HOW IT WORKS</div>
        <div style="font-size:11px;color:var(--t1);line-height:1.65;">
          Every user who signs up to Deriv via your affiliate link earns you a <strong style="color:var(--g);">20–45% revenue share</strong> on all their trades — for life. Sign up free at <strong style="color:var(--g);">affiliates.deriv.com</strong>
        </div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:14px;">
        <div style="font-size:9px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--t3);margin-bottom:6px;">IB PROGRAM</div>
        <div style="font-size:11px;color:var(--t1);line-height:1.65;">
          The <strong style="color:var(--am);">Introducing Broker</strong> program pays you per trade placed — not just on deposits. Earn a fixed pip/spread commission every time a referred user trades through NexusFX.
        </div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:14px;">
        <div style="font-size:9px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--t3);margin-bottom:6px;">SETUP STEPS</div>
        <div style="font-size:10px;color:var(--t1);line-height:1.8;">
          1. Register at <span style="color:var(--g);">affiliates.deriv.com</span><br>
          2. Get your tracking link<br>
          3. Add it to <code style="color:var(--am);font-size:9px;">js/payment.js</code><br>
          4. Every user → your commission
        </div>
      </div>
    </div>
    <div style="padding:0 16px 14px;display:flex;gap:10px;">
      <a href="https://affiliates.deriv.com" target="_blank" style="padding:10px 20px;background:var(--g);color:#001f16;border-radius:7px;font-size:12px;font-weight:700;text-decoration:none;">Register as Affiliate ↗</a>
      <a href="https://deriv.com/partners/introducing-broker/" target="_blank" style="padding:10px 20px;background:var(--bg2);border:1px solid var(--border2);color:var(--t1);border-radius:7px;font-size:12px;font-weight:600;text-decoration:none;">IB Program Details ↗</a>
    </div>`;
}

function exportCSV() {
  if (!isPro()) {
    showUpgradeModal('CSV export is a Pro feature. Upgrade to download your complete trade journal.', 'csv');
    return;
  }
  const state = AppState.get();
  const trades = state.closedTrades || [];
  if (!trades.length) { alert('No trades to export yet.'); return; }
  const rows = ['#,Time,Asset,Direction,Stake,Entry,Exit,PnL,Status'];
  trades.forEach((t, i) => {
    rows.push([i+1, new Date(t.openTime).toISOString(), t.asset, t.type, t.stake.toFixed(2), t.entry ? t.entry.toFixed(5) : '', t.exit ? t.exit.toFixed(5) : '', t.pnl.toFixed(2), t.won ? 'WON' : 'LOST'].join(','));
  });
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'nexusfx_journal_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
}

function clearData() {
  if (!confirm('This will clear all trade history and reset your balance. Continue?')) return;
  const defaults = AppState.defaults();
  defaults.sessionStart = Date.now();
  AppState.set(defaults);
  location.reload();
}

window.addEventListener('load', () => {
  loadDashboard();
  setInterval(loadDashboard, 5000);
});
