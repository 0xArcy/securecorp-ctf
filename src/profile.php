<?php
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: index.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Profile - SecureCorp</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background-color: #f0f2f5;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .navbar {
            background-color: #212529 !important; /* bg-dark */
        }
        .container-content {
            padding: 30px;
            max-width: 800px;
            margin: 0 auto;
        }
        .card {
            border: none;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .card-header {
            background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%);
            color: white;
            border-radius: 10px 10px 0 0 !important;
            font-weight: 600;
            padding: 15px 20px;
        }
        .card-body {
            padding: 20px;
        }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
        <div class="container">
            <a class="navbar-brand fw-bold" href="index.php">SecureCorp</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav me-auto">
                    <li class="nav-item"><a class="nav-link" href="dashboard.php">Dashboard</a></li>
                    <li class="nav-item"><a class="nav-link active" href="profile.php">Profile</a></li>
                    <li class="nav-item"><a class="nav-link" href="settings.php">Settings</a></li>
                </ul>
                <span class="navbar-text text-white me-3">
                    Welcome, <strong><?php echo htmlspecialchars($_SESSION['first_name'] . ' ' . $_SESSION['last_name']); ?></strong>
                </span>
                <a href="logout.php" class="btn btn-danger btn-sm">Logout</a>
            </div>
        </div>
    </nav>

    <div class="container-content mt-4">
        <div class="card">
            <div class="card-header">
                My Profile
            </div>
            <div class="card-body">
                <div class="row mb-3">
                    <div class="col-md-3 fw-bold">First Name:</div>
                    <div class="col-md-9"><?php echo htmlspecialchars($_SESSION['first_name']); ?></div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-3 fw-bold">Last Name:</div>
                    <div class="col-md-9"><?php echo htmlspecialchars($_SESSION['last_name']); ?></div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-3 fw-bold">Username:</div>
                    <div class="col-md-9"><?php echo htmlspecialchars($_SESSION['username']); ?></div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-3 fw-bold">Email:</div>
                    <div class="col-md-9"><?php echo htmlspecialchars($_SESSION['email']); ?></div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-3 fw-bold">Role:</div>
                    <div class="col-md-9"><span class="badge bg-primary">Employee</span></div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
