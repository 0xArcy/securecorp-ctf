#!/bin/bash

# E-Commerce CTF Lab Setup Script
# This script sets up the vulnerable e-commerce application with Apache and Node.js

set -e

echo "=========================================="
echo "E-Commerce CTF Lab - Deployment Script"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Error: This script must be run as root (use sudo)"
  exit 1
fi

# Update system packages
echo "[*] Updating system packages..."
apt-get update -qq

# Install Node.js and npm
echo "[*] Installing Node.js and npm..."
apt-get install -y curl gnupg2
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install build dependencies required by some native Node modules (sqlite3)
echo "[*] Installing build tools and sqlite dev headers..."
apt-get install -y build-essential python3 libsqlite3-dev

# Install Apache
echo "[*] Installing Apache..."
apt-get install -y apache2

# Enable required Apache modules
echo "[*] Enabling Apache modules..."
a2enmod proxy
a2enmod proxy_http
a2enmod rewrite

# Create app directory
APP_DIR="/var/www/ecommerce"
echo "[*] Creating application directory at $APP_DIR..."
mkdir -p $APP_DIR

# Copy application files from repository root (only necessary files)
echo "[*] Copying application files..."
mkdir -p $APP_DIR
cp ../package.json $APP_DIR/ 2>/dev/null || true
cp ../package-lock.json $APP_DIR/ 2>/dev/null || true
cp ../server.js $APP_DIR/ 2>/dev/null || true
cp -r ../public $APP_DIR/ 2>/dev/null || true
cp ../apache-config.conf $APP_DIR/ 2>/dev/null || true
# If a pre-seeded SQLite DB exists in repo root, copy it so data persists
if [ -f ../data.sqlite ]; then
  cp ../data.sqlite $APP_DIR/
fi
cd $APP_DIR

# Install Node dependencies
echo "[*] Installing Node.js dependencies..."
npm install --production

# Copy Apache configuration
echo "[*] Configuring Apache virtual host..."
cp $APP_DIR/apache-config.conf /etc/apache2/sites-available/ecommerce.conf
a2ensite ecommerce.conf

# Disable default site if it exists
a2dissite 000-default.conf 2>/dev/null || true

# Create uploads directory with proper permissions
echo "[*] Setting up uploads directory..."
mkdir -p $APP_DIR/uploads
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR
chmod -R 775 $APP_DIR/uploads

# Test Apache configuration
echo "[*] Testing Apache configuration..."
apache2ctl configtest

# Restart Apache
echo "[*] Restarting Apache..."
systemctl restart apache2

# Create a systemd service to run the Node.js application persistently
SERVICE_FILE="/etc/systemd/system/ecommerce.service"
echo "[*] Creating systemd service for Node.js app..."
cat > $SERVICE_FILE <<EOF
[Unit]
Description=E-Commerce CTF Node App
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node $APP_DIR/server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Ensure permissions and reload systemd
chown -R www-data:www-data $APP_DIR
systemctl daemon-reload
systemctl enable ecommerce.service
systemctl restart ecommerce.service

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Application is running at http://localhost"
echo "Node.js app running on port 3000"
echo "Apache proxying requests on port 80"
echo ""
echo "Demo Credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "Check application logs: tail -f $APP_DIR/app.log"
echo ""

echo "[+] Deployment complete! The Node.js app is served via Apache proxy on port 80."
echo ""
echo "[+] Creating Uploads Directory..."
mkdir -p $APP_DIR/uploads
chown -R www-data:www-data $APP_DIR/uploads
chmod 777 $APP_DIR/uploads

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Application is running at:"
echo "  http://localhost"
echo "  http://$(hostname -I | cut -d' ' -f1)"
echo ""
echo "Node.js app running on port 3000 (internal)"
echo "Apache proxying requests on port 80 (public)"
echo ""
echo "Demo Credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "Other users: alice, bob, carol (password: <username>123)"
echo ""
echo "Systemd service: systemctl status ecommerce.service"
echo "Logs: journalctl -u ecommerce.service -n 100"
