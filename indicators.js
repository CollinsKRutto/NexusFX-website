/* =============================================
   NexusFX — Technical Indicators Library
   Shared across terminal, backtest, dashboard
   ============================================= */

function calcRSI(prices, period = 14) {
  const rsi = new Array(prices.length).fill(50);
  if (prices.length < period + 1) return rsi;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let avgG = gains / period, avgL = losses / period;
  rsi[period] = 100 - (100 / (1 + (avgG / (avgL || 1))));
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    const g = d > 0 ? d : 0, l = d < 0 ? -d : 0;
    avgG = (avgG * (period - 1) + g) / period;
    avgL = (avgL * (period - 1) + l) / period;
    rsi[i] = 100 - (100 / (1 + (avgG / (avgL || 1))));
  }
  return rsi;
}

function calcBB(prices, period = 20, mult = 2) {
  return prices.map((_, i) => {
    if (i < period) return { mid: prices[i], upper: prices[i], lower: prices[i] };
    const sl = prices.slice(i - period, i);
    const mid = sl.reduce((a, b) => a + b, 0) / period;
    const std = Math.sqrt(sl.reduce((a, b) => a + (b - mid) ** 2, 0) / period);
    return { mid, upper: mid + mult * std, lower: mid - mult * std };
  });
}

function calcEMA(prices, period) {
  const k = 2 / (period + 1);
  const ema = new Array(prices.length).fill(0);
  ema[0] = prices[0];
  for (let i = 1; i < prices.length; i++) ema[i] = prices[i] * k + ema[i - 1] * (1 - k);
  return ema;
}

function calcMACD(prices, fast = 12, slow = 26, signal = 9) {
  const fastEMA = calcEMA(prices, fast);
  const slowEMA = calcEMA(prices, slow);
  const line = prices.map((_, i) => fastEMA[i] - slowEMA[i]);
  const signalLine = calcEMA(line, signal);
  const hist = line.map((v, i) => v - signalLine[i]);
  return { line, signal: signalLine, hist };
}

function computeMetrics(trades, equity, capital) {
  if (!trades.length) return { trades, equity, winRate: 0, pf: 0, mdd: 0, exp: 0, totalPnl: 0, total: 0, wins: 0, losses: 0 };
  const wins = trades.filter(t => t.won);
  const losses = trades.filter(t => !t.won);
  const wr = (wins.length / trades.length) * 100;
  const gw = wins.reduce((a, t) => a + t.pnl, 0);
  const gl = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
  const pf = gl > 0 ? gw / gl : 999;
  const totalPnl = trades.reduce((a, t) => a + t.pnl, 0);
  const exp = totalPnl / trades.length;
  let peak = capital, mdd = 0;
  equity.forEach(v => { if (v > peak) peak = v; const dd = peak - v; if (dd > mdd) mdd = dd; });
  const mddPct = peak > 0 ? (mdd / peak) * 100 : 0;
  return {
    trades, equity,
    winRate: parseFloat(wr.toFixed(2)),
    pf: parseFloat(pf.toFixed(2)),
    mdd: parseFloat(mddPct.toFixed(2)),
    exp: parseFloat(exp.toFixed(2)),
    totalPnl: parseFloat(totalPnl.toFixed(2)),
    total: trades.length,
    wins: wins.length,
    losses: losses.length
  };
}

// Simulate a strategy over price data
function simStrategy(prices, strat, capital, stake) {
  const trades = [];
  let equity = [capital], bal = capital;
  const rsi = calcRSI(prices, 14);
  const bb = calcBB(prices, 20, 2);
  const ema9 = calcEMA(prices, 9), ema21 = calcEMA(prices, 21);
  const macd = calcMACD(prices, 12, 26, 9);
  const start = 50;
  for (let i = start; i < prices.length - 1; i++) {
    let sig = null;
    if (strat === 'rsi') {
      if (rsi[i - 1] > 70 && rsi[i] <= 70) sig = 'sell';
      else if (rsi[i - 1] < 30 && rsi[i] >= 30) sig = 'buy';
    } else if (strat === 'bb') {
      if (prices[i] > bb[i].upper && prices[i - 1] <= bb[i - 1].upper) sig = 'sell';
      else if (prices[i] < bb[i].lower && prices[i - 1] >= bb[i - 1].lower) sig = 'buy';
    } else if (strat === 'macd') {
      if (macd.line[i - 1] < macd.signal[i - 1] && macd.line[i] >= macd.signal[i]) sig = 'buy';
      else if (macd.line[i - 1] > macd.signal[i - 1] && macd.line[i] <= macd.signal[i]) sig = 'sell';
    } else {
      if (ema9[i - 1] < ema21[i - 1] && ema9[i] >= ema21[i]) sig = 'buy';
      else if (ema9[i - 1] > ema21[i - 1] && ema9[i] <= ema21[i]) sig = 'sell';
    }
    if (sig && bal >= stake) {
      const nm = prices[i + 1] - prices[i];
      const won = (nm > 0 && sig === 'buy') || (nm < 0 && sig === 'sell');
      const pnl = won ? stake * 0.85 : -stake;
      bal += pnl;
      trades.push({ i, sig, won, pnl, entry: prices[i], exit: prices[i + 1] });
    }
    equity.push(bal);
  }
  return computeMetrics(trades, equity, capital);
}
