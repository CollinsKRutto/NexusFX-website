/* =============================================
   NexusFX — Dashboard / Analytics Logic
   ============================================= */

let grChart = null, distChart = null;

/* ---- LOAD & RENDER ALL DATA ---- */
function loadDashboard() {
  const state = AppState.get();
  const trades = state.closedTrades || [];
  const liveEq = state.liveEquity || [10000];
  const btEq = state.btEquity || [];

  renderKPIs(trades, state.bal || 10000, state.sessionStart);
  renderGrowthChart(liveEq, btEq);
  renderDistChart(trades);
  renderJournal(trades);
}

/* ---- KPI CARDS ---- */
function renderKPIs(trades, bal, sessionStart) {
  // Balance
  const balEl = document.getElementById('d-bal');
  if (balEl) {
    balEl.textContent = '$' + bal.toFixed(2);
    balEl.style.color = bal >= 10000 ? 'var(--g)' : 'var(--r)';
  }

  // Session duration
  if (sessionStart) {
    const mins = Math.floor((Date.now() - sessionStart) / 60000);
    const durEl = document.getElementById('d-dur');
    const durSub = document.getElementById('d-dur-sub');
    if (durEl) durEl.textContent = mins < 60 ? mins + 'm' : Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
    if (durSub) durSub.textContent = 'Started ' + new Date(sessionStart).toLocaleTimeString();
  }

  if (!trades.length) return;

  const wins = trades.filter(t => t.won);
  const losses = trades.filter(t => !t.won);
  const totalPnl = trades.reduce((a, t) => a + t.pnl, 0);
  const wr = ((wins.length / trades.length) * 100);
  const gw = wins.reduce((a, t) => a + t.pnl, 0);
  const gl = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
  const pf = gl > 0 ? (gw / gl).toFixed(2) : '∞';
  const exp = (totalPnl / trades.length).toFixed(2);

  // Max drawdown from live equity
  const liveEq = AppState.get().liveEquity || [10000];
  let peak = 10000, mdd = 0;
  liveEq.forEach(v => { if (v > peak) peak = v; const dd = peak - v; if (dd > mdd) mdd = dd; });
  const mddPct = peak > 0 ? ((mdd / peak) * 100).toFixed(2) : '0.00';

  const best = Math.max(...trades.map(t => t.pnl));
  const worst = Math.min(...trades.map(t => t.pnl));

  // Update DOM
  const set = (id, val, color) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    if (color) el.style.color = color;
  };

  set('d-pnl', (totalPnl >= 0 ? '+$' : '-$') + Math.abs(totalPnl).toFixed(2), totalPnl >= 0 ? 'var(--g)' : 'var(--r)');
  set('d-wr', wr.toFixed(1) + '%', wr >= 50 ? 'var(--g)' : 'var(--r)');
  set('d-wr-s', wins.length + ' W / ' + losses.length + ' L');
  set('d-pf', pf, parseFloat(pf) >= 1 ? 'var(--g)' : 'var(--r)');
  set('d-mdd', mddPct + '%', 'var(--r)');
  set('d-exp', (parseFloat(exp) >= 0 ? '+$' : '-$') + Math.abs(parseFloat(exp)).toFixed(2), parseFloat(exp) >= 0 ? 'var(--g)' : 'var(--r)');
  set('d-tot', trades.length);
  set('d-tot-s', wins.length + ' Wins / ' + losses.length + ' Losses');
  set('d-best', '+$' + Math.abs(best).toFixed(2), 'var(--g)');
  set('d-worst', '-$' + Math.abs(Math.min(worst, 0)).toFixed(2), 'var(--r)');

  // Win rate bar
  const wrBar = document.getElementById('wr-bar');
  const wrLbl = document.getElementById('wr-pct-lbl');
  if (wrBar) { wrBar.style.width = Math.min(wr, 100) + '%'; wrBar.style.background = wr >= 50 ? 'var(--g)' : 'var(--r)'; }
  if (wrLbl) { wrLbl.textContent = wr.toFixed(1) + '%'; wrLbl.style.color = wr >= 50 ? 'var(--g)' : 'var(--r)'; }
}

