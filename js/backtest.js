/* =============================================
   NexusFX — Backtesting Engine Logic
   ============================================= */

let currentStrat = 'rsi';
let eqChart = null, ddChart = null;

/* ---- STRATEGY SELECTOR ---- */
function selStrat(el, strat) {
  document.querySelectorAll('.so').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  currentStrat = strat;

  const paramMap = {
    rsi: `
      <div class="fg"><label class="fl">RSI Period</label><input type="number" class="fi" id="rsi-p" value="14" min="2" max="50"></div>
      <div class="fg"><label class="fl">Overbought Level</label><input type="number" class="fi" id="rsi-ob" value="70"></div>
      <div class="fg"><label class="fl">Oversold Level</label><input type="number" class="fi" id="rsi-os" value="30"></div>`,
    bb: `
      <div class="fg"><label class="fl">BB Period</label><input type="number" class="fi" id="bb-p" value="20"></div>
      <div class="fg"><label class="fl">Std Dev Multiplier</label><input type="number" class="fi" id="bb-s" value="2" step="0.1"></div>`,
    macd: `
      <div class="fg"><label class="fl">Fast EMA</label><input type="number" class="fi" id="mf" value="12"></div>
      <div class="fg"><label class="fl">Slow EMA</label><input type="number" class="fi" id="ms" value="26"></div>
      <div class="fg"><label class="fl">Signal Line</label><input type="number" class="fi" id="msig" value="9"></div>`,
    ema: `
      <div class="fg"><label class="fl">Fast EMA</label><input type="number" class="fi" id="ef" value="9"></div>
      <div class="fg"><label class="fl">Slow EMA</label><input type="number" class="fi" id="ews" value="21"></div>
      <div class="fg"><label class="fl">Filter EMA</label><input type="number" class="fi" id="efil" value="50"></div>`
  };
  document.getElementById('strat-params').innerHTML = paramMap[strat] || paramMap.rsi;
}

/* ---- RUN BACKTEST ---- */
function runBT() {
  const btn = document.getElementById('bt-run');
  btn.textContent = '⏳ Running...'; btn.disabled = true;
  document.getElementById('bt-prog').style.display = 'block';
  document.getElementById('bt-info').style.display = 'none';
  document.getElementById('bt-res').innerHTML = '<div style="color:var(--am);font-size:11px;text-align:center;padding-top:40px;line-height:1.8;">&#9654; Simulation running...<br><span style="color:var(--t2);font-size:10px;">Processing price data</span></div>';
  document.getElementById('bt-trade-pills').innerHTML = '';

  const pts = parseInt(document.getElementById('bt-pts').value) || 1000;
  const cap = parseFloat(document.getElementById('bt-cap').value) || 1000;
  const stk = parseFloat(document.getElementById('bt-stk').value) || 10;
  const sym = document.getElementById('bt-sym').value;

  // Generate price data
  const prices = genPrices(sym, pts);

  // Progress animation
  let pct = 0;
  const prog = setInterval(() => {
    pct = Math.min(pct + Math.random() * 20, 90);
    document.getElementById('bt-pct').textContent = Math.round(pct) + '%';
    document.getElementById('bt-pbar').style.width = pct + '%';
  }, 100);

  setTimeout(() => {
    clearInterval(prog);
    document.getElementById('bt-pct').textContent = '100%';
    document.getElementById('bt-pbar').style.width = '100%';

    const res = simStrategy(prices, currentStrat, cap, stk);

    // Save bt equity to shared state
    const state = AppState.get();
    state.btEquity = res.equity;
    AppState.set(state);

    renderBTResults(res);
    renderEqChart(res, prices, cap);
    renderTradePills(res.trades);

    btn.textContent = '▶ RUN BACKTEST'; btn.disabled = false;
    document.getElementById('bt-prog').style.display = 'none';
    document.getElementById('bt-info').style.display = 'block';
    document.getElementById('bt-info').innerHTML = `<div class="alert ${res.pf >= 1.2 ? 'al-g' : res.pf >= 1 ? 'al-am' : 'al-r'}" style="font-size:10px;">${res.pf >= 1.2 ? '✓ Positive edge detected. Consider live testing with small stakes.' : res.pf >= 1 ? '⚠ Marginal edge. Optimize parameters before going live.' : '✕ Negative edge. Do not trade this live — adjust strategy.'}</div>`;
  }, 1400);
}

