<?php
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: index.php");
    exit();
}

$upload_message = '';
$upload_error = '';
$files = [];

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_FILES['profile_photo'])) {
        $file = $_FILES['profile_photo'];
        $filename = $file['name'];
        $tmp_name = $file['tmp_name'];
        $file_size = $file['size'];

        // VULNERABLE: Zero validation!
        // No MIME type check, no extension whitelist, no file size check
        // This allows arbitrary file upload including PHP shell scripts

        $upload_dir = '/var/www/html/uploads/';
        $target_file = $upload_dir . basename($filename);

        if (move_uploaded_file($tmp_name, $target_file)) {
            $upload_message = "File '{$filename}' uploaded successfully!";
        } else {
            $upload_error = "Failed to upload file.";
        }
    }
}

// List uploaded files
$upload_dir = '/var/www/html/uploads/';
if (is_dir($upload_dir)) {
    $files = array_diff(scandir($upload_dir), array('.', '..'));
}

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Employee Dashboard - Corporate Portal</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background-color: #f0f2f5;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .navbar {
            background-color: #212529 !important; /* bg-dark */
        }
        .navbar-brand {
            font-weight: 700;
            font-size: 20px;
        }
        .dashboard-container {
            padding: 30px;
            max-width: 1000px;
            margin: 0 auto;
        }
        .card {
            border: none;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
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
        .profile-section {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 20px;
        }
        .profile-avatar {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 32px;
            font-weight: 700;
        }
        .form-control, .form-label {
            margin-bottom: 10px;
        }
        .btn-primary {
            background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%);
            border: none;
        }
        .btn-primary:hover {
            background: linear-gradient(135deg, #0a58ca 0%, #0d6efd 100%);
        }
        .btn-logout {
            background-color: #dc3545;
            border: none;
        }
        .btn-logout:hover {
            background-color: #c82333;
        }
        .alert {
            border-radius: 10px;
        }
        .file-list {
            list-style: none;
            padding: 0;
        }
        .file-list li {
            padding: 10px;
            background: #f8f9fa;
            margin-bottom: 5px;
            border-radius: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
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
                    <li class="nav-item"><a class="nav-link active" href="dashboard.php">Dashboard</a></li>
                    <li class="nav-item"><a class="nav-link" href="profile.php">Profile</a></li>
                    <li class="nav-item"><a class="nav-link" href="settings.php">Settings</a></li>
                </ul>
                <span class="navbar-text text-white me-3">
                    Welcome, <strong><?php echo htmlspecialchars($_SESSION['first_name'] . ' ' . $_SESSION['last_name']); ?></strong>
                </span>
                <a href="logout.php" class="btn btn-danger btn-sm">Logout</a>
            </div>
        </div>
    </nav>

    <div class="dashboard-container">
        <!-- Welcome Section -->
        <div class="card">
            <div class="card-header">
                Profile Information
            </div>
            <div class="card-body">
                <div class="profile-section">
                    <div class="profile-avatar">
                        <?php echo strtoupper(substr($_SESSION['first_name'], 0, 1)); ?>
                    </div>
                    <div>
                        <h4 class="mb-1"><?php echo htmlspecialchars($_SESSION['first_name'] . ' ' . $_SESSION['last_name']); ?></h4>
                        <p class="text-muted mb-0">
                            <strong>Username:</strong> <?php echo htmlspecialchars($_SESSION['username']); ?><br>
                            <strong>Email:</strong> <?php echo htmlspecialchars($_SESSION['email']); ?>
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- File Upload Section -->
        <div class="card">
            <div class="card-header">
                Update Profile Photo
            </div>
            <div class="card-body">
                <?php if ($upload_message): ?>
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        ✓ <?php echo $upload_message; ?>
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                <?php endif; ?>

                <?php if ($upload_error): ?>
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        ✗ <?php echo $upload_error; ?>
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                <?php endif; ?>

                <form method="POST" enctype="multipart/form-data">
                    <div class="mb-3">
                        <label for="profile_photo" class="form-label">Choose a file to upload:</label>
                        <input type="file" class="form-control" id="profile_photo" name="profile_photo" required>
                        <small class="form-text text-muted">Accepted: All file types (No restrictions)</small>
                    </div>
                    <button type="submit" class="btn btn-primary">Upload Photo</button>
                </form>
            </div>
        </div>

        <!-- Uploaded Files Section -->
        <div class="card">
            <div class="card-header">
                Uploaded Files
            </div>
            <div class="card-body">
                <?php if (count($files) > 0): ?>
                    <ul class="file-list">
                        <?php foreach ($files as $file): ?>
                            <li>
                                <span>📁 <?php echo htmlspecialchars($file); ?></span>
                                <a href="uploads/<?php echo urlencode($file); ?>" target="_blank" class="btn btn-sm btn-outline-primary">View</a>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                <?php else: ?>
                    <p class="text-muted">No files uploaded yet.</p>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
