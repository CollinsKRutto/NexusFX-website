/* =============================================
   NexusFX — Plan System & Feature Gating
   =============================================
   FREE tier:  live trading ON but throttled
   PRO tier:   full access
   ENTERPRISE: full access + extras
   ============================================= */

// ─── YOUR DERIV AFFILIATE TOKEN ──────────────────────────────
// Sign up at https://affiliates.deriv.com
// Replace this with your real affiliate token
const DERIV_AFFILIATE_TOKEN = "YOUR_AFFILIATE_TOKEN_HERE";
const DERIV_APP_ID = "1089"; // Replace with your registered App ID from api.deriv.com

// ─── PLAN DEFINITIONS ────────────────────────────────────────
const PLANS = {
  free: {
    name: "Free",
    price: 0,
    limits: {
      maxStake: 5,              // Max $5 stake per trade
      tradesPerDay: 10,         // Max 10 trades per day
      executionDelay: 3000,     // 3-second delay before execution (ms)
      assets: ["R_50"],         // Only Volatility 50
      btCandles: 500,           // Max 500 candles backtest
      strategies: ["rsi","bb"], // Only 2 strategies
      martingale: false,        // No martingale
      csvExport: false,         // No CSV export
      dashboard: "basic",       // Limited dashboard
      cooldownMs: 8000,         // 8s cooldown between trades
    }
  },
  pro: {
    name: "Pro Trader",
    price: 29,
    limits: {
      maxStake: 50000,
      tradesPerDay: 9999,
      executionDelay: 0,
      assets: ["R_10","R_25","R_50","R_75","R_100","1HZ10V"],
      btCandles: 5000,
      strategies: ["rsi","bb","macd","ema"],
      martingale: true,
      csvExport: true,
      dashboard: "full",
      cooldownMs: 0,
    }
  },
  enterprise: {
    name: "Enterprise",
    price: 99,
    limits: {
      maxStake: 50000,
      tradesPerDay: 9999,
      executionDelay: 0,
      assets: ["R_10","R_25","R_50","R_75","R_100","1HZ10V"],
      btCandles: 5000,
      strategies: ["rsi","bb","macd","ema"],
      martingale: true,
      csvExport: true,
      dashboard: "full",
      cooldownMs: 0,
    }
  }
};

// ─── PRO ACTIVATION KEYS (simple static unlock system) ───────
// In production: generate these with a script and distribute after payment
// Format: NXF-XXXX-XXXX-XXXX  (you generate and sell these)
// For demo: key NXF-PRO1-2026-DEMO unlocks Pro
const PRO_KEY_PREFIX = "NXF-PRO";
const ENT_KEY_PREFIX = "NXF-ENT";

function validateProKey(key) {
  if (!key) return null;
  const k = key.trim().toUpperCase();
  // In production replace with a real key list fetched from your payment system
  // For now: any key starting with NXF-PRO = Pro, NXF-ENT = Enterprise
  if (k.startsWith(ENT_KEY_PREFIX) && k.length >= 12) return "enterprise";
  if (k.startsWith(PRO_KEY_PREFIX) && k.length >= 12) return "pro";
  return null;
}

// ─── PLAN STATE ───────────────────────────────────────────────
function getCurrentPlan() {
  try {
    const saved = localStorage.getItem("nfx_plan");
    if (saved && PLANS[saved]) return saved;
  } catch(e) {}
  return "free";
}

function setPlan(planKey) {
  try { localStorage.setItem("nfx_plan", planKey); } catch(e) {}
}

function getPlanLimits() {
  return PLANS[getCurrentPlan()].limits;
}

function isPro() {
  return getCurrentPlan() === "pro" || getCurrentPlan() === "enterprise";
}

// ─── TRADE THROTTLE TRACKER ───────────────────────────────────
function getTodayTradeCount() {
  try {
    const data = JSON.parse(localStorage.getItem("nfx_daily") || "{}");
    const today = new Date().toDateString();
    return data.date === today ? (data.count || 0) : 0;
  } catch(e) { return 0; }
}

function incrementDailyTrades() {
  try {
    const today = new Date().toDateString();
    const count = getTodayTradeCount() + 1;
    localStorage.setItem("nfx_daily", JSON.stringify({ date: today, count }));
  } catch(e) {}
}

function getLastTradeTime() {
  try { return parseInt(localStorage.getItem("nfx_last_trade") || "0"); } catch(e) { return 0; }
}

function setLastTradeTime() {
  try { localStorage.setItem("nfx_last_trade", Date.now().toString()); } catch(e) {}
}

