/* =====================================================================
   authpage.js — login.html va register.html uchun forma mantiqi.
   Bootstrap validatsiyasi: forma "was-validated" klassini olgach,
   noto'g'ri maydonlar avtomatik .invalid-feedback bilan ko'rsatiladi.
   ===================================================================== */
(function () {
  'use strict';
  if (!Auth.guest()) return;                                   // allaqachon kirgan boʻlsa — dashboard'ga

  const isRegister = document.body.dataset.page === 'register';
  const form = document.getElementById('authForm');
  const alertBox = document.getElementById('formAlert');
  const alertText = document.getElementById('formAlertText');
  const button = document.getElementById('submitBtn');
  const spinner = document.getElementById('spinner');

  // Mavzu tugmasi, tooltiplar, parolni koʻrsatish tugmasi
  document.querySelectorAll('.js-theme').forEach((b) => b.addEventListener('click', () => { Auth.toggleTheme(); UI.syncThemeIcons(); }));
  UI.syncThemeIcons();
  if (window.bootstrap) UI.initTips();
  UI.initPasswordToggles();

  // Roʻyxatdan oʻtishda parol kuchini koʻrsatish (Progress komponenti)
  if (isRegister) {
    const meter = document.getElementById('pwMeter');
    const text = document.getElementById('pwMeterText');
    form.elements.password.addEventListener('input', () => {
      const v = form.elements.password.value;
      const score = [v.length >= 8, /[A-Za-z]/.test(v) && /\d/.test(v), /[^A-Za-z0-9]/.test(v), v.length >= 12].filter(Boolean).length;
      const levels = [['0', 'bg-secondary', ''], ['25', 'bg-danger', 'Zaif'], ['50', 'bg-warning', 'Oʻrtacha'], ['75', 'bg-info', 'Yaxshi'], ['100', 'bg-success', 'Juda yaxshi']];
      const lv = levels[v ? score : 0];
      meter.style.width = lv[0] + '%';
      meter.className = 'progress-bar ' + lv[1];
      text.textContent = lv[2];
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.hidden = true;
    form.classList.add('was-validated');
    if (!form.checkValidity()) return;                         // Bootstrap xato xabarlarini koʻrsatadi

    button.disabled = true; spinner.hidden = false;            // yuklanmoqda holati
    const d = new FormData(form);
    let error;
    try {
      error = isRegister
        ? await Auth.register(d.get('name'), d.get('email'), d.get('password'))
        : await Auth.login(d.get('email'), d.get('password'));
    } catch (x) { error = x.message; }
    button.disabled = false; spinner.hidden = true;

    if (error) { alertText.textContent = error; alertBox.hidden = false; return; }
    location.replace('dashboard.html');
  });
})();
