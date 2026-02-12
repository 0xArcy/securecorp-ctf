<?php
/**
 * SECURE LOGIN EXAMPLE - SQL Injection Prevention Using Prepared Statements
 * 
 * This file demonstrates the CORRECT way to handle user authentication.
 * Compare this with the vulnerable index.php to understand the fix.
 */

session_start();

$DB_HOST = 'localhost';
$DB_USER = 'ctf_user';
$DB_PASS = 'password123';
$DB_NAME = 'company_db';

$conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$error_message = '';
$username_input = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    $username_input = htmlspecialchars($username);

    /**
     * SECURE: Using MySQLi Prepared Statements
     * 
     * Step 1: prepare($query)
     *   - Sends the SQL structure to the database
     *   - The '?' is a placeholder for user input
     *   - Database KNOWS: this is the query structure, nothing more
     * 
     * Step 2: bind_param('ss', $username, $password)
     *   - Binds actual user input to the placeholders
     *   - The 's' means: both parameters are STRINGS
     *   - The data is sent separately from the SQL code
     * 
     * Step 3: execute()
     *   - Sends the data to the database
     *   - Database treats the input as DATA only, never as CODE
     * 
     * WHY THIS PREVENTS SQL INJECTION:
     * - Vulnerable: "SELECT * FROM users WHERE username = '' OR 1=1--'"
     *   (The attacker's input modifies the SQL LOGIC)
     * - Secure: "SELECT * FROM users WHERE username = ?"
     *   (The input (' OR 1=1--') is treated as a literal STRING value)
     */

    // Step 1: Prepare the statement with placeholders
    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ? AND password = ?");

    if (!$stmt) {
        die("Prepare failed: " . $conn->error);
    }

    // Step 2: Bind parameters ('ss' = 2 STRING parameters)
    $stmt->bind_param("ss", $username, $password);

    // Step 3: Execute the prepared statement
    $stmt->execute();

    // Step 4: Get the result
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['first_name'] = $user['first_name'];
        $_SESSION['last_name'] = $user['last_name'];
        header("Location: dashboard.php");
        exit();
    } else {
        $error_message = "Invalid username or password.";
    }

    $stmt->close();
}

$conn->close();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secure Login Example</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .login-container {
            background: white;
            padding: 50px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 450px;
        }
        .login-header {
            text-align: center;
            margin-bottom: 40px;
        }
        .login-header h1 {
            color: #28a745;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        .login-header p {
            color: #999;
            font-size: 12px;
        }
        .form-control {
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 12px;
            font-size: 14px;
            margin-bottom: 15px;
        }
        .form-control:focus {
            border-color: #28a745;
            box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
        }
        .btn-login {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            border: none;
            color: white;
            padding: 12px;
            font-size: 16px;
            font-weight: 600;
            border-radius: 5px;
            width: 100%;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .btn-login:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(40, 167, 69, 0.4);
        }
        .code-block {
            background: #f5f5f5;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin-top: 20px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            border-radius: 5px;
            overflow-x: auto;
        }
        .alert {
            margin-bottom: 20px;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <h1>✓ SECURE Login</h1>
            <p>Protected with Prepared Statements</p>
        </div>

        <?php if ($error_message): ?>
            <div class="alert alert-danger" role="alert">
                <?php echo $error_message; ?>
            </div>
        <?php endif; ?>

        <form method="POST" action="">
            <input type="text" name="username" class="form-control" placeholder="Username" value="<?php echo $username_input; ?>" required>
            <input type="password" name="password" class="form-control" placeholder="Password" required>
            <button type="submit" class="btn-login">Sign In Securely</button>
        </form>

    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
