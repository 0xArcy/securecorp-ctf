<?php
session_start();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About Us - SecureCorp</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">

<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
  <div class="container-fluid">
    <a class="navbar-brand" href="index.php">SecureCorp</a>
    <div class="collapse navbar-collapse" id="navbarNav">
      <ul class="navbar-nav">
        <li class="nav-item"><a class="nav-link" href="index.php">Home</a></li>
        <li class="nav-item"><a class="nav-link active" href="about.php">About Us</a></li>
        <li class="nav-item"><a class="nav-link" href="contact.php">Contact</a></li>
        <?php if(isset($_SESSION['user_id'])): ?>
            <li class="nav-item"><a class="nav-link" href="dashboard.php">Dashboard</a></li>
        <?php endif; ?>
      </ul>
    </div>
  </div>
</nav>

<div class="container mt-5">
    <div class="row">
        <div class="col-lg-8 mx-auto">
            <h1 class="mb-4">About SecureCorp</h1>
            <p class="lead">Leading the way in secure digital infrastructure since 2010.</p>
            <hr>
            <p>SecureCorp is a global leader in providing enterprise-grade security solutions. We pride ourselves on our rigorous testing methodologies and our unbreakable systems.</p>
            
            <h3>Our Mission</h3>
            <p>To secure the world's data, one byte at a time.</p>
            
            <h3>Our Team</h3>
            <p>Our team consists of industry veterans who have dedicated their lives to cybersecurity.</p>
            
            <!-- Hint: Sometimes developers leave comments about internal systems -->
            <!-- Note to dev team: migrate the legacy admin portal to the new secure server. -->
        </div>
    </div>
</div>

<footer class="bg-dark text-white text-center py-3 mt-5 fixed-bottom">
    &copy; 2024 SecureCorp
</footer>

</body>
</html>
