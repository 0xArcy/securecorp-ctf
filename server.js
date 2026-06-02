const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
const PORT = 3000;

// Database setup (persistent file so seeded users persist across restarts)
const DB_FILE = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(DB_FILE);

// Session config
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Initialize database
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT,
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
    description TEXT
  )`);

  // Seed data only if users table is empty
  db.get('SELECT COUNT(*) AS c FROM users', (err, row) => {
    if (!err && row && row.c === 0) {
      db.run("INSERT INTO users (username, password, email, first_name, last_name, is_admin) VALUES ('admin', 'admin123', 'admin@shop.com', 'Admin', 'User', 1)");
      db.run("INSERT INTO users (username, password, email, first_name, last_name, is_admin) VALUES ('alice', 'alice123', 'alice@shop.com', 'Alice', 'Cooper', 0)");
      db.run("INSERT INTO users (username, password, email, first_name, last_name, is_admin) VALUES ('bob', 'bob123', 'bob@shop.com', 'Bob', 'Builder', 0)");
      db.run("INSERT INTO users (username, password, email, first_name, last_name, is_admin) VALUES ('carol', 'carol123', 'carol@shop.com', 'Carol', 'Danvers', 0)");
    }
  });

  // Seed products only if products table is empty
  db.get('SELECT COUNT(*) AS c FROM products', (err, row) => {
    if (!err && row && row.c === 0) {
      db.run("INSERT INTO products (name, price, description) VALUES ('Wireless Headphones', 79.99, 'Premium noise-cancelling headphones')");
      db.run("INSERT INTO products (name, price, description) VALUES ('USB-C Cable', 12.99, 'Fast charging cable 2m')");
      db.run("INSERT INTO products (name, price, description) VALUES ('Laptop Stand', 34.99, 'Adjustable aluminum stand')");
      db.run("INSERT INTO products (name, price, description) VALUES ('Mechanical Keyboard', 89.99, 'RGB backlit gaming keyboard')");
      db.run("INSERT INTO products (name, price, description) VALUES ('Wireless Mouse', 24.99, 'Precision optical sensor')");
      db.run("INSERT INTO products (name, price, description) VALUES ('4K Webcam', 59.99, 'Ultra HD video streaming')");
      db.run("INSERT INTO products (name, price, description) VALUES ('Phone Case', 14.99, 'Durable protective case')");
      db.run("INSERT INTO products (name, price, description) VALUES ('Screen Protector', 8.99, 'Tempered glass protection')");
      db.run("INSERT INTO products (name, price, description) VALUES ('Power Bank', 44.99, '20000mAh fast charging')");
      db.run("INSERT INTO products (name, price, description) VALUES ('USB Hub', 19.99, '7-port USB 3.0 hub')");
    }
  });
});

// Routes

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login POST - VULNERABLE TO SQL INJECTION
app.post('/login', (req, res) => {
  const username = req.body.username || '';
  const password = req.body.password || '';

  // VULNERABLE: Direct string concatenation (SQL Injection)
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  db.get(query, (err, row) => {
    if (err) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          <style>
            body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
            .card { border: none; border-radius: 12px; max-width: 500px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="card-body p-5 text-center">
              <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
              <h4 class="text-danger">Error</h4>
              <p>Invalid credentials or server error.</p>
              <a href="/login" class="btn btn-primary mt-3">Back to Login</a>
            </div>
          </div>
        </body>
        </html>
      `);
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

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
          .card { border: none; border-radius: 12px; max-width: 500px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="card-body p-5 text-center">
            <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
            <h4 class="text-danger">Invalid Credentials</h4>
            <p>Username or password is incorrect.</p>
            <a href="/login" class="btn btn-primary mt-3">Back to Login</a>
          </div>
        </div>
      </body>
      </html>
    `);
  });
});

// Dashboard (guest access allowed)
app.get('/dashboard', (req, res) => {
  db.all('SELECT * FROM products', (err, products) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#ABEBC6'];
    
    const productsList = products.map((p, i) => `
      <div class="col-md-6 col-lg-3 mb-4">
        <div class="product-card">
          <div class="product-image" style="background: ${colors[i % colors.length]};">
            <div class="placeholder-icon">📦</div>
          </div>
          <div class="product-info">
            <h5 class="product-title">${p.name}</h5>
            <p class="product-desc">${p.description}</p>
            <div class="product-footer">
              <span class="price">$${p.price}</span>
              <a href="/product/${p.id}" class="btn-view">View</a>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    const userSection = req.session.userId 
      ? `<span class="text-white me-3">👤 ${req.session.firstName}</span>
         <a href="/profile" class="btn btn-light btn-sm me-2">Profile</a>
         <a href="/logout" class="btn btn-danger btn-sm">Logout</a>`
      : `<a href="/login" class="btn btn-light btn-sm me-2">Login</a>`;

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>TechShop - E-Commerce</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; }
          body { background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          .navbar { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1rem 0; }
          .navbar-brand { font-weight: 700; font-size: 1.5rem; }
          .container { margin-top: 2rem; margin-bottom: 2rem; }
          h2 { margin-bottom: 1.5rem; font-weight: 700; color: #333; }
          
          .product-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.3s, box-shadow 0.3s;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          
          .product-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.15);
          }
          
          .product-image {
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          }
          
          .placeholder-icon {
            font-size: 4rem;
            opacity: 0.8;
          }
          
          .product-info {
            padding: 1.2rem;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
          }
          
          .product-title {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #333;
          }
          
          .product-desc {
            font-size: 0.85rem;
            color: #666;
            margin-bottom: 1rem;
            flex-grow: 1;
          }
          
          .product-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 1rem;
            border-top: 1px solid #eee;
          }
          
          .price {
            font-size: 1.2rem;
            font-weight: 700;
            color: #667eea;
          }
          
          .btn-view {
            background: #667eea;
            color: white;
            border: none;
            padding: 0.4rem 0.8rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: background 0.3s;
            text-decoration: none;
            display: inline-block;
          }
          
          .btn-view:hover {
            background: #764ba2;
            color: white;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <nav class="navbar navbar-dark">
          <div class="container-fluid">
            <a href="/" class="navbar-brand">🛍️ TechShop</a>
            <div>
              <a href="/dashboard" class="btn btn-light btn-sm me-2">Shop</a>
              <a href="/search" class="btn btn-light btn-sm me-2">Search</a>
              <a href="/cart" class="btn btn-light btn-sm me-2">🛒 Cart</a>
              ${req.session.userId ? `<span class="text-white me-3">👤 ${req.session.firstName}</span>` : ''}
              ${req.session.userId ? `<a href="/logout" class="btn btn-danger btn-sm">Logout</a>` : `<a href="/login" class="btn btn-light btn-sm me-2">Login</a>`}
            </div>
          </div>
        </nav>
        
        <div class="container">
          <h2>Featured Products</h2>
          <div class="row">
            ${productsList}
          </div>
        </div>
      </body>
      </html>
      </html>
    `);
  });
});

// Profile page - Simple user profile
app.get('/profile', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const adminLink = req.session.isAdmin ? `<a href="/admin" class="btn btn-warning btn-sm">Admin Panel</a>` : '';

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Profile - TechShop</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; }
        body { 
          background-color: #f8f9fa;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .navbar { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .navbar-brand { font-weight: 700; font-size: 1.5rem; }
        .container { margin-top: 2rem; margin-bottom: 2rem; }
        .card { 
          border: none; 
          border-radius: 12px; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 1.5rem;
        }
        .card-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px 12px 0 0 !important;
          padding: 1.2rem;
          font-weight: 600;
        }
        .profile-info {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .avatar {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          color: white;
        }
        .profile-details h5 { margin: 0; color: #333; }
        .profile-details p { color: #666; font-size: 0.9rem; margin: 5px 0; }
        .badge-admin {
          display: inline-block;
          background: #ffc107;
          color: #333;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-top: 5px;
        }
      </style>
    </head>
    <body>
      <nav class="navbar navbar-dark">
        <div class="container-fluid">
          <span class="navbar-brand">🛍️ TechShop</span>
          <div>
              <a href="/dashboard" class="btn btn-light btn-sm me-2">Shop</a>
              <a href="/search" class="btn btn-light btn-sm me-2">Search</a>
              ${adminLink}
            <a href="/logout" class="btn btn-danger btn-sm">Logout</a>
          </div>
        </div>
      </nav>
      
      <div class="container" style="max-width: 600px;">
        <div class="card">
          <div class="card-header">My Profile</div>
          <div class="card-body">
            <div class="profile-info">
              <div class="avatar">${req.session.firstName.charAt(0).toUpperCase()}</div>
              <div class="profile-details">
                <h5>${req.session.firstName} ${req.session.lastName}</h5>
                <p><strong>Username:</strong> ${req.session.username}</p>
                <p><strong>Email:</strong> ${req.session.email}</p>
                ${req.session.isAdmin ? '<div class="badge-admin">⭐ Administrator</div>' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Admin Panel - Only accessible to admin
app.get('/admin', (req, res) => {
  if (!req.session.userId || !req.session.isAdmin) {
    return res.redirect('/dashboard');
  }

  db.all('SELECT id, username, email, first_name, last_name FROM users', (err, users) => {
    const userRows = users.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${u.username}</td>
        <td>${u.first_name} ${u.last_name}</td>
        <td>${u.email}</td>
        <td>
          ${u.username === 'admin' ? 
            '<span class="badge bg-warning text-dark">ADMIN</span>' : 
            `<form method="POST" action="/admin/delete" style="display:inline;">
              <input type="hidden" name="user_id" value="${u.id}">
              <button type="submit" class="btn btn-danger btn-sm" onclick="return confirm('Delete this user?')">Delete</button>
            </form>`
          }
        </td>
      </tr>
    `).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Admin Panel - TechShop</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; }
          body { 
            background-color: #f8f9fa;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .navbar { background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%); }
          .navbar-brand { font-weight: 700; font-size: 1.5rem; }
          .container { margin-top: 2rem; margin-bottom: 2rem; }
          .card { 
            border: none; 
            border-radius: 12px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .card-header {
            background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
            color: white;
            border-radius: 12px 12px 0 0 !important;
            padding: 1.2rem;
            font-weight: 600;
          }
          .table { margin-bottom: 0; }
          .table thead { background: #f5f5f5; }
          .table tbody tr:hover { background: #fafafa; }
        </style>
      </head>
      <body>
        <nav class="navbar navbar-dark">
          <div class="container-fluid">
            <span class="navbar-brand">🔐 Admin Panel</span>
            <div>
                <a href="/dashboard" class="btn btn-light btn-sm me-2">Shop</a>
                <a href="/search" class="btn btn-light btn-sm me-2">Search</a>
                <a href="/profile" class="btn btn-light btn-sm me-2">Profile</a>
              <a href="/logout" class="btn btn-danger btn-sm">Logout</a>
            </div>
          </div>
        </nav>
        
        <div class="container">
          <div class="card">
            <div class="card-header">User Management</div>
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${userRows}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  });
});