/* ---- RENDER RESULTS ---- */
function renderBTResults(r) {
  const gc = r.totalPnl >= 0 ? 'var(--g)' : 'var(--r)';
  const wc = r.winRate >= 50 ? 'var(--g)' : 'var(--r)';
  document.getElementById('bt-res').innerHTML = `
    <div class="m-grid">
      <div class="mc">
        <div class="mc-l">Win Rate</div>
        <div class="mc-v" style="color:${wc}">${r.winRate.toFixed(1)}%</div>
        <div class="mc-s">${r.wins}W / ${r.losses}L</div>
      </div>
      <div class="mc">
        <div class="mc-l">Profit Factor</div>
        <div class="mc-v" style="color:var(--bl)">${r.pf}</div>
        <div class="mc-s">Gross W / Gross L</div>
      </div>
      <div class="mc">
        <div class="mc-l">Max Drawdown</div>
        <div class="mc-v" style="color:var(--r)">${r.mdd.toFixed(2)}%</div>
        <div class="mc-s">Peak to trough</div>
      </div>
      <div class="mc">
        <div class="mc-l">Expectancy</div>
        <div class="mc-v" style="color:${r.exp >= 0 ? 'var(--g)' : 'var(--r)'}">${r.exp >= 0 ? '+' : ''}$${r.exp.toFixed(2)}</div>
        <div class="mc-s">Avg P&L per trade</div>
      </div>
    </div>
    <hr class="hr">
    <div class="sec-lbl">Full Summary</div>
    <div class="sr"><span class="sl">Total Trades</span><span class="sv">${r.total}</span></div>
    <div class="sr"><span class="sl">Net P&L</span><span class="sv" style="color:${gc}">${r.totalPnl >= 0 ? '+' : ''}$${r.totalPnl.toFixed(2)}</span></div>
    <div class="sr"><span class="sl">Win Rate</span><span class="sv" style="color:${wc}">${r.winRate.toFixed(1)}%</span></div>
    <div style="margin:4px 0 10px;">
      <div class="pb2"><div class="pf2" style="width:${r.winRate}%;background:${wc}"></div></div>
    </div>
    <div class="sr"><span class="sl">Profit Factor</span><span class="sv" style="color:${r.pf >= 1 ? 'var(--g)' : 'var(--r)'}">${r.pf >= 1 ? '✓ ' : ''}${r.pf}</span></div>
    <div class="sr"><span class="sl">Max Drawdown</span><span class="sv" style="color:var(--r)">${r.mdd.toFixed(2)}%</span></div>
    <div class="sr"><span class="sl">Expectancy</span><span class="sv" style="color:${r.exp >= 0 ? 'var(--g)' : 'var(--r)'}">${r.exp >= 0 ? '+' : ''}$${Math.abs(r.exp).toFixed(2)}</span></div>
    <div class="sr"><span class="sl">Final Balance</span><span class="sv" style="color:${gc}">$${(r.equity[r.equity.length - 1] || 0).toFixed(2)}</span></div>
    <hr class="hr">
    <div class="sec-lbl">Win/Loss Breakdown</div>
    <div style="display:flex;gap:6px;margin-top:6px;">
      <div style="flex:${r.wins};background:rgba(0,229,176,.2);height:8px;border-radius:4px 0 0 4px;"></div>
      <div style="flex:${r.losses};background:rgba(255,61,107,.2);height:8px;border-radius:0 4px 4px 0;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:10px;font-family:var(--mono);">
      <span style="color:var(--g)">Wins: ${r.wins}</span>
      <span style="color:var(--r)">Losses: ${r.losses}</span>
    </div>`;
}

