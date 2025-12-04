const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const expressWinston = require('express-winston');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { db, init } = require('./db');

init();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Utility to generate a readable RRN (reference number): YYYYMMDDHHMMSS_mmm_RANDOM
function generateRRN() {
  const d = new Date();
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const datePart = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const millis = String(d.getMilliseconds()).padStart(3, '0');
  const rand = Math.floor(Math.random() * 900000 + 100000); // 6-digit
  return `${datePart}_${millis}_${rand}`;
}

// Attach an RRN and optional username to each request for tracing
app.use((req, res, next) => {
  req.rrn = generateRRN();
  // propagate username if sent in common places
  req.requestedUsername = req.body && req.body.username ? req.body.username : (req.params && req.params.username ? req.params.username : (req.query && req.query.username ? req.query.username : null));
  next();
});

// Setup logging
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const infoRotate = new DailyRotateFile({
  filename: path.join(logDir, 'application.%DATE%.log'),
  datePattern: 'YYYY-MM-DD_HH',
  zippedArchive: false,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'info'
});

const errorRotate = new DailyRotateFile({
  filename: path.join(logDir, 'error.%DATE%.log'),
  datePattern: 'YYYY-MM-DD_HH',
  zippedArchive: false,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error'
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    infoRotate,
    errorRotate,
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  expressFormat: true,
  colorize: false,
  msg: "HTTP {{req.method}} {{req.url}}",
  requestWhitelist: [...expressWinston.requestWhitelist, 'body'],
  responseWhitelist: [...expressWinston.responseWhitelist, 'body'],
  dynamicMeta: (req, res) => ({ rrn: req.rrn, username: req.requestedUsername })
}));