// Delete user - Admin only
app.post('/admin/delete', (req, res) => {
  if (!req.session.userId || !req.session.isAdmin) {
    return res.redirect('/dashboard');
  }

  const userId = req.body.user_id;
  
  // Prevent admin from deleting admin account
  db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user || user.username === 'admin') {
      return res.redirect('/admin');
    }

    db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
      res.redirect('/admin');
    });
  });
});

// Simple file execution endpoint (for demonstration)
app.get('/execute', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const cmd = req.query.cmd || 'id';
  
  try {
    // VULNERABLE: Direct command execution
    const output = execSync(cmd).toString();
    res.send(`<pre>${output}</pre>`);
  } catch (error) {
    res.send(`<pre>Error: ${error.message}</pre>`);
  }
});

// Search endpoint (VULNERABLE TO SQL INJECTION) - intentionally unsafe for lab
app.get('/search', (req, res) => {
  const q = req.query.q || '';

  // VULNERABLE: direct concatenation into SQL (teaches SQL injection)
  const query = `SELECT * FROM products WHERE name LIKE '%${q}%' OR description LIKE '%${q}%'`;

  db.all(query, (err, products) => {
    if (err) return res.send(`<p>Error running query: ${err.message}</p>`);

    const resultsList = products.map(p => `<li><a href="/product/${p.id}">${p.name} - $${p.price}</a></li>`).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Search Results</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body>
        <div class="container" style="margin-top:2rem;">
          <h2>Search results for "${q}"</h2>
          <ul>
            ${resultsList}
          </ul>
          <a href="/dashboard" class="btn btn-secondary mt-3">Back to Shop</a>
        </div>
      </body>
      </html>
    `);
  });
});

// Product Detail Page
app.get('/product/:id', (req, res) => {
  const productId = req.params.id;
  
  db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
    if (err || !product) {
      return res.send('<h2>Product not found</h2><a href="/dashboard">Back to Shop</a>');
    }

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#ABEBC6'];
    const bgColor = colors[productId % colors.length];

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${product.name} - TechShop</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; }
          body { 
            background-color: #f8f9fa;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .navbar { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          .navbar-brand { font-weight: 700; font-size: 1.5rem; }
          .container { margin-top: 2rem; margin-bottom: 2rem; }
          .product-image {
            height: 400px;
            background: ${bgColor};
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 8rem;
            opacity: 0.8;
            border-radius: 12px;
            margin-bottom: 2rem;
          }
          .product-title {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: #333;
          }
          .product-price {
            font-size: 2rem;
            color: #667eea;
            font-weight: 700;
            margin-bottom: 1.5rem;
          }
          .product-desc {
            font-size: 1.1rem;
            color: #666;
            margin-bottom: 2rem;
            line-height: 1.6;
          }
          .btn-action {
            padding: 12px 30px;
            font-weight: 600;
            border-radius: 8px;
            margin-right: 10px;
          }
          .btn-add-cart {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
          }
          .btn-add-cart:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
            color: white;
          }
          .btn-back {
            background: #f0f0f0;
            color: #333;
            border: 1px solid #ddd;
          }
          .btn-back:hover {
            background: #e0e0e0;
            text-decoration: none;
            color: #333;
          }
        </style>
      </head>
      <body>
        <nav class="navbar navbar-dark">
          <div class="container-fluid">
            <a href="/" class="navbar-brand">🛍️ TechShop</a>
            <div>
                <a href="/dashboard" class="btn btn-light btn-sm me-2">Shop</a>
                <a href="/search" class="btn btn-light btn-sm me-2">Search</a>
                <a href="/cart" class="btn btn-light btn-sm me-2">🛒 Cart</a>
              ${req.session.userId ? `<span class="text-white me-3">👤 ${req.session.firstName}</span>` : ''}
              ${req.session.userId ? `<a href="/logout" class="btn btn-danger btn-sm">Logout</a>` : `<a href="/login" class="btn btn-light btn-sm">Login</a>`}
            </div>
          </div>
        </nav>
        
        <div class="container" style="max-width: 800px;">
          <div class="product-image">📦</div>
          <h1 class="product-title">${product.name}</h1>
          <div class="product-price">$${product.price}</div>
          <div class="product-desc">
            ${product.description}
            <p style="margin-top: 1.5rem; color: #999;">Premium quality product with excellent reviews. Fast shipping available.</p>
          </div>
          
          <div>
            ${req.session.userId ? `
              <form method="POST" action="/cart/add" style="display: inline;">
                <input type="hidden" name="product_id" value="${product.id}">
                <input type="hidden" name="quantity" value="1">
                <button type="submit" class="btn btn-action btn-add-cart">Add to Cart</button>
              </form>
            ` : `
              <a href="/login" class="btn btn-action btn-add-cart">Login to Add to Cart</a>
            `}
            <a href="/dashboard" class="btn btn-action btn-back">Continue Shopping</a>
          </div>
        </div>
      </body>
      </html>
    `);
  });
});

