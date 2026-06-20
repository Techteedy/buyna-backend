const { Pool } = require('pg');

// On Render, DATABASE_URL is provided automatically once you attach a Postgres
// database to this service. Locally, set it in a .env file or your shell.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : false,
});

async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows;
}

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'boss',
      capital_amount NUMERIC DEFAULT 0,
      pin_hash TEXT,
      pin_salt TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS capital_amount NUMERIC DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_salt TEXT;

    CREATE TABLE IF NOT EXISTS stock (
      id SERIAL PRIMARY KEY,
      user_phone TEXT NOT NULL,
      item TEXT NOT NULL,
      quantity NUMERIC NOT NULL DEFAULT 0,
      unit_cost NUMERIC DEFAULT 0,
      low_stock_threshold NUMERIC DEFAULT 5,
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_phone, item)
    );

    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      user_phone TEXT NOT NULL,
      item TEXT,
      quantity NUMERIC DEFAULT 1,
      amount NUMERIC NOT NULL,
      cost_basis NUMERIC DEFAULT 0,
      profit NUMERIC DEFAULT 0,
      channel TEXT DEFAULT 'voice',
      recorded_by TEXT DEFAULT 'boss',
      synced BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      user_phone TEXT NOT NULL,
      category TEXT,
      amount NUMERIC NOT NULL,
      note TEXT,
      channel TEXT DEFAULT 'voice',
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS debts (
      id SERIAL PRIMARY KEY,
      user_phone TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      amount NUMERIC NOT NULL,
      status TEXT DEFAULT 'owing',
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS kolo (
      id SERIAL PRIMARY KEY,
      user_phone TEXT NOT NULL,
      goal_name TEXT DEFAULT 'General savings',
      target_amount NUMERIC DEFAULT 0,
      saved_amount NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS ussd_sessions (
      session_id TEXT PRIMARY KEY,
      phone TEXT,
      stage TEXT,
      data TEXT,
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id SERIAL PRIMARY KEY,
      user_phone TEXT NOT NULL,
      name TEXT NOT NULL,
      yield_count NUMERIC DEFAULT 1,
      total_cost NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_phone, name)
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id SERIAL PRIMARY KEY,
      recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      cost NUMERIC DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS apprentices (
      id SERIAL PRIMARY KEY,
      boss_phone TEXT NOT NULL,
      apprentice_phone TEXT NOT NULL,
      apprentice_name TEXT,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(boss_phone, apprentice_phone)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      boss_phone TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}

module.exports = { pool, query, initSchema };
