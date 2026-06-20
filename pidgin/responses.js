// Turns structured results into natural Pidgin sentences for TTS / SMS / USSD display.

function formatNaira(n) {
  return Number(n).toLocaleString('en-NG');
}

const responses = {
  saleRecorded: ({ item, quantity, amount, profit, todayTotal, todayProfit }) => {
    const itemPart = quantity > 1 ? `${quantity} ${item}` : item;
    return `Oga you don sell ${itemPart} for ${formatNaira(amount)}. ` +
      `Today total na ${formatNaira(todayTotal)}, profit na ${formatNaira(todayProfit)}.`;
  },

  expenseRecorded: ({ amount, category }) =>
    `OK, I don record ${formatNaira(amount)} wey you spend on ${category}.`,

  koloDeposit: ({ amount, savedAmount, targetAmount, goalName }) => {
    if (targetAmount > 0) {
      const remaining = Math.max(targetAmount - savedAmount, 0);
      return `Sharp! You don save ${formatNaira(amount)} for ${goalName}. ` +
        `You don reach ${formatNaira(savedAmount)} out of ${formatNaira(targetAmount)}. ` +
        `${formatNaira(remaining)} remain.`;
    }
    return `Sharp! You don save ${formatNaira(amount)}. Your Kolo balance na ${formatNaira(savedAmount)} now.`;
  },

  koloBalance: ({ savedAmount }) =>
    `Your Kolo balance na ${formatNaira(savedAmount)}. Continue to save small small.`,

  debtQuery: ({ debts, total }) => {
    if (!debts.length) return `Nobody owe you for now. Your book clean.`;
    const list = debts.map(d => `${d.customer_name} owe ${formatNaira(d.amount)}`).join(', ');
    return `People wey owe you: ${list}. Total na ${formatNaira(total)}.`;
  },

  debtRecorded: ({ customerName, amount }) =>
    `OK, I don record say ${customerName} owe you ${formatNaira(amount)}. I go remind dem.`,

  stockQuery: ({ stock }) => {
    if (!stock.length) return `You never add any stock yet.`;
    const list = stock.map(s => `${s.item}: ${s.quantity} remain`).join(', ');
    return `Your stock be like this — ${list}.`;
  },

  lowStockAlert: ({ item, quantity }) =>
    `Oga, ${item} dey finish — only ${quantity} remain. Time to restock.`,

  restockRecorded: ({ item, quantity }) =>
    `OK, I don add ${quantity} ${item} to your stock.`,

  dailySummary: ({ todayTotal, todayProfit, salesCount }) =>
    `Today, you sell ${salesCount} time, total na ${formatNaira(todayTotal)}, ` +
    `profit na ${formatNaira(todayProfit)}. You dey go!`,

  overspendingWarning: ({ daysLeft }) =>
    `Oga at this rate, your money go finish in ${daysLeft} days. Slow down small.`,

  unknown: () =>
    `I no understand wetin you talk. Try say "I sell rice for 5000" or "I save 1000".`,
};

module.exports = responses;
