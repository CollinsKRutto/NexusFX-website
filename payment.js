/* =============================================
   NexusFX — Payment & Affiliate System
   =============================================
   How payments work (static site model):
   1. User clicks "Upgrade to Pro"
   2. Redirected to your payment page
      (Flutterwave / Gumroad / PayPal)
   3. After successful payment, customer
      receives a Pro activation key by email
   4. They enter the key in the upgrade modal
   5. Key unlocks Pro features via localStorage

   Deriv Affiliate Commission:
   - Sign up: https://affiliates.deriv.com
   - Every user who registers via your link
     earns you revenue share on their trades
   - IB Program pays per-trade commission
   ============================================= */

// ─── YOUR PAYMENT LINKS ──────────────────────────────────────
// Replace these with your actual payment page URLs
const PAYMENT_LINKS = {
  pro: {
    // Option 1: Flutterwave (best for Kenya/Africa - supports M-Pesa)
    flutterwave: "https://flutterwave.com/pay/YOUR_PRO_LINK",
    // Option 2: PayPal
    paypal: "https://paypal.me/YOURPAYPALID/29",
    // Option 3: Gumroad (simplest - auto-delivers key by email)
    gumroad: "https://YOUR_STORE.gumroad.com/l/nexusfx-pro",
    // Option 4: Stripe Checkout (most professional)
    stripe: "https://buy.stripe.com/YOUR_PRO_PRICE_LINK",
    // M-Pesa (via Flutterwave or IntaSend)
    mpesa: "https://intasend.com/pay/YOUR_MPESA_LINK",
  },
  enterprise: {
    flutterwave: "https://flutterwave.com/pay/YOUR_ENT_LINK",
    paypal: "https://paypal.me/YOURPAYPALID/99",
    gumroad: "https://YOUR_STORE.gumroad.com/l/nexusfx-enterprise",
    stripe: "https://buy.stripe.com/YOUR_ENT_PRICE_LINK",
    mpesa: "https://intasend.com/pay/YOUR_ENT_MPESA_LINK",
  }
};

// ─── DERIV AFFILIATE CONFIG ───────────────────────────────────
// How to set up:
// 1. Go to https://affiliates.deriv.com and create account
// 2. Apply for the IB (Introducing Broker) program
// 3. Get your tracking link (looks like: https://track.deriv.com/_ABC123_/1/)
// 4. Replace the values below with your real codes
const AFFILIATE_CONFIG = {
  trackingLink: "https://track.deriv.com/_YOUR_CODE_/1/",
  // Your affiliate token - appended to OAuth URL so Deriv tracks signups
  affiliateToken: "YOUR_AFFILIATE_TOKEN",
  // IB commission rate (informational only - Deriv pays you directly)
  // Typically: 20-45% revenue share OR $0.50-$2.00 per trade
  commissionType: "revenue_share", // "revenue_share" or "per_trade"
  commissionRate: "30%",
};

