const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, rrn, username }) => {
      return `[${timestamp}] [${rrn}] ${username || 'unknown'} - ${message}`;
    })
  ),
  transports: [
    infoRotate,
    errorRotate,
    new winston.transports.Console({ 
      format: winston.format.printf(({ timestamp, level, message, rrn, username }) => {
        return `[${timestamp}] [${rrn}] ${username || 'unknown'} - ${message}`;
      })
    })
  ]
});

// Custom middleware to log API calls with request params and response details
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  let responseBody = '';

  res.send = function(data) {
    responseBody = data;
    return originalSend.call(this, data);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    let logDetails = '';
    
    // Log request parameters
    if (req.method === 'POST' || req.method === 'PUT') {
      if (req.body && Object.keys(req.body).length > 0) {
        logDetails = `Input: ${JSON.stringify(req.body)} | `;
      }
    }
    
    // Log response
    try {
      const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
      if (parsed.success !== undefined) {
        logDetails += `Success: ${parsed.success}`;
      } else if (parsed.error) {
        logDetails += `Error: ${parsed.error}`;
      } else if (parsed.user) {
        logDetails += `User: ${parsed.user.username}`;
      } else if (parsed.id) {
        logDetails += `ID: ${parsed.id}`;
      } else if (Array.isArray(parsed)) {
        logDetails += `Records: ${parsed.length}`;
      }
    } catch (e) {
      logDetails += `Response: ${res.statusCode}`;
    }

    const logMsg = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms | ${logDetails}`;
    logger.info(logMsg, { rrn: req.rrn, username: req.requestedUsername });
  });
  next();
});

// Routes
app.post('/api/register', (req, res) => {
  const { username, fullName, password, cnic, country, city, zipcode } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  db.get('SELECT username FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      logger.error(`[${req.rrn}] ${username} - DB error on select`, { rrn: req.rrn, username, err });
      return res.status(500).json({ error: 'db error' });
    }
    if (row) return res.status(409).json({ error: 'Username exists' });

    const stmt = 'INSERT INTO users (username, fullName, password, cnic, country, city, zipcode, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.run(stmt, [username, fullName, password, cnic, country, city, zipcode, new Date().toISOString()], function (e) {
      if (e) {
        logger.error(`[${req.rrn}] ${username} - DB error inserting user`, { rrn: req.rrn, username, err: e });
        return res.status(500).json({ error: 'db error' });
      }
      logger.info(`[${req.rrn}] ${username} - User registered`, { rrn: req.rrn, username });
      res.json({ success: true });
    });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      logger.error(`[${req.rrn}] ${username || req.requestedUsername} - DB error on login`, { rrn: req.rrn, username: username || req.requestedUsername, err });
      return res.status(500).json({ error: 'db error' });
    }
    if (!row) return res.status(404).json({ error: 'User not found' });
    if (row.password !== password) return res.status(401).json({ error: 'Incorrect password' });
    logger.info(`[${req.rrn}] ${username} - User login success`, { rrn: req.rrn, username });
    res.json({ success: true, user: { fullName: row.fullName, username: row.username } });
  });
});

app.get('/api/user/:username/data', (req, res) => {
  const username = req.params.username;
  const result = {};
  db.all('SELECT * FROM expenses WHERE username = ? ORDER BY date DESC', [username], (err, expenses) => {
    if (err) {
      logger.error(`[${req.rrn}] ${username} - DB error fetching expenses`, { rrn: req.rrn, username, err });
      return res.status(500).json({ error: 'db error' });
    }
    result.expenses = expenses || [];
    db.all('SELECT name,color,hex,budget,icon FROM categories WHERE username = ?', [username], (err2, categories) => {
      if (err2) {
        logger.error(`[${req.rrn}] ${username} - DB error fetching categories`, { rrn: req.rrn, username, err: err2 });
        return res.status(500).json({ error: 'db error' });
      }
      result.categories = categories && categories.length ? categories : null;
      db.get('SELECT amount FROM budgets WHERE username = ?', [username], (err3, budgetRow) => {
        if (err3) {
          logger.error(`[${req.rrn}] ${username} - DB error fetching budget`, { rrn: req.rrn, username, err: err3 });
          return res.status(500).json({ error: 'db error' });
        }
        result.budget = budgetRow ? budgetRow.amount : null;
        logger.info(`[${req.rrn}] ${username} - Retrieved user data`, { rrn: req.rrn, username });
        res.json(result);
      });
    });
  });
});

app.post('/api/expenses', (req, res) => {
  const { username, amount, category, description, date } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  db.run('INSERT INTO expenses (username, amount, category, description, date) VALUES (?, ?, ?, ?, ?)', [username, amount, category, description, date], function (err) {
    if (err) {
      logger.error(`[${req.rrn}] ${username} - DB error insert expense`, { rrn: req.rrn, username, err });
      return res.status(500).json({ error: 'db error' });
    }
    logger.info(`[${req.rrn}] ${username} - Expense added id=${this.lastID}`, { rrn: req.rrn, username, expenseId: this.lastID });
    res.json({ success: true, id: this.lastID });
  });
});

    app.post('/api/expenses/bulk', (req, res) => {
      const { username, expenses } = req.body;
      if (!username || !Array.isArray(expenses)) return res.status(400).json({ error: 'invalid payload' });
      db.serialize(() => {
        db.run('DELETE FROM expenses WHERE username = ?', [username], (delErr) => {
          if (delErr) {
            logger.error(`[${req.rrn}] ${username} - DB error deleting existing expenses before bulk insert`, { rrn: req.rrn, username, err: delErr });
            return res.status(500).json({ error: 'db error' });
          }
          const stmt = db.prepare('INSERT INTO expenses (username, amount, category, description, date) VALUES (?, ?, ?, ?, ?)');
          for (const e of expenses) {
            stmt.run([username, e.amount, e.category, e.description, e.date]);
          }
          stmt.finalize((fErr) => {
            if (fErr) {
              logger.error(`[${req.rrn}] ${username} - DB error finalizing bulk expense insert`, { rrn: req.rrn, username, err: fErr });
              return res.status(500).json({ error: 'db error' });
            }
            logger.info(`[${req.rrn}] ${username} - Bulk expenses saved (${expenses.length})`, { rrn: req.rrn, username, count: expenses.length });
            res.json({ success: true });
          });
        });
      });
    });

    app.get('/api/expenses/:username', (req, res) => {
      const username = req.params.username;
      db.all('SELECT * FROM expenses WHERE username = ? ORDER BY date DESC', [username], (err, rows) => {
        if (err) {
          logger.error(`[${req.rrn}] ${username} - DB error fetching expenses`, { rrn: req.rrn, username, err });
          return res.status(500).json({ error: 'db error' });
        }
        logger.info(`[${req.rrn}] ${username} - Retrieved ${rows.length} expenses`, { rrn: req.rrn, username, count: rows.length });
        res.json(rows);
      });
    });

    app.delete('/api/expenses/:id', (req, res) => {
      const id = req.params.id;
      db.run('DELETE FROM expenses WHERE id = ?', [id], function (err) {
        if (err) {
          logger.error(`[${req.rrn}] - DB error delete expense id=${id}`, { rrn: req.rrn, err });
          return res.status(500).json({ error: 'db error' });
        }
        logger.info(`[${req.rrn}] - Expense deleted id=${id}`, { rrn: req.rrn, expenseId: id });
        res.json({ success: true });
      });
    });

    app.post('/api/categories', (req, res) => {
      const { username, categories } = req.body;
      if (!username || !Array.isArray(categories)) return res.status(400).json({ error: 'invalid payload' });
      db.serialize(() => {
        db.run('DELETE FROM categories WHERE username = ?', [username], (delErr) => {
          if (delErr) {
            logger.error(`[${req.rrn}] ${username} - DB error delete categories`, { rrn: req.rrn, username, err: delErr });
            return res.status(500).json({ error: 'db error' });
          }
          const stmt = db.prepare('INSERT INTO categories (username, name, color, hex, budget, icon) VALUES (?, ?, ?, ?, ?, ?)');
          for (const c of categories) {
            stmt.run([username, c.name, c.color, c.hex, c.budget, c.icon]);
          }
          stmt.finalize((fErr) => {
            if (fErr) {
              logger.error(`[${req.rrn}] ${username} - DB error finalizing categories insert`, { rrn: req.rrn, username, err: fErr });
              return res.status(500).json({ error: 'db error' });
            }
            logger.info(`[${req.rrn}] ${username} - Categories saved (${categories.length})`, { rrn: req.rrn, username, count: categories.length });
            res.json({ success: true });
          });
        });
      });
    });

    app.get('/api/categories/:username', (req, res) => {
      const username = req.params.username;
      db.all('SELECT name,color,hex,budget,icon FROM categories WHERE username = ?', [username], (err, rows) => {
        if (err) {
          logger.error(`[${req.rrn}] ${username} - DB error fetching categories`, { rrn: req.rrn, username, err });
          return res.status(500).json({ error: 'db error' });
        }
        res.json(rows);
      });
    });

    app.post('/api/budget', (req, res) => {
      const { username, amount } = req.body;
      if (!username) return res.status(400).json({ error: 'username required' });
      // Upsert budget: try update, if no rows changed then insert
      db.run('UPDATE budgets SET amount = ? WHERE username = ?', [amount, username], function (err) {
        if (err) {
          logger.error(`[${req.rrn}] ${username} - DB error save budget (update)`, { rrn: req.rrn, username, err });
          return res.status(500).json({ error: 'db error' });
        }
        if (this.changes === 0) {
          db.run('INSERT INTO budgets (username, amount) VALUES (?, ?)', [username, amount], function (e) {
            if (e) {
              logger.error(`[${req.rrn}] ${username} - DB error save budget (insert)`, { rrn: req.rrn, username, err: e });
              return res.status(500).json({ error: 'db error' });
            }
            logger.info(`[${req.rrn}] ${username} - Budget set to ${amount}`, { rrn: req.rrn, username, amount });
            res.json({ success: true });
          });
        } else {
          logger.info(`[${req.rrn}] ${username} - Budget set to ${amount}`, { rrn: req.rrn, username, amount });
          res.json({ success: true });
        }
      });
    });

    app.get('/api/budget/:username', (req, res) => {
      const username = req.params.username;
      db.get('SELECT amount FROM budgets WHERE username = ?', [username], (err, row) => {
        if (err) {
          logger.error(`[${req.rrn}] ${username} - DB error fetching budget`, { rrn: req.rrn, username, err });
          return res.status(500).json({ error: 'db error' });
        }
        res.json({ amount: row ? row.amount : null });
      });
    });

    app.get('/api/user/:username', (req, res) => {
      const username = req.params.username;
      db.get('SELECT username, fullName, cnic, country, city, zipcode, createdAt FROM users WHERE username = ?', [username], (err, row) => {
        if (err) {
          logger.error(`[${req.rrn}] ${username} - DB error fetching user profile`, { rrn: req.rrn, username, err });
          return res.status(500).json({ error: 'db error' });
        }
        if (!row) return res.status(404).json({ error: 'User not found' });
        logger.info(`[${req.rrn}] ${username} - Retrieved user profile`, { rrn: req.rrn, username });
        res.json({ user: row });
      });
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
