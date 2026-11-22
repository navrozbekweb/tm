/* =====================================================================
   app.js — himoyalangan sahifalar (dashboard, tasks, kanban, calendar,
   projects, settings) uchun asosiy mantiq.

   Tuzilma:
     1. Boshlangʻich sozlash (foydalanuvchi, holat, umumiy elementlar)
     2. Kichik HTML yasovchi funksiyalar (badge, menyu, qator ...)
     3. Oyna (modal) formalari: vazifa va loyiha
     4. Har bir sahifani chizuvchi funksiyalar (pages obyekti)
     5. Hodisalar (click, change, drag & drop)
   Sahifaning statik qismi (navbar, sidebar, panellar) HTML faylda yozilgan;
   bu yerda faqat ma'lumotga bogʻliq qismlar chiziladi.
   ===================================================================== */
(function () {
  'use strict';

  /* ================= 1. Boshlangʻich sozlash ================= */
  const user = Auth.guard();                 // kirmagan boʻlsa login sahifasiga yuboradi
  if (!user) return;

  if (!window.bootstrap) {                   // CDN ochilmasa — foydalanuvchiga tushuntiramiz
    document.body.insertAdjacentHTML('afterbegin',
      '<div class="alert alert-danger m-3" role="alert"><i class="bi bi-wifi-off me-2"></i>' +
      'Bootstrap yuklanmadi. Internet aloqasini tekshirib, sahifani yangilang.</div>');
    return;
  }

  Store.init(user);
  const page = document.body.dataset.page;
  const { STATUS, PRIORITY } = Store;
  const esc = UI.esc;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
  const SORTS = {
    due: 'Muddat boʻyicha', priority: 'Ustuvorlik boʻyicha', title: 'Nomi boʻyicha', status: 'Holat boʻyicha'
  };

  // Sahifaning joriy holati (filtrlar, sahifa raqami, kalendar oyi ...)
  const state = {
    q: new URLSearchParams(location.search).get('q') || '',
    status: '', priority: '', project: '',
    sort: 'due', view: Store.prefs().view, page: 1,
    month: new Date()
  };

  /* ================= 2. Kichik HTML yasovchilar ================= */

  const statusBadge = (s) =>
    '<span class="badge rounded-pill text-bg-' + STATUS[s].color + '"><i class="bi ' + STATUS[s].icon + ' me-1"></i>' + STATUS[s].label + '</span>';

  const priorityBadge = (p) => {
    const c = PRIORITY[p].color;
    return '<span class="badge rounded-pill bg-' + c + '-subtle text-' + c + '-emphasis border border-' + c + '-subtle">' +
      '<i class="bi ' + PRIORITY[p].icon + ' me-1"></i>' + PRIORITY[p].label + '</span>';
  };

  const dueBadge = (t) => {
    const late = Store.isLate(t);
    return '<span class="text-nowrap small ' + (late ? 'text-danger fw-semibold' : 'text-body-secondary') + '">' +
      '<i class="bi ' + (late ? 'bi-exclamation-circle' : 'bi-calendar-event') + ' me-1"></i>' + Store.formatDate(t.dueDate) + '</span>';
  };

  // Vazifa nomi: ustiga olib borilganda Popover bilan tavsifini koʻrsatadi, bosilganda tahrirlaydi
  const titleLink = (t) =>
    '<a href="#" class="fw-semibold text-decoration-none ' + (t.status === 'done' ? 'text-decoration-line-through text-body-secondary' : 'text-reset') + '" ' +
    'data-action="edit" data-id="' + t.id + '" data-bs-toggle="popover" data-bs-trigger="hover focus" data-bs-placement="top" ' +
    'data-bs-title="' + esc(t.title) + '" data-bs-content="' + esc(t.description || 'Tavsif kiritilmagan') + '">' + esc(t.title) + '</a>';

  // Har bir vazifa uchun "⋮" dropdown menyusi
  function taskMenu(t) {
    const statuses = Object.keys(STATUS).map((s) =>
      '<li><button type="button" class="dropdown-item' + (t.status === s ? ' active' : '') + '" data-action="status" data-id="' + t.id + '" data-status="' + s + '">' +
      '<i class="bi ' + STATUS[s].icon + ' me-2"></i>' + STATUS[s].label + '</button></li>').join('');
    return '<div class="dropdown">' +
      '<button class="btn btn-sm btn-light no-caret js-row-dd" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Amallar">' +
      '<i class="bi bi-three-dots-vertical"></i></button>' +
      '<ul class="dropdown-menu dropdown-menu-end shadow">' +
      '<li><button type="button" class="dropdown-item" data-action="edit" data-id="' + t.id + '"><i class="bi bi-pencil me-2"></i>Tahrirlash</button></li>' +
      '<li><hr class="dropdown-divider"></li><li><h6 class="dropdown-header">Holatni oʻzgartirish</h6></li>' + statuses +
      '<li><hr class="dropdown-divider"></li>' +
      '<li><button type="button" class="dropdown-item text-danger" data-action="delete" data-id="' + t.id + '"><i class="bi bi-trash me-2"></i>Oʻchirish</button></li>' +
      '</ul></div>';
  }

  const checkbox = (t) =>
    '<input class="form-check-input" type="checkbox" data-action="toggle" data-id="' + t.id + '"' + (t.status === 'done' ? ' checked' : '') +
    ' aria-label="Bajarildi deb belgilash">';

  // Roʻyxat (list-group) elementi — dashboard va "Roʻyxat" koʻrinishida ishlatiladi
  function listItem(t) {
    return '<div class="list-group-item d-flex align-items-center gap-3 py-3">' + checkbox(t) +
      '<div class="flex-grow-1 text-truncate">' + titleLink(t) +
      '<div class="small text-body-secondary text-truncate">' + esc(Store.projectName(t.projectId)) + '</div></div>' +
      '<div class="d-none d-sm-block">' + priorityBadge(t.priority) + '</div>' + dueBadge(t) + taskMenu(t) + '</div>';
  }

  const emptyState = (text) =>
    '<div class="text-center text-body-secondary py-5"><i class="bi bi-inbox display-4"></i><p class="mt-2 mb-0">' + text + '</p></div>';

  // Konteynerga HTML qoʻyadi va Tooltip/Popover/Dropdown'larni toʻgʻri qayta ishga tushiradi
  function setHTML(el, html) {
    if (!el) return;
    UI.disposeTips(el);
    $$('.js-row-dd', el).forEach((b) => { const i = bootstrap.Dropdown.getInstance(b); if (i) i.dispose(); });
    el.innerHTML = html;
    UI.initTips(el);
    // jadval ichidagi dropdown kesilib qolmasligi uchun "fixed" joylashuv
    $$('.js-row-dd', el).forEach((b) => bootstrap.Dropdown.getOrCreateInstance(b, {
      popperConfig: (def) => Object.assign({}, def, { strategy: 'fixed' })
    }));
  }

  // Filtr va saralash
  function getFiltered(onlySearch) {
    const q = state.q.trim().toLowerCase();
    let list = Store.tasks().filter((t) =>
      (!q || t.title.toLowerCase().includes(q)) &&
      (onlySearch || ((!state.status || t.status === state.status) &&
        (!state.priority || t.priority === state.priority) &&
        (!state.project || t.projectId === state.project))));
    if (!onlySearch) {
      const order = Object.keys(STATUS);
      const cmp = {
        due: (a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'),
        priority: (a, b) => PRIORITY[a.priority].rank - PRIORITY[b.priority].rank,
        title: (a, b) => a.title.localeCompare(b.title),
        status: (a, b) => order.indexOf(a.status) - order.indexOf(b.status)
      }[state.sort];
      list = list.slice().sort(cmp);
    }
    return list;
  }

  /* ================= 3. Modal formalar ================= */

  /* ---- Vazifa oynasi ---- */
  const taskModalEl = $('#taskModal');
  const taskForm = $('#taskForm');
  const taskModal = bootstrap.Modal.getOrCreateInstance(taskModalEl);

  function openTaskModal(id, preset) {
    const t = id ? Store.find(id) :
      Object.assign({ status: 'todo', priority: 'medium', title: '', description: '', dueDate: '', projectId: '' }, preset || {});
    const f = taskForm.elements;
    taskForm.classList.remove('was-validated');
    f.title.setCustomValidity('');
    f.projectId.innerHTML = '<option value="">— Loyihasiz —</option>' +
      Store.projects().map((p) => '<option value="' + p.id + '">' + esc(p.name) + '</option>').join('');
    f.id.value = id || '';
    f.title.value = t.title;
    f.description.value = t.description || '';
    f.status.value = t.status;
    f.priority.value = t.priority;
    f.dueDate.value = t.dueDate || '';
    f.projectId.value = t.projectId || '';
    $('#taskModalLabel').textContent = id ? 'Vazifani tahrirlash' : 'Yangi vazifa';
    taskModal.show();
  }
  taskModalEl.addEventListener('shown.bs.modal', () => taskForm.elements.title.focus());
  taskForm.elements.title.addEventListener('input', () => taskForm.elements.title.setCustomValidity(''));

  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = taskForm.elements;
    f.title.setCustomValidity(f.title.value.trim() ? '' : 'Sarlavhani kiriting');   // faqat probel boʻlsa ham xato
    taskForm.classList.add('was-validated');                                         // Bootstrap validatsiyasi
    if (!taskForm.checkValidity()) return;
    const obj = {
      title: f.title.value.trim(), description: f.description.value.trim(),
      status: f.status.value, priority: f.priority.value,
      dueDate: f.dueDate.value || null, projectId: f.projectId.value || null
    };
    if (f.id.value) obj.id = f.id.value;
    Store.saveTask(obj);
    taskModal.hide();
    UI.toast(f.id.value ? 'Vazifa yangilandi' : 'Yangi vazifa qoʻshildi');
    refresh();
  });

  /* ---- Loyiha oynasi ---- */
  const projectModalEl = $('#projectModal');
  const projectForm = $('#projectForm');
  const projectModal = bootstrap.Modal.getOrCreateInstance(projectModalEl);
  projectModalEl.addEventListener('shown.bs.modal', () => projectForm.elements.name.focus());
  projectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = projectForm.elements;
    f.name.setCustomValidity(f.name.value.trim() ? '' : 'Nomni kiriting');
    projectForm.classList.add('was-validated');
    if (!projectForm.checkValidity()) return;
    Store.addProject(f.name.value.trim().slice(0, 80), f.description.value.trim().slice(0, 200));
    projectModal.hide();
    projectForm.reset();
    projectForm.classList.remove('was-validated');
    UI.toast('Loyiha yaratildi');
    refresh();
  });

  /* ================= 4. Sahifalarni chizish ================= */

  /* ---- Umumiy qism: navbar va sidebar ---- */
  function renderChrome() {
    const c = Store.countByStatus();
    const pct = c.total ? Math.round(c.done / c.total * 100) : 0;
    const bar = $('#sideProgress');
    if (bar) { bar.style.width = pct + '%'; bar.parentElement.setAttribute('aria-valuenow', pct); }
    const txt = $('#sideProgressText'); if (txt) txt.textContent = pct + '%';
    const badge = $('#navTaskCount'); if (badge) badge.textContent = c.total - c.done;
  }

  const pages = {};

  /* ---- Boshqaruv paneli ---- */
  pages.dashboard = function () {
    const c = Store.countByStatus();
    $('#greeting').textContent = 'Salom, ' + user.name.split(' ')[0] + '!';

    // 1) Statistika kartalari (grid: xs 2 ustun, md 3, xl 6)
    const stats = [
      ['Jami vazifalar', c.total, 'bi-list-task', 'info'],
      [STATUS.todo.label, c.todo, STATUS.todo.icon, STATUS.todo.color],
      [STATUS.in_progress.label, c.in_progress, STATUS.in_progress.icon, STATUS.in_progress.color],
      [STATUS.review.label, c.review, STATUS.review.icon, STATUS.review.color],
      [STATUS.done.label, c.done, STATUS.done.icon, STATUS.done.color],
      ['Muddati oʻtgan', c.late, 'bi-exclamation-triangle', 'danger']
    ];
    setHTML($('#statsRow'), stats.map((s) =>
      '<div class="col"><div class="card h-100 border-0 shadow-sm"><div class="card-body d-flex align-items-center gap-3">' +
      '<span class="feature-icon bg-' + s[3] + '-subtle text-' + s[3] + '-emphasis"><i class="bi ' + s[2] + '"></i></span>' +
      '<div><div class="fs-3 fw-bold lh-1">' + s[1] + '</div><div class="small text-body-secondary">' + s[0] + '</div></div>' +
      '</div></div></div>').join(''));

    // 2) Umumiy bajarilish — Progress komponenti
    const total = c.total || 1, pct = Math.round(c.done / total * 100);
    $('#overallPct').textContent = pct + '%';
    const stacked = Object.keys(STATUS).map((s) =>
      '<div class="progress" role="progressbar" aria-label="' + STATUS[s].label + '" aria-valuenow="' + c[s] + '" aria-valuemin="0" aria-valuemax="' + total + '" ' +
      'style="width:' + (c[s] / total * 100) + '%" data-bs-toggle="tooltip" data-bs-title="' + STATUS[s].label + ': ' + c[s] + ' ta">' +
      '<div class="progress-bar bg-' + STATUS[s].color + '"></div></div>').join('');
    const legend = Object.keys(STATUS).map((s) =>
      '<span class="me-3 small text-nowrap"><i class="bi bi-circle-fill text-' + STATUS[s].color + ' me-1" style="font-size:.6rem"></i>' + STATUS[s].label + '</span>').join('');
    setHTML($('#stackedProgress'), '<div class="progress-stacked mb-3" style="height:14px">' + stacked + '</div><div>' + legend + '</div>');

    // 3) Yaqin muddatlar — list-group
    const soon = Store.tasks().filter((t) => t.dueDate && t.status !== 'done')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
    setHTML($('#upcomingList'), soon.length ? soon.map(listItem).join('') : emptyState('Yaqin muddatli vazifalar yoʻq'));
  };

  /* ---- Vazifalar (jadval / roʻyxat) ---- */
  function tableView(rows, total) {
    return '<div class="card shadow-sm"><div class="table-responsive">' +
      '<table class="table table-hover table-striped align-middle mb-0">' +
      '<caption class="px-3">Jami: ' + total + ' ta vazifa</caption>' +
      '<thead class="table-light"><tr>' +
      '<th scope="col" class="ps-3" style="width:48px"><span class="visually-hidden">Bajarildi</span></th>' +
      '<th scope="col">Vazifa</th>' +
      '<th scope="col" class="d-none d-lg-table-cell">Loyiha</th>' +
      '<th scope="col" class="d-none d-sm-table-cell">Holat</th>' +
      '<th scope="col" class="d-none d-md-table-cell">Ustuvorlik</th>' +
      '<th scope="col" class="text-nowrap">Muddat</th>' +
      '<th scope="col" class="text-end pe-3"><span class="visually-hidden">Amallar</span></th></tr></thead><tbody>' +
      rows.map((t) =>
        '<tr><td class="ps-3">' + checkbox(t) + '</td>' +
        '<td>' + titleLink(t) + '<div class="small text-body-secondary d-lg-none">' + esc(Store.projectName(t.projectId)) + '</div></td>' +
        '<td class="d-none d-lg-table-cell text-body-secondary">' + esc(Store.projectName(t.projectId)) + '</td>' +
        '<td class="d-none d-sm-table-cell">' + statusBadge(t.status) + '</td>' +
        '<td class="d-none d-md-table-cell">' + priorityBadge(t.priority) + '</td>' +
        '<td>' + dueBadge(t) + '</td>' +
        '<td class="text-end pe-3">' + taskMenu(t) + '</td></tr>').join('') +
      '</tbody></table></div></div>';
  }

  function pagerView(pageCount) {
    if (pageCount <= 1) return '';
    const cur = state.page;
    let start = Math.max(1, cur - 2), end = Math.min(pageCount, start + 4);
    start = Math.max(1, end - 4);
    const item = (label, p, disabled, active) =>
      '<li class="page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '') + '"><button type="button" class="page-link" data-action="page" data-page="' + p + '"' +
      (active ? ' aria-current="page"' : '') + '>' + label + '</button></li>';
    let html = item('<i class="bi bi-chevron-left"></i><span class="visually-hidden">Oldingi</span>', cur - 1, cur === 1);
    for (let p = start; p <= end; p++) html += item(p, p, false, p === cur);
    html += item('<i class="bi bi-chevron-right"></i><span class="visually-hidden">Keyingi</span>', cur + 1, cur === pageCount);
    return '<nav aria-label="Sahifalash"><ul class="pagination pagination-sm justify-content-center mb-0">' + html + '</ul></nav>';
  }

  pages.tasks = function () {
    const all = Store.tasks();

    // Holat boʻyicha tablar (nav-tabs) — har birida soni badge bilan
    const tabs = [['', 'Hammasi', all.length]].concat(Object.keys(STATUS).map((s) =>
      [s, STATUS[s].label, all.filter((t) => t.status === s).length]));
    $('#statusTabs').innerHTML = tabs.map((t) =>
      '<li class="nav-item"><button type="button" class="nav-link' + (state.status === t[0] ? ' active' : '') + '" data-action="tab" data-status="' + t[0] + '"' +
      (state.status === t[0] ? ' aria-current="page"' : '') + '>' + t[1] +
      ' <span class="badge rounded-pill text-bg-secondary ms-1">' + t[2] + '</span></button></li>').join('');

    // Filtr elementlari
    $('#fProject').innerHTML = '<option value="">Barcha loyihalar</option>' +
      Store.projects().map((p) => '<option value="' + p.id + '">' + esc(p.name) + '</option>').join('');
    $('#fProject').value = state.project;
    $('#fPriority').value = state.priority;
    $('#sortLabel').textContent = SORTS[state.sort];
    $$('[data-action="sort"]').forEach((b) => b.classList.toggle('active', b.dataset.sort === state.sort));
    $('#viewTable').checked = state.view === 'table';
    $('#viewList').checked = state.view === 'list';

    // Roʻyxat + sahifalash
    const list = getFiltered();
    const per = Store.prefs().perPage;
    const pageCount = Math.max(1, Math.ceil(list.length / per));
    state.page = Math.min(state.page, pageCount);
    const rows = list.slice((state.page - 1) * per, state.page * per);
    let html;
    if (!list.length) html = '<div class="card shadow-sm">' + emptyState('Vazifalar topilmadi') + '</div>';
    else if (state.view === 'table') html = tableView(rows, list.length);
    else html = '<div class="list-group shadow-sm">' + rows.map(listItem).join('') + '</div>';
    setHTML($('#taskView'), html);
    $('#pager').innerHTML = pagerView(pageCount);
  };

  /* ---- Kanban ---- */
  function kanbanCard(t) {
    return '<div class="card kanban-card shadow-sm" draggable="true" data-id="' + t.id + '"><div class="card-body p-2">' +
      '<div class="d-flex justify-content-between align-items-start gap-2">' + titleLink(t) + taskMenu(t) + '</div>' +
      '<div class="d-flex flex-wrap gap-2 align-items-center mt-2">' + priorityBadge(t.priority) + dueBadge(t) + '</div>' +
      '<div class="small text-body-secondary mt-1"><i class="bi bi-folder2 me-1"></i>' + esc(Store.projectName(t.projectId)) + '</div></div></div>';
  }

  pages.kanban = function () {
    const list = getFiltered(true);
    setHTML($('#board'), '<div class="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-3">' +
      Object.keys(STATUS).map((s) => {
        const items = list.filter((t) => t.status === s), st = STATUS[s];
        return '<div class="col"><div class="card h-100 kanban-col shadow-sm" data-status="' + s + '">' +
          '<div class="card-header d-flex justify-content-between align-items-center fw-semibold bg-' + st.color + '-subtle text-' + st.color + '-emphasis">' +
          '<span><i class="bi ' + st.icon + ' me-2"></i>' + st.label + '</span><span class="badge rounded-pill text-bg-' + st.color + '">' + items.length + '</span></div>' +
          '<div class="card-body d-grid gap-2 align-content-start kanban-body bg-body-tertiary">' +
          (items.map(kanbanCard).join('') || '<p class="text-center text-body-secondary small my-3">Boʻsh</p>') + '</div></div></div>';
      }).join('') + '</div>');
  };

  /* ---- Kalendar (jadval koʻrinishida) ---- */
  pages.calendar = function () {
    const y = state.month.getFullYear(), m = state.month.getMonth();
    const first = (new Date(y, m, 1).getDay() + 6) % 7;        // dushanbadan boshlanadi
    const days = new Date(y, m + 1, 0).getDate();
    const todayKey = Store.dayOffset(0);
    $('#calTitle').textContent = MONTHS[m] + ' ' + y;

    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    while (cells.length % 7) cells.push(null);

    const dayCell = (d) => {
      if (!d) return '<td class="cal-cell bg-body-tertiary"></td>';
      const key = Store.dateKey(new Date(y, m, d));
      const ev = Store.tasks().filter((t) => t.dueDate === key);
      const desktop = ev.map((t) =>
        '<span class="badge text-start text-truncate d-none d-md-block mb-1 text-bg-' + (Store.isLate(t) ? 'danger' : STATUS[t.status].color) + '" ' +
        'role="button" tabindex="0" data-action="edit" data-id="' + t.id + '" data-bs-toggle="popover" data-bs-trigger="hover focus" ' +
        'data-bs-title="' + esc(t.title) + '" data-bs-content="' + STATUS[t.status].label + ' · ' + PRIORITY[t.priority].label + ' ustuvorlik">' + esc(t.title) + '</span>').join('');
      const mobile = ev.length ? '<span class="badge rounded-pill text-bg-primary d-md-none">' + ev.length + '</span>' : '';
      return '<td class="cal-cell p-1' + (key === todayKey ? ' table-primary' : '') + '"><div class="small fw-semibold mb-1">' + d + '</div>' + desktop + mobile + '</td>';
    };

    let rows = '';
    for (let i = 0; i < cells.length; i += 7) rows += '<tr>' + cells.slice(i, i + 7).map(dayCell).join('') + '</tr>';
    setHTML($('#calBody'), '<div class="table-responsive"><table class="table table-bordered cal-table mb-0">' +
      '<thead class="table-light text-center"><tr>' + ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map((w) => '<th scope="col" class="small">' + w + '</th>').join('') + '</tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>');

    // Oy ichidagi muddatlar roʻyxati (ayniqsa telefon uchun qulay)
    const prefix = y + '-' + String(m + 1).padStart(2, '0');
    const inMonth = Store.tasks().filter((t) => t.dueDate && t.dueDate.indexOf(prefix) === 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    setHTML($('#calList'), inMonth.length ? inMonth.map(listItem).join('') : emptyState('Bu oyda muddatli vazifa yoʻq'));
  };

  /* ---- Loyihalar ---- */
  pages.projects = function () {
    const projects = Store.projects();
    if (!projects.length) { setHTML($('#projectGrid'), '<div class="col-12"><div class="card">' + emptyState('Hali loyiha yoʻq') + '</div></div>'); return; }
    setHTML($('#projectGrid'), projects.map((p, i) => {
      const tasks = Store.tasks().filter((t) => t.projectId === p.id);
      const done = tasks.filter((t) => t.status === 'done').length;
      const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
      const items = tasks.map((t) =>
        '<li class="list-group-item px-0 d-flex justify-content-between align-items-center gap-2"><span class="text-truncate' +
        (t.status === 'done' ? ' text-decoration-line-through text-body-secondary' : '') + '">' + esc(t.title) + '</span>' + statusBadge(t.status) + '</li>').join('');
      return '<div class="col"><div class="card h-100 shadow-sm overflow-hidden">' +
        '<img src="assets/img/' + Store.COVERS[i % Store.COVERS.length] + '" class="card-img-top cover-img" alt="' + esc(p.name) + ' loyihasi muqovasi" loading="lazy">' +
        '<div class="card-body"><div class="d-flex justify-content-between align-items-start gap-2"><h2 class="h5 card-title mb-1">' + esc(p.name) + '</h2>' +
        '<span class="badge text-bg-light border">' + tasks.length + ' ta</span></div>' +
        '<p class="card-text text-body-secondary small">' + esc(p.description || 'Tavsif yoʻq') + '</p>' +
        '<div class="progress" style="height:8px" role="progressbar" aria-label="Bajarilish" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:' + pct + '%"></div></div>' +
        '<div class="small text-body-secondary mt-1">' + done + '/' + tasks.length + ' bajarildi (' + pct + '%)</div>' +
        '<div class="collapse mt-3" id="proj-' + p.id + '"><ul class="list-group list-group-flush">' +
        (items || '<li class="list-group-item px-0 text-body-secondary small">Vazifalar yoʻq</li>') + '</ul></div></div>' +
        '<div class="card-footer bg-transparent d-flex justify-content-between align-items-center gap-2">' +
        '<button type="button" class="btn btn-sm btn-outline-primary" data-bs-toggle="collapse" data-bs-target="#proj-' + p.id + '" aria-expanded="false" aria-controls="proj-' + p.id + '"><i class="bi bi-list-ul me-1"></i>Vazifalar</button>' +
        '<div class="btn-group"><button type="button" class="btn btn-sm btn-primary" data-action="new-task" data-project="' + p.id + '"><i class="bi bi-plus-lg me-1"></i>Vazifa</button>' +
        '<button type="button" class="btn btn-sm btn-primary dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false"><span class="visually-hidden">Menyuni ochish</span></button>' +
        '<ul class="dropdown-menu dropdown-menu-end"><li><button type="button" class="dropdown-item text-danger" data-action="delete-project" data-id="' + p.id + '"><i class="bi bi-trash me-2"></i>Loyihani oʻchirish</button></li></ul></div>' +
        '</div></div></div>';
    }).join(''));
  };

  /* ---- Sozlamalar ---- */
  // Sahifa chizilishi: faqat qiymatlarni toʻldiradi
  pages.settings = function () {
    const p = $('#profileForm');
    p.elements.name.value = user.name;
    p.elements.email.value = user.email;
    $('#profileName').textContent = user.name;
    $('#profileEmail').textContent = user.email;
  };

  // Hodisa ishlovchilari bir marta ulanadi (refresh() takror chaqirsa ham koʻpaymaydi)
  function initSettings() {
    const p = $('#profileForm'), pw = $('#passwordForm');

    // Profil formasi
    p.addEventListener('submit', (e) => {
      e.preventDefault();
      p.classList.add('was-validated');
      if (!p.checkValidity()) return;
      const err = Auth.updateProfile(p.elements.name.value, p.elements.email.value);
      const box = $('#profileError');
      if (err) { box.textContent = err; box.hidden = false; return; }
      box.hidden = true;
      location.reload();
    });

    // Parol formasi + parol kuchi indikatori (Progress)
    const meter = $('#pwMeter'), meterText = $('#pwMeterText');
    pw.elements.next.addEventListener('input', () => {
      const v = pw.elements.next.value;
      const score = [v.length >= 8, /[A-Za-z]/.test(v) && /\d/.test(v), /[^A-Za-z0-9]/.test(v), v.length >= 12].filter(Boolean).length;
      const levels = [['0', 'bg-secondary', ''], ['25', 'bg-danger', 'Zaif'], ['50', 'bg-warning', 'Oʻrtacha'], ['75', 'bg-info', 'Yaxshi'], ['100', 'bg-success', 'Juda yaxshi']];
      meter.style.width = levels[v ? score : 0][0] + '%';
      meter.className = 'progress-bar ' + levels[v ? score : 0][1];
      meterText.textContent = levels[v ? score : 0][2];
    });
    pw.addEventListener('submit', async (e) => {
      e.preventDefault();
      pw.classList.add('was-validated');
      if (!pw.checkValidity()) return;
      const box = $('#passwordError');
      let err;
      try { err = await Auth.changePassword(pw.elements.current.value, pw.elements.next.value); } catch (x) { err = x.message; }
      if (err) { box.textContent = err; box.hidden = false; return; }
      box.hidden = true; pw.reset(); pw.classList.remove('was-validated');
      meter.style.width = '0'; meterText.textContent = '';
      UI.toast('Parol yangilandi');
    });

    // Koʻrinish sozlamalari: qorongʻi rejim, sahifadagi qatorlar soni, standart koʻrinish
    const prefs = Store.prefs();
    $('#darkSwitch').addEventListener('change', (e) => { Auth.setTheme(e.target.checked ? 'dark' : 'light'); UI.syncThemeIcons(); });
    const range = $('#perPage');
    range.value = prefs.perPage; $('#perPageOut').textContent = prefs.perPage;
    range.addEventListener('input', () => {
      prefs.perPage = Number(range.value); $('#perPageOut').textContent = range.value; Store.savePrefs();
    });
    $$('[name="defaultView"]').forEach((r) => {
      r.checked = r.value === prefs.view;
      r.addEventListener('change', () => { prefs.view = r.value; Store.savePrefs(); UI.toast('Saqlandi'); });
    });
  };

  // Barcha ma'lumot oʻzgarganda: sidebar + joriy sahifani qayta chizish
  function refresh() { renderChrome(); if (pages[page]) pages[page](); }

  /* ================= 5. Hodisalar ================= */

  // --- Navbar: qidiruv ---
  $$('.js-search').forEach((input) => {
    input.value = state.q;
    input.addEventListener('input', () => {
      state.q = input.value; state.page = 1;
      $$('.js-search').forEach((o) => { if (o !== input) o.value = state.q; });   // ikkala qidiruv maydonini sinxronlash
      if (page === 'tasks' || page === 'kanban') pages[page]();
    });
  });
  $$('.js-search-form').forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault();
    if (page !== 'tasks' && page !== 'kanban') location.href = 'tasks.html?q=' + encodeURIComponent(state.q);
  }));

  // --- Navbar: foydalanuvchi, mavzu ---
  $$('.js-user-name').forEach((el) => { el.textContent = user.name; });
  $$('.js-user-email').forEach((el) => { el.textContent = user.email; });
  $$('.js-theme').forEach((b) => b.addEventListener('click', () => { Auth.toggleTheme(); UI.syncThemeIcons(); }));
  $$('.js-logout').forEach((b) => b.addEventListener('click', Auth.logout));

  // --- Bitta umumiy click ishlovchi: [data-action] ---
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action, id = el.dataset.id;
    if (el.tagName === 'A') e.preventDefault();

    // Sichqoncha ostidagi Popover modal ochilganda yopilib ketsin
    const pop = bootstrap.Popover.getInstance(el); if (pop) pop.hide();

    switch (action) {
      case 'new-task':
        openTaskModal(null, { priority: el.dataset.priority || 'medium', projectId: el.dataset.project || '' });
        return;
      case 'new-project': projectModal.show(); return;
      case 'edit': openTaskModal(id); return;
      case 'toggle': Store.toggleDone(id); break;
      case 'status': Store.setStatus(id, el.dataset.status); UI.toast('Holat: ' + STATUS[el.dataset.status].label, 'primary'); break;
      case 'delete':
        if (!(await UI.confirm('Bu vazifa butunlay oʻchiriladi. Davom etasizmi?'))) return;
        Store.removeTask(id); UI.toast('Vazifa oʻchirildi', 'secondary'); break;
      case 'delete-project':
        if (!(await UI.confirm('Loyiha oʻchiriladi (vazifalari saqlanib qoladi). Davom etasizmi?'))) return;
        Store.removeProject(id); UI.toast('Loyiha oʻchirildi', 'secondary'); break;
      case 'tab': state.status = el.dataset.status; state.page = 1; break;
      case 'page': state.page = Number(el.dataset.page); break;
      case 'sort': state.sort = el.dataset.sort; state.page = 1; break;
      case 'month': state.month = new Date(state.month.getFullYear(), state.month.getMonth() + Number(el.dataset.n), 1); break;
      case 'today': state.month = new Date(); break;
      case 'reset-data':
        if (!(await UI.confirm('Barcha vazifa va loyihalar namunaviy holatga qaytariladi.', 'Ha, tiklash'))) return;
        Store.reset(user); UI.toast('Namunaviy maʼlumotlar tiklandi', 'primary'); break;
      default: return;
    }
    refresh();
  });

  // --- Filtr selectlari va koʻrinish tugmalari ---
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'fPriority') { state.priority = t.value; state.page = 1; refresh(); }
    else if (t.id === 'fProject') { state.project = t.value; state.page = 1; refresh(); }
    else if (t.name === 'viewMode') { state.view = t.value; Store.prefs().view = t.value; Store.savePrefs(); refresh(); }
  });

  // --- Kanban: sudrab tashlash (Drag & Drop) ---
  let dragId = null;
  document.addEventListener('dragstart', (e) => {
    const c = e.target.closest && e.target.closest('.kanban-card');
    dragId = c ? c.dataset.id : null;
    if (c) e.dataTransfer.setData('text/plain', dragId);     // Firefox uchun shart
  });
  document.addEventListener('dragover', (e) => {
    const col = e.target.closest && e.target.closest('.kanban-col');
    if (col && dragId) { e.preventDefault(); col.classList.add('drag-over'); }
  });
  document.addEventListener('dragleave', (e) => {
    const col = e.target.closest && e.target.closest('.kanban-col');
    if (col && !col.contains(e.relatedTarget)) col.classList.remove('drag-over');
  });
  document.addEventListener('drop', (e) => {
    const col = e.target.closest && e.target.closest('.kanban-col');
    if (!col || !dragId) return;
    e.preventDefault();
    Store.setStatus(dragId, col.dataset.status);
    dragId = null;
    refresh();
  });
  document.addEventListener('dragend', () => { dragId = null; $$('.kanban-col.drag-over').forEach((c) => c.classList.remove('drag-over')); });

  /* ---- Ishga tushirish ---- */
  UI.initTips();                  // navbar/sidebar'dagi statik tooltiplar
  UI.syncThemeIcons();
  if (page === 'settings') initSettings();
  refresh();
})();
