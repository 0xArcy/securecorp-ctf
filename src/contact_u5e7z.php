<?php
session_start();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact Us - SecureCorp</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">

<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
  <div class="container-fluid">
    <a class="navbar-brand" href="index.php">SecureCorp</a>
    <div class="collapse navbar-collapse" id="navbarNav">
      <ul class="navbar-nav">
        <li class="nav-item"><a class="nav-link" href="index.php">Home</a></li>
        <li class="nav-item"><a class="nav-link" href="about_l4m3r.php">About Us</a></li>
        <li class="nav-item"><a class="nav-link active" href="contact_u5e7z.php">Contact</a></li>
        <?php if(isset($_SESSION['user_id'])): ?>
            <li class="nav-item"><a class="nav-link" href="dashboard_v2r1q.php">Dashboard</a></li>
        <?php endif; ?>
      </ul>
    </div>
  </div>
</nav>

<div class="container mt-5">
    <div class="row">
        <div class="col-lg-6 mx-auto">
            <div class="card shadow">
                <div class="card-header bg-secondary text-white">
                    <h3>Contact Support</h3>
                </div>
                <div class="card-body">
                    <p>If you are experiencing issues with the portal, please fill out the form below.</p>
                    <form>
                        <div class="mb-3">
                            <label class="form-label">Name</label>
                            <input type="text" class="form-control" placeholder="John Doe">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-control" placeholder="john@securecorp.com">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Message</label>
                            <textarea class="form-control" rows="4"></textarea>
                        </div>
                        <button type="button" class="btn btn-dark" onclick="alert('Message sent to admin!')">Send Message</button>
                    </form>
                </div>
            </div>
             <!-- Hint: The admin checks emails on the /dashboard_v2r1q.php page occasionally -->
        </div>
    </div>
</div>

<footer class="bg-dark text-white text-center py-3 mt-5 fixed-bottom">
    &copy; 2024 SecureCorp
</footer>

</body>
</html>
