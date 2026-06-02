# SQL Injection Vulnerability Lab - Student Guide

## What is SQL Injection?

**SQL Injection** is a security vulnerability where an attacker inserts malicious SQL code into input fields. This malicious code gets executed by the database, allowing attackers to:
- Bypass authentication (login without valid credentials)
- Read unauthorized data
- Modify or delete data
- Execute administrative operations

### Why does it happen?
When applications **concatenate user input directly into SQL queries** without sanitization or validation, attackers can inject SQL commands that alter the query's logic.

---

## Setup: Get the Lab Running Locally

Before you start, run the application on your machine:

```bash
# Clone or navigate to the repo
cd securecorp-ctf

# Install dependencies
npm install

# Start the app
npm start
```

The app will start on `http://localhost:3000`. Open this in your browser.

**Demo Credentials** (already seeded in the database):
- admin / admin123 (administrator)
- alice / alice123
- bob / bob123
- carol / carol123

---

## Step 1: Write the Vulnerable Code

In this step, you will **write the vulnerable login code yourself** to understand how SQL injection happens.

### Your Task:

Open `server.js` in your editor and find the login POST route (around line 100). You'll see this skeleton:

```javascript
// Login POST - VULNERABLE TO SQL INJECTION
app.post('/login', (req, res) => {
  const username = req.body.username || '';
  const password = req.body.password || '';

  // TODO: Write a vulnerable query that concatenates username and password directly
  // const query = ???

  db.get(query, (err, row) => {
    if (err) {
      return res.send('Error');
    }

    if (row) {
      req.session.userId = row.id;
      req.session.username = row.username;
      req.session.isAdmin = row.is_admin;
      return res.redirect('/dashboard');
    }

    res.send('Invalid credentials');
  });
});
```

### Write Your Vulnerable Query:

Replace the `TODO` line with this vulnerable query:

```javascript
const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
```

**Why is this vulnerable?**
- The query directly inserts `username` and `password` into the SQL using template literals
- No validation or escaping happens
- An attacker can inject SQL code by crafting special input

### After Writing:

1. Save `server.js`
2. Restart the app: `npm start`
3. Open `http://localhost:3000/login`
4. Try a normal login with: admin / admin123 (should work)
5. Move to **Step 2** to learn how to exploit it

---

## Step 2: How SQL Queries Work & How to Exploit Your Code

Now that you've written the vulnerable query, let's understand **exactly** what happens when an attacker uses SQL injection against your code.

### Normal Login (No Injection)

When a user logs in normally with:
- Username: `admin`
- Password: `admin123`

Your code builds this SQL query:

```sql
SELECT * FROM users WHERE username = 'admin' AND password = 'admin123'
```

This query:
1. Looks for a user with username = 'admin' AND password = 'admin123'
2. If found, user is authenticated ✅

### SQL Injection Attack #1: Comment Bypass

An attacker enters:
- Username: `admin' --`
- Password: `anything` (ignored)

Your vulnerable code builds:

```sql
SELECT * FROM users WHERE username = 'admin' --' AND password = 'anything'
```

**What happens:**
- The `--` comments out everything after it
- The password check is **ignored** 
- Any user with username 'admin' is authenticated (regardless of password)
- **Attack succeeds!** ✅

### SQL Injection Attack #2: OR Logic

An attacker enters:
- Username: `' OR '1'='1`
- Password: `' OR '1'='1`

Your vulnerable code builds:

```sql
SELECT * FROM users WHERE username = '' OR '1'='1' AND password = '' OR '1'='1'
```

**What happens:**
- `'1'='1'` is always **true**
- The WHERE clause matches ANY user
- Database returns the first user (usually admin)
- **Attack succeeds!** ✅

### Try These Attacks Yourself

Open `http://localhost:3000/login` and try these payloads:

| Username | Password | What Happens |
|----------|----------|--------------|
| `admin' --` | `x` | Logs in as admin (password ignored) |
| `' OR '1'='1` | `anything` | Logs in as first user in DB |
| `alice' --` | `x` | Logs in as alice |
| `admin' OR '1'='1` | `x` | Logs in as admin |