/* ---- GROWTH CHART ---- */
function renderGrowthChart(liveEq, btEq) {
  const liveNorm = liveEq.map(v => ((v - 10000) / 10000) * 100);
  const btNorm = btEq.length ? btEq.map((v, i, a) => ((v - a[0]) / a[0]) * 100) : [];
  const maxLen = Math.max(liveNorm.length, btNorm.length, 2);
  const labels = Array.from({ length: maxLen }, (_, i) => i);

  if (grChart) grChart.destroy();
  grChart = new Chart(document.getElementById('gr-ch').getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Live', data: liveNorm,
          borderColor: '#00e5b0', borderWidth: 2,
          fill: true, backgroundColor: 'rgba(0,229,176,.05)',
          pointRadius: 0, tension: 0.3
        },
        {
          label: 'Backtest', data: btNorm,
          borderColor: '#a78bfa', borderWidth: 2,
          fill: false, pointRadius: 0, tension: 0.3, borderDash: [5, 3]
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: {
        legend: { labels: { color: '#4d6e88', font: { family: 'JetBrains Mono', size: 10 } } },
        tooltip: {
          backgroundColor: '#111a24', borderColor: '#1c2d3e', borderWidth: 1,
          callbacks: { label: c => c.dataset.label + ': ' + (c.raw >= 0 ? '+' : '') + c.raw.toFixed(2) + '%' }
        }
      },
      scales: {
        x: { display: false },
        y: {
          grid: { color: 'rgba(255,255,255,.04)' },
          ticks: { color: '#4d6e88', font: { family: 'JetBrains Mono', size: 10 }, callback: v => v.toFixed(1) + '%' }
        }
      }
    }
  });
}

/* ---- DISTRIBUTION CHART ---- */
function renderDistChart(trades) {
  const wins = trades.filter(t => t.won).length;
  const losses = trades.length - wins;

  if (distChart) distChart.destroy();
  distChart = new Chart(document.getElementById('dist-ch').getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Wins', 'Losses'],
      datasets: [{
        data: [wins, losses],
        backgroundColor: ['rgba(0,229,176,.7)', 'rgba(255,61,107,.7)'],
        borderColor: ['#00e5b0', '#ff3d6b'],
        borderWidth: 1, borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#4d6e88', font: { family: 'JetBrains Mono', size: 12 } } },
        y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#4d6e88', font: { family: 'JetBrains Mono', size: 10 }, stepSize: 1 } }
      }
    }
  });
}

/* ---- JOURNAL TABLE ---- */
function renderJournal(trades) {
  const tbody = document.getElementById('jnl-body');
  if (!trades.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No trades recorded yet.<br><a href="terminal.html">&#9658; Go to Live Terminal to start trading</a></td></tr>';
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

/* ---- EXPORT CSV ---- */
function exportCSV() {
  const state = AppState.get();
  const trades = state.closedTrades || [];
  if (!trades.length) { alert('No trades to export yet.'); return; }
  const rows = ['#,Time,Asset,Direction,Stake,Entry,Exit,PnL,Status'];
  trades.forEach((t, i) => {
    rows.push([
      i + 1,
      new Date(t.openTime).toISOString(),
      t.asset, t.type,
      t.stake.toFixed(2),
      t.entry ? t.entry.toFixed(5) : '',
      t.exit ? t.exit.toFixed(5) : '',
      t.pnl.toFixed(2),
      t.won ? 'WON' : 'LOST'
    ].join(','));
  });
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'nexusfx_journal_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
}

/* ---- CLEAR DATA ---- */
function clearData() {
  if (!confirm('This will clear all trade history and reset your balance. Continue?')) return;
  const defaults = AppState.defaults();
  defaults.sessionStart = Date.now();
  AppState.set(defaults);
  location.reload();
}

/* ---- INIT ---- */
window.addEventListener('load', () => {
  loadDashboard();
  // Auto-refresh every 5 seconds in case terminal is open in another tab
  setInterval(loadDashboard, 5000);
});
