/* landing.js — bosh sahifa (index.html): mavzu tugmasi va tooltip/popover'larni yoqish */
(function () {
  'use strict';
  document.documentElement.style.visibility = 'visible';
  document.querySelectorAll('.js-theme').forEach((b) => b.addEventListener('click', () => { Auth.toggleTheme(); UI.syncThemeIcons(); }));
  UI.syncThemeIcons();
  if (window.bootstrap) UI.initTips();          // tooltip va popover'lar qoʻlda yoqiladi (Bootstrap talabi)
})();
