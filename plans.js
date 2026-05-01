/* =============================================
   NexusFX — Plan System & Feature Gating
   =============================================
   DEMO:       Simulated $10,000, no real money,
               full access to all features to
               let people explore freely
   FREE:       Real Deriv account connected,
               $10 min / $50 max stake, live trading
               with some limits
   PRO:        Full access, $50,000 max stake
   ENTERPRISE: Everything + white-label + API
   ============================================= */

const DERIV_AFFILIATE_TOKEN = "YOUR_AFFILIATE_TOKEN_HERE";
const DERIV_APP_ID = "1089";

// ─── PLAN DEFINITIONS ─────────────────────────────────────────
const PLANS = {
  demo: {
    name: "Demo",
    price: 0,
    badge: "DEMO",
    badgeColor: "#a78bfa",
    limits: {
      maxStake: 10000,        // Simulated — no real money
      minStake: 0.35,
      tradesPerDay: 9999,     // Unlimited demo trades
      executionDelay: 0,      // Instant — demo should feel real
      assets: ["R_10","R_25","R_50","R_75","R_100","1HZ10V"],
      btCandles: 1000,        // 1,000 candle backtest in demo
      strategies: ["rsi","bb","macd","ema"], // All strategies in demo
      martingale: true,
      csvExport: false,       // Can't export — it's not real
      dashboard: "full",
      cooldownMs: 0,
      isDemo: true,           // Flag — no real money
    }
  },
  free: {
    name: "Free",
    price: 0,
    badge: "FREE",
    badgeColor: "#ffb800",
    limits: {
      maxStake: 50,           // Max $50 real stake
      minStake: 10,           // Min $10 real stake
      tradesPerDay: 20,       // 20 real trades per day
      executionDelay: 2000,   // 2-second delay
      assets: ["R_50"],       // R_50 only
      btCandles: 500,         // 500 candle backtest
      strategies: ["rsi","bb"], // 2 strategies only
      martingale: false,
      csvExport: false,
      dashboard: "basic",
      cooldownMs: 5000,       // 5s cooldown between trades
      isDemo: false,
    }
  },
  pro: {
    name: "Pro Trader",
    price: 29,
    badge: "PRO",
    badgeColor: "#00e5b0",
    limits: {
      maxStake: 50000,
      minStake: 0.35,
      tradesPerDay: 9999,
      executionDelay: 0,
      assets: ["R_10","R_25","R_50","R_75","R_100","1HZ10V"],
      btCandles: 5000,
      strategies: ["rsi","bb","macd","ema"],
      martingale: true,
      csvExport: true,
      dashboard: "full",
      cooldownMs: 0,
      isDemo: false,
    }
  },
  enterprise: {
    name: "Enterprise",
    price: 99,
    badge: "ENTERPRISE",
    badgeColor: "#3b9eff",
    limits: {
      maxStake: 50000,
      minStake: 0.35,
      tradesPerDay: 9999,
      executionDelay: 0,
      assets: ["R_10","R_25","R_50","R_75","R_100","1HZ10V"],
      btCandles: 5000,
      strategies: ["rsi","bb","macd","ema"],
      martingale: true,
      csvExport: true,
      dashboard: "full",
      cooldownMs: 0,
      isDemo: false,
    }
  }
};

// ─── KEY VALIDATION ───────────────────────────────────────────
const PRO_KEY_PREFIX = "NXF-PRO";
const ENT_KEY_PREFIX = "NXF-ENT";

function validateProKey(key) {
  if (!key) return null;
  const k = key.trim().toUpperCase();
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
  return "demo"; // Default is demo — always accessible
}

function setPlan(planKey) {
  try { localStorage.setItem("nfx_plan", planKey); } catch(e) {}
}

function getPlanLimits() {
  return PLANS[getCurrentPlan()].limits;
}

function isDemo() {
  return getCurrentPlan() === "demo";
}

function isPro() {
  return getCurrentPlan() === "pro" || getCurrentPlan() === "enterprise";
}

function isFree() {
  return getCurrentPlan() === "free";
}

// ─── DAILY TRADE TRACKER ──────────────────────────────────────
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
function checkTradeAllowed(stake) {
  const lim = getPlanLimits();

  if (stake > lim.maxStake) {
    return { allowed: false, reason: `${PLANS[getCurrentPlan()].name} plan max stake is $${lim.maxStake}. Upgrade for higher limits.`, type: "stake" };
  }

  if (!lim.isDemo && stake < lim.minStake) {
    return { allowed: false, reason: `${PLANS[getCurrentPlan()].name} plan minimum stake is $${lim.minStake}.`, type: "minstake" };
  }

  const dailyCount = getTodayTradeCount();
  if (dailyCount >= lim.tradesPerDay) {
    return { allowed: false, reason: `You've reached your ${lim.tradesPerDay} trade limit for today. Upgrade to Pro for unlimited trades.`, type: "daily" };
  }

  const cooldownRemaining = lim.cooldownMs - (Date.now() - getLastTradeTime());
  if (cooldownRemaining > 0) {
    return { allowed: false, reason: `Cooldown active. Wait ${Math.ceil(cooldownRemaining/1000)}s between trades.`, type: "cooldown", countdown: cooldownRemaining };
  }

  return { allowed: true };
}

