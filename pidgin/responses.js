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

  unknown: () =>
    `I no understand wetin you talk. Try say "I sell rice for 5000" or "I save 1000".`,

  costPriceSet: ({ item, amount }) =>
    `OK, I don set cost price for ${item} to ${formatNaira(amount)}. I go warn you if you wan sell below that.`,

  belowCostWarning: ({ item, costPrice }) =>
    `No do am! That price go put you for loss for ${item}. Your cost price na ${formatNaira(costPrice)}.`,

  capitalSet: ({ amount }) =>
    `OK, I don record your capital as ${formatNaira(amount)}. I go warn you if you dey spend too fast.`,

  overspendingWarning: ({ daysLeft }) =>
    `Oga at this rate, your money go finish in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}. Slow down small.`,

  restockPrediction: ({ item, daysLeft, restockByDate }) => {
    if (daysLeft === null) return `I no get enough sales history for ${item} yet to predict restock time.`;
    return `Based on how you dey sell, your ${item} go finish in about ${daysLeft} days. Restock by ${restockByDate}.`;
  },

  recipeAdded: ({ recipeName, totalCost, yieldCount, costPerItem }) =>
    `OK, I don save ${recipeName}. Total cost na ${formatNaira(totalCost)} for ${yieldCount} plates — that's ${formatNaira(costPerItem)} per plate. Make sure you sell above that.`,

  recipeCostQuery: ({ recipeName, costPerItem, totalCost, yieldCount }) =>
    `${recipeName} cost ${formatNaira(costPerItem)} per plate (${formatNaira(totalCost)} total for ${yieldCount} plates).`,

  recipeNotFound: ({ recipeName }) =>
    `I no get recipe for ${recipeName} yet. Tell me the ingredients first.`,

  reconcileBalanced: ({ total }) =>
    `Everything balance well. Cash, POS and transfer add up to ${formatNaira(total)} — that match your sales today.`,

  reconcileMismatch: ({ counted, expected, difference }) =>
    `Oga, something no add up — you counted ${formatNaira(counted)} but today sales show ${formatNaira(expected)}. ${formatNaira(difference)} dey missing. Check again.`,

  taskForDay: ({ day, task }) =>
    `Day ${day}: ${task}`,

  onboardingComplete: () =>
    `Oga you don complete your first 90 days! Continue the good work — your habits don set well well.`,

  businessEvaluation: ({ name, minCost, maxCost, successRate, firstBuy, successFactors }) => {
    const factorsList = successFactors.map((f, i) => `${i + 1}) ${f}`).join(' ');
    return `${name} — here's wetin you need to know. Startup cost dey range from ${formatNaira(minCost)} to ${formatNaira(maxCost)}, depending on your scale. ` +
      `Rough success rate for businesses like this na about ${successRate} percent, based on common patterns. ` +
      `Buy this first: ${firstBuy}. Key things wey go determine if you go succeed: ${factorsList}`;
  },

  businessNotFound: () =>
    `I no get specific data for that business yet, but here's general advice: start small with what you have, ` +
    `track every sale and expense from day one, and grow only after you don prove the idea work for small scale first.`,

  lifeStages: ({ stages }) =>
    `Every business pass through 5 stages: ${stages.map((s, i) => `${i + 1}) ${s}`).join(', ')}. ` +
    `Tell me which stage you dey, and I fit guide you better.`,

  apprenticeAdded: ({ name, phone }) =>
    `OK, I don add ${name} as your apprentice. ${name} fit only record sales — dem no fit see your totals or delete anything. I go alert you every time dem record a sale.`,

  apprenticeAddFailed: () =>
    `I need the apprentice phone number to add them. Try say "add apprentice 08033334444 named Chinedu".`,

  apprenticeSaleAlert: ({ apprenticeName, item, amount }) =>
    `${apprenticeName} just record a sale — ${item} for ${formatNaira(amount)}.`,

  apprenticeRestricted: () =>
    `Apprentice fit only record sales for now. Ask oga for anything else.`,

  notificationsEmpty: () =>
    `No new notification. Everything quiet for now.`,

  notificationsList: ({ list }) =>
    `Here's wetin happen — ${list}`,
};

module.exports = responses;
