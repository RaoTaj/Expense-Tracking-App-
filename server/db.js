const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new Database(dbPath);

function init() {
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    fullName TEXT,
    password TEXT,
    cnic TEXT,
    country TEXT,
    city TEXT,
    zipcode TEXT,
    createdAt TEXT
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    amount REAL,
    category TEXT,
    description TEXT,
    date TEXT
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    name TEXT,
    color TEXT,
    hex TEXT,
    budget REAL,
    icon TEXT
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS budgets (
    username TEXT PRIMARY KEY,
    amount REAL
  )`);
}

module.exports = { db, init };