/* ---- EQUITY & DRAWDOWN CHARTS ---- */
function renderEqChart(res, prices, cap) {
  const eq = res.equity;
  const step = Math.max(1, Math.floor(eq.length / 120));
  const eqS = eq.filter((_, i) => i % step === 0);
  const bh = prices.filter((_, i) => i % step === 0).map(p => (p / prices[0]) * cap);
  const labels = eqS.map((_, i) => i);

  if (eqChart) eqChart.destroy();
  const eqCanvas = document.getElementById('eq-ch');
  eqChart = new Chart(eqCanvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Strategy', data: eqS, borderColor: '#00e5b0', borderWidth: 2, fill: true, backgroundColor: 'rgba(0,229,176,.06)', pointRadius: 0, tension: 0.3 },
        { label: 'Buy & Hold', data: bh, borderColor: '#3b9eff', borderWidth: 1.5, fill: false, pointRadius: 0, tension: 0.3, borderDash: [6, 3] }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111a24', borderColor: '#1c2d3e', borderWidth: 1, callbacks: { label: c => c.dataset.label + ': $' + c.raw.toFixed(2) } } },
      scales: {
        x: { display: false },
        y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#4d6e88', font: { family: 'JetBrains Mono', size: 10 }, callback: v => '$' + v.toFixed(0) } }
      }
    }
  });

  // Drawdown chart
  const ddData = []; let pk = cap;
  eq.forEach(v => { if (v > pk) pk = v; ddData.push(-((pk - v) / pk * 100)); });
  const ddS = ddData.filter((_, i) => i % step === 0);

  if (ddChart) ddChart.destroy();
  ddChart = new Chart(document.getElementById('dd-ch').getContext('2d'), {
    type: 'line',
    data: { labels, datasets: [{ data: ddS, borderColor: '#ff3d6b', borderWidth: 1.5, fill: true, backgroundColor: 'rgba(255,61,107,.08)', pointRadius: 0, tension: 0 }] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#4d6e88', font: { family: 'JetBrains Mono', size: 9 }, callback: v => v.toFixed(1) + '%' } }
      }
    }
  });
}

/* ---- TRADE PILLS ---- */
function renderTradePills(trades) {
  const container = document.getElementById('bt-trade-pills');
  const sample = trades.slice(0, 24);
  container.innerHTML = sample.map(t =>
    `<div style="width:10px;height:10px;border-radius:2px;background:${t.won ? 'rgba(0,229,176,.7)' : 'rgba(255,61,107,.7)'};title:'${t.won ? 'Win' : 'Loss'}'" title="${t.won ? 'Win +$' + t.pnl.toFixed(2) : 'Loss -$' + Math.abs(t.pnl).toFixed(2)}"></div>`
  ).join('') + (trades.length > 24 ? `<span style="font-size:10px;color:var(--t2);font-family:var(--mono);">+${trades.length - 24} more</span>` : '');
}

/* ---- RESET ---- */
function resetBT() {
  if (eqChart) { eqChart.destroy(); eqChart = null; }
  if (ddChart) { ddChart.destroy(); ddChart = null; }
  document.getElementById('bt-res').innerHTML = '<div style="color:var(--t3);font-size:11px;text-align:center;padding-top:50px;line-height:1.8;">Configure a strategy<br>and click<br><strong style="color:var(--am);">▶ RUN BACKTEST</strong><br>to see results</div>';
  document.getElementById('bt-trade-pills').innerHTML = '';
  document.getElementById('bt-info').innerHTML = '<div class="alert al-am" style="font-size:10px;">&#9432; Runs a full simulation on synthetic price data matching the volatility profile of the selected index. Up to 5,000 candles processed in under 2 seconds.</div>';
}

/* ---- INIT ---- */
window.addEventListener('load', () => {
  // No auth needed for backtester
});
