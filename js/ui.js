/* =====================================================================
   ui.js — Bootstrap komponentalari bilan ishlash uchun umumiy yordamchilar:
   Toast, Modal (tasdiqlash), Tooltip, Popover, parolni koʻrsatish tugmasi.
   ===================================================================== */
const UI = (function () {
  'use strict';

  // Foydalanuvchi matnini HTML ichiga xavfsiz qoʻyish (XSS'dan himoya)
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- Toast (qalqib chiquvchi xabar) ---------- */
  function toast(message, type) {
    type = type || 'success';
    let box = document.getElementById('toastBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toastBox';
      box.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = 'toast align-items-center border-0 text-bg-' + type;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="d-flex"><div class="toast-body">' + esc(message) +
      '</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Yopish"></button></div>';
    box.appendChild(el);
    el.addEventListener('hidden.bs.toast', () => el.remove());
    new bootstrap.Toast(el, { delay: 2600 }).show();
  }

  /* ---------- Tasdiqlash oynasi (confirm() oʻrniga Bootstrap Modal) ---------- */
  function confirmDialog(message, okText) {
    return new Promise((resolve) => {
      const el = document.getElementById('confirmModal');
      const modal = bootstrap.Modal.getOrCreateInstance(el);
      let result = false;
      el.querySelector('.js-confirm-text').textContent = message;
      const ok = el.querySelector('.js-confirm-ok');
      ok.textContent = okText || 'Ha, oʻchirish';
      const onOk = () => { result = true; modal.hide(); };
      ok.addEventListener('click', onOk, { once: true });
      el.addEventListener('hidden.bs.modal', () => { ok.removeEventListener('click', onOk); resolve(result); }, { once: true });
      modal.show();
    });
  }

  /* ---------- Tooltip va Popover ---------- */
  // Ular avtomatik ishga tushmaydi — Bootstrap talabi. root ichidagilarni yoqamiz.
  function initTips(root) {
    root = root || document;
    root.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => bootstrap.Tooltip.getOrCreateInstance(el));
    root.querySelectorAll('[data-bs-toggle="popover"]').forEach((el) => bootstrap.Popover.getOrCreateInstance(el));
  }
  // Sahifa qayta chizilishidan oldin eskilarini yoʻq qilamiz (aks holda "osilib" qoladi).
  // Agar tooltip/popover hozir koʻrinib turgan boʻlsa — avval yopilishini (animatsiya) kutamiz,
  // aks holda Bootstrap yopilish tugagach oʻchirilgan obyektga murojaat qilib xato beradi.
  function disposeTips(root) {
    root.querySelectorAll('[data-bs-toggle="tooltip"], [data-bs-toggle="popover"]').forEach((el) => {
      const isTooltip = el.dataset.bsToggle === 'tooltip';
      const Component = isTooltip ? bootstrap.Tooltip : bootstrap.Popover;
      const instance = Component.getInstance(el);
      if (!instance) return;
      if (el.hasAttribute('aria-describedby')) {            // hozir koʻrinib turibdi
        el.addEventListener(isTooltip ? 'hidden.bs.tooltip' : 'hidden.bs.popover', () => instance.dispose(), { once: true });
        instance.hide();
      } else {
        instance.dispose();
      }
    });
  }

  /* ---------- Parolni koʻrsatish/yashirish tugmalari ----------
     <button data-toggle-password="#inputId"> koʻrinishida ishlatiladi */
  function initPasswordToggles() {
    document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = document.querySelector(btn.dataset.togglePassword);
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.innerHTML = '<i class="bi ' + (show ? 'bi-eye-slash' : 'bi-eye') + '"></i>';
        btn.setAttribute('aria-label', show ? 'Parolni yashirish' : 'Parolni koʻrsatish');
      });
    });
  }

  // Mavzu tugmasi ikonkasini holatga moslash
  function syncThemeIcons() {
    const dark = Auth.getTheme() === 'dark';
    document.querySelectorAll('.js-theme-icon').forEach((i) => { i.className = 'bi js-theme-icon ' + (dark ? 'bi-sun' : 'bi-moon-stars'); });
    const sw = document.getElementById('darkSwitch'); if (sw) sw.checked = dark;
  }

  return { esc: esc, toast: toast, confirm: confirmDialog, initTips: initTips, disposeTips: disposeTips,
           initPasswordToggles: initPasswordToggles, syncThemeIcons: syncThemeIcons };
})();