// ─── GATE CHECK ───────────────────────────────────────────────
// Returns { allowed: bool, reason: string, countdown: ms }
function checkTradeAllowed(stake) {
  const lim = getPlanLimits();
  const plan = getCurrentPlan();

  if (stake > lim.maxStake) {
    return { allowed: false, reason: `Free plan max stake is $${lim.maxStake}. Upgrade to Pro for stakes up to $50,000.`, type: "stake" };
  }

  const dailyCount = getTodayTradeCount();
  if (dailyCount >= lim.tradesPerDay) {
    return { allowed: false, reason: `You've used all ${lim.tradesPerDay} free trades today. Upgrade to Pro for unlimited trades.`, type: "daily" };
  }

  const cooldownRemaining = lim.cooldownMs - (Date.now() - getLastTradeTime());
  if (cooldownRemaining > 0) {
    return { allowed: false, reason: `Free plan cooldown: wait ${Math.ceil(cooldownRemaining/1000)}s between trades.`, type: "cooldown", countdown: cooldownRemaining };
  }

  return { allowed: true };
}

function checkStrategyAllowed(stratKey) {
  const lim = getPlanLimits();
  return lim.strategies.includes(stratKey);
}

function checkAssetAllowed(assetKey) {
  const lim = getPlanLimits();
  return lim.assets.includes(assetKey);
}

function checkBtCandlesAllowed(count) {
  const lim = getPlanLimits();
  return Math.min(count, lim.btCandles);
}