// Cart Page
app.get('/cart', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const cart = req.session.cart || [];
  
  if (cart.length === 0) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cart - TechShop</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; }
          body { 
            background-color: #f8f9fa;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .navbar { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          .navbar-brand { font-weight: 700; font-size: 1.5rem; }
          .container { margin-top: 2rem; }
        </style>
      </head>
      <body>
        <nav class="navbar navbar-dark">
          <div class="container-fluid">
            <a href="/" class="navbar-brand">🛍️ TechShop</a>
            <div>
                <a href="/dashboard" class="btn btn-light btn-sm me-2">Shop</a>
                <a href="/search" class="btn btn-light btn-sm me-2">Search</a>
                <span class="text-white me-3">👤 ${req.session.firstName}</span>
              <a href="/logout" class="btn btn-danger btn-sm">Logout</a>
            </div>
          </div>
        </nav>
        
        <div class="container text-center mt-5">
          <div style="font-size: 4rem; margin-bottom: 1rem;">🛒</div>
          <h2>Your Cart is Empty</h2>
          <p class="text-muted mt-3">Start shopping to add items to your cart</p>
          <a href="/dashboard" class="btn btn-primary mt-3">Continue Shopping</a>
        </div>
      </body>
      </html>
    `);
  }

  // Get product details for cart items
  const placeholders = cart.map(() => '?').join(',');
  const productIds = cart.map(item => item.product_id);
  
  db.all(`SELECT * FROM products WHERE id IN (${placeholders})`, productIds, (err, products) => {
    const cartItems = cart.map(item => {
      const product = products.find(p => p.id === item.product_id);
      if (!product) return '';
      return `
        <tr>
          <td>${product.name}</td>
          <td>$${product.price}</td>
          <td>${item.quantity}</td>
          <td>$${(product.price * item.quantity).toFixed(2)}</td>
          <td>
            <form method="POST" action="/cart/remove" style="display: inline;">
              <input type="hidden" name="product_id" value="${product.id}">
              <button type="submit" class="btn btn-danger btn-sm">Remove</button>
            </form>
          </td>
        </tr>
      `;
    }).join('');

    const total = cart.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Shopping Cart - TechShop</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; }
          body { 
            background-color: #f8f9fa;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .navbar { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          .navbar-brand { font-weight: 700; font-size: 1.5rem; }
          .container { margin-top: 2rem; margin-bottom: 2rem; }
          .card { 
            border: none; 
            border-radius: 12px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .table { margin-bottom: 0; }
          .summary { 
            background: #f0f0f0; 
            padding: 1.5rem; 
            border-radius: 8px; 
            margin-top: 2rem;
            text-align: right;
          }
          .summary h4 {
            color: #667eea;
            font-weight: 700;
            font-size: 1.8rem;
          }
          .btn-checkout {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 8px;
            margin-top: 1rem;
          }
          .btn-checkout:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
            color: white;
          }
        </style>
      </head>
      <body>
        <nav class="navbar navbar-dark">
          <div class="container-fluid">
            <a href="/" class="navbar-brand">🛍️ TechShop</a>
            <div>
                <a href="/dashboard" class="btn btn-light btn-sm me-2">Shop</a>
                <a href="/search" class="btn btn-light btn-sm me-2">Search</a>
                <span class="text-white me-3">👤 ${req.session.firstName}</span>
              <a href="/logout" class="btn btn-danger btn-sm">Logout</a>
            </div>
          </div>
        </nav>
        
        <div class="container" style="max-width: 1000px;">
          <h2 class="mb-4">Shopping Cart (${cart.length} items)</h2>
          
          <div class="table-responsive">
            <table class="table">
              <thead style="background: #f5f5f5;">
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${cartItems}
              </tbody>
            </table>
          </div>

          <div class="summary">
            <h4>Total: $${total.toFixed(2)}</h4>
            <button onclick="alert('This is a demo store. Checkout is disabled.')" class="btn btn-checkout">Proceed to Checkout</button>
          </div>

          <a href="/dashboard" class="btn btn-secondary mt-3">Continue Shopping</a>
        </div>
      </body>
      </html>
    `);
  });
});

// Add to Cart
app.post('/cart/add', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const productId = parseInt(req.body.product_id);
  const quantity = parseInt(req.body.quantity) || 1;

  if (!req.session.cart) {
    req.session.cart = [];
  }

  // Check if product already in cart
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
  if (!req.session.userId) {
    return res.redirect('/login');
  }

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
