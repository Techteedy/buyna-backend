const { query } = require('../db');
const responses = require('./responses');

async function ensureUser(phone) {
  await query(`INSERT INTO users (phone) VALUES ($1) ON CONFLICT (phone) DO NOTHING`, [phone]);
}

async function todayTotals(phone) {
  const rows = await query(`
    SELECT COALESCE(SUM(amount),0) AS total, COALESCE(SUM(profit),0) AS profit, COUNT(*) AS cnt
    FROM sales WHERE user_phone = $1 AND created_at::date = now()::date
  `, [phone]);
  const row = rows[0];
  return { total: Number(row.total), profit: Number(row.profit), cnt: Number(row.cnt) };
}

async function recordSale(phone, parsed, channel) {
  const { item, quantity, amount } = parsed;
  if (!amount) return { text: 'I no catch the amount. Try again, talk the price clearly.' };

  const stockRows = await query(`SELECT * FROM stock WHERE user_phone = $1 AND item = $2`, [phone, item]);
  const stockRow = stockRows[0];
  const unitCost = stockRow ? Number(stockRow.unit_cost) : 0;
  const costBasis = unitCost * quantity;
  const profit = amount - costBasis;

  await query(`
    INSERT INTO sales (user_phone, item, quantity, amount, cost_basis, profit, channel)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [phone, item, quantity, amount, costBasis, profit, channel]);

  let lowStockNote = '';
  if (stockRow) {
    const newQty = Math.max(Number(stockRow.quantity) - quantity, 0);
    await query(`UPDATE stock SET quantity = $1, updated_at = now() WHERE id = $2`, [newQty, stockRow.id]);
    if (newQty <= Number(stockRow.low_stock_threshold)) {
      lowStockNote = ' ' + responses.lowStockAlert({ item, quantity: newQty });
    }
  }

  const { total, profit: todayProfit } = await todayTotals(phone);
  const text = responses.saleRecorded({ item, quantity, amount, profit, todayTotal: total, todayProfit }) + lowStockNote;
  return { text, data: { item, quantity, amount, profit } };
}

async function recordExpense(phone, parsed, channel) {
  const { amount, category } = parsed;
  if (!amount) return { text: 'I no catch the amount wey you spend.' };
  await query(`INSERT INTO expenses (user_phone, category, amount, channel) VALUES ($1, $2, $3, $4)`,
    [phone, category, amount, channel]);
  return { text: responses.expenseRecorded({ amount, category }) };
}

async function koloDeposit(phone, parsed) {
  const { amount } = parsed;
  if (!amount) return { text: 'How much you save? Talk the amount.' };
  let rows = await query(`SELECT * FROM kolo WHERE user_phone = $1 ORDER BY id LIMIT 1`, [phone]);
  let goal = rows[0];
  if (!goal) {
    await query(`INSERT INTO kolo (user_phone, goal_name, target_amount, saved_amount) VALUES ($1, 'General savings', 0, 0)`, [phone]);
    rows = await query(`SELECT * FROM kolo WHERE user_phone = $1 ORDER BY id LIMIT 1`, [phone]);
    goal = rows[0];
  }
  const savedAmount = Number(goal.saved_amount) + amount;
  await query(`UPDATE kolo SET saved_amount = $1 WHERE id = $2`, [savedAmount, goal.id]);
  return { text: responses.koloDeposit({ amount, savedAmount, targetAmount: Number(goal.target_amount), goalName: goal.goal_name }) };
}

async function koloBalance(phone) {
  const rows = await query(`SELECT * FROM kolo WHERE user_phone = $1 ORDER BY id LIMIT 1`, [phone]);
  return { text: responses.koloBalance({ savedAmount: rows[0] ? Number(rows[0].saved_amount) : 0 }) };
}

async function debtQuery(phone) {
  const debts = await query(`SELECT * FROM debts WHERE user_phone = $1 AND status = 'owing'`, [phone]);
  const total = debts.reduce((s, d) => s + Number(d.amount), 0);
  return { text: responses.debtQuery({ debts, total }) };
}

async function debtRecord(phone, parsed) {
  const { customerName, amount } = parsed;
  if (!amount) return { text: 'How much the customer owe?' };
  await query(`INSERT INTO debts (user_phone, customer_name, amount) VALUES ($1, $2, $3)`, [phone, customerName, amount]);
  return { text: responses.debtRecorded({ customerName, amount }) };
}

async function stockQuery(phone) {
  const stock = await query(`SELECT * FROM stock WHERE user_phone = $1`, [phone]);
  return { text: responses.stockQuery({ stock }) };
}

async function restock(phone, parsed) {
  const { item, quantity, unitCost } = parsed;
  const rows = await query(`SELECT * FROM stock WHERE user_phone = $1 AND item = $2`, [phone, item]);
  const existing = rows[0];
  if (existing) {
    await query(`UPDATE stock SET quantity = quantity + $1, unit_cost = COALESCE($2, unit_cost), updated_at = now() WHERE id = $3`,
      [quantity, unitCost, existing.id]);
  } else {
    await query(`INSERT INTO stock (user_phone, item, quantity, unit_cost) VALUES ($1, $2, $3, $4)`,
      [phone, item, quantity, unitCost || 0]);
  }
  return { text: responses.restockRecorded({ item, quantity }) };
}

async function dailySummary(phone) {
  const { total, profit, cnt } = await todayTotals(phone);
  return { text: responses.dailySummary({ todayTotal: total, todayProfit: profit, salesCount: cnt }) };
}

async function handleIntent(phone, parsed, channel = 'voice') {
  await ensureUser(phone);
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