After each successful injection login, you'll be redirected to `/dashboard` and see your username at the top.

---

## Step 3: Understanding the Attack Mechanics

### Template for Building Custom Payloads:

Your vulnerable query looks like this:
```sql
SELECT * FROM users WHERE username = 'INPUT1' AND password = 'INPUT2'
```

### You Can Try These Strategies:

**Strategy 1: Comment Out Password Check**
```
username: ' --
password: (anything)
Result: SELECT * FROM users WHERE username = '' -- AND password = '(anything)'
Effect: Password check is ignored!
```

**Strategy 2: OR Logic to Make True Condition**
```
username: ' OR '1'='1
password: (anything)
Result: SELECT * FROM users WHERE username = '' OR '1'='1' AND password = '(anything)'
Effect: Returns first user (usually admin)
```

**Strategy 3: Combine Strategies**
```
username: admin' OR '1'='1 --
password: (anything)
Result: SELECT * FROM users WHERE username = 'admin' OR '1'='1' -- AND password = '(anything)'
Effect: Logs in as admin
```

---

## Step 4: Getting Admin Access via Injection

You can now use SQL injection to gain admin access **without knowing the password**!

### Easy Admin Bypass:

1. Open `http://localhost:3000/login`
2. Enter: `admin' --` in the username field
3. Enter anything in the password field (e.g., `x`)
4. Click Login

You're now logged in as **admin**! ✅

### Verify Admin Access:

1. You should be redirected to the dashboard
2. Click your avatar/profile (top right) → "Admin Panel"
3. You can now see all users and delete them
4. Try deleting alice, bob, and carol

### What You Just Did:

You exploited the vulnerable query you wrote. The injection payload bypassed the password check by commenting it out with `--`.

---

## Step 5: More Injection Attacks on Search

The `/search` endpoint also uses vulnerable code (that you wrote). Try these payloads:

Open `http://localhost:3000/search` and try:

| Query | Effect |
|-------|--------|
| `' OR '1'='1` | Returns all products |
| `Headphones' --` | Searches for Headphones, ignores rest |
| `' UNION SELECT id, username, password, email, category FROM users --` | Attempts UNION-based extraction (if columns match) |

---

## Step 6: Fixing the Code (Remediation)

Now that you understand how your vulnerable code can be exploited, let's fix it!

### The Vulnerable Code You Wrote:

```javascript
// VULNERABLE - what you wrote in Step 1
const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
db.get(query, (err, row) => { ... });
```

### The Secure Code You Should Write Now:

Replace your vulnerable query with **parameterized queries** (also called prepared statements):

```javascript
// SECURE - use parameterized queries
const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
db.get(query, [username, password], (err, row) => { ... });
```

### How Parameterized Queries Work:

1. The SQL structure is defined **FIRST**: `'SELECT * FROM users WHERE username = ? AND password = ?'`
2. The `?` placeholders are replaced by the database engine, not by string concatenation
3. User input is treated as **DATA ONLY**, never as executable SQL code
4. Even if a user enters `admin' --`, it's stored as a literal string value

### Your Task:

1. Open `server.js`
2. Find the vulnerable query you wrote in the login route
3. Replace it with the parameterized version above
4. Do the same for the `/search` endpoint:

```javascript
// VULNERABLE (what you wrote):
let query = `SELECT id, name, price, description, category FROM products WHERE (name LIKE '%${q}%' OR description LIKE '%${q}%')`;

// SECURE (what you should write):
let query = 'SELECT id, name, price, description, category FROM products WHERE (name LIKE ? OR description LIKE ?)';
db.all(query, [`%${q}%`, `%${q}%`], (err, products) => { ... });
```

### Test Your Fix:

1. Restart the app: `npm start`
2. Try the injection payloads again: `admin' --` in the login form
3. **They won't work anymore!** ✅
4. Only valid credentials work now: admin / admin123
5. Try searching with: `' OR '1'='1` - it will search for that literal string instead of returning all products

