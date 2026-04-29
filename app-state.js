/* =============================================
   NexusFX — Shared App State
   ============================================= */

const ASSETS = {
  R_10:  { name: 'Volatility 10',       base: 74500, vol: 0.0008 },
  R_25:  { name: 'Volatility 25',       base: 3820,  vol: 0.003  },
  R_50:  { name: 'Volatility 50',       base: 985,   vol: 0.005  },
  R_75:  { name: 'Volatility 75',       base: 1247,  vol: 0.008  },
  R_100: { name: 'Volatility 100',      base: 6540,  vol: 0.012  }
};

// Persisted state via localStorage
const AppState = {
  _key: 'nfx_state',

  get() {
    try {
      const saved = localStorage.getItem(this._key);
      return saved ? JSON.parse(saved) : this.defaults();
    } catch (e) { return this.defaults(); }
  },

  set(data) {
    try { localStorage.setItem(this._key, JSON.stringify(data)); } catch (e) {}
  },

  defaults() {
    return {
      auth: false,
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
    try { const t = localStorage.getItem('nfx_t'); return t ? atob(t) : null; } catch (e) { return null; }
  },

  setToken(token) {
    try { localStorage.setItem('nfx_t', btoa(token)); } catch (e) {}
  },

  clearToken() {
    try { localStorage.removeItem('nfx_t'); } catch (e) {}
  }
};

// Auth helpers — shared by all app pages
function showAuth() { document.getElementById('auth-ov').style.display = 'flex'; }
function hideAuth() { document.getElementById('auth-ov').style.display = 'none'; }

function oauthLogin() {
  const url = `https://oauth.deriv.com/oauth2/authorize?app_id=1089&scope=read,trade&redirect_uri=${encodeURIComponent(location.href)}`;
  window.open(url, '_blank');
  hideAuth();
  connectDemo();
}

function connectToken() {
  const t = document.getElementById('api-tok').value.trim();
  if (!t) { alert('Please enter a valid Deriv API token.'); return; }
  AppState.setToken(t);
  hideAuth();
  connectDemo();
}

function connectDemo() {
  const state = AppState.get();
  state.auth = true;
  AppState.set(state);
  hideAuth();
  if (typeof onConnect === 'function') onConnect();
}

function setWsConnected(connected) {
  const pill = document.getElementById('ws-pill');
  const badge = document.getElementById('acct-badge');
  if (!pill || !badge) return;
  const state = AppState.get();
  if (connected) {
    pill.innerHTML = '<span class="dot dg dp"></span><span style="color:var(--g)">CONNECTED</span>';
    badge.textContent = 'DEMO • $' + state.bal.toFixed(2);
    badge.className = 'badge bg';
  } else {
    pill.innerHTML = '<span class="dot dr"></span><span style="color:var(--r)">DISCONNECTED</span>';
    badge.textContent = 'NOT CONNECTED';
    badge.className = 'badge bam';
  }
}

function updateBalBadge(bal) {
  const badge = document.getElementById('acct-badge');
  if (badge) badge.textContent = 'DEMO • $' + bal.toFixed(2);
}

// Generate synthetic price series for backtesting
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
