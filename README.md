# NexusFX — Deriv Trading Ecosystem

Your ultimate partner in Deriv trading success. A complete web-based trading ecosystem powered by the Deriv API.

## 🚀 Live Demo
Visit: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

## 📁 File Structure
```
/
├── index.html              ← Homepage (GitHub Pages serves this automatically)
├── css/
│   ├── base.css            ← Shared variables, nav, footer, buttons
│   ├── landing.css         ← Homepage/landing page styles
│   └── app.css             ← Terminal, backtest, dashboard styles
├── js/
│   ├── landing.js          ← Hero chart, counters, mobile nav
│   ├── app-state.js        ← Shared state (localStorage) + auth helpers
│   ├── indicators.js       ← RSI, BB, EMA, MACD calculations
│   ├── terminal.js         ← Live trading terminal logic
│   ├── backtest.js         ← Backtesting engine logic
│   └── dashboard.js        ← Analytics dashboard + charts
└── pages/
    ├── terminal.html       ← Live Trading Terminal
    ├── backtest.html       ← Backtesting Engine
    └── dashboard.html      ← Analytics Dashboard
```

## 🛠 How to Host on GitHub Pages

1. Create a new GitHub repository (e.g. `nexusfx-website`)
2. Upload **all files and folders** maintaining the exact folder structure above
3. Go to **Settings → Pages**
4. Under **Source**, select `Deploy from a branch`
5. Choose **main** branch and **/ (root)** folder
6. Click **Save**
7. Your site will be live at `https://YOUR-USERNAME.github.io/nexusfx-website/`

> ⚠️ Make sure `index.html` is at the **root** of the repository — this is what GitHub Pages serves as the homepage.

## ✨ Features
- **Live Trading Terminal** — Real-time price feed, Rise/Fall & Call/Put contracts
- **Backtesting Engine** — 4 strategies, up to 5,000 candles, equity curve & drawdown
- **Analytics Dashboard** — Growth curve, trade journal, CSV export
- **Risk Management** — Stop loss, take profit, Martingale engine
- **Deriv OAuth 2.0** — Secure login or API token connection

## 🔌 Connecting to Real Deriv API
1. Register your app at https://api.deriv.com
2. Replace `app_id=1089` in `js/app-state.js` with your own App ID
3. Use the OAuth button on the terminal page or paste your API token

## ⚠️ Disclaimer
Not affiliated with Deriv Ltd. Trading involves significant risk of loss.
