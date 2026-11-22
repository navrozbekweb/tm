# TaskManager — Bootstrap 5 versiyasi (2-mustaqil ish)

Ishga tushirish: `index.html` ni Live Server / `python -m http.server` orqali oching (internet kerak — Bootstrap CDN'dan yuklanadi).

## Baholash mezonlari qayerda bajarilgan
| № | Mezon | Qayerda |
|---|-------|---------|
| 1 | Responsive (xs/md/lg+) | Barcha sahifalarda `container-fluid`, `row/col-*`, `row-cols-*`, `offcanvas-lg` yon panel, `navbar` |
| 2 | Matnlar | `display-4`, `lead`, `mark`, `blockquote`, `text-body-secondary`, `fw-*`, `kbd`, `badge` (index.html, dashboard) |
| 3 | Jadval va roʻyxatlar | tasks.html: `table table-hover table-striped table-responsive`, `pagination`; `list-group` (dashboard, kalendar) |
| 4 | Formalar | login/register/settings/modal: `form-floating`, `input-group`, `form-select`, `form-check`, `form-switch`, `form-range`, validatsiya |
| 5 | Media + ikonkalar | `img-fluid`, `rounded-circle img-thumbnail`, `card-img-top`, `figure`; Bootstrap Icons hamma joyda |
| 6 | Dropdown va tugmali dropdown | navbar "Yangi vazifa" (split button), foydalanuvchi menyusi, qator menyusi (⋮), saralash |
| 7 | Konteynerli menyu | `navbar` (+collapse), `offcanvas`, `nav-pills`, `nav-tabs`, `breadcrumb`, `pagination` |
| 8 | Tooltip/Popover | tugmalarda tooltip; vazifa nomi va kalendar hodisalarida popover; landing "Batafsil" |
| 9 | Panel (Card) | `card` header/body/footer, `accordion`, `collapse` (loyiha vazifalari) |
| 10 | Slayder | index.html va dashboard.html — `carousel` |
| 11 | Yagona mavzu | Hammasi "vazifalar boshqaruvi" tizimi atrofida |

## Fayllar
- `*.html` — sahifalar (Bootstrap klasslari HTML ichida yozilgan)
- `css/custom.css` — brend rangi + kichik qoʻshimchalar
- `js/auth.js` — kirish/roʻyxatdan oʻtish · `store.js` — ma'lumotlar · `ui.js` — toast/modal/tooltip yordamchilari · `app.js` — sahifalar mantiqi · `authpage.js`, `landing.js`
- `assets/img/` — SVG rasmlar (slayder, muqova, avatar)
