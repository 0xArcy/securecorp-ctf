const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
const PORT = 3000;

const DB_FILE = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(DB_FILE);

app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ─── Shared UI helpers ────────────────────────────────────────────────────────

const CATEGORY_META = {
  Electronics: { icon: '⚡', color: '#FF6B6B' },
  Cables:      { icon: '🔌', color: '#4ECDC4' },
  Accessories: { icon: '🎒', color: '#45B7D1' },
  Peripherals: { icon: '⌨️',  color: '#FFA07A' },
  Gaming:      { icon: '🎮', color: '#a855f7' },
  Storage:     { icon: '💾', color: '#eab308' },
  Networking:  { icon: '🌐', color: '#BB8FCE' },
  Wearables:   { icon: '⌚', color: '#85C1E2' },
  Office:      { icon: '🖥️',  color: '#6ee7b7' },
};

function getCategoryMeta(cat) {
  return CATEGORY_META[cat] || { icon: '📦', color: '#667eea' };
}

function baseStyles(extra = '') {
  return `
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      body { background: #f0f2f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; min-height: 100vh; }
      .card { border: none; border-radius: 16px; box-shadow: 0 2px 14px rgba(0,0,0,0.08); }
      .btn { font-weight: 500; }
      .section-title { font-weight: 700; color: #1a1a2e; }
      .badge-cat { font-size: .72rem; font-weight: 600; padding: 3px 8px; border-radius: 20px; display: inline-block; }
      ${extra}
    </style>`;
}

function navbar(req, { active = '' } = {}) {
  const cartCount = (req.session.cart || []).reduce((s, i) => s + i.quantity, 0);
  const cartBadge = cartCount > 0
    ? `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="font-size:.6rem;min-width:18px;">${cartCount}</span>`
    : '';

  const navLink = (href, label, key) =>
    `<a href="${href}" class="nav-link text-white ${active === key ? 'fw-bold' : 'opacity-75'}" style="${active === key ? 'border-bottom:2px solid rgba(255,255,255,.8); padding-bottom:1px;' : ''}">${label}</a>`;

  return `
    <nav class="navbar navbar-dark py-0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); box-shadow: 0 2px 24px rgba(102,126,234,.4);">
      <div class="container-fluid px-4" style="height:58px;">
        <a href="/" class="navbar-brand fw-bold text-decoration-none" style="font-size:1.4rem; letter-spacing:-.5px;">🛍️ TechShop</a>
        <div class="d-flex align-items-center gap-3">
          ${navLink('/dashboard', 'Shop', 'shop')}
          ${navLink('/search', '🔍 Search', 'search')}
          <a href="/cart" class="nav-link text-white ${active === 'cart' ? 'fw-bold' : 'opacity-75'} position-relative">
            🛒 Cart${cartBadge}
          </a>
          ${req.session.isAdmin ? `<a href="/admin" class="btn btn-warning btn-sm ms-1 fw-semibold">⚙️ Admin</a>` : ''}
          ${req.session.userId
            ? `<a href="/profile" class="nav-link text-white opacity-75">👤 ${req.session.firstName}</a>
               <a href="/logout" class="btn btn-sm fw-semibold" style="background:rgba(255,255,255,.15); color:white; border:1px solid rgba(255,255,255,.35);">Logout</a>`
            : `<a href="/login" class="btn btn-light btn-sm fw-semibold ms-1">Login</a>`}
        </div>
      </div>
    </nav>`;
}

