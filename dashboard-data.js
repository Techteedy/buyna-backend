const { query } = require('./db');
const { getTaskForDay, TOTAL_DAYS } = require('./pidgin/onboarding-tasks');

async function getDashboard(phone) {
  const userRows = await query(`SELECT * FROM users WHERE phone = $1`, [phone]);
  const user = userRows[0] || null;

  const todayRows = await query(`
    SELECT COALESCE(SUM(amount),0) AS total, COALESCE(SUM(profit),0) AS profit, COUNT(*) AS cnt
    FROM sales WHERE user_phone = $1 AND created_at::date = now()::date
  `, [phone]);

  const weekRows = await query(`
    SELECT COALESCE(SUM(amount),0) AS total, COALESCE(SUM(profit),0) AS profit
    FROM sales WHERE user_phone = $1 AND created_at >= now() - interval '7 days'
  `, [phone]);

  const todayExpenseRows = await query(`
    SELECT COALESCE(SUM(amount),0) AS total
    FROM expenses WHERE user_phone = $1 AND created_at::date = now()::date
  `, [phone]);

  const weekExpenseRows = await query(`
    SELECT COALESCE(SUM(amount),0) AS total
    FROM expenses WHERE user_phone = $1 AND created_at >= now() - interval '7 days'
  `, [phone]);

  const allExpenseRows = await query(`
    SELECT COALESCE(SUM(amount),0) AS total_spent, COUNT(DISTINCT created_at::date) AS days
    FROM expenses WHERE user_phone = $1
  `, [phone]);

  const recentSales = await query(`
    SELECT item, quantity, amount, profit, channel, recorded_by, created_at
    FROM sales WHERE user_phone = $1 ORDER BY created_at DESC LIMIT 10
  `, [phone]);

  const recentExpenses = await query(`
    SELECT category, amount, created_at
    FROM expenses WHERE user_phone = $1 ORDER BY created_at DESC LIMIT 5
  `, [phone]);

  const stock = await query(`
    SELECT item, quantity, unit_cost, low_stock_threshold
    FROM stock WHERE user_phone = $1 ORDER BY item
  `, [phone]);

  const debts = await query(`
    SELECT customer_name, amount, status, created_at
    FROM debts WHERE user_phone = $1 AND status = 'owing' ORDER BY created_at DESC
  `, [phone]);

  const kolo = await query(`
    SELECT goal_name, target_amount, saved_amount
    FROM kolo WHERE user_phone = $1 ORDER BY id
  `, [phone]);

  const notifications = await query(`
    SELECT message, is_read, created_at
    FROM notifications WHERE boss_phone = $1 ORDER BY created_at DESC LIMIT 10
  `, [phone]);

  const apprentices = await query(`
    SELECT apprentice_name, apprentice_phone, active
    FROM apprentices WHERE boss_phone = $1 AND active = true
  `, [phone]);

  const recipes = await query(`
    SELECT name, yield_count, total_cost
    FROM recipes WHERE user_phone = $1 ORDER BY name
  `, [phone]);

  // Overspending fuel-gauge — same math as the voice warning, surfaced visually here
  let capitalStatus = null;
  const capital = user ? Number(user.capital_amount) : 0;
  if (capital > 0) {
    const totalSpent = Number(allExpenseRows[0].total_spent);
    const days = Math.max(Number(allExpenseRows[0].days), 1);
    const dailyRate = totalSpent / days;
    const remaining = capital - totalSpent;
    const daysLeft = dailyRate > 0 ? Math.round(remaining / dailyRate) : null;
    capitalStatus = {
      capital,
      spent: totalSpent,
      remaining,
      daysLeft,
      warning: daysLeft !== null && daysLeft <= 14 && remaining > 0,
    };
  }

  // First 90 Days — today's task, same logic as the voice version
  let todayTask = null;
  if (user) {
    const signupDate = new Date(user.created_at);
    const dayNumber = Math.floor((Date.now() - signupDate.getTime()) / 86400000) + 1;
    if (dayNumber <= TOTAL_DAYS) {
      todayTask = { day: dayNumber, task: getTaskForDay(dayNumber) };
    }
  }

  return {
    phone,
    capitalStatus,
    todayTask,
    memberSince: user ? user.created_at : null,
    today: {
      total: Number(todayRows[0].total),
      profit: Number(todayRows[0].profit),
      count: Number(todayRows[0].cnt),
      expenses: Number(todayExpenseRows[0].total),
    },
    week: {
      total: Number(weekRows[0].total),
      profit: Number(weekRows[0].profit),
      expenses: Number(weekExpenseRows[0].total),
    },
    recentSales: recentSales.map(s => ({
      item: s.item,
      quantity: Number(s.quantity),
      amount: Number(s.amount),
      profit: Number(s.profit),
      channel: s.channel,
      recordedBy: s.recorded_by,
      createdAt: s.created_at,
    })),
    recentExpenses: recentExpenses.map(e => ({
      category: e.category,
      amount: Number(e.amount),
      createdAt: e.created_at,
    })),
    stock: stock.map(s => ({
      item: s.item,
      quantity: Number(s.quantity),
      unitCost: Number(s.unit_cost),
      lowThreshold: Number(s.low_stock_threshold),
      isLow: Number(s.quantity) <= Number(s.low_stock_threshold),
    })),
    debts: debts.map(d => ({
      customerName: d.customer_name,
      amount: Number(d.amount),
      createdAt: d.created_at,
    })),
    kolo: kolo.map(k => ({
      goalName: k.goal_name,
      targetAmount: Number(k.target_amount),
      savedAmount: Number(k.saved_amount),
    })),
    notifications: notifications.map(n => ({
      message: n.message,
      isRead: n.is_read,
      createdAt: n.created_at,
    })),
    apprentices: apprentices.map(a => ({
      name: a.apprentice_name,
      phone: a.apprentice_phone,
    })),
    recipes: recipes.map(r => ({
      name: r.name,
      yieldCount: Number(r.yield_count),
      totalCost: Number(r.total_cost),
      costPerItem: Number(r.yield_count) > 0 ? Number(r.total_cost) / Number(r.yield_count) : Number(r.total_cost),
    })),
  };
}

module.exports = { getDashboard };
