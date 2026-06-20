const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const db = new DatabaseSync(path.join(__dirname, 'buyna.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'boss',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_phone TEXT NOT NULL,
    item TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    unit_cost REAL DEFAULT 0,
    low_stock_threshold REAL DEFAULT 5,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_phone, item)
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_phone TEXT NOT NULL,
    item TEXT,
    quantity REAL DEFAULT 1,
    amount REAL NOT NULL,
    cost_basis REAL DEFAULT 0,
    profit REAL DEFAULT 0,
    channel TEXT DEFAULT 'voice',
    recorded_by TEXT DEFAULT 'boss',
    synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_phone TEXT NOT NULL,
    category TEXT,
    amount REAL NOT NULL,
    note TEXT,
    channel TEXT DEFAULT 'voice',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_phone TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'owing',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS kolo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_phone TEXT NOT NULL,
    goal_name TEXT DEFAULT 'General savings',
    target_amount REAL DEFAULT 0,
    saved_amount REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ussd_sessions (
    session_id TEXT PRIMARY KEY,
    phone TEXT,
    stage TEXT,
    data TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;