// ─── Database setup ───────────────────────────────────────────────────────────

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    is_admin INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT,
    price REAL,
    description TEXT,
    category TEXT
  )`);

  db.all('PRAGMA table_info(products)', (err, columns) => {
    if (!err && columns && !columns.some(col => col.name === 'category')) {
      db.run('ALTER TABLE products ADD COLUMN category TEXT', (alterErr) => {
        if (alterErr) console.error('Failed to add category column:', alterErr.message);
      });
    }
  });

  db.get('SELECT COUNT(*) AS c FROM users', (err, row) => {
    if (!err && row && row.c === 0) {
      db.run("INSERT INTO users (username, password, email, first_name, last_name, is_admin) VALUES ('admin', 'admin123', 'admin@shop.com', 'Admin', 'User', 1)");
      db.run("INSERT INTO users (username, password, email, first_name, last_name, is_admin) VALUES ('alice', 'alice123', 'alice@shop.com', 'Alice', 'Cooper', 0)");
      db.run("INSERT INTO users (username, password, email, first_name, last_name, is_admin) VALUES ('bob', 'bob123', 'bob@shop.com', 'Bob', 'Builder', 0)");
      db.run("INSERT INTO users (username, password, email, first_name, last_name, is_admin) VALUES ('carol', 'carol123', 'carol@shop.com', 'Carol', 'Danvers', 0)");
    }
  });

  db.get('SELECT COUNT(*) AS c FROM products', (err, row) => {
    if (!err && row && row.c === 0) {
      const products = [
        ['Wireless Headphones',79.99,'Premium noise-cancelling headphones','Electronics'],
        ['USB-C Cable',12.99,'Fast charging cable 2m','Cables'],
        ['Laptop Stand',34.99,'Adjustable aluminum stand','Accessories'],
        ['Mechanical Keyboard',89.99,'RGB backlit gaming keyboard','Peripherals'],
        ['Wireless Mouse',24.99,'Precision optical sensor','Peripherals'],
        ['4K Webcam',59.99,'Ultra HD video streaming','Electronics'],
        ['Phone Case',14.99,'Durable protective case','Accessories'],
        ['Screen Protector',8.99,'Tempered glass protection','Accessories'],
        ['Power Bank',44.99,'20000mAh fast charging','Electronics'],
        ['USB Hub',19.99,'7-port USB 3.0 hub','Peripherals'],
        ['Bluetooth Speaker',49.99,'Portable stereo speaker','Electronics'],
        ['Gaming Headset',69.99,'Surround sound headset','Gaming'],
        ['HDMI Cable',9.99,'High speed HDMI 2.0 cable','Cables'],
        ['External SSD 1TB',129.99,'Fast portable storage','Storage'],
        ['Wireless Charger',29.99,'Fast wireless charging pad','Electronics'],
        ['Monitor 27"',199.99,'IPS 1440p monitor','Peripherals'],
        ['Webcam Cover',3.99,'Privacy webcam slider','Accessories'],
        ['Desk Lamp',22.99,'Adjustable LED desk lamp','Office'],
        ['Laptop Sleeve',18.99,'Protective laptop sleeve 15 inch','Accessories'],
        ['Microphone USB',59.99,'Podcasting USB microphone','Peripherals'],
        ['Graphics Tablet',99.99,'Drawing tablet with stylus','Peripherals'],
        ['Router AC1200',79.99,'Dual-band wireless router','Networking'],
        ['SD Card 128GB',24.99,'High speed memory card','Storage'],
        ['Smartwatch',149.99,'Fitness tracking smartwatch','Wearables'],
        ['Phone Gimbal',89.99,'3-axis stabilizer for phones','Accessories'],
        ['Mechanical Keycap Set',39.99,'PBT keycap set','Peripherals'],
        ['Gaming Mousepad',19.99,'Large cloth mousepad','Gaming'],
        ['USB-C Dock',129.99,'Multiport docking station','Peripherals'],
        ['Portable Projector',249.99,'Mini projector 1080p','Electronics'],
        ['Noise Cancelling Earbuds',99.99,'In-ear ANC earbuds','Electronics']
      ];
      const stmt = db.prepare('INSERT INTO products (name, price, description, category) VALUES (?, ?, ?, ?)');
      for (const p of products) stmt.run(p[0], p[1], p[2], p[3]);
      stmt.finalize();
    }
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login POST
// ─────────────────────────────────────────────────────────────────────────────
// TODO (PHASE 1 — STUDENT TASK):
// Replace the safe query below with this vulnerable one:
//
//   const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
//
// The safe version uses parameterized queries (? placeholders) so injection
// is impossible. The vulnerable version pastes user input directly into the
// SQL string — that's what makes it exploitable.
// ─────────────────────────────────────────────────────────────────────────────
app.post('/login', (req, res) => {
  const username = req.body.username || '';
  const password = req.body.password || '';

  // SAFE (default) — replace with the vulnerable query above to start the lab
  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';

  db.get(query, [username, password], (err, row) => {
    if (err) {
      return res.send(`<!DOCTYPE html><html lang="en">
        <head><meta charset="UTF-8"><title>Error - TechShop</title>${baseStyles()}</head>
        <body>${navbar(req)}
        <div class="d-flex align-items-center justify-content-center" style="min-height:80vh;">
          <div class="card p-5 text-center" style="max-width:440px; width:100%;">
            <div style="font-size:3rem;">❌</div>
            <h4 class="text-danger mt-3">SQL Error</h4>
            <p class="text-muted"><code>${err.message}</code></p>
            <a href="/login" class="btn btn-primary mt-3" style="border-radius:10px;">Back to Login</a>
          </div>
        </div></body></html>`);
    }

    if (row) {
      req.session.userId = row.id;
      req.session.username = row.username;
      req.session.isAdmin = row.is_admin;
      req.session.email = row.email;
      req.session.firstName = row.first_name;
      req.session.lastName = row.last_name;
      return res.redirect('/dashboard');
    }

    res.send(`<!DOCTYPE html><html lang="en">
      <head><meta charset="UTF-8"><title>Login Failed - TechShop</title>${baseStyles()}</head>
      <body>${navbar(req)}
      <div class="d-flex align-items-center justify-content-center" style="min-height:80vh;">
        <div class="card p-5 text-center" style="max-width:440px; width:100%;">
          <div style="font-size:3rem;">🔒</div>
          <h4 class="fw-bold mt-3" style="color:#1a1a2e;">Invalid Credentials</h4>
          <p class="text-muted">Username or password is incorrect.</p>
          <a href="/login" class="btn mt-3 fw-semibold" style="background:linear-gradient(135deg,#667eea,#764ba2); color:white; border:none; border-radius:10px; padding:.6rem 2rem;">Try Again</a>
        </div>
      </div></body></html>`);
  });
});

// Dashboard
app.get('/dashboard', (req, res) => {
  const filterCat = req.query.category || '';

  db.all('SELECT DISTINCT category FROM products ORDER BY category', (err, cats) => {
    const categories = (cats || []).map(c => c.category).filter(Boolean);

    const baseQuery = filterCat
      ? `SELECT * FROM products WHERE category = '${filterCat}' ORDER BY id`
      : 'SELECT * FROM products ORDER BY id';

    db.all(baseQuery, (err2, products) => {
      const categoryPills = ['', ...categories].map(cat => {
        const active = cat === filterCat;
        const meta = getCategoryMeta(cat);
        const label = cat || 'All';
        const icon = cat ? meta.icon : '🏪';
        return `<a href="/dashboard${cat ? '?category=' + encodeURIComponent(cat) : ''}"
          class="btn btn-sm rounded-pill me-2 mb-2 ${active ? 'btn-primary' : 'btn-outline-secondary'}"
          style="${active ? '' : 'opacity:.7;'}">${icon} ${label}</a>`;
      }).join('');

      const productsList = (products || []).map(p => {
        const meta = getCategoryMeta(p.category);
        return `
          <div class="col-6 col-md-4 col-lg-3 mb-4">
            <div class="card h-100"
              style="transition:transform .25s,box-shadow .25s; cursor:pointer;"
              onmouseenter="this.style.transform='translateY(-6px)'; this.style.boxShadow='0 16px 32px rgba(102,126,234,.18)'"
              onmouseleave="this.style.transform=''; this.style.boxShadow=''">
              <div style="height:170px; background:${meta.color}20; display:flex; align-items:center; justify-content:center; font-size:4rem; border-radius:16px 16px 0 0; border-bottom:1px solid ${meta.color}30;">
                ${meta.icon}
              </div>
              <div class="card-body d-flex flex-column p-3">
                <span class="badge-cat mb-1" style="background:${meta.color}20; color:${meta.color}; border:1px solid ${meta.color}40;">${p.category || 'Other'}</span>
                <h6 class="fw-semibold mb-1" style="color:#1a1a2e; font-size:.92rem;">${p.name}</h6>
                <p class="text-muted mb-2" style="font-size:.78rem; flex-grow:1; line-height:1.4;">${p.description}</p>
                <div class="d-flex justify-content-between align-items-center pt-2" style="border-top:1px solid #f0f0f0;">
                  <span class="fw-bold" style="color:#667eea; font-size:1.05rem;">$${p.price}</span>
                  <a href="/product/${p.id}" class="btn btn-sm fw-semibold"
                    style="background:linear-gradient(135deg,#667eea,#764ba2); color:white; border:none; border-radius:8px; font-size:.78rem; padding:.3rem .7rem;">View</a>
                </div>
              </div>
            </div>
          </div>`;
      }).join('');

      res.send(`<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>TechShop — Products</title>
          ${baseStyles()}
        </head>
        <body>
          ${navbar(req, { active: 'shop' })}
          <div class="container py-4">
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
              <h2 class="section-title mb-0">${filterCat ? `${getCategoryMeta(filterCat).icon} ${filterCat}` : '🏪 All Products'}</h2>
              <span class="text-muted" style="font-size:.85rem;">${(products || []).length} products</span>
            </div>
            <div class="mb-4">${categoryPills}</div>
            <div class="row">${productsList}</div>
          </div>
        </body>
        </html>`);
    });
  });
});

// Profile
app.get('/profile', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');

  res.send(`<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Profile — TechShop</title>
      ${baseStyles(`
        .avatar { width:88px; height:88px; background:linear-gradient(135deg,#667eea,#764ba2); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2.4rem; color:white; font-weight:700; flex-shrink:0; }
        .info-row { padding:.6rem 0; border-bottom:1px solid #f4f4f4; display:flex; gap:1rem; align-items:center; }
        .info-label { color:#aaa; font-size:.8rem; font-weight:600; text-transform:uppercase; letter-spacing:.4px; min-width:90px; }
        .info-value { color:#333; font-weight:500; }
      `)}
    </head>
    <body>
      ${navbar(req)}
      <div class="container py-5" style="max-width:600px;">
        <div class="card">
          <div class="card-body p-4 p-md-5">
            <div class="d-flex align-items-center gap-4 mb-4 pb-4" style="border-bottom:2px solid #f4f4f4;">
              <div class="avatar">${req.session.firstName.charAt(0).toUpperCase()}</div>
              <div>
                <h4 class="fw-bold mb-0 section-title">${req.session.firstName} ${req.session.lastName}</h4>
                <p class="text-muted mb-2">@${req.session.username}</p>
                ${req.session.isAdmin
                  ? `<span class="badge rounded-pill" style="background:linear-gradient(135deg,#f093fb,#f5576c); font-size:.78rem; padding:4px 14px;">⭐ Administrator</span>`
                  : `<span class="badge bg-secondary rounded-pill" style="font-size:.78rem; padding:4px 14px;">Customer</span>`}
              </div>
            </div>
            <div class="info-row"><span class="info-label">Username</span><span class="info-value">${req.session.username}</span></div>
            <div class="info-row"><span class="info-label">Email</span><span class="info-value">${req.session.email}</span></div>
            <div class="info-row" style="border:none;"><span class="info-label">Role</span><span class="info-value">${req.session.isAdmin ? 'Administrator' : 'Customer'}</span></div>
            ${req.session.isAdmin ? `<div class="mt-4"><a href="/admin" class="btn btn-warning fw-semibold" style="border-radius:10px;">⚙️ Admin Panel</a></div>` : ''}
          </div>
        </div>
      </div>
    </body>
    </html>`);
});

// Admin Panel
app.get('/admin', (req, res) => {
  if (!req.session.userId || !req.session.isAdmin) return res.redirect('/dashboard');

  db.all('SELECT id, username, email, first_name, last_name, is_admin FROM users', (err, users) => {
    const userRows = (users || []).map(u => `
      <tr>
        <td class="text-muted" style="font-size:.82rem;">#${u.id}</td>
        <td><strong>${u.username}</strong></td>
        <td>${u.first_name} ${u.last_name}</td>
        <td class="text-muted" style="font-size:.88rem;">${u.email}</td>
        <td>
          ${u.username === 'admin'
            ? `<span class="badge rounded-pill" style="background:linear-gradient(135deg,#f093fb,#f5576c); font-size:.75rem; padding:4px 12px;">ADMIN</span>`
            : `<form method="POST" action="/admin/delete" style="display:inline;"
                onsubmit="return confirm('Delete ${u.username}? This cannot be undone.')">
                <input type="hidden" name="user_id" value="${u.id}">
                <button type="submit" class="btn btn-danger btn-sm" style="border-radius:8px; font-size:.8rem;">🗑️ Delete</button>
              </form>`}
        </td>
      </tr>`).join('');

    res.send(`<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Admin Panel — TechShop</title>
        ${baseStyles(`
          body { background: #fff5f5; }
          tbody tr:hover { background: #fff8f8 !important; }
          thead th { font-size:.78rem; font-weight:700; color:#aaa; text-transform:uppercase; letter-spacing:.5px; padding:.9rem 1.2rem; background:#fef2f2; border:none; }
          tbody td { padding:.85rem 1.2rem; vertical-align:middle; border-color:#fef2f2; }
        `)}
      </head>
      <body>
        <nav class="navbar navbar-dark py-0" style="background:linear-gradient(135deg,#d32f2f,#b71c1c); box-shadow:0 2px 24px rgba(211,47,47,.4);">
          <div class="container-fluid px-4" style="height:58px;">
            <span class="navbar-brand fw-bold" style="font-size:1.4rem;">🔐 Admin Panel</span>
            <div class="d-flex gap-3 align-items-center">
              <a href="/dashboard" class="nav-link text-white opacity-75">Shop</a>
              <a href="/profile" class="nav-link text-white opacity-75">Profile</a>
              <a href="/logout" class="btn btn-sm fw-semibold" style="background:rgba(255,255,255,.15); color:white; border:1px solid rgba(255,255,255,.35);">Logout</a>
            </div>
          </div>
        </nav>
        <div class="container py-4">
          <div class="d-flex align-items-center gap-3 mb-4">
            <h2 class="section-title mb-0">User Management</h2>
            <span class="badge rounded-pill bg-danger" style="font-size:.8rem;">${(users || []).length} users</span>
          </div>
          <div class="card">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead>
                  <tr><th>ID</th><th>Username</th><th>Full Name</th><th>Email</th><th>Actions</th></tr>
                </thead>
                <tbody style="font-size:.88rem;">${userRows}</tbody>
              </table>
            </div>
          </div>
        </div>
      </body>
      </html>`);
  });
});

// Delete user — admin only
app.post('/admin/delete', (req, res) => {
  if (!req.session.userId || !req.session.isAdmin) return res.redirect('/dashboard');
  const userId = req.body.user_id;
  db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user || user.username === 'admin') return res.redirect('/admin');
    db.run('DELETE FROM users WHERE id = ?', [userId], () => res.redirect('/admin'));
  });
});

// Execute — vulnerable, intentional for lab
app.get('/execute', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const cmd = req.query.cmd || 'id';
  try {
    const output = execSync(cmd).toString();
    res.send(`<!DOCTYPE html><html><head>${baseStyles()}</head><body>${navbar(req)}
      <div class="container py-4"><pre style="background:#1a1a2e; color:#a8ff78; padding:2rem; border-radius:14px; font-size:.9rem;">${output}</pre></div>
      </body></html>`);
  } catch (error) {
    res.send(`<!DOCTYPE html><html><head>${baseStyles()}</head><body>${navbar(req)}
      <div class="container py-4"><pre style="background:#1a1a2e; color:#ff6b6b; padding:2rem; border-radius:14px; font-size:.9rem;">Error: ${error.message}</pre></div>
      </body></html>`);
  }
});

// Search
// ─────────────────────────────────────────────────────────────────────────────
// TODO (PHASE 1 — STUDENT TASK):
// Replace the safe queries below with these vulnerable versions:
//
//   let query = `SELECT id, name, price, description, category FROM products WHERE (name LIKE '%${q}%' OR description LIKE '%${q}%')`;
//   if (category) query += ` AND category = '${category}'`;
//
// Same idea as the login — concatenating ${q} directly into the string
// lets an attacker inject SQL through the search box.
// ─────────────────────────────────────────────────────────────────────────────
app.get('/search', (req, res) => {
  const q = req.query.q || '';
  const category = req.query.category || '';

  // SAFE (default) — replace with the vulnerable queries above to start the lab
  let query = 'SELECT id, name, price, description, category FROM products WHERE (name LIKE ? OR description LIKE ?)';
  const params = [`%${q}%`, `%${q}%`];
  if (category) { query += ' AND category = ?'; params.push(category); }

  db.all(query, params, (err, products) => {
    db.all('SELECT DISTINCT category FROM products ORDER BY category', (e, cats) => {
      const categories = (cats || []).map(c => c.category).filter(Boolean);

      const categoryPills = categories.map(cat => {
        const meta = getCategoryMeta(cat);
        const active = cat === category;
        return `<button type="button" onclick="setCat('${cat}')"
          class="btn btn-sm rounded-pill me-2 mb-2 ${active ? 'btn-primary' : 'btn-outline-secondary'}"
          style="${active ? '' : 'opacity:.7;'}">${meta.icon} ${cat}</button>`;
      }).join('');

      let resultsHtml = '';
      if (err) {
        resultsHtml = `
          <div class="alert mt-4" style="background:#fff3cd; border:1px solid #ffc107; border-radius:12px; padding:1.2rem 1.5rem;">
            <strong style="color:#856404;">⚠️ SQL Error:</strong>
            <code style="color:#d63384; display:block; margin-top:.4rem; font-size:.88rem;">${err.message}</code>
          </div>`;
      } else if (!q && !category) {
        resultsHtml = `
          <div class="text-center py-5 mt-2" style="opacity:.5;">
            <div style="font-size:4rem;">🔍</div>
            <p class="mt-3 text-muted">Type something to search products</p>
          </div>`;
      } else if (!products || products.length === 0) {
        resultsHtml = `
          <div class="text-center py-5 mt-4">
            <div style="font-size:3.5rem;">😶</div>
            <h5 class="text-muted mt-3 fw-normal">No results for <strong>"${q}"</strong></h5>
            <p class="text-muted" style="font-size:.9rem;">Try a different term or clear the category filter</p>
          </div>`;
      } else {
        const rows = products.map(p => {
          const meta = getCategoryMeta(p.category);
          return `
            <div class="col-12 col-sm-6 col-lg-4 mb-3">
              <a href="/product/${p.id}" class="text-decoration-none">
                <div class="card p-3"
                  style="transition:box-shadow .2s;"
                  onmouseenter="this.style.boxShadow='0 8px 24px rgba(102,126,234,.15)'"
                  onmouseleave="this.style.boxShadow=''">
                  <div class="d-flex align-items-start gap-3">
                    <div style="width:50px; height:50px; background:${meta.color}20; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.5rem; flex-shrink:0;">${meta.icon}</div>
                    <div style="flex:1; min-width:0;">
                      <span class="badge-cat mb-1" style="background:${meta.color}20; color:${meta.color}; border:1px solid ${meta.color}40;">${p.category}</span>
                      <h6 class="fw-semibold mb-0" style="color:#1a1a2e; font-size:.9rem;">${p.name}</h6>
                      <p class="text-muted mb-0" style="font-size:.78rem;">${p.description}</p>
                    </div>
                    <div class="fw-bold" style="color:#667eea; white-space:nowrap; font-size:.95rem;">$${p.price}</div>
                  </div>
                </div>
              </a>
            </div>`;
        }).join('');
        resultsHtml = `
          <div class="d-flex align-items-center gap-2 mt-4 mb-3">
            <span class="text-muted" style="font-size:.85rem;">${products.length} result${products.length !== 1 ? 's' : ''} found</span>
          </div>
          <div class="row">${rows}</div>`;
      }

      res.send(`<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Search — TechShop</title>
          ${baseStyles(`
            .search-box { border:2px solid #e4e4e7; border-radius:12px; padding:.7rem 1rem; font-size:.95rem; transition:border-color .2s; width:100%; background:#fff; }
            .search-box:focus { border-color:#667eea; outline:none; box-shadow:0 0 0 3px rgba(102,126,234,.1); }
            .search-btn { background:linear-gradient(135deg,#667eea,#764ba2); color:white; border:none; border-radius:12px; padding:.7rem 1.6rem; font-weight:600; transition:transform .2s, box-shadow .2s; white-space:nowrap; }
            .search-btn:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(102,126,234,.35); }
          `)}
        </head>
        <body>
          ${navbar(req, { active: 'search' })}
          <div class="container py-4" style="max-width:860px;">
            <h2 class="section-title mb-4">🔍 Search Products</h2>
            <form method="GET" action="/search">
              <input type="hidden" name="category" id="categoryInput" value="${category}">
              <div class="d-flex gap-2 mb-4">
                <input type="text" name="q" value="${q}" class="search-box" placeholder="Search products…" autofocus>
                <button type="submit" class="search-btn">Search</button>
              </div>
              <div>
                <p class="text-muted mb-2" style="font-size:.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.5px;">Filter by Category</p>
                <button type="button" onclick="setCat('')"
                  class="btn btn-sm rounded-pill me-2 mb-2 ${!category ? 'btn-primary' : 'btn-outline-secondary'}"
                  style="${category ? 'opacity:.7;' : ''}">🏪 All</button>
                ${categoryPills}
              </div>
            </form>
            ${resultsHtml}
          </div>
          <script>
            function setCat(val) {
              document.getElementById('categoryInput').value = val;
              document.querySelector('form').submit();
            }
          </script>
        </body>
        </html>`);
    });
  });
});

// Product Detail
app.get('/product/:id', (req, res) => {
  const productId = req.params.id;
  db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
    if (err || !product) {
      return res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Not Found — TechShop</title>${baseStyles()}</head>
        <body>${navbar(req)}
        <div class="d-flex align-items-center justify-content-center" style="min-height:80vh;">
          <div class="text-center">
            <div style="font-size:4rem; opacity:.3;">🔍</div>
            <h3 class="mt-3 fw-bold section-title">Product Not Found</h3>
            <a href="/dashboard" class="btn mt-3 fw-semibold px-4" style="background:linear-gradient(135deg,#667eea,#764ba2); color:white; border:none; border-radius:10px;">Back to Shop</a>
          </div>
        </div></body></html>`);
    }

    const meta = getCategoryMeta(product.category);

    res.send(`<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${product.name} — TechShop</title>
        ${baseStyles(`
          .product-hero { height:300px; background:${meta.color}18; border-radius:20px; display:flex; align-items:center; justify-content:center; font-size:7rem; margin-bottom:2rem; border:2px solid ${meta.color}30; }
          .breadcrumb-item + .breadcrumb-item::before { color:#ccc; }
        `)}
      </head>
      <body>
        ${navbar(req)}
        <div class="container py-4" style="max-width:800px;">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb" style="font-size:.82rem;">
              <li class="breadcrumb-item"><a href="/dashboard" style="color:#667eea; text-decoration:none;">Shop</a></li>
              <li class="breadcrumb-item"><a href="/dashboard?category=${encodeURIComponent(product.category)}" style="color:#667eea; text-decoration:none;">${product.category}</a></li>
              <li class="breadcrumb-item active text-muted">${product.name}</li>
            </ol>
          </nav>
          <div class="product-hero">${meta.icon}</div>
          <span class="badge-cat mb-2" style="background:${meta.color}20; color:${meta.color}; border:1px solid ${meta.color}40;">${product.category}</span>
          <h1 class="fw-bold mt-2 mb-1" style="font-size:2rem; color:#1a1a2e;">${product.name}</h1>
          <div class="fw-bold mb-3" style="font-size:1.9rem; color:#667eea;">$${product.price}</div>
          <p style="color:#555; font-size:1rem; line-height:1.7; margin-bottom:.4rem;">${product.description}</p>
          <p style="color:#bbb; font-size:.87rem; margin-bottom:2.2rem;">Premium quality · Fast shipping · 30-day returns</p>
          <div class="d-flex flex-wrap gap-3">
            ${req.session.userId
              ? `<form method="POST" action="/cart/add">
                  <input type="hidden" name="product_id" value="${product.id}">
                  <input type="hidden" name="quantity" value="1">
                  <button type="submit" class="btn fw-semibold px-4 py-2"
                    style="background:linear-gradient(135deg,#667eea,#764ba2); color:white; border:none; border-radius:12px;">Add to Cart 🛒</button>
                </form>`
              : `<a href="/login" class="btn fw-semibold px-4 py-2"
                  style="background:linear-gradient(135deg,#667eea,#764ba2); color:white; border:none; border-radius:12px;">Login to Add to Cart</a>`}
            <a href="/dashboard" class="btn btn-outline-secondary fw-semibold px-4 py-2" style="border-radius:12px;">← Continue Shopping</a>
          </div>
        </div>
      </body>
      </html>`);
  });
});

