const { query } = require('../db');
const responses = require('./responses');
const { getTaskForDay, TOTAL_DAYS } = require('./onboarding-tasks');
const { findBusiness, LIFE_STAGES } = require('./business-knowledge');

async function ensureUser(phone) {
  await query(`INSERT INTO users (phone) VALUES ($1) ON CONFLICT (phone) DO NOTHING`, [phone]);
}

async function getUser(phone) {
  const rows = await query(`SELECT * FROM users WHERE phone = $1`, [phone]);
  return rows[0];
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

  let belowCostNote = '';
  if (unitCost > 0 && amount < unitCost * quantity) {
    belowCostNote = ' ' + responses.belowCostWarning({ item, costPrice: unitCost });
  }

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
  const text = responses.saleRecorded({ item, quantity, amount, profit, todayTotal: total, todayProfit }) + belowCostNote + lowStockNote;
  return { text, data: { item, quantity, amount, profit } };
}

async function recordExpense(phone, parsed, channel) {
  const { amount, category } = parsed;
  if (!amount) return { text: 'I no catch the amount wey you spend.' };
  await query(`INSERT INTO expenses (user_phone, category, amount, channel) VALUES ($1, $2, $3, $4)`,
    [phone, category, amount, channel]);
  return { text: responses.expenseRecorded({ amount, category }) };
}

// Goal-based Kolo — multiple named goals per trader, falls back to "General savings"
async function koloDeposit(phone, parsed) {
  const { amount, goalName } = parsed;
  if (!amount) return { text: 'How much you save? Talk the amount.' };

  const name = goalName || 'General savings';
  let rows = await query(`SELECT * FROM kolo WHERE user_phone = $1 AND goal_name = $2`, [phone, name]);
  let goal = rows[0];
  if (!goal) {
    await query(`INSERT INTO kolo (user_phone, goal_name, target_amount, saved_amount) VALUES ($1, $2, 0, 0)`, [phone, name]);
    rows = await query(`SELECT * FROM kolo WHERE user_phone = $1 AND goal_name = $2`, [phone, name]);
    goal = rows[0];
  }
  const savedAmount = Number(goal.saved_amount) + amount;
  await query(`UPDATE kolo SET saved_amount = $1 WHERE id = $2`, [savedAmount, goal.id]);
  return { text: responses.koloDeposit({ amount, savedAmount, targetAmount: Number(goal.target_amount), goalName: goal.goal_name }) };
}

