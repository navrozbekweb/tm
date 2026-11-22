/* =====================================================================
   auth.js — autentifikatsiya (roʻyxatdan oʻtish, kirish, sessiya, mavzu)
   Ma'lumotlar brauzerning localStorage / sessionStorage'ida saqlanadi.
   Parollar PBKDF2 (SHA-256) bilan heshlanadi — ochiq holda saqlanmaydi.
   ===================================================================== */
(function () {
  'use strict';

  const ACCOUNTS_KEY = 'tm-accounts';   // barcha hisoblar
  const SESSION_KEY  = 'tm-session';    // joriy sessiya (yorliq yopilsa oʻchadi)
  const LOCK_KEY     = 'tm-lock';       // koʻp xato urinishdan himoya
  const THEME_KEY    = 'tm-theme';
  const SESSION_TTL  = 8 * 60 * 60 * 1000; // 8 soat
  const MAX_ATTEMPTS = 5;
  const LOCK_MS      = 60 * 1000;          // 1 daqiqa
  const encoder = new TextEncoder();

  /* ---------- Yordamchi funksiyalar ---------- */
  const readJSON  = (storage, key) => { try { return JSON.parse(storage.getItem(key)); } catch (e) { return null; } };
  const normEmail = (e) => String(e || '').trim().toLowerCase();
  const toB64     = (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
  const fromB64   = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const isEmail   = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isStrong  = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

  function getAccounts() { const a = readJSON(localStorage, ACCOUNTS_KEY); return Array.isArray(a) ? a : []; }
  function saveAccounts(a) { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a)); }

  // Ikki satrni bir xil vaqtda solishtirish (timing-hujumdan himoya)
  function safeEqual(a, b) {
    if (a.length !== b.length) return false;
    let r = 0;
    for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return r === 0;
  }

  async function hashPassword(password, salt) {
    if (!window.crypto || !crypto.subtle) {
      throw new Error('Xavfsiz muhit kerak: sahifani Live Server yoki localhost orqali oching');
    }
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: 150000 }, key, 256);
    return toB64(bits);
  }

  function startSession(email) {
    const token = crypto.getRandomValues(new Uint8Array(16));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email: email, exp: Date.now() + SESSION_TTL, t: toB64(token) }));
  }

  /* ---------- Mavzu (light / dark) — Bootstrap 5.3 data-bs-theme ---------- */
  function applyTheme(theme) { document.documentElement.setAttribute('data-bs-theme', theme); }
  function currentTheme() { return document.documentElement.getAttribute('data-bs-theme') || 'light'; }
  try { applyTheme(localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'); } catch (e) { applyTheme('light'); }

  /* ---------- Ochiq API ---------- */
  const Auth = {
    // Joriy foydalanuvchi yoki null
    user() {
      const s = readJSON(sessionStorage, SESSION_KEY);
      if (!s || !s.email || s.exp < Date.now()) { sessionStorage.removeItem(SESSION_KEY); return null; }
      const acc = getAccounts().find((x) => x.email === s.email);
      if (!acc) { sessionStorage.removeItem(SESSION_KEY); return null; }
      return { name: acc.name, email: acc.email };
    },

    // Himoyalangan sahifalar uchun: kirmagan boʻlsa login'ga yuboradi
    guard() {
      const u = Auth.user();
      if (!u) { location.replace('login.html'); return null; }
      document.documentElement.style.visibility = 'visible';
      return u;
    },

    // Login/register sahifalari uchun: allaqachon kirgan boʻlsa dashboard'ga yuboradi
    guest() {
      if (Auth.user()) { location.replace('dashboard.html'); return false; }
      document.documentElement.style.visibility = 'visible';
      return true;
    },

    logout() { sessionStorage.removeItem(SESSION_KEY); location.replace('login.html'); },

    // Xato boʻlsa matn, muvaffaqiyatli boʻlsa null qaytaradi
    async register(name, email, password) {
      email = normEmail(email); name = String(name).trim();
      if (name.length < 2) return 'Ismni kiriting';
      if (!isEmail(email)) return 'Email manzili notoʻgʻri';
      if (!isStrong(password)) return 'Parol kamida 8 belgi, harf va raqamdan iborat boʻlsin';
      const accounts = getAccounts();
      if (accounts.some((x) => x.email === email)) return 'Bu email bilan hisob allaqachon mavjud';
      const salt = crypto.getRandomValues(new Uint8Array(16));
      accounts.push({ name: name, email: email, salt: toB64(salt), hash: await hashPassword(password, salt) });
      saveAccounts(accounts);
      startSession(email);
      return null;
    },

    async login(email, password) {
      const lock = readJSON(localStorage, LOCK_KEY) || { n: 0, until: 0 };
      if (lock.until > Date.now()) {
        return 'Koʻp urinish. ' + Math.ceil((lock.until - Date.now()) / 1000) + ' soniyadan keyin urinib koʻring';
      }
      email = normEmail(email);
      const acc = getAccounts().find((x) => x.email === email);
      // Foydalanuvchi mavjudligini bildirmaslik uchun har doim hesh hisoblanadi
      const salt = acc ? fromB64(acc.salt) : new Uint8Array(16);
      const hash = await hashPassword(String(password), salt);
      if (acc && safeEqual(hash, acc.hash)) { localStorage.removeItem(LOCK_KEY); startSession(email); return null; }
      lock.n++;
      if (lock.n >= MAX_ATTEMPTS) { lock.until = Date.now() + LOCK_MS; lock.n = 0; }
      localStorage.setItem(LOCK_KEY, JSON.stringify(lock));
      return 'Email yoki parol notoʻgʻri';
    },

    updateProfile(name, email) {
      const u = Auth.user(), newEmail = normEmail(email), accounts = getAccounts();
      if (!u) return 'Tizimga kirilmagan';
      if (String(name).trim().length < 2) return 'Ismni kiriting';
      if (!isEmail(newEmail)) return 'Email manzili notoʻgʻri';
      if (newEmail !== u.email && accounts.some((x) => x.email === newEmail)) return 'Bu email boshqa hisobda ishlatilgan';
      accounts.forEach((x) => { if (x.email === u.email) { x.name = String(name).trim(); x.email = newEmail; } });
      saveAccounts(accounts);
      if (newEmail !== u.email) {            // vazifalar ma'lumotini yangi email'ga koʻchirish
        const d = localStorage.getItem('tm-data:' + u.email);
        if (d) { localStorage.setItem('tm-data:' + newEmail, d); localStorage.removeItem('tm-data:' + u.email); }
      }
      startSession(newEmail);
      return null;
    },

    async changePassword(current, next) {
      const u = Auth.user();
      if (!u) return 'Tizimga kirilmagan';
      const accounts = getAccounts(), acc = accounts.find((y) => y.email === u.email);
      if (!safeEqual(await hashPassword(current, fromB64(acc.salt)), acc.hash)) return 'Joriy parol notoʻgʻri';
      if (!isStrong(next)) return 'Yangi parol kamida 8 belgi, harf va raqamdan iborat boʻlsin';
      const salt = crypto.getRandomValues(new Uint8Array(16));
      acc.salt = toB64(salt); acc.hash = await hashPassword(next, salt);
      saveAccounts(accounts);
      return null;
    },

    // Mavzu: setTheme('dark'|'light'), toggleTheme(), getTheme()
    getTheme: currentTheme,
    setTheme(theme) { applyTheme(theme); try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ } },
    toggleTheme() { const t = currentTheme() === 'dark' ? 'light' : 'dark'; Auth.setTheme(t); return t; },
    isStrong: isStrong
  };

  // Brauzerning "orqaga" tugmasi bilan keshdan ochilgan himoyalangan sahifani tekshirish
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && document.body && document.body.dataset.page && !Auth.user()) location.replace('login.html');
  });

  window.Auth = Auth;
})();
