/* =============================================
   NexusFX — Landing Page JavaScript
   ============================================= */

/* ---- MOBILE NAV ---- */
function toggleMobileNav() {
  document.getElementById('mobile-nav').classList.toggle('open');
}
function closeMobileNav() {
  document.getElementById('mobile-nav').classList.remove('open');
}

/* ---- COUNTER ANIMATION ---- */
function animCount(el, target, suffix, dur) {
  let frame = 0, step = target / 60;
  const id = setInterval(() => {
    frame++;
    const val = Math.min(Math.floor(step * frame), target);
    el.textContent = val.toLocaleString() + suffix;
    if (frame >= 60) clearInterval(id);
  }, dur / 60);
}

/* ---- HERO CHART ---- */
let heroChart = null;
let heroPrice = 985.12;
let heroData = [];

function initHeroChart() {
  const canvas = document.getElementById('hero-chart');
  if (!canvas) return;
  for (let i = 0; i < 60; i++) {
    heroPrice += heroPrice * (Math.random() - 0.499) * 0.005;
    heroData.push(parseFloat(heroPrice.toFixed(5)));
  }
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 160);
  grad.addColorStop(0, 'rgba(0,229,176,.25)');
  grad.addColorStop(1, 'rgba(0,229,176,.0)');
  heroChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: heroData.map((_, i) => i),
      datasets: [{
        data: heroData,
        borderColor: '#00e5b0', borderWidth: 2,
        fill: true, backgroundColor: grad,
        pointRadius: 0, tension: 0.3
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });
}

function tickHeroChart() {
  heroPrice += heroPrice * (Math.random() - 0.499) * 0.005;
  heroData.push(parseFloat(heroPrice.toFixed(5)));
  if (heroData.length > 80) heroData.shift();
  if (!heroChart) return;
  heroChart.data.labels = heroData.map((_, i) => i);
  heroChart.data.datasets[0].data = heroData;
  heroChart.update('none');

  const priceEl = document.getElementById('hero-price');
  if (priceEl) priceEl.textContent = heroPrice.toFixed(3);

  // Random RSI simulation
  const rsi = Math.round(35 + Math.random() * 45);
  const hm1 = document.getElementById('hm1');
  if (hm1) {
    hm1.textContent = rsi.toFixed(1);
    hm1.style.color = rsi > 70 ? '#ff3d6b' : rsi < 30 ? '#00e5b0' : '#ffb800';
  }
  const signals = ['BUY', 'SELL', 'HOLD'];
  const sig = signals[Math.floor(Math.random() * 3)];
  const hm3 = document.getElementById('hm3');
  if (hm3) {
    hm3.textContent = sig;
    hm3.style.color = sig === 'BUY' ? '#00e5b0' : sig === 'SELL' ? '#ff3d6b' : '#ffb800';
  }
}

/* ---- SMOOTH SCROLL for anchor links ---- */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});

/* ---- INIT ---- */
window.addEventListener('load', () => {
  // Animate counters
  animCount(document.getElementById('hs-traders'), 12847, '', 1200);
  animCount(document.getElementById('hs-trades'), 384920, '', 1500);
  setTimeout(() => {
    const wr = document.getElementById('hs-wr');
    if (wr) wr.textContent = '61.4%';
  }, 1000);

  // Hero chart
  initHeroChart();
  setInterval(tickHeroChart, 900);

  // Nav active state on scroll
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 80) current = s.id; });
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  });
});

// Called by pricing buttons on homepage
function showPayModal(plan) {
  showPaymentModal(plan);
}
