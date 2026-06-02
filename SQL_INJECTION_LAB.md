# SQL Injection Vulnerability Lab - Student Guide

## What is SQL Injection?

**SQL Injection** is a security vulnerability where an attacker inserts malicious SQL code into input fields. This malicious code gets executed by the database, allowing attackers to:
- Bypass authentication (login without valid credentials)
- Extract unauthorized data
- Modify or delete data
- Gain administrative access

### Why does it happen?
When applications **concatenate user input directly into SQL queries** without proper protection, attackers can inject SQL commands that change the query's logic.

---

## Setup: Get the Lab Running Locally

Before you start, run the application on your machine:

```bash
# Navigate to the repo
cd securecorp-ctf

# Install dependencies
npm install

# Start the app
npm start
```

The app will start on `http://localhost:3000`. Open this in your browser.

**Demo User Credentials** (already seeded):
- **alice** / **alice123** ← Start here!
- bob / bob123
- carol / carol123
- admin / admin123 (your target)

---

## Step 1: Login as Alice

Start by logging into the application as a normal user to understand the interface.

### Your Task:

1. Open `http://localhost:3000/login`
2. Enter these credentials:
   - **Username:** alice
   - **Password:** alice123
3. Click "Login"
4. You should be redirected to the dashboard and see "👤 Alice" in the top right

### What You See:
- A product shop with 30 different tech items
- Navigation bar with: **Shop**, **Search**, **Cart**, **Profile**, **Logout**
- You are **NOT an admin** (no Admin button visible)

### Current State:
You are a regular user. Your goal is to:
1. Learn SQL injection via the **Search** feature
2. Escalate to **admin** privileges
3. **Delete user bob** from the admin panel

---

## Step 2: Discover the Search SQL Injection Vulnerability

The search feature is vulnerable to SQL injection. Let's explore it.

### Your Task:

1. Click on **"Search"** in the navbar
2. You'll see a search box with a text field
3. Try a normal search first:
   - Search for: `Headphones`
   - You should see products matching "Headphones"
4. Now try these experimental payloads:

| Search Query | Expected Result |
|--------------|-----------------|
| `test` | No results (product not found) |
| `Keyboard` | Shows keyboard products |
| `' OR '1'='1` | **Returns ALL products** ✅ (SQL injection!) |
| `'; DROP TABLE products; --` | Does nothing (likely filtered) |

### Try It Yourself:

Enter this in the search box:
```
' OR '1'='1
```

**What happens?** All products appear! This is your first SQL injection success.

### Why Did This Work?

The search endpoint builds a query like this:
```sql
SELECT * FROM products WHERE (name LIKE '%INPUT%' OR description LIKE '%INPUT%')
```

When you enter `' OR '1'='1`, the query becomes:
```sql
SELECT * FROM products WHERE (name LIKE '%' OR '1'='1'%' OR description LIKE '%' OR '1'='1'%')
```

The `'1'='1'` part is **always true**, so it returns everything!

---

## Step 3: Understanding SQL Injection in the Search

Now let's understand exactly how your injection works.

### The Vulnerable Code:

Look at `server.js` around line 550+ for the search endpoint:

```javascript
// VULNERABLE:
let query = `SELECT id, name, price, description, category FROM products WHERE (name LIKE '%${q}%' OR description LIKE '%${q}%')`;
if (category) query += ` AND category = '${category}'`;

db.all(query, (err, products) => { ... });
```

The query uses **direct string concatenation** (`${q}`), which allows SQL injection.

### Attack Template:

**Original Query:**
```sql
SELECT ... WHERE name LIKE '%INPUT%' OR description LIKE '%INPUT%'
```

**Your Injection:**
```
' OR '1'='1
```

**Resulting Query:**
```sql
SELECT ... WHERE name LIKE '%' OR '1'='1'%' OR description LIKE '%' OR '1'='1'%'
```

### Try More Payloads:

| Payload | Effect | Learning |
|---------|--------|----------|
| `' OR '1'='1` | All products shown | Always-true condition |
| `Headphones' --` | Just Headphones (comment out rest) | SQL comments (`--`) |
| `Keyboard' OR 'x'='x` | All products | Multiple always-true variations |

---

## Step 4: Escalate to Admin Privileges

Now that you understand SQL injection, use it to **become an admin** without knowing the admin password.

### Your Task:

The admin login uses a similar vulnerable query:
```javascript
const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
```

1. Click **"Logout"** (top right)
2. Go to **"Login"** page
3. Try this injection payload:
   - **Username:** `admin' --`
   - **Password:** `anything` (e.g., `x`)
4. Click "Login"

### What Happens:

Your payload transforms the query to:
```sql
SELECT * FROM users WHERE username = 'admin' --' AND password = 'x'
```

The `--` comments out everything after it, **removing the password check**. You bypass authentication! ✅

### Verify Admin Access:

