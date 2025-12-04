#!/usr/bin/env bash
set -euo pipefail

# Usage: sudo bash setup_vm.sh <repo_url> [branch]
# Example: sudo bash setup_vm.sh https://github.com/RaoTaj/Expense-Tracking-App-.git main

REPO_URL=${1:-}
BRANCH=${2:-main}
APP_DIR=/opt/expense-tracker
SERVER_DIR="$APP_DIR/server"

if [[ -z "$REPO_URL" ]]; then
  echo "Error: repo URL is required as first argument"
  echo "Usage: sudo bash setup_vm.sh <repo_url> [branch]"
  exit 1
fi

echo "Updating packages..."
apt-get update -y

echo "Installing required packages..."
apt-get install -y curl git build-essential python3 libsqlite3-dev ufw

# Install Node.js (20.x LTS) via NodeSource
if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js 20.x..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "Node found: $(node -v)"
fi

# Create app directory
mkdir -p "$APP_DIR"
chown -R $(whoami) "$APP_DIR"
cd "$APP_DIR"

if [[ -d "$APP_DIR/.git" || -d "$SERVER_DIR" ]]; then
  echo "Repository already present, attempting to update..."
  cd "$APP_DIR"
  git fetch --all
  git checkout "$BRANCH" || true
  git pull origin "$BRANCH" || true
else
  echo "Cloning repository..."
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$SERVER_DIR"

echo "Installing server dependencies (this will build better-sqlite3)..."
# use npm ci if package-lock.json present, else npm install
if [[ -f package-lock.json ]]; then
  npm ci --loglevel=info
else
  npm install --loglevel=info
fi

# Expose firewall port 4000
ufw allow 4000/tcp || true

# Install PM2 to manage the process
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

# Start app with PM2
pm2 stop expense-tracker-server || true
pm2 delete expense-tracker-server || true
pm2 start index.js --name expense-tracker-server --cwd "$SERVER_DIR"
pm2 save

# Setup PM2 startup so it restarts after reboot
PM2_STARTUP_CMD=$(pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami)) | tail -n1)
# Print the pm2 startup command for user to run if needed
echo "Run the following command as printed by pm2 (if any):"
echo "$PM2_STARTUP_CMD"

# Display status
pm2 ls

echo "Setup complete. Backend should be running on port 4000. Check logs with: pm2 logs expense-tracker-server"