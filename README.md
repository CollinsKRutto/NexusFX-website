# NexusFX — Deriv Trading Ecosystem

## ⚡ IMPORTANT: How to Upload to GitHub Pages

This ZIP uses a **flat file structure** — every file goes in the **root of your repository**.

### Upload Steps:
1. Extract the ZIP — you will see all files directly (no subfolders)
2. In your GitHub repo, click **Add file → Upload files**
3. Drag ALL files in at once (index.html, terminal.html, backtest.html, dashboard.html, all .css and .js files)
4. Commit to main branch
5. Go to **Settings → Pages → Source → Deploy from branch → main / (root)**
6. Your site is live at `https://YOUR-USERNAME.github.io/YOUR-REPO/`

### File List (all go in root):
```
index.html          ← Homepage
terminal.html       ← Live Trading Terminal
backtest.html       ← Backtesting Engine
dashboard.html      ← Analytics Dashboard
base.css            ← Shared styles
landing.css         ← Homepage styles
app.css             ← App styles
app-state.js        ← Shared state
plans.js            ← Plan gating + upgrade modals
payment.js          ← Payment links + affiliate config
indicators.js       ← RSI, BB, MACD calculations
landing.js          ← Hero chart, counters
terminal.js         ← Trading terminal logic
backtest.js         ← Backtesting engine
dashboard.js        ← Analytics + charts
README.md
```

## 🔧 Configure These 3 Things in payment.js:
1. `DERIV_APP_ID` — from https://api.deriv.com
2. `trackingLink` — from https://affiliates.deriv.com
3. `PAYMENT_LINKS` — your M-Pesa/Flutterwave/PayPal URLs

## 🌍 Hosting on TrueHost:
1. Upload ZIP to cPanel → File Manager → public_html
2. Extract the ZIP directly into public_html
3. Make sure index.html is at public_html/index.html (not in a subfolder)
4. Visit your domain ✓  No database needed.
