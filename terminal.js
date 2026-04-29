/* =============================================
   NexusFX — Live Trading Terminal Logic
   (with Free/Pro plan gating)
   ============================================= */

let S = {
  auth: false, bal: 10000, asset: 'R_50', ot: 'rise',
  dur: { v: 5, u: 't' }, mart: false, stake: 10, tp: 50, sl: 30,
  price: 0, prev: 0, data: [],
  openTrades: [], closed: [], cnt: 0,
  tickInt: null, resolveInt: null, executingTrade: false
};
let mainChart = null, rsiChart = null;

function onConnect() {
  const state = AppState.get();
  S.auth = true; S.bal = state.bal || 10000;
  S.closed = state.closedTrades || [];
  setWsConnected(true);
  applyAssetRestrictions(document.getElementById("asset-sel"));
  applyMartingaleGate();
  initMainChart(); startFeed(); updSessStats();
  renderPlanBadge(); renderFreeLimitBanner();
  document.getElementById("ss-bal").textContent = "$" + S.bal.toFixed(2);
}

function applyMartingaleGate() {
  const lim = getPlanLimits();
  const row = document.querySelector(".tg-row");
  const martToggle = document.getElementById("mart-tg");
  if (!lim.martingale && row) {
    row.style.opacity = "0.5";
    row.style.cursor = "pointer";
    row.onclick = () => showUpgradeModal("Martingale mode requires a Pro plan.", "martingale");
    if (martToggle) martToggle.disabled = true;
    const lbl = row.querySelector(".tg-lbl");
    if (lbl) lbl.innerHTML = 'Martingale <span style="color:var(--am);font-size:9px;"> 🔒 Pro</span>';
  }
}

function initMainChart() {
  const a = ASSETS[S.asset];
  S.price = a.base * (0.99 + Math.random() * 0.02); S.prev = S.price; S.data = [];
  for (let i = 0; i < 80; i++) { S.price += S.price * (Math.random() - 0.499) * a.vol; S.data.push(parseFloat(S.price.toFixed(5))); }
  document.getElementById("ch-ticker").textContent = S.asset + " / USD";
  document.getElementById("live-p").textContent = S.data[S.data.length - 1].toFixed(5);
  const wrap = document.getElementById("main-ch-wrap");
  const mc = document.getElementById("main-ch");
  mc.width = wrap.offsetWidth; mc.height = wrap.offsetHeight || 350;
  const ctx = mc.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, mc.height);
  grad.addColorStop(0, "rgba(0,229,176,.12)"); grad.addColorStop(1, "rgba(0,229,176,.0)");
  if (mainChart) mainChart.destroy();
  mainChart = new Chart(ctx, {
    type: "line",
    data: { labels: S.data.map((_, i) => i), datasets: [{ data: S.data, borderColor: "#00e5b0", borderWidth: 1.5, fill: true, backgroundColor: grad, pointRadius: 0, tension: 0 }] },
    options: { responsive: false, animation: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { color: "#4d6e88", font: { family: "JetBrains Mono", size: 10 }, maxTicksLimit: 6 } } } }
  });
  const rsi = calcRSI(S.data, 14);
  const rc = document.getElementById("rsi-ch");
  rc.width = wrap.offsetWidth; rc.height = 110;
  if (rsiChart) rsiChart.destroy();
  rsiChart = new Chart(rc.getContext("2d"), {
    type: "line",
    data: { labels: rsi.map((_, i) => i), datasets: [
      { data: rsi, borderColor: "#a78bfa", borderWidth: 1.5, fill: false, pointRadius: 0, tension: 0 },
      { data: rsi.map(() => 70), borderColor: "rgba(255,61,107,.4)", borderWidth: 1, fill: false, pointRadius: 0, borderDash: [4, 3] },
      { data: rsi.map(() => 30), borderColor: "rgba(0,229,176,.4)", borderWidth: 1, fill: false, pointRadius: 0, borderDash: [4, 3] }
    ]},
    options: { responsive: false, animation: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { min: 0, max: 100, grid: { color: "rgba(255,255,255,.04)" }, ticks: { color: "#4d6e88", font: { family: "JetBrains Mono", size: 9 }, maxTicksLimit: 4 } } } }
  });
}