// Routes
app.post('/api/register', (req, res) => {
  const { username, fullName, password, cnic, country, city, zipcode } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  
  try {
    const row = db.prepare('SELECT username FROM users WHERE username = ?').get(username);
    if (row) return res.status(409).json({ error: 'Username exists' });
    
    db.prepare('INSERT INTO users (username, fullName, password, cnic, country, city, zipcode, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(username, fullName, password, cnic, country, city, zipcode, new Date().toISOString());
    
    logger.info(`[${req.rrn}] ${username} - User registered`, { rrn: req.rrn, username });
    res.json({ success: true });
  } catch (err) {
    logger.error(`[${req.rrn}] ${username} - DB error inserting user`, { rrn: req.rrn, username, err });
    res.status(500).json({ error: 'db error' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  try {
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!row) return res.status(404).json({ error: 'User not found' });
    if (row.password !== password) return res.status(401).json({ error: 'Incorrect password' });
    
    logger.info(`[${req.rrn}] ${username} - User login success`, { rrn: req.rrn, username });
    res.json({ success: true, user: { fullName: row.fullName, username: row.username } });
  } catch (err) {
    logger.error(`[${req.rrn}] ${username} - DB error on login`, { rrn: req.rrn, username, err });
    res.status(500).json({ error: 'db error' });
  }
});

app.get('/api/user/:username/data', (req, res) => {
  const username = req.params.username;
  
  try {
    const expenses = db.prepare('SELECT * FROM expenses WHERE username = ? ORDER BY date DESC').all(username) || [];
    const categories = db.prepare('SELECT name,color,hex,budget,icon FROM categories WHERE username = ?').all(username);
    const budgetRow = db.prepare('SELECT amount FROM budgets WHERE username = ?').get(username);
    
    res.json({
      expenses,
      categories: categories && categories.length ? categories : null,
      budget: budgetRow ? budgetRow.amount : null
    });
  } catch (err) {
    logger.error(`[${req.rrn}] ${username} - DB error fetching user data`, { rrn: req.rrn, username, err });
    res.status(500).json({ error: 'db error' });
  }
});

app.post('/api/expenses', (req, res) => {
  const { username, amount, category, description, date } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  
  try {
    const result = db.prepare('INSERT INTO expenses (username, amount, category, description, date) VALUES (?, ?, ?, ?, ?)')
      .run(username, amount, category, description, date);
    
    logger.info(`[${req.rrn}] ${username} - Expense added id=${result.lastInsertRowid}`, { rrn: req.rrn, username, expenseId: result.lastInsertRowid });
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    logger.error(`[${req.rrn}] ${username} - DB error insert expense`, { rrn: req.rrn, username, err });
    res.status(500).json({ error: 'db error' });
  }
});

app.post('/api/expenses/bulk', (req, res) => {
  const { username, expenses } = req.body;
  if (!username || !Array.isArray(expenses)) return res.status(400).json({ error: 'invalid payload' });
  
  try {
    db.prepare('DELETE FROM expenses WHERE username = ?').run(username);
    
    const insertStmt = db.prepare('INSERT INTO expenses (username, amount, category, description, date) VALUES (?, ?, ?, ?, ?)');
    for (const e of expenses) {
      insertStmt.run(username, e.amount, e.category, e.description, e.date);
    }
    
    logger.info(`[${req.rrn}] ${username} - Bulk expenses saved (${expenses.length})`, { rrn: req.rrn, username, count: expenses.length });
    res.json({ success: true });
  } catch (err) {
    logger.error(`[${req.rrn}] ${username} - DB error bulk expenses`, { rrn: req.rrn, username, err });
    res.status(500).json({ error: 'db error' });
  }
});

app.get('/api/expenses/:username', (req, res) => {
  const username = req.params.username;
  
  try {
    const rows = db.prepare('SELECT * FROM expenses WHERE username = ? ORDER BY date DESC').all(username) || [];
    logger.info(`[${req.rrn}] ${username} - Retrieved ${rows.length} expenses`, { rrn: req.rrn, username, count: rows.length });
    res.json(rows);
  } catch (err) {
    logger.error(`[${req.rrn}] ${username} - DB error fetching expenses`, { rrn: req.rrn, username, err });
    res.status(500).json({ error: 'db error' });
  }
});

app.delete('/api/expenses/:id', (req, res) => {
  const id = req.params.id;
  
  try {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    logger.info(`[${req.rrn}] - Expense deleted id=${id}`, { rrn: req.rrn, expenseId: id });
    res.json({ success: true });
  } catch (err) {
    logger.error(`[${req.rrn}] - DB error delete expense id=${id}`, { rrn: req.rrn, err });
    res.status(500).json({ error: 'db error' });
  }
});

app.post('/api/categories', (req, res) => {
  const { username, categories } = req.body;
  if (!username || !Array.isArray(categories)) return res.status(400).json({ error: 'invalid payload' });
  
  try {
    db.prepare('DELETE FROM categories WHERE username = ?').run(username);
    
    const insertStmt = db.prepare('INSERT INTO categories (username, name, color, hex, budget, icon) VALUES (?, ?, ?, ?, ?, ?)');
    for (const c of categories) {
      insertStmt.run(username, c.name, c.color, c.hex, c.budget, c.icon);
    }
    
    logger.info(`[${req.rrn}] ${username} - Categories saved (${categories.length})`, { rrn: req.rrn, username, count: categories.length });
    res.json({ success: true });
  } catch (err) {
    logger.error(`[${req.rrn}] ${username} - DB error save categories`, { rrn: req.rrn, username, err });
    res.status(500).json({ error: 'db error' });
  }
});

app.get('/api/categories/:username', (req, res) => {
  const username = req.params.username;
  
  try {
    const rows = db.prepare('SELECT name,color,hex,budget,icon FROM categories WHERE username = ?').all(username) || [];
    res.json(rows);
  } catch (err) {
    logger.error(`[${req.rrn}] ${username} - DB error fetching categories`, { rrn: req.rrn, username, err });
    res.status(500).json({ error: 'db error' });
  }
});

app.post('/api/budget', (req, res) => {
  const { username, amount } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  
  try {
    db.prepare('INSERT INTO budgets (username, amount) VALUES (?, ?) ON CONFLICT(username) DO UPDATE SET amount=excluded.amount')
      .run(username, amount);
    
    logger.info(`[${req.rrn}] ${username} - Budget set to ${amount}`, { rrn: req.rrn, username, amount });
    res.json({ success: true });
  } catch (err) {
    logger.error(`[${req.rrn}] ${username} - DB error save budget`, { rrn: req.rrn, username, err });
    res.status(500).json({ error: 'db error' });
  }
});

app.get('/api/budget/:username', (req, res) => {
  const username = req.params.username;
  
  try {
    const row = db.prepare('SELECT amount FROM budgets WHERE username = ?').get(username);
    res.json({ amount: row ? row.amount : null });
  } catch (err) {
    logger.error(`[${req.rrn}] ${username} - DB error fetching budget`, { rrn: req.rrn, username, err });
    res.status(500).json({ error: 'db error' });
  }
});

app.get('/api/user/:username', (req, res) => {
  const username = req.params.username;
  
  try {
    const row = db.prepare('SELECT username, fullName, cnic, country, city, zipcode, createdAt FROM users WHERE username = ?').get(username);
    if (!row) return res.status(404).json({ error: 'User not found' });
    
    logger.info(`[${req.rrn}] ${username} - Retrieved user profile`, { rrn: req.rrn, username });
    res.json({ user: row });
  } catch (err) {
    logger.error(`[${req.rrn}] ${username} - DB error fetching user profile`, { rrn: req.rrn, username, err });
    res.status(500).json({ error: 'db error' });
  }
});

// Logout endpoint so clients can record logout server-side for audit
app.post('/api/logout', (req, res) => {
  const username = req.body && req.body.username ? req.body.username : req.requestedUsername;
  logger.info(`[${req.rrn}] ${username || 'unknown'} - User logout`, { rrn: req.rrn, username });
  res.json({ success: true });
});

// serve static build when available
const buildPath = path.join(__dirname, '..', 'build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get('*', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));
}

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
  logger.info(`Server started on ${port}`);
});