After logging in:
1. Click your profile (top right) → should show "⭐ Administrator"
2. You should see an **"Admin"** button in the navbar
3. Click the **"Admin"** button

You now have admin panel access! You can see all users in the system.

### How This Attack Works:

| Component | Effect |
|-----------|--------|
| `admin' --` | Closes the string and starts SQL comment |
| `--` | Comments out the rest of the query (`' AND password = '...'`) |
| Result | Password check is completely skipped |

---

## Step 5: Delete User Bob (Your Goal!)

Now that you're admin, complete your lab objective: **delete user bob**.

### Your Task:

1. Click **"Admin"** in the navbar (now visible to you)
2. You'll see all users in a table:
   - admin (ADMIN badge - protected)
   - alice
   - bob ← Delete this one!
   - carol
3. Find the **"Delete"** button for **bob**
4. Click it and confirm the deletion
5. Verify bob no longer appears in the user list

### Congratulations! 🎉

You've successfully:
1. ✅ Logged in as alice
2. ✅ Discovered SQL injection in the search feature
3. ✅ Escalated to admin privileges
4. ✅ **Deleted user bob**

---

## Step 6: BONUS - Understanding UNION-Based Injection

For advanced students, here's a bonus technique: **UNION-based SQL injection**.

### What is UNION?

SQL's `UNION` operator combines results from multiple `SELECT` statements. For example:

```sql
SELECT id, name FROM products
UNION
SELECT id, username FROM users
```

This returns both product names AND usernames in the same result.

### UNION Injection Attack:

Go back to the Search page and try:

```
' UNION SELECT id, username, email, email, 'user' FROM users --
```

This injects a `UNION` statement to extract user data from the `users` table!

**What it does:**
1. The original query selects: `id, name, price, description, category FROM products`
2. You inject: `UNION SELECT id, username, email, email, 'user' FROM users`
3. Result: Products **and** user account details are shown together

**Try to extract:**
- All usernames
- All emails
- Can you figure out what data is stored in each column?

### UNION Injection Template:

```
' UNION SELECT column1, column2, column3, column4, column5 FROM table_name --
```

You need to:
1. Match the number of columns (5 in products table)
2. Guess the table name (try: `users`, `admin`, `accounts`)
3. Guess column names (try: `username`, `email`, `password`)

---

## Step 7: Fixing the Vulnerabilities (Remediation)

Now that you've exploited the vulnerabilities, let's learn how to fix them.

### The Problem:

Both vulnerable endpoints use **direct string concatenation**:

```javascript
// ❌ VULNERABLE
const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
const query = `SELECT * FROM products WHERE name LIKE '%${q}%' ...`;
```

### The Solution: Parameterized Queries

Use **parameterized queries** (prepared statements) where user input is **never** part of the query structure:

```javascript
// ✅ SAFE
const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
db.get(query, [username, password], (err, row) => { ... });

// ✅ SAFE (search)
let query = 'SELECT * FROM products WHERE (name LIKE ? OR description LIKE ?)';
db.all(query, [`%${q}%`, `%${q}%`], (err, products) => { ... });
```

### Key Differences:

| Vulnerable | Safe |
|-----------|------|
| `'${username}'` | `?` (placeholder) |
| User input is SQL code | User input is data |
| `admin' --` breaks the query | `admin' --` is treated as literal string |
| Can inject SQL | Injection impossible |

### Your Challenge:

Modify `server.js` to fix BOTH vulnerabilities:
1. Login endpoint (line ~130)
2. Search endpoint (line ~550)

Replace the vulnerable queries with parameterized versions. Test your fixes by trying the injection payloads again—they should fail!

---

## Summary: What You Learned

| Step | Concept | Outcome |
|------|---------|---------|
| 1 | Normal login | Understand the app |
| 2 | Search SQL injection | Discover vulnerability |
| 3 | Injection mechanics | Understand how `' OR '1'='1` works |
| 4 | Authentication bypass | Use `admin' --` to bypass login |
| 5 | Admin actions | Delete user bob ✅ |
| 6 | UNION injection | Extract data from other tables |
| 7 | Parameterized queries | Fix vulnerabilities |

---

## Key Takeaways

1. **Never concatenate user input into SQL queries** - Use parameterized queries instead
2. **SQL comments (`--`)** can hide password checks
3. **OR logic (`'1'='1')** makes conditions always true
4. **UNION** can extract data from unrelated tables
5. **Input validation is not enough** - Use prepared statements

---

## Verification Checklist

- [ ] Logged in as alice with correct credentials
- [ ] Found `' OR '1'='1` returns all products
- [ ] Used `admin' --` to bypass admin login
- [ ] Verified admin panel access
- [ ] Deleted user bob successfully
- [ ] Tried UNION injection (bonus)
- [ ] Fixed vulnerabilities using parameterized queries (bonus)

---

**Lab Complete!** 🏆