function startFeed() {
  if (S.tickInt) clearInterval(S.tickInt);
  if (S.resolveInt) clearInterval(S.resolveInt);
  S.tickInt = setInterval(() => {
    const a = ASSETS[S.asset];
    S.prev = S.price;
    S.price = parseFloat((S.price + S.price * (Math.random() - 0.499) * a.vol).toFixed(5));
    S.data.push(S.price); if (S.data.length > 80) S.data.shift();
    updChart(); updPriceDisplay(); updOpenPos();
  }, 850);
  S.resolveInt = setInterval(resolveExpired, 1000);
}

function updChart() {
  if (!mainChart) return;
  mainChart.data.labels = S.data.map((_, i) => i);
  mainChart.data.datasets[0].data = S.data;
  mainChart.update("none");
  const rsi = calcRSI(S.data, 14);
  const lr = parseFloat(rsi[rsi.length - 1].toFixed(1));
  document.getElementById("ind-rsi").textContent = "RSI: " + lr;
  document.getElementById("ind-rsi").className = "badge " + (lr > 70 ? "br" : lr < 30 ? "bg" : "bbl");
  if (rsiChart) { rsiChart.data.labels = rsi.map((_, i) => i); rsiChart.data.datasets[0].data = rsi; rsiChart.update("none"); }
  const bb = calcBB(S.data, 20, 2);
  const lbb = bb[bb.length - 1];
  let bblbl = "MID", bbcls = "bam";
  if (S.price > lbb.upper) { bblbl = "UPPER"; bbcls = "br"; }
  else if (S.price < lbb.lower) { bblbl = "LOWER"; bbcls = "bg"; }
  document.getElementById("ind-bb").textContent = "BB: " + bblbl;
  document.getElementById("ind-bb").className = "badge " + bbcls;
}

function updPriceDisplay() {
  const el = document.getElementById("live-p");
  el.textContent = S.price.toFixed(5);
  el.style.color = S.price >= S.prev ? "var(--g)" : "var(--r)";
  const diff = S.price - S.prev, pct = S.prev ? (diff / S.prev * 100) : 0;
  const sign = diff >= 0 ? "+" : "";
  const ch = document.getElementById("live-ch");
  ch.textContent = sign + diff.toFixed(5) + " (" + sign + pct.toFixed(3) + "%)";
  ch.style.color = diff >= 0 ? "var(--g)" : "var(--r)";
}

function setOT(t) {
  S.ot = t;
  ["rise","fall","call","put"].forEach(x => { const e = document.getElementById("ot-"+x); if(e) e.className="ot"; });
  const el = document.getElementById("ot-"+t);
  if (el) el.className = "ot " + (t==="rise"||t==="call" ? "on-g" : "on-r");
  const isBuy = t === "rise" || t === "call";
  const btn = document.getElementById("exec-btn");
  btn.textContent = isBuy ? "▶ EXECUTE TRADE (BUY)" : "▶ EXECUTE TRADE (SELL)";
  btn.style.background = isBuy ? "var(--g)" : "var(--r)";
  btn.style.color = isBuy ? "#001f16" : "#fff";
}

function setDur(v, u, el) {
  S.dur = { v, u };
  document.querySelectorAll(".chip").forEach(e => e.classList.remove("active"));
  el.classList.add("active");
}

function setTF(el) { document.querySelectorAll(".tf").forEach(e => e.classList.remove("active")); el.classList.add("active"); }

function onMart() {
  const lim = getPlanLimits();
  if (!lim.martingale) {
    document.getElementById("mart-tg").checked = false;
    showUpgradeModal("Martingale mode requires a Pro plan. Upgrade to enable automatic stake doubling on losses.", "martingale");
    return;
  }
  S.mart = document.getElementById("mart-tg").checked;
  document.getElementById("mart-opts").style.display = S.mart ? "block" : "none";
}