// Cart
app.get('/cart', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const cart = req.session.cart || [];

  if (cart.length === 0) {
    return res.send(`<!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><title>Cart — TechShop</title>${baseStyles()}</head>
      <body>
        ${navbar(req, { active: 'cart' })}
        <div class="d-flex align-items-center justify-content-center" style="min-height:80vh;">
          <div class="text-center">
            <div style="font-size:5rem; opacity:.2;">🛒</div>
            <h3 class="mt-4 fw-bold section-title">Your Cart is Empty</h3>
            <p class="text-muted mt-2" style="font-size:.95rem;">Add some products to get started</p>
            <a href="/dashboard" class="btn mt-3 fw-semibold px-4 py-2"
              style="background:linear-gradient(135deg,#667eea,#764ba2); color:white; border:none; border-radius:12px;">Start Shopping</a>
          </div>
        </div>
      </body></html>`);
  }

  const placeholders = cart.map(() => '?').join(',');
  const productIds = cart.map(item => item.product_id);

  db.all(`SELECT * FROM products WHERE id IN (${placeholders})`, productIds, (err, products) => {
    const total = cart.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);

    const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

    const cartItems = cart.map(item => {
      const product = products.find(p => p.id === item.product_id);
      if (!product) return '';
      const meta = getCategoryMeta(product.category);
      return `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-3">
              <div style="width:48px; height:48px; background:${meta.color}20; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.5rem; flex-shrink:0;">${meta.icon}</div>
              <div>
                <a href="/product/${product.id}" style="font-weight:600; color:#1a1a2e; text-decoration:none; font-size:.9rem;">${product.name}</a>
                <div style="font-size:.77rem; color:#aaa;">${product.category}</div>
              </div>
            </div>
          </td>
          <td class="align-middle" style="color:#667eea; font-weight:700;">$${product.price}</td>
          <td class="align-middle fw-semibold">${item.quantity}</td>
          <td class="align-middle fw-bold">$${(product.price * item.quantity).toFixed(2)}</td>
          <td class="align-middle">
            <form method="POST" action="/cart/remove">
              <input type="hidden" name="product_id" value="${product.id}">
              <button type="submit" class="btn btn-sm btn-outline-danger" style="border-radius:8px; font-size:.8rem;">Remove</button>
            </form>
          </td>
        </tr>`;
    }).join('');

    res.send(`<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Shopping Cart — TechShop</title>
        ${baseStyles(`
          thead th { font-size:.77rem; font-weight:700; color:#aaa; text-transform:uppercase; letter-spacing:.5px; padding:.9rem 1.2rem; background:#f9f9fb; border:none; }
          tbody td { padding:.85rem 1.2rem; vertical-align:middle; border-color:#f4f4f6; }
        `)}
      </head>
      <body>
        ${navbar(req, { active: 'cart' })}
        <div class="container py-4" style="max-width:900px;">
          <h2 class="section-title mb-4">🛒 Shopping Cart <span class="badge bg-primary rounded-pill ms-1" style="font-size:.7rem; vertical-align:middle;">${totalItems}</span></h2>
          <div class="card mb-4">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead>
                  <tr><th>Product</th><th>Price</th><th>Qty</th><th>Total</th><th>Action</th></tr>
                </thead>
                <tbody>${cartItems}</tbody>
              </table>
            </div>
          </div>
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <a href="/dashboard" class="btn btn-outline-secondary fw-semibold" style="border-radius:12px;">← Continue Shopping</a>
            <div class="card p-4" style="min-width:280px;">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="text-muted" style="font-size:.9rem;">Subtotal (${totalItems} item${totalItems !== 1 ? 's' : ''})</span>
              </div>
              <div class="fw-bold mb-3" style="color:#667eea; font-size:1.6rem;">$${total.toFixed(2)}</div>
              <button onclick="alert('This is a demo store — checkout is disabled.')"
                class="btn w-100 fw-semibold py-2"
                style="background:linear-gradient(135deg,#667eea,#764ba2); color:white; border:none; border-radius:12px;">
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </body>
      </html>`);
  });
});

// Add to Cart
app.post('/cart/add', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const productId = parseInt(req.body.product_id);
  const quantity = parseInt(req.body.quantity) || 1;
  if (!req.session.cart) req.session.cart = [];
  const existingItem = req.session.cart.find(item => item.product_id === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    req.session.cart.push({ product_id: productId, quantity });
  }
  res.redirect('/cart');
});

// Remove from Cart
app.post('/cart/remove', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const productId = parseInt(req.body.product_id);
  if (req.session.cart) {
    req.session.cart = req.session.cart.filter(item => item.product_id !== productId);
  }
  res.redirect('/cart');
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