async function koloBalance(phone) {
  const rows = await query(`SELECT * FROM kolo WHERE user_phone = $1 ORDER BY id`, [phone]);
  if (!rows.length) return { text: responses.koloBalance({ savedAmount: 0 }) };
  if (rows.length === 1) return { text: responses.koloBalance({ savedAmount: Number(rows[0].saved_amount) }) };
  const list = rows.map(r => `${r.goal_name}: ${Number(r.saved_amount).toLocaleString('en-NG')}`).join(', ');
  return { text: `Your Kolo goals — ${list}.` };
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

// Price Calculator — sets the floor price for an item, recordSale warns if undercut
async function setCostPrice(phone, parsed) {
  const { item, amount } = parsed;
  if (!amount) return { text: 'How much be the cost price? Talk the amount.' };
  const rows = await query(`SELECT * FROM stock WHERE user_phone = $1 AND item = $2`, [phone, item]);
  if (rows[0]) {
    await query(`UPDATE stock SET unit_cost = $1, updated_at = now() WHERE id = $2`, [amount, rows[0].id]);
  } else {
    await query(`INSERT INTO stock (user_phone, item, quantity, unit_cost) VALUES ($1, $2, 0, $3)`, [phone, item, amount]);
  }
  return { text: responses.costPriceSet({ item, amount }) };
}

// Overspending Early Warning — fuel-gauge against a capital amount the trader sets once
async function setCapital(phone, parsed) {
  const { amount } = parsed;
  if (!amount) return { text: 'How much be your capital? Talk the amount.' };
  await query(`UPDATE users SET capital_amount = $1 WHERE phone = $2`, [amount, phone]);
  return { text: responses.capitalSet({ amount }) };
}

async function checkOverspending(phone) {
  const user = await getUser(phone);
  const capital = user ? Number(user.capital_amount) : 0;
  if (!capital) return null;

  const rows = await query(`
    SELECT COALESCE(SUM(amount),0) AS total_spent, COUNT(DISTINCT created_at::date) AS days
    FROM expenses WHERE user_phone = $1
  `, [phone]);
  const totalSpent = Number(rows[0].total_spent);
  const days = Math.max(Number(rows[0].days), 1);
  const dailyRate = totalSpent / days;
  if (dailyRate <= 0) return null;

  const remaining = capital - totalSpent;
  if (remaining <= 0) return null;
  const daysLeft = Math.round(remaining / dailyRate);
  if (daysLeft <= 14) {
    return responses.overspendingWarning({ daysLeft });
  }
  return null;
}

// Restock Reminder Based on Sales Speed
async function restockPrediction(phone, parsed) {
  const { item } = parsed;
  const stockRows = await query(`SELECT * FROM stock WHERE user_phone = $1 AND item = $2`, [phone, item]);
  const stock = stockRows[0];
  if (!stock) return { text: responses.restockPrediction({ item, daysLeft: null }) };

  const salesRows = await query(`
    SELECT COALESCE(SUM(quantity),0) AS total_qty, COUNT(DISTINCT created_at::date) AS days
    FROM sales WHERE user_phone = $1 AND item = $2
  `, [phone, item]);
  const totalQty = Number(salesRows[0].total_qty);
  const days = Math.max(Number(salesRows[0].days), 1);
  const dailyVelocity = totalQty / days;

  if (dailyVelocity <= 0) return { text: responses.restockPrediction({ item, daysLeft: null }) };

  const daysLeft = Math.round(Number(stock.quantity) / dailyVelocity);
  const restockBy = new Date(Date.now() + Math.max(daysLeft - 2, 0) * 86400000);
  const restockByDate = restockBy.toLocaleDateString('en-NG', { weekday: 'long', month: 'short', day: 'numeric' });

  return { text: responses.restockPrediction({ item, daysLeft, restockByDate }) };
}

// Recipe and Batch Cost Calculator
async function recipeAdd(phone, parsed) {
  const { recipeName, yieldCount, ingredients } = parsed;
  const totalCost = ingredients.reduce((s, i) => s + i.cost, 0);

  await query(`
    INSERT INTO recipes (user_phone, name, yield_count, total_cost)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_phone, name) DO UPDATE SET yield_count = $3, total_cost = $4, created_at = now()
  `, [phone, recipeName, yieldCount, totalCost]);

  const recipeRows = await query(`SELECT id FROM recipes WHERE user_phone = $1 AND name = $2`, [phone, recipeName]);
  const recipeId = recipeRows[0].id;
  await query(`DELETE FROM recipe_ingredients WHERE recipe_id = $1`, [recipeId]);
  for (const ing of ingredients) {
    await query(`INSERT INTO recipe_ingredients (recipe_id, name, cost) VALUES ($1, $2, $3)`, [recipeId, ing.name, ing.cost]);
  }

  const costPerItem = yieldCount > 0 ? totalCost / yieldCount : totalCost;
  return { text: responses.recipeAdded({ recipeName, totalCost, yieldCount, costPerItem }) };
}

async function recipeCostQuery(phone, parsed) {
  const { recipeName } = parsed;
  const rows = await query(`SELECT * FROM recipes WHERE user_phone = $1 AND name ILIKE $2`, [phone, `%${recipeName}%`]);
  const recipe = rows[0];
  if (!recipe) return { text: responses.recipeNotFound({ recipeName }) };
  const costPerItem = Number(recipe.yield_count) > 0 ? Number(recipe.total_cost) / Number(recipe.yield_count) : Number(recipe.total_cost);
  return { text: responses.recipeCostQuery({ recipeName: recipe.name, costPerItem, totalCost: Number(recipe.total_cost), yieldCount: Number(recipe.yield_count) }) };
}

// End of Market Day Reconciliation
async function reconcile(phone, parsed) {
  const { cash, pos, transfer } = parsed;
  const counted = cash + pos + transfer;
  const { total: expected } = await todayTotals(phone);

  if (Math.abs(counted - expected) < 1) {
    return { text: responses.reconcileBalanced({ total: counted }) };
  }
  const difference = Math.abs(expected - counted);
  return { text: responses.reconcileMismatch({ counted, expected, difference }) };
}

// First 90 Days Business Guide
async function taskQuery(phone) {
  const user = await getUser(phone);
  if (!user) return { text: 'Welcome to BUYNA! Use the app today and I go give you your first task tomorrow.' };
  const signupDate = new Date(user.created_at);
  const dayNumber = Math.floor((Date.now() - signupDate.getTime()) / 86400000) + 1;
  if (dayNumber > TOTAL_DAYS) return { text: responses.onboardingComplete() };
  const task = getTaskForDay(dayNumber);
  return { text: responses.taskForDay({ day: dayNumber, task }) };
}

// Business Evaluation Tool
async function evaluateBusiness(phone, parsed) {
  const biz = findBusiness(parsed.raw);
  if (!biz) return { text: responses.businessNotFound() };
  return { text: responses.businessEvaluation(biz) };
}

async function lifeStagesQuery() {
  return { text: responses.lifeStages({ stages: LIFE_STAGES }) };
}

async function handleIntent(phone, parsed, channel = 'voice') {
  await ensureUser(phone);
  let result;
  switch (parsed.intent) {
    case 'RECORD_SALE': result = await recordSale(phone, parsed, channel); break;
    case 'RECORD_EXPENSE': result = await recordExpense(phone, parsed, channel); break;
    case 'KOLO_DEPOSIT': result = await koloDeposit(phone, parsed); break;
    case 'KOLO_BALANCE': result = await koloBalance(phone); break;
    case 'DEBT_QUERY': result = await debtQuery(phone); break;
    case 'DEBT_RECORD': result = await debtRecord(phone, parsed); break;
    case 'STOCK_QUERY': result = await stockQuery(phone); break;
    case 'RESTOCK': result = await restock(phone, parsed); break;
    case 'DAILY_SUMMARY': result = await dailySummary(phone); break;
    case 'SET_COST_PRICE': result = await setCostPrice(phone, parsed); break;
    case 'SET_CAPITAL': result = await setCapital(phone, parsed); break;
    case 'RESTOCK_PREDICTION_QUERY': result = await restockPrediction(phone, parsed); break;
    case 'RECIPE_ADD': result = await recipeAdd(phone, parsed); break;
    case 'RECIPE_COST_QUERY': result = await recipeCostQuery(phone, parsed); break;
    case 'RECONCILE': result = await reconcile(phone, parsed); break;
    case 'TASK_QUERY': result = await taskQuery(phone); break;
    case 'BUSINESS_EVALUATE': result = await evaluateBusiness(phone, parsed); break;
    case 'LIFE_STAGES_QUERY': result = await lifeStagesQuery(); break;
    default: result = { text: responses.unknown() };
  }

  // Quiet overspending check piggybacks on any expense-recording turn
  if (parsed.intent === 'RECORD_EXPENSE') {
    const warning = await checkOverspending(phone);
    if (warning) result.text += ' ' + warning;
  }

  return result;
}

module.exports = { handleIntent };
