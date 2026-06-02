#!/bin/bash

# Redeploy the vulnerable web app on the VM.
# This script stops the Node service, updates /var/www/ecommerce,
# installs dependencies, and restarts the service + Apache.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="/var/www/ecommerce"

echo "=========================================="
echo "E-Commerce CTF Lab - Redeploy Script"
echo "=========================================="
echo ""

if [ "$EUID" -ne 0 ]; then
  echo "Error: This script must be run as root (use sudo)."
  exit 1
fi

if [ ! -d "$REPO_ROOT" ]; then
  echo "Error: Repository root not found at $REPO_ROOT"
  exit 1
fi

echo "[*] Stopping web app service..."
systemctl stop ecommerce.service 2>/dev/null || true

echo "[*] Updating application files in $APP_DIR..."
mkdir -p "$APP_DIR"
cp "$REPO_ROOT/package.json" "$APP_DIR/"
cp "$REPO_ROOT/package-lock.json" "$APP_DIR/" 2>/dev/null || true
cp "$REPO_ROOT/server.js" "$APP_DIR/"
cp "$REPO_ROOT/apache-config.conf" "$APP_DIR/"
cp -r "$REPO_ROOT/public" "$APP_DIR/"

if [ -f "$REPO_ROOT/data.sqlite" ]; then
  echo "[*] Preserving seeded database from repo root..."
  cp "$REPO_ROOT/data.sqlite" "$APP_DIR/data.sqlite" 2>/dev/null || true
fi

echo "[*] Ensuring uploads directory exists..."
mkdir -p "$APP_DIR/uploads"
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"
chmod -R 775 "$APP_DIR/uploads"

cd "$APP_DIR"

echo "[*] Installing production dependencies..."
npm install --production

echo "[*] Reinstalling Apache config..."
cp "$APP_DIR/apache-config.conf" /etc/apache2/sites-available/ecommerce.conf

a2enmod proxy proxy_http rewrite 2>/dev/null || true

a2ensite ecommerce.conf 2>/dev/null || true
a2dissite 000-default.conf 2>/dev/null || true

echo "[*] Testing Apache configuration..."
apache2ctl configtest

echo "[*] Restarting Apache..."
systemctl restart apache2

echo "[*] Restarting Node service..."
systemctl daemon-reload
systemctl enable ecommerce.service 2>/dev/null || true
systemctl restart ecommerce.service

echo ""
echo "Redeploy complete."
echo "Open: http://localhost (or http://$(hostname -I | cut -d' ' -f1))"