// ─── PAYMENT MODAL ────────────────────────────────────────────
function showPaymentModal(plan) {
  const existing = document.getElementById("payment-modal");
  if (existing) existing.remove();

  const p = PLANS[plan];
  const links = PAYMENT_LINKS[plan];

  const modal = document.createElement("div");
  modal.id = "payment-modal";
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(7,11,16,.95);
    display:flex;align-items:center;justify-content:center;
    z-index:9999;backdrop-filter:blur(8px);
  `;

  modal.innerHTML = `
    <div style="background:#0c1219;border:1px solid #243848;border-radius:16px;
                padding:36px 32px;width:460px;font-family:'Space Grotesk',sans-serif;">

      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:#00e5b0;letter-spacing:2px;">
          UPGRADE TO ${p.name.toUpperCase()}
        </div>
        <div style="font-size:36px;font-weight:700;color:#e4eef8;margin:8px 0 4px;">
          $${p.price}<span style="font-size:16px;color:#4d6e88;">/month</span>
        </div>
        <div style="font-size:11px;color:#4d6e88;">Pay once → receive activation key by email → enter key below</div>
      </div>

      <!-- PAYMENT OPTIONS -->
      <div style="margin-bottom:20px;">
        <div style="font-size:10px;font-weight:700;color:#4d6e88;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">
          CHOOSE PAYMENT METHOD
        </div>

        <a href="${links.mpesa}" target="_blank" onclick="rememberPaymentAttempt('${plan}')" style="
          display:flex;align-items:center;gap:12px;
          background:#18242f;border:1px solid #1c2d3e;border-radius:8px;
          padding:12px 14px;margin-bottom:8px;text-decoration:none;
          transition:border-color .15s;
        " onmouseover="this.style.borderColor='#00e5b0'" onmouseout="this.style.borderColor='#1c2d3e'">
          <div style="width:32px;height:32px;background:#00c264;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:white;flex-shrink:0;">M</div>
          <div>
            <div style="font-size:12px;font-weight:700;color:#e4eef8;">M-Pesa / Mobile Money</div>
            <div style="font-size:10px;color:#4d6e88;">Via IntaSend — KSh, UGX, TZS supported</div>
          </div>
          <div style="margin-left:auto;font-size:10px;color:#00e5b0;font-weight:700;">POPULAR ↗</div>
        </a>

        <a href="${links.flutterwave}" target="_blank" onclick="rememberPaymentAttempt('${plan}')" style="
          display:flex;align-items:center;gap:12px;
          background:#18242f;border:1px solid #1c2d3e;border-radius:8px;
          padding:12px 14px;margin-bottom:8px;text-decoration:none;
        " onmouseover="this.style.borderColor='#ffb800'" onmouseout="this.style.borderColor='#1c2d3e'">
          <div style="width:32px;height:32px;background:#ffb800;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#1a0a00;flex-shrink:0;">FLW</div>
          <div>
            <div style="font-size:12px;font-weight:700;color:#e4eef8;">Flutterwave</div>
            <div style="font-size:10px;color:#4d6e88;">Card, bank transfer, mobile money — Africa-wide</div>
          </div>
          <div style="margin-left:auto;font-size:10px;color:#ffb800;font-weight:700;">↗</div>
        </a>

        <a href="${links.paypal}" target="_blank" onclick="rememberPaymentAttempt('${plan}')" style="
          display:flex;align-items:center;gap:12px;
          background:#18242f;border:1px solid #1c2d3e;border-radius:8px;
          padding:12px 14px;margin-bottom:8px;text-decoration:none;
        " onmouseover="this.style.borderColor='#3b9eff'" onmouseout="this.style.borderColor='#1c2d3e'">
          <div style="width:32px;height:32px;background:#003087;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#009cde;flex-shrink:0;">PP</div>
          <div>
            <div style="font-size:12px;font-weight:700;color:#e4eef8;">PayPal</div>
            <div style="font-size:10px;color:#4d6e88;">International cards and PayPal balance</div>
          </div>
          <div style="margin-left:auto;font-size:10px;color:#3b9eff;font-weight:700;">↗</div>
        </a>
      </div>

      <!-- KEY ENTRY -->
      <div style="background:#111a24;border:1px solid #1c2d3e;border-radius:10px;padding:16px;margin-bottom:16px;">
        <div style="font-size:10px;font-weight:700;color:#4d6e88;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">
          ALREADY PAID? ENTER YOUR KEY
        </div>
        <input id="pay-key-input" type="text" placeholder="NXF-PRO-XXXX-XXXX" style="
          width:100%;background:#18242f;border:1px solid #1c2d3e;color:#e4eef8;
          padding:9px 12px;border-radius:6px;font-size:12px;
          font-family:'JetBrains Mono',monospace;outline:none;margin-bottom:8px;
        ">
        <button onclick="activateKeyFromPayment()" style="
          width:100%;padding:10px;background:#00e5b0;color:#001f16;
          border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;
        ">ACTIVATE KEY</button>
        <div id="pay-key-error" style="font-size:10px;color:#ff3d6b;margin-top:6px;display:none;">
          Invalid key. Check your email — key arrives within 5 minutes of payment.
        </div>
      </div>

      <div style="font-size:10px;color:#2a4560;text-align:center;margin-bottom:14px;">
        After payment: key delivered to your email within 5 minutes.<br>
        Support: <strong style="color:#4d6e88;">support@nexusfx.io</strong>
      </div>

      <button onclick="document.getElementById('payment-modal').remove()" style="
        width:100%;padding:10px;background:transparent;border:1px solid #243848;
        color:#4d6e88;border-radius:8px;font-size:12px;cursor:pointer;
      ">Cancel</button>
    </div>
  `;

  document.body.appendChild(modal);
}

function rememberPaymentAttempt(plan) {
  try { localStorage.setItem("nfx_payment_attempt", JSON.stringify({ plan, time: Date.now() })); } catch(e) {}
}

function activateKeyFromPayment() {
  const key = document.getElementById("pay-key-input").value;
  const plan = validateProKey(key);
  if (plan) {
    setPlan(plan);
    try { localStorage.setItem("nfx_key", key); } catch(e) {}
    document.getElementById("payment-modal").remove();
    showActivationSuccess(plan);
    setTimeout(() => location.reload(), 2000);
  } else {
    document.getElementById("pay-key-error").style.display = "block";
  }
}

// ─── DERIV AFFILIATE SIGNUP PROMPT ───────────────────────────
// Shown to new users who don't have a Deriv account yet
function showDerivSignupPrompt() {
  const toast = document.createElement("div");
  toast.style.cssText = `
    position:fixed;bottom:24px;left:24px;z-index:8000;
    background:#0c1219;border:1px solid #1c2d3e;border-radius:12px;
    padding:16px 18px;width:300px;font-family:'Space Grotesk',sans-serif;
    box-shadow:0 8px 32px rgba(0,0,0,.4);
  `;
  toast.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
      <div style="font-size:20px;">🎯</div>
      <div>
        <div style="font-size:12px;font-weight:700;color:#e4eef8;margin-bottom:3px;">Don't have a Deriv account?</div>
        <div style="font-size:11px;color:#4d6e88;line-height:1.5;">Create one free and get a $10,000 demo account instantly.</div>
      </div>
    </div>
    <a href="${AFFILIATE_CONFIG.trackingLink}" target="_blank" style="
      display:block;padding:10px;background:#00e5b0;color:#001f16;
      border-radius:7px;font-size:12px;font-weight:700;text-decoration:none;
      text-align:center;margin-bottom:8px;
    ">Create Free Deriv Account ↗</a>
    <button onclick="this.parentElement.remove()" style="
      width:100%;padding:6px;background:transparent;border:none;
      color:#2a4560;font-size:11px;cursor:pointer;
    ">No thanks</button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 15000);
}

// Show signup prompt to first-time visitors
window.addEventListener("load", () => {
  try {
    const seen = localStorage.getItem("nfx_deriv_prompt");
    if (!seen) {
      setTimeout(showDerivSignupPrompt, 5000);
      localStorage.setItem("nfx_deriv_prompt", "1");
    }
  } catch(e) {}
});
