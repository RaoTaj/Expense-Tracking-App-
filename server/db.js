const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(dbPath);

function init() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      fullName TEXT,
      password TEXT,
      cnic TEXT,
      country TEXT,
      city TEXT,
      zipcode TEXT,
      createdAt TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      amount REAL,
      category TEXT,
      description TEXT,
      date TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      name TEXT,
      color TEXT,
      hex TEXT,
      budget REAL,
      icon TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS budgets (
      username TEXT PRIMARY KEY,
      amount REAL
    )`);
  });
}

module.exports = { db, init };
