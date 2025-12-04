# Linux VM Deployment Guide

## Problem Fixed
The project was using `sqlite3` npm package which has a pre-compiled Windows binary. When cloned to Linux, the binary doesn't work (ELF header error). **Solution:** Switched to `better-sqlite3` which compiles from source for the target platform.

## Steps to Deploy on Linux VM

### 1. Pull Latest Changes
```bash
cd ~/Expense-Tracking-App-
git pull origin main
```

### 2. Backend Setup
```bash
cd server
npm install
# On Linux, better-sqlite3 will compile automatically during npm install
# This will take a few minutes as it builds the native module

npm start
# Should start on port 4000 without ELF errors
# Look for: "Backend server started on port 4000"
```

### 3. Frontend Setup (New Terminal)
```bash
cd ~/Expense-Tracking-App-/
npm install
npm run build

# Optionally serve locally:
npx serve -s build -l 3000
# Or let the backend serve it (already configured)
```

### 4. Test Backend API
```bash
# In new terminal, test if backend is running:
curl -X POST http://localhost:4000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","fullName":"Test","password":"pass123","cnic":"12345","country":"PK","city":"Karachi","zipcode":"75000"}'

# Response should be: {"success":true}
```

### 5. Check Logs
```bash
cd ~/Expense-Tracking-App-/server/logs
tail -f application.*.log

# You should see entries like:
# [20251204075106_123_456789] testuser - User registered
```

## Key Changes Made

### package.json
- **Old:** `sqlite3: ^5.1.6` (Windows binary)
- **New:** `better-sqlite3: ^9.0.0` (compiles for each platform)

### server/db.js
- **Old:** Used async callbacks: `db.serialize()`, `db.run(sql, [params], callback)`
- **New:** Uses synchronous API: `db.exec()`, `db.prepare(sql).run(...params)`, `db.prepare(sql).get()`, `db.prepare(sql).all()`

### server/index.js
- **Old:** All endpoints used async callbacks (nested DB calls)
- **New:** All endpoints use synchronous better-sqlite3 with try-catch error handling

## Expected Log Format
Each operation now includes:
- **RRN** (Reference Number): `YYYYMMDDHHMMSS_mmm_RANDOM` for tracing
- **Username**: Who performed the action
- **Action**: What happened

Example:
```
[20251204075106_123_456789] testuser - User registered
[20251204075115_234_567890] testuser - Expense added id=1
[20251204075120_345_678901] testuser - User login success
```

## Firewall (if needed)
If accessing from another machine on network:
```bash
# Allow port 4000
sudo ufw allow 4000
```

## Connection from Frontend to Backend
Make sure your frontend `package.json` has:
```json
"proxy": "http://localhost:4000"
```

Or if running on different machine, update API calls to:
```javascript
const API_BASE = process.env.REACT_APP_API_URL || 'http://YOUR_VM_IP:4000';
```

## Troubleshooting

### "Module not found" after npm install
```bash
rm -rf node_modules package-lock.json
npm install
```

### "Better-sqlite3 build failed"
- Install build tools: `sudo apt-get install build-essential python3`
- Retry: `npm install`

### Database locked error
- Make sure only one instance of backend is running
- Check: `ps aux | grep node`

### API calls return 500
- Check logs in `server/logs/error.*.log`
- Verify database file exists: `ls -la server/database.db`

## Mobile App Deployment (Optional)
```bash
cd ../expense-tracker-mobile
npm install
eas build --platform android
# Follow EAS prompts to sign and build APK
```

Backend IP in mobile app config: Update `API_BASE` to point to VM IP for testing.

## PM2 (recommended) or systemd service

PM2 is the easiest way to keep the Node process running and resurrect it after reboots. The repository includes `server/setup_vm.sh` which installs PM2 and starts the server.

Alternatively you can use systemd with the provided `server/expense-tracker.service` file. To enable it on the VM:

```bash
# copy the service file to /etc/systemd/system
sudo cp server/expense-tracker.service /etc/systemd/system/expense-tracker.service
sudo systemctl daemon-reload
sudo systemctl enable --now expense-tracker.service
sudo journalctl -u expense-tracker -f
```

Replace `WorkingDirectory` and `ExecStart` in the service file if you install the app in a different path than `/opt/expense-tracker`.