function onAssetChange() {
  const sel = document.getElementById("asset-sel");
  const lim = getPlanLimits();
  if (!lim.assets.includes(sel.value)) {
    showUpgradeModal("Additional assets (R_10, R_25, R_75, R_100) are available on the Pro plan. Free plan is limited to Volatility 50 (R_50).", "asset");
    sel.value = lim.assets[0]; return;
  }
  S.asset = sel.value;
  const a = ASSETS[S.asset];
  S.price = a.base * (0.99 + Math.random() * 0.02); S.prev = S.price; S.data = [];
  initMainChart();
}

function updRisk() {
  S.stake = parseFloat(document.getElementById("stake").value) || 10;
  S.tp = parseFloat(document.getElementById("tp").value) || 50;
  S.sl = parseFloat(document.getElementById("sl").value) || 30;
  const lim = getPlanLimits();
  const stakeEl = document.getElementById("stake");
  if (S.stake > lim.maxStake && !isPro()) {
    stakeEl.style.borderColor = "var(--r)";
    stakeEl.title = "Free plan max: $" + lim.maxStake;
  } else { stakeEl.style.borderColor = ""; }
  document.getElementById("rr").textContent = "1 : " + (S.tp/S.sl).toFixed(1);
  document.getElementById("mloss").textContent = "$" + S.sl.toFixed(2);
  document.getElementById("tprof").textContent = "$" + S.tp.toFixed(2);
  const pct = Math.min((S.sl/S.bal)*500, 90) || 20;
  const needle = document.getElementById("riskn");
  needle.style.left = pct + "%";
  needle.style.background = pct < 30 ? "var(--g)" : pct < 65 ? "var(--am)" : "var(--r)";
}

function execTrade() {
  if (!S.auth) { showAuth(); return; }
  if (S.executingTrade) return;
  if (S.bal < S.stake) { alert("Insufficient balance."); return; }
  const lim = getPlanLimits();
  if (S.stake > lim.maxStake) {
    showUpgradeModal(`Free plan max stake is $${lim.maxStake} per trade. Upgrade to Pro for stakes up to $50,000.`, "stake");
    return;
  }
  const gate = checkTradeAllowed(S.stake);
  if (!gate.allowed) {
    if (gate.type === "cooldown") { showCooldownToast(gate.countdown); }
    else { showUpgradeModal(gate.reason, gate.type); }
    return;
  }
  if (lim.executionDelay > 0) {
    S.executingTrade = true;
    const btn = document.getElementById("exec-btn");
    const orig = btn.textContent; btn.disabled = true; btn.textContent = "⏳ Free plan delay...";
    showExecutionCountdown(lim.executionDelay, () => {
      S.executingTrade = false; btn.disabled = false; btn.textContent = orig; doExec();
    });
  } else { doExec(); }
}

function doExec() {
  const durMs = S.dur.u==="t" ? S.dur.v*850 : S.dur.u==="m" ? S.dur.v*60000 : S.dur.v*3600000;
  const t = { id: ++S.cnt, asset: S.asset, type: S.ot, stake: S.stake, entry: S.price, openTime: Date.now(), durMs };
  S.openTrades.push(t); S.bal -= S.stake;
  incrementDailyTrades(); setLastTradeTime();
  updBal(); renderOpenPos(); renderFreeLimitBanner();
}

function showCooldownToast(ms) {
  const existing = document.getElementById("cd-toast"); if (existing) existing.remove();
  const t = document.createElement("div"); t.id = "cd-toast";
  t.style.cssText = "position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:8000;background:#18242f;border:1px solid rgba(255,184,0,.3);border-radius:8px;padding:10px 20px;font-family:'Space Grotesk',sans-serif;font-size:12px;color:#ffb800;font-weight:600;white-space:nowrap;";
  let rem = Math.ceil(ms / 1000);
  t.textContent = `⏱ Cooldown: ${rem}s — Upgrade to Pro for instant execution`;
  document.body.appendChild(t);
  const iv = setInterval(() => { rem--; if (t.parentNode) t.textContent = `⏱ Cooldown: ${rem}s — Upgrade to Pro for instant execution`; if (rem <= 0) { clearInterval(iv); if (t.parentNode) t.remove(); }}, 1000);
}

function resolveExpired() {
  const now = Date.now();
  S.openTrades = S.openTrades.filter(t => { if (now - t.openTime < t.durMs) return true; resolveTrade(t); return false; });
  renderOpenPos();
}