### Summary of Changes:

| Before (Vulnerable) | After (Secure) |
|---------------------|----------------|
| `` `... ${username} ...` `` | `'... ? ...'` with `[username]` |
| User input is executable SQL | User input is data only |
| Exploitable by injection | Injection attacks fail |

---

## Congratulations! 🎓

You have:
1. ✅ Written vulnerable SQL injection code
2. ✅ Understood how SQL injection attacks work
3. ✅ Exploited your own code
4. ✅ Fixed the vulnerability using parameterized queries
5. ✅ Verified that injection no longer works

---

## Summary of All Steps

| Step | Task | Key Learning |
|------|------|--------------|
| 1 | Write vulnerable code | Direct string concatenation is dangerous |
| 2 | Learn attack mechanics | Comments (`--`) and OR logic (`'1'='1'`) bypass logic |
| 3 | Build custom payloads | Understand how to construct injection attacks |
| 4 | Exploit your code | Demonstrate real impact (admin bypass) |
| 5 | Try more attacks | Search endpoint and UNION-based techniques |
| 6 | Fix the code | Use parameterized queries for safety |

---

## Key Takeaways

✅ **Always use parameterized queries / prepared statements**
✅ **Never concatenate user input directly into SQL**
✅ **Validate and sanitize all user inputs**
✅ **Use ORM frameworks that handle escaping automatically**
✅ **Apply principle of least privilege to database accounts**

---

## Additional Challenges (Optional)

1. **Try other users:** Use SQL injection to login as `user1`, `user2`, `user3`
2. **Extract password hashes:** Modify payloads to dump user data using UNION SELECT
3. **Bypass other forms:** Check if other parts of the app have injection vulnerabilities
4. **Time-based injection:** Experiment with time delays to extract data character-by-character

---

## Resources

- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [SQLite Query Language](https://www.sqlite.org/lang.html)
- [Prepared Statements](https://en.wikipedia.org/wiki/Prepared_statement)

---

## Update: Deployment & Persistence (2026-06-02)

### For Local Testing (Recommended for Students)

Just use:
```bash
npm install
npm start
```

Then open `http://localhost:3000`. The app uses a file-backed SQLite database (`data.sqlite`) so all data persists across restarts.

### For Production Deployment (Teachers/Labs on Debian/Ubuntu)

If you want to deploy this lab to a production Debian/Ubuntu server with Apache as a reverse proxy:

```bash
sudo bash deploy/setup.sh
```

This script:
- Installs Node.js, npm, Apache, and build tools
- Copies app files to `/var/www/ecommerce`
- Creates a systemd service `ecommerce.service` to keep the Node app running
- Configures Apache to proxy port 80 → Node.js port 3000
- Persists the SQLite database so seeded users and products survive restarts

**Note:** The deploy script is for production server setup only. For classroom/local use, just run `npm start`.

### Database Details

- **Persistent SQLite DB**: File-backed `data.sqlite` created in the app directory. All SQL queries run against this file.
- **Seeded users** (on first run):
  - admin / admin123 (is_admin = 1)
  - alice / alice123
  - bob / bob123
  - carol / carol123
- **30+ seeded products** with categories (Electronics, Cables, Accessories, Gaming, etc.) for richer search and injection exercises.

### Search Endpoint (Also Vulnerable)

A new route `GET /search?q=...` performs a vulnerable LIKE query:

```javascript
// VULNERABLE: direct concatenation
const query = `SELECT id, name, price, description, category FROM products WHERE (name LIKE '%${q}%' OR description LIKE '%${q}%')`;
if (category) query += ` AND category = '${category}'`;
```

Students can practice SQL injection payloads here too, including UNION-based attacks.

---

**If you'd like, I can add a `--vulnerable` / `--fixed` toggle to `deploy/setup.sh` so teachers can deploy either the intentionally vulnerable build or a fixed (parameterized queries) version for remediation demonstrations.** 
