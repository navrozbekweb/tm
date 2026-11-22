/* =====================================================================
   store.js — vazifalar, loyihalar va sozlamalar (localStorage)
   Har bir foydalanuvchi uchun ma'lumot alohida kalitda saqlanadi.
   ===================================================================== */
const Store = (function () {
  'use strict';

  /* Holatlar va ustuvorliklar: rangi Bootstrap rang nomlari (primary, success, ...) bilan mos */
  const STATUS = {
    todo:        { label: 'Qilish kerak', color: 'secondary', icon: 'bi-circle' },
    in_progress: { label: 'Jarayonda',    color: 'primary',   icon: 'bi-arrow-repeat' },
    review:      { label: 'Tekshiruvda',  color: 'warning',   icon: 'bi-eye' },
    done:        { label: 'Bajarildi',    color: 'success',   icon: 'bi-check-circle' }
  };
  const PRIORITY = {
    high:   { label: 'Yuqori', color: 'danger',  rank: 0, icon: 'bi-chevron-double-up' },
    medium: { label: 'Oʻrta',  color: 'warning', rank: 1, icon: 'bi-dash-lg' },
    low:    { label: 'Past',   color: 'success', rank: 2, icon: 'bi-chevron-double-down' }
  };
  const COVERS = ['cover-1.svg', 'cover-2.svg', 'cover-3.svg'];

  let dataKey = '';
  let data = null;
  const PREFS_KEY = 'tm-prefs';
  let prefs = { perPage: 8, view: 'table' };

  /* ---------- Sana yordamchilari ---------- */
  function dateKey(d) {                       // Date -> "2026-11-22"
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dayOffset(n) { const d = new Date(); d.setDate(d.getDate() + n); return dateKey(d); } // bugundan n kun
  function formatDate(s) { return s ? s.split('-').reverse().join('.') : 'Muddatsiz'; }           // "22.11.2026"

  function uid() {
    const a = crypto.getRandomValues(new Uint8Array(6));
    return Array.from(a, (x) => x.toString(16).padStart(2, '0')).join('');
  }

  /* ---------- Namunaviy ma'lumotlar (birinchi kirishda) ---------- */
  function seed(user) {
    const p1 = uid(), p2 = uid(), p3 = uid(), me = uid();
    const task = (title, description, project, status, priority, due) => ({
      id: uid(), title: title, description: description, status: status, priority: priority,
      dueDate: due === null ? null : dayOffset(due), projectId: project, assigneeId: me
    });
    return {
      members: [{ id: me, name: user.name }],
      projects: [
        { id: p1, name: 'Veb-sayt',    description: 'Yangi korporativ sayt' },
        { id: p2, name: 'Mobil ilova', description: 'iOS va Android ilovasi' },
        { id: p3, name: 'Marketing',   description: 'Reklama kampaniyasi' }
      ],
      tasks: [
        task('Bosh sahifa dizaynini yakunlash', 'Figma maketini Bootstrap grid asosida tayyorlash', p1, 'in_progress', 'high', 0),
        task('Navigatsiya menyusini qayta ishlash', 'Navbar va offcanvas menyu', p1, 'todo', 'medium', 3),
        task('Push-bildirishnomalarni ulash', 'Firebase orqali xabarnomalar', p2, 'review', 'high', -1),
        task('Login ekranini test qilish', 'Barcha qurilmalarda tekshirish', p2, 'done', 'low', -2),
        task('Hujjatlarni yangilash', '', p1, 'todo', 'low', null),
        task('Instagram uchun post tayyorlash', 'Haftalik kontent-reja boʻyicha', p3, 'todo', 'medium', 2),
        task('Reklama byudjetini hisoblash', 'Oylik xarajatlar jadvali', p3, 'in_progress', 'high', 5),
        task('Ilova ikonkasini yangilash', '1024x1024 PNG', p2, 'done', 'low', -4),
        task('SEO sozlamalarini tekshirish', 'Meta teglar va sitemap', p1, 'review', 'medium', 1),
        task('Mijozlar soʻrovnomasi', 'Google Forms orqali', p3, 'todo', 'low', 7),
        task('API hujjatlarini yozish', 'Swagger orqali', p2, 'in_progress', 'medium', 4),
        task('Xatoliklar roʻyxatini tozalash', 'Eski bug-larni yopish', p1, 'done', 'medium', -6)
      ]
    };
  }

  /* ---------- Yuklash / saqlash ---------- */
  function save() { try { localStorage.setItem(dataKey, JSON.stringify(data)); } catch (e) { /* ignore */ } }
  function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ } }

  function init(user) {
    dataKey = 'tm-data:' + user.email;
    try { data = JSON.parse(localStorage.getItem(dataKey)); } catch (e) { data = null; }
    if (!data || !Array.isArray(data.tasks)) { data = seed(user); save(); }
    try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS_KEY)) || {}); } catch (e) { /* ignore */ }
  }

  /* ---------- Vazifalar ---------- */
  const find = (id) => data.tasks.find((t) => t.id === id);
  const isLate = (t) => !!t.dueDate && t.status !== 'done' && t.dueDate < dayOffset(0);
  const projectName = (id) => { const p = data.projects.find((x) => x.id === id); return p ? p.name : '—'; };

  // Yangi vazifa qoʻshish yoki mavjudini yangilash (obj.id boʻlsa yangilaydi)
  function saveTask(obj) {
    const existing = obj.id ? find(obj.id) : null;
    if (existing) Object.assign(existing, obj);
    else data.tasks.unshift(Object.assign({ id: uid(), assigneeId: data.members[0].id }, obj));
    save();
  }
  function removeTask(id) { data.tasks = data.tasks.filter((t) => t.id !== id); save(); }
  function setStatus(id, status) { const t = find(id); if (t) { t.status = status; save(); } }
  function toggleDone(id) { const t = find(id); if (t) { t.status = t.status === 'done' ? 'todo' : 'done'; save(); } }

  /* ---------- Loyihalar ---------- */
  function addProject(name, description) { data.projects.push({ id: uid(), name: name, description: description || '' }); save(); }
  function removeProject(id) {
    data.projects = data.projects.filter((p) => p.id !== id);
    data.tasks.forEach((t) => { if (t.projectId === id) t.projectId = null; });
    save();
  }
  function reset(user) { data = seed(user); save(); }

  function countByStatus() {
    const c = { total: data.tasks.length, late: data.tasks.filter(isLate).length };
    Object.keys(STATUS).forEach((s) => { c[s] = data.tasks.filter((t) => t.status === s).length; });
    return c;
  }

  return {
    STATUS: STATUS, PRIORITY: PRIORITY, COVERS: COVERS,
    init: init, find: find, isLate: isLate, projectName: projectName,
    saveTask: saveTask, removeTask: removeTask, setStatus: setStatus, toggleDone: toggleDone,
    addProject: addProject, removeProject: removeProject, reset: reset, countByStatus: countByStatus,
    tasks: () => data.tasks, projects: () => data.projects,
    prefs: () => prefs, savePrefs: savePrefs,
    dateKey: dateKey, dayOffset: dayOffset, formatDate: formatDate
  };
})();
