const db = require('../db');
const responses = require('./responses');

function ensureUser(phone) {
  db.prepare(`INSERT INTO users (phone) VALUES (?) ON CONFLICT(phone) DO NOTHING`).run(phone);
}

function todayTotals(phone) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(amount),0) AS total, COALESCE(SUM(profit),0) AS profit, COUNT(*) AS cnt
    FROM sales WHERE user_phone = ? AND date(created_at) = date('now')
  `).get(phone);
  return { total: row.total, profit: row.profit, cnt: row.cnt };
}

function recordSale(phone, parsed, channel) {
  const { item, quantity, amount } = parsed;
  if (!amount) return { text: 'I no catch the amount. Try again, talk the price clearly.' };

  const stockRow = db.prepare(`SELECT * FROM stock WHERE user_phone = ? AND item = ?`).get(phone, item);
  const unitCost = stockRow ? stockRow.unit_cost : 0;
  const costBasis = unitCost * quantity;
  const profit = amount - costBasis;

  db.prepare(`
    INSERT INTO sales (user_phone, item, quantity, amount, cost_basis, profit, channel)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(phone, item, quantity, amount, costBasis, profit, channel);

  let lowStockNote = '';
  if (stockRow) {
    const newQty = Math.max(stockRow.quantity - quantity, 0);
    db.prepare(`UPDATE stock SET quantity = ?, updated_at = datetime('now') WHERE id = ?`).run(newQty, stockRow.id);
    if (newQty <= stockRow.low_stock_threshold) {
      lowStockNote = ' ' + responses.lowStockAlert({ item, quantity: newQty });
    }
  }

  const { total, profit: todayProfit } = todayTotals(phone);
  const text = responses.saleRecorded({ item, quantity, amount, profit, todayTotal: total, todayProfit }) + lowStockNote;
  return { text, data: { item, quantity, amount, profit } };
}

function recordExpense(phone, parsed, channel) {
  const { amount, category } = parsed;
  if (!amount) return { text: 'I no catch the amount wey you spend.' };
  db.prepare(`INSERT INTO expenses (user_phone, category, amount, channel) VALUES (?, ?, ?, ?)`)
    .run(phone, category, amount, channel);
  return { text: responses.expenseRecorded({ amount, category }) };
}

function koloDeposit(phone, parsed) {
  const { amount } = parsed;
  if (!amount) return { text: 'How much you save? Talk the amount.' };
  let goal = db.prepare(`SELECT * FROM kolo WHERE user_phone = ? ORDER BY id LIMIT 1`).get(phone);
  if (!goal) {
    db.prepare(`INSERT INTO kolo (user_phone, goal_name, target_amount, saved_amount) VALUES (?, 'General savings', 0, 0)`).run(phone);
    goal = db.prepare(`SELECT * FROM kolo WHERE user_phone = ? ORDER BY id LIMIT 1`).get(phone);
  }
  const savedAmount = goal.saved_amount + amount;
  db.prepare(`UPDATE kolo SET saved_amount = ? WHERE id = ?`).run(savedAmount, goal.id);
  return { text: responses.koloDeposit({ amount, savedAmount, targetAmount: goal.target_amount, goalName: goal.goal_name }) };
}

function koloBalance(phone) {
  const goal = db.prepare(`SELECT * FROM kolo WHERE user_phone = ? ORDER BY id LIMIT 1`).get(phone);
  return { text: responses.koloBalance({ savedAmount: goal ? goal.saved_amount : 0 }) };
}

function debtQuery(phone) {
  const debts = db.prepare(`SELECT * FROM debts WHERE user_phone = ? AND status = 'owing'`).all(phone);
  const total = debts.reduce((s, d) => s + d.amount, 0);
  return { text: responses.debtQuery({ debts, total }) };
}

function debtRecord(phone, parsed) {
  const { customerName, amount } = parsed;
  if (!amount) return { text: 'How much the customer owe?' };
  db.prepare(`INSERT INTO debts (user_phone, customer_name, amount) VALUES (?, ?, ?)`).run(phone, customerName, amount);
  return { text: responses.debtRecorded({ customerName, amount }) };
}

function stockQuery(phone) {
  const stock = db.prepare(`SELECT * FROM stock WHERE user_phone = ?`).all(phone);
  return { text: responses.stockQuery({ stock }) };
}

function restock(phone, parsed) {
  const { item, quantity, unitCost } = parsed;
  const existing = db.prepare(`SELECT * FROM stock WHERE user_phone = ? AND item = ?`).get(phone, item);
  if (existing) {
    db.prepare(`UPDATE stock SET quantity = quantity + ?, unit_cost = COALESCE(?, unit_cost), updated_at = datetime('now') WHERE id = ?`)
      .run(quantity, unitCost, existing.id);
  } else {
    db.prepare(`INSERT INTO stock (user_phone, item, quantity, unit_cost) VALUES (?, ?, ?, ?)`)
      .run(phone, item, quantity, unitCost || 0);
  }
  return { text: responses.restockRecorded({ item, quantity }) };
}

function dailySummary(phone) {
  const { total, profit, cnt } = todayTotals(phone);
  return { text: responses.dailySummary({ todayTotal: total, todayProfit: profit, salesCount: cnt }) };
}

function handleIntent(phone, parsed, channel = 'voice') {
  ensureUser(phone);
  switch (parsed.intent) {
    case 'RECORD_SALE': return recordSale(phone, parsed, channel);
    case 'RECORD_EXPENSE': return recordExpense(phone, parsed, channel);
    case 'KOLO_DEPOSIT': return koloDeposit(phone, parsed);
    case 'KOLO_BALANCE': return koloBalance(phone);
    case 'DEBT_QUERY': return debtQuery(phone);
    case 'DEBT_RECORD': return debtRecord(phone, parsed);
    case 'STOCK_QUERY': return stockQuery(phone);
    case 'RESTOCK': return restock(phone, parsed);
    case 'DAILY_SUMMARY': return dailySummary(phone);
    default: return { text: responses.unknown() };
  }
}

module.exports = { handleIntent };