function checkStrategyAllowed(stratKey) {
  return getPlanLimits().strategies.includes(stratKey);
}

function checkAssetAllowed(assetKey) {
  return getPlanLimits().assets.includes(assetKey);
}

function checkBtCandlesAllowed(count) {
  return Math.min(count, getPlanLimits().btCandles);
}

// ─── PLAN BADGE ───────────────────────────────────────────────
function renderPlanBadge() {
  const plan = getCurrentPlan();
  const p = PLANS[plan];
  const el = document.getElementById("plan-badge");
  if (!el) return;

  const isUpgradeable = plan === "demo" || plan === "free";
  el.innerHTML = `
    <span style="
      background:${p.badgeColor}18;color:${p.badgeColor};
      border:1px solid ${p.badgeColor}44;padding:3px 10px;border-radius:4px;
      font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;
      cursor:${isUpgradeable ? 'pointer' : 'default'};
    " ${isUpgradeable ? `onclick="showUpgradeModal('Unlock more features by upgrading your plan.','general')"` : ''}>
      ${p.badge}${isUpgradeable ? ' ↑' : ' ✓'}
    </span>`;
}

// ─── FREE PLAN BANNER ─────────────────────────────────────────
function renderFreeLimitBanner() {
  const plan = getCurrentPlan();
  if (plan === "pro" || plan === "enterprise") return;

  const lim = getPlanLimits();
  const dailyUsed = getTodayTradeCount();
  const dailyLeft = lim.tradesPerDay - dailyUsed;

  const existing = document.getElementById("free-banner");
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.id = "free-banner";
  banner.style.cssText = "background:#111a24;border-bottom:1px solid rgba(255,184,0,.15);padding:5px 16px;display:flex;align-items:center;gap:14px;font-family:'Space Grotesk',sans-serif;font-size:11px;color:#4d6e88;flex-shrink:0;";

  if (plan === "demo") {
    banner.innerHTML = `
      <span style="color:#a78bfa;font-weight:700;">DEMO MODE</span>
      <span>Simulated $10,000 balance — <strong style="color:#e4eef8;">no real money</strong></span>
      <span>All features unlocked for exploration</span>
      <span style="margin-left:auto;display:flex;gap:8px;">
        <a href="#" onclick="switchToFree();return false;" style="color:#ffb800;font-weight:700;text-decoration:none;">Connect Real Account (Free)</a>
        <span style="color:#2a4560;">|</span>
        <a href="#" onclick="showPaymentModal('pro');return false;" style="color:#00e5b0;font-weight:700;text-decoration:none;">↑ Upgrade to Pro</a>
      </span>`;
  } else {
    // Free plan banner
    banner.innerHTML = `
      <span style="color:#ffb800;font-weight:700;">FREE PLAN</span>
      <span>Stake: <strong style="color:#e4eef8;">$${lim.minStake}–$${lim.maxStake}</strong></span>
      <span>Trades today: <strong style="color:${dailyLeft <= 5 ? '#ff3d6b' : '#e4eef8'}">${dailyUsed}/${lim.tradesPerDay}</strong></span>
      <span>Asset: <strong style="color:#e4eef8;">R_50 only</strong></span>
      <span style="margin-left:auto;">
        <a href="#" onclick="showPaymentModal('pro');return false;" style="color:#00e5b0;font-weight:700;text-decoration:none;">↑ Upgrade to Pro — $29/mo</a>
      </span>`;
  }

  const appBar = document.querySelector(".app-bar");
  if (appBar && appBar.nextSibling) {
    appBar.parentNode.insertBefore(banner, appBar.nextSibling);
  }
}

// ─── SWITCH TO FREE (connect real account) ────────────────────
function switchToFree() {
  setPlan("free");
  // Show the auth overlay so they can connect their real Deriv account
  showAuth();
}