function resolveTrade(t) {
  const exit = S.price, move = (exit - t.entry) / t.entry;
  const isBuy = t.type === "rise" || t.type === "call";
  const won = (move > 0 && isBuy) || (move < 0 && !isBuy) || Math.random() > 0.48;
  const pnl = won ? t.stake * 0.85 : -t.stake;
  t.exit = exit; t.pnl = pnl; t.won = won; t.closeTime = Date.now();
  S.closed.push(t); S.bal = Math.max(0, S.bal + t.stake + pnl);
  const state = AppState.get();
  state.bal = S.bal; state.closedTrades = S.closed;
  state.liveEquity = (state.liveEquity || [10000]).concat([S.bal]);
  AppState.set(state);
  updBal(); addLogRow(t); updSessStats();
}

function closeAll() { S.openTrades.forEach(t => resolveTrade(t)); S.openTrades = []; renderOpenPos(); }

function updBal() { document.getElementById("ss-bal").textContent = "$" + S.bal.toFixed(2); updateBalBadge(S.bal); }

function updOpenPos() {
  const now = Date.now();
  S.openTrades.forEach(t => { const rem = Math.max(0, (t.durMs - (now - t.openTime)) / 1000); const el = document.getElementById("pos-" + t.id); if (el) el.querySelector(".pos-timer").textContent = rem.toFixed(1) + "s"; });
}

function renderOpenPos() {
  const p = document.getElementById("pos-panel");
  document.getElementById("open-ct").textContent = S.openTrades.length;
  if (!S.openTrades.length) { p.innerHTML = '<div style="color:var(--t3);font-size:11px;text-align:center;padding:20px 0;">No open positions</div>'; return; }
  p.innerHTML = S.openTrades.map(t => `<div id="pos-${t.id}" style="background:var(--bg2);border:1px solid var(--border);border-radius:5px;padding:7px 10px;margin-bottom:5px;"><div style="display:flex;justify-content:space-between;"><span style="font-size:11px;font-weight:700;color:${t.type==='rise'||t.type==='call'?'var(--g)':'var(--r)'}">${t.type.toUpperCase()}</span><span class="pos-timer" style="font-size:10px;color:var(--t2);font-family:var(--mono)">—</span></div><div style="font-size:10px;color:var(--t2);margin-top:2px;">${t.asset} • $${t.stake.toFixed(2)} • ${t.entry.toFixed(5)}</div></div>`).join("");
}

function addLogRow(t) {
  document.getElementById("log-ct").textContent = S.closed.length;
  const ts = new Date(t.openTime);
  const row = document.createElement("div"); row.className = "log-rw";
  row.innerHTML = `<div class="lc" style="color:var(--t2)">${ts.toTimeString().slice(0,8)}</div><div class="lc">${t.asset}</div><div class="lc" style="color:${t.type==='rise'||t.type==='call'?'var(--g)':'var(--r)'}">${t.type.toUpperCase()}</div><div class="lc">$${t.stake.toFixed(2)}</div><div class="lc"><span class="badge ${t.won?'bg':'br'}" style="font-size:10px;">${t.won?'WON':'LOST'}</span></div>`;
  const lb = document.getElementById("log-body"); lb.insertBefore(row, lb.firstChild);
}

function updSessStats() {
  const tr = S.closed; document.getElementById("ss-trades").textContent = tr.length;
  if (!tr.length) return;
  const wins = tr.filter(t => t.won).length, wr = ((wins/tr.length)*100).toFixed(1);
  const pnl = tr.reduce((a,t) => a+t.pnl, 0);
  const we = document.getElementById("ss-wr"); we.textContent = wr+"%"; we.style.color = parseFloat(wr)>=50?"var(--g)":"var(--r)";
  const pe = document.getElementById("ss-pnl"); pe.textContent = (pnl>=0?"+$":"-$")+Math.abs(pnl).toFixed(2); pe.style.color = pnl>=0?"var(--g)":"var(--r)";
}

window.addEventListener("load", () => {
  const state = AppState.get();
  if (state.auth) connectDemo(); else showAuth();
});
