/* =============================================
   NexusFX — Shared App State
   ============================================= */

const ASSETS = {
  R_10:   { name: 'Volatility 10',   base: 74500, vol: 0.0008 },
  R_25:   { name: 'Volatility 25',   base: 3820,  vol: 0.003  },
  R_50:   { name: 'Volatility 50',   base: 985,   vol: 0.005  },
  R_75:   { name: 'Volatility 75',   base: 1247,  vol: 0.008  },
  R_100:  { name: 'Volatility 100',  base: 6540,  vol: 0.012  },
  '1HZ10V':{ name: 'Vol 10 (1s)',    base: 74520, vol: 0.001  }
};

const AppState = {
  _key: 'nfx_state',

  get() {
    try {
      const saved = localStorage.getItem(this._key);
      return saved ? JSON.parse(saved) : this.defaults();
    } catch(e) { return this.defaults(); }
  },

  set(data) {
    try { localStorage.setItem(this._key, JSON.stringify(data)); } catch(e) {}
  },

  defaults() {
    return {
      auth: false,
      mode: 'demo',       // 'demo' | 'real'
      bal: 10000,
      startBal: 10000,
      asset: 'R_50',
      closedTrades: [],
      liveEquity: [10000],
      btEquity: [],
      sessionStart: Date.now()
    };
  },

  getToken() {
    try { const t = localStorage.getItem('nfx_t'); return t ? atob(t) : null; } catch(e) { return null; }
  },

  setToken(token) {
    try { localStorage.setItem('nfx_t', btoa(token)); } catch(e) {}
  },

  clearToken() {
    try { localStorage.removeItem('nfx_t'); } catch(e) {}
  }
};

/* ── AUTH OVERLAY HELPERS ── */
function showAuth() {
  const el = document.getElementById('auth-ov');
  if (el) el.style.display = 'flex';
}

function hideAuth() {
  const el = document.getElementById('auth-ov');
  if (el) el.style.display = 'none';
}

/* ── OAUTH — opens Deriv login, then starts as Free plan ── */
function oauthLogin() {
  const url = `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}&scope=read,trade&redirect_uri=${encodeURIComponent(location.href)}`;
  window.open(url, '_blank');
  hideAuth();
  // Set to free plan when connecting real account
  setPlan('free');
  _startSession('real');
}

/* ── API TOKEN ── */
function connectToken() {
  const t = document.getElementById('api-tok').value.trim();
  if (!t) { alert('Please enter a valid Deriv API token.'); return; }
  AppState.setToken(t);
  hideAuth();
  setPlan('free');
  _startSession('real');
}

/* ── DEMO — always works, no account needed ── */
function connectDemo() {
  hideAuth();
  setPlan('demo');
  _startSession('demo');
}

/* ── Internal session starter ── */
function _startSession(mode) {
  const state = AppState.get();
  state.auth = true;
  state.mode = mode;
  // Reset balance when switching modes
  if (mode === 'demo') {
    state.bal = 10000;
    state.startBal = 10000;
  }
  state.sessionStart = Date.now();
  AppState.set(state);
  if (typeof onConnect === 'function') onConnect();
}

/* ── WS STATUS BAR ── */
function setWsConnected(connected) {
  const pill  = document.getElementById('ws-pill');
  const badge = document.getElementById('acct-badge');
  if (!pill || !badge) return;
  const state = AppState.get();
  const plan  = getCurrentPlan();
  const label = plan === 'demo' ? 'DEMO' : (PLANS[plan] ? PLANS[plan].name.toUpperCase() : 'FREE');

  if (connected) {
    pill.innerHTML = '<span class="dot dg dp"></span><span style="color:var(--g)">CONNECTED</span>';
    badge.textContent = label + ' • $' + state.bal.toFixed(2);
    badge.className = 'badge bg';
  } else {
    pill.innerHTML = '<span class="dot dr"></span><span style="color:var(--r)">DISCONNECTED</span>';
    badge.textContent = 'NOT CONNECTED';
    badge.className = 'badge bam';
  }
}

function updateBalBadge(bal) {
  const badge = document.getElementById('acct-badge');
  if (!badge) return;
  const plan  = getCurrentPlan();
  const label = plan === 'demo' ? 'DEMO' : (PLANS[plan] ? PLANS[plan].name.toUpperCase() : 'FREE');
  badge.textContent = label + ' • $' + bal.toFixed(2);
}

/* ── PRICE GENERATOR ── */
function genPrices(asset, count) {
  const a = ASSETS[asset] || ASSETS.R_50;
  const prices = [];
  let p = a.base * (0.99 + Math.random() * 0.02);
  for (let i = 0; i < count; i++) {
    p += p * (Math.random() - 0.499) * a.vol;
    prices.push(parseFloat(p.toFixed(5)));
  }
  return prices;
}