// ─── UPGRADE MODAL ────────────────────────────────────────────
function showUpgradeModal(reason, type) {
  const existing = document.getElementById("upgrade-modal");
  if (existing) existing.remove();

  const plan = getCurrentPlan();
  const nextPlan = plan === "demo" ? "free" : plan === "free" ? "pro" : "enterprise";

  const modal = document.createElement("div");
  modal.id = "upgrade-modal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(7,11,16,.92);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(6px);";
  modal.innerHTML = `
    <div style="background:#0c1219;border:1px solid #243848;border-radius:14px;padding:36px 32px;width:440px;text-align:center;font-family:'Space Grotesk',sans-serif;">
      <div style="font-size:28px;margin-bottom:10px;">🔒</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:#00e5b0;margin-bottom:8px;letter-spacing:1px;">UPGRADE REQUIRED</div>
      <div style="font-size:13px;color:#8aa8c2;line-height:1.7;margin-bottom:22px;">${reason}</div>

      ${plan === "demo" ? `
      <div style="background:#18242f;border:1px solid rgba(167,139,250,.2);border-radius:10px;padding:14px;margin-bottom:14px;text-align:left;">
        <div style="font-size:10px;font-weight:700;color:#a78bfa;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">CONNECT FREE ACCOUNT</div>
        <div style="font-size:11px;color:#8aa8c2;margin-bottom:10px;">Connect your real Deriv account for free live trading ($10–$50 stakes, R_50 only).</div>
        <button onclick="switchToFree()" style="width:100%;padding:10px;background:#a78bfa;color:#1a0030;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">Connect Real Account (Free)</button>
      </div>` : ""}

      <div style="background:#111a24;border:1px solid #1c2d3e;border-radius:10px;padding:14px;margin-bottom:14px;text-align:left;">
        <div style="font-size:10px;font-weight:700;color:#4d6e88;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">ENTER PRO ACTIVATION KEY</div>
        <input id="pro-key-input" type="text" placeholder="NXF-PRO-XXXX-XXXX" style="width:100%;background:#18242f;border:1px solid #1c2d3e;color:#e4eef8;padding:9px 12px;border-radius:6px;font-size:12px;font-family:'JetBrains Mono',monospace;outline:none;margin-bottom:8px;">
        <button onclick="activateKey()" style="width:100%;padding:10px;background:#00e5b0;color:#001f16;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">ACTIVATE KEY</button>
        <div id="key-error" style="font-size:10px;color:#ff3d6b;margin-top:6px;display:none;">Invalid key. Check your purchase confirmation email.</div>
      </div>

      <div style="font-size:11px;color:#4d6e88;margin-bottom:12px;">— or purchase a plan —</div>
      <button onclick="document.getElementById('upgrade-modal').remove();showPaymentModal('pro');" style="display:block;width:100%;padding:12px;background:linear-gradient(135deg,#00e5b0,#3b9eff);color:#001f16;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:8px;">&#9654; Get Pro — $29/mo</button>
      <button onclick="document.getElementById('upgrade-modal').remove();" style="width:100%;padding:10px;background:transparent;border:1px solid #243848;color:#4d6e88;border-radius:8px;font-size:12px;cursor:pointer;">Continue on ${PLANS[plan].name}</button>
      <div style="margin-top:14px;font-size:10px;color:#2a4560;">Pay via M-Pesa, Flutterwave, or PayPal → Key sent by email</div>
    </div>`;
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
  toast.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:9999;background:#003d2e;border:1px solid #00e5b0;border-radius:10px;padding:16px 20px;font-family:'Space Grotesk',sans-serif;font-size:13px;color:#00e5b0;font-weight:600;";
  toast.textContent = `✓ ${PLANS[plan].name} activated! Reloading...`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ─── EXECUTION DELAY COUNTDOWN ────────────────────────────────
function showExecutionCountdown(delayMs, onComplete) {
  const existing = document.getElementById("exec-countdown");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "exec-countdown";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(7,11,16,.8);display:flex;align-items:center;justify-content:center;z-index:5000;backdrop-filter:blur(4px);";
  let remaining = Math.ceil(delayMs / 1000);
  overlay.innerHTML = `
    <div style="text-align:center;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:72px;font-weight:700;color:#00e5b0;" id="cd-number">${remaining}</div>
      <div style="font-size:13px;color:#4d6e88;margin-top:8px;">Free plan execution delay</div>
      <div style="font-size:11px;color:#2a4560;margin-top:4px;">Upgrade to Pro for instant execution</div>
    </div>`;
  document.body.appendChild(overlay);
  const interval = setInterval(() => {
    remaining--;
    const el = document.getElementById("cd-number");
    if (el) el.textContent = remaining;
    if (remaining <= 0) { clearInterval(interval); overlay.remove(); onComplete(); }
  }, 1000);
}

// ─── ASSET RESTRICTIONS ───────────────────────────────────────
function applyAssetRestrictions(selectEl) {
  if (!selectEl) return;
  const allowed = getPlanLimits().assets;
  Array.from(selectEl.options).forEach(opt => {
    if (!allowed.includes(opt.value)) {
      opt.text = opt.text.replace(" 🔒 Pro","") + " 🔒 Pro";
      opt.disabled = true;
    } else {
      opt.text = opt.text.replace(" 🔒 Pro","");
      opt.disabled = false;
    }
  });
  if (!allowed.includes(selectEl.value)) selectEl.value = allowed[0];
}