// ─── UPGRADE MODAL HTML ──────────────────────────────────────
function showUpgradeModal(reason, type) {
  const existing = document.getElementById("upgrade-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "upgrade-modal";
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(7,11,16,.92);
    display:flex;align-items:center;justify-content:center;
    z-index:9999;backdrop-filter:blur(6px);
  `;
  modal.innerHTML = `
    <div style="background:#0c1219;border:1px solid #243848;border-radius:14px;padding:36px 32px;width:420px;text-align:center;">
      <div style="font-size:32px;margin-bottom:12px;">🔒</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;color:#00e5b0;margin-bottom:8px;letter-spacing:1px;">PRO FEATURE</div>
      <div style="font-size:13px;color:#8aa8c2;line-height:1.7;margin-bottom:24px;">${reason}</div>

      <div style="background:#111a24;border:1px solid #1c2d3e;border-radius:10px;padding:16px;margin-bottom:20px;text-align:left;">
        <div style="font-size:10px;font-weight:700;color:#4d6e88;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">UNLOCK WITH PRO KEY</div>
        <input id="pro-key-input" type="text" placeholder="Enter your key: NXF-PRO-XXXX-XXXX" style="
          width:100%;background:#18242f;border:1px solid #1c2d3e;color:#e4eef8;
          padding:9px 12px;border-radius:6px;font-size:12px;font-family:'JetBrains Mono',monospace;
          outline:none;margin-bottom:8px;
        ">
        <button onclick="activateKey()" style="
          width:100%;padding:10px;background:#00e5b0;color:#001f16;
          border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;
        ">ACTIVATE KEY</button>
        <div id="key-error" style="font-size:10px;color:#ff3d6b;margin-top:6px;display:none;">Invalid key. Check your purchase confirmation email.</div>
      </div>

      <div style="font-size:11px;color:#4d6e88;margin-bottom:16px;">— or get a key instantly —</div>

      <a href="#pricing" onclick="document.getElementById('upgrade-modal').remove();window.location.href='../index.html#pricing';" style="
        display:block;padding:13px;background:linear-gradient(135deg,#00e5b0,#3b9eff);
        color:#001f16;border-radius:8px;font-size:13px;font-weight:700;
        text-decoration:none;margin-bottom:10px;
      ">&#9654; Upgrade to Pro — $29/mo</a>

      <button onclick="document.getElementById('upgrade-modal').remove()" style="
        width:100%;padding:10px;background:transparent;border:1px solid #243848;
        color:#4d6e88;border-radius:8px;font-size:12px;cursor:pointer;
      ">Continue on Free Plan</button>

      <div style="margin-top:16px;font-size:10px;color:#2a4560;">
        Pay via M-Pesa, Flutterwave, or PayPal → Receive activation key by email
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function activateKey() {
  const key = document.getElementById("pro-key-input").value;
  const plan = validateProKey(key);
  if (plan) {
    setPlan(plan);
    try { localStorage.setItem("nfx_key", key); } catch(e) {}
    document.getElementById("upgrade-modal").remove();
    showActivationSuccess(plan);
    setTimeout(() => location.reload(), 2000);
  } else {
    document.getElementById("key-error").style.display = "block";
  }
}

function showActivationSuccess(plan) {
  const toast = document.createElement("div");
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:#003d2e;border:1px solid #00e5b0;border-radius:10px;
    padding:16px 20px;font-family:'Space Grotesk',sans-serif;
    font-size:13px;color:#00e5b0;font-weight:600;
    box-shadow:0 8px 32px rgba(0,229,176,.15);
  `;
  toast.textContent = `✓ ${PLANS[plan].name} activated! Reloading...`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ─── FREE PLAN EXECUTION DELAY UI ────────────────────────────
function showExecutionCountdown(delayMs, onComplete) {
  const existing = document.getElementById("exec-countdown");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "exec-countdown";
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(7,11,16,.8);
    display:flex;align-items:center;justify-content:center;
    z-index:5000;backdrop-filter:blur(4px);
  `;

  let remaining = Math.ceil(delayMs / 1000);
  overlay.innerHTML = `
    <div style="text-align:center;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:72px;font-weight:700;color:#00e5b0;" id="cd-number">${remaining}</div>
      <div style="font-size:13px;color:#4d6e88;margin-top:8px;">Free plan: execution delay</div>
      <div style="font-size:11px;color:#2a4560;margin-top:4px;">Upgrade to Pro for instant execution</div>
    </div>
  `;
  document.body.appendChild(overlay);

  const interval = setInterval(() => {
    remaining--;
    const el = document.getElementById("cd-number");
    if (el) el.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(interval);
      overlay.remove();
      onComplete();
    }
  }, 1000);
}

// ─── FREE PLAN BADGE (shown in app bar) ──────────────────────
function renderPlanBadge() {
  const plan = getCurrentPlan();
  const el = document.getElementById("plan-badge");
  if (!el) return;
  if (plan === "free") {
    el.innerHTML = `<span style="background:rgba(255,184,0,.12);color:#ffb800;border:1px solid rgba(255,184,0,.2);padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;cursor:pointer;" onclick="showUpgradeModal('Unlock all features with a Pro key.','general')">FREE PLAN ↑ UPGRADE</span>`;
  } else if (plan === "pro") {
    el.innerHTML = `<span style="background:rgba(0,229,176,.12);color:#00e5b0;border:1px solid rgba(0,229,176,.2);padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;">PRO ✓</span>`;
  } else {
    el.innerHTML = `<span style="background:rgba(59,158,255,.12);color:#3b9eff;border:1px solid rgba(59,158,255,.2);padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;">ENTERPRISE ✓</span>`;
  }
}

// ─── FREE PLAN ASSET RESTRICTIONS (populate select) ──────────
function applyAssetRestrictions(selectEl) {
  if (!selectEl) return;
  const allowed = getPlanLimits().assets;
  Array.from(selectEl.options).forEach(opt => {
    if (!allowed.includes(opt.value)) {
      opt.text = opt.text + " 🔒 Pro";
      opt.disabled = true;
    }
  });
  // Make sure selected value is allowed
  if (!allowed.includes(selectEl.value)) {
    selectEl.value = allowed[0];
  }
}

// ─── DERIV AFFILIATE LINK BUILDER ────────────────────────────
// Appends your affiliate token to every Deriv OAuth and signup URL
function buildDerivOAuthURL(redirectUri) {
  const base = "https://oauth.deriv.com/oauth2/authorize";
  const params = new URLSearchParams({
    app_id: DERIV_APP_ID,
    scope: "read,trade,admin",
    redirect_uri: redirectUri || window.location.href,
  });
  // Affiliate token is passed via the signup URL separately
  return `${base}?${params.toString()}`;
}

function buildDerivSignupURL() {
  // This is your affiliate/IB referral link — users who sign up via this link
  // are tracked to your Deriv affiliate account and generate commission
  return `https://track.deriv.com/_YOURTRACKINGCODE_/1/`;
  // Replace _YOURTRACKINGCODE_ with your actual code from affiliates.deriv.com
}

// ─── FREE PLAN LIMIT BANNER ───────────────────────────────────
function renderFreeLimitBanner() {
  if (isPro()) return;
  const lim = getPlanLimits();
  const dailyUsed = getTodayTradeCount();
  const dailyLeft = lim.tradesPerDay - dailyUsed;

  const existing = document.getElementById("free-banner");
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.id = "free-banner";
  banner.style.cssText = `
    background:#18242f;border-bottom:1px solid rgba(255,184,0,.2);
    padding:6px 16px;display:flex;align-items:center;gap:12px;
    font-family:'Space Grotesk',sans-serif;font-size:11px;color:#4d6e88;
    flex-shrink:0;
  `;
  banner.innerHTML = `
    <span style="color:#ffb800;font-weight:700;">⚠ FREE PLAN</span>
    <span>Max stake: <strong style="color:#e4eef8;">$${lim.maxStake}</strong></span>
    <span>Trades today: <strong style="color:${dailyLeft <= 3 ? '#ff3d6b' : '#e4eef8'}">${dailyUsed}/${lim.tradesPerDay}</strong></span>
    <span>Execution delay: <strong style="color:#e4eef8;">${lim.executionDelay/1000}s</strong></span>
    <span>Asset: <strong style="color:#e4eef8;">R_50 only</strong></span>
    <span style="margin-left:auto;"><a href="#" onclick="showUpgradeModal('Unlock unlimited trades, all assets, and instant execution.','general');return false;" style="color:#00e5b0;font-weight:700;text-decoration:none;">↑ Upgrade to Pro</a></span>
  `;

  // Insert after app-bar
  const appBar = document.querySelector(".app-bar");
  if (appBar && appBar.nextSibling) {
    appBar.parentNode.insertBefore(banner, appBar.nextSibling);
  }
}
