// Turns structured results into natural Pidgin sentences for TTS / SMS / USSD display.

function formatNaira(n) {
  return Number(n).toLocaleString('en-NG');
}

const responses = {
  saleRecorded: ({ item, quantity, amount, profit, todayTotal, todayProfit }) => {
    const itemPart = quantity > 1 ? `${quantity} ${item}` : item;
    return `You don sell ${itemPart}, na ${formatNaira(amount)} o! ` +
      `Today total na ${formatNaira(todayTotal)}, profit na ${formatNaira(todayProfit)}. You dey try!`;
  },

  expenseRecorded: ({ amount, category }) =>
    `OK, I don write am down — ${formatNaira(amount)} wey you spend for ${category}.`,

  koloDeposit: ({ amount, savedAmount, targetAmount, goalName }) => {
    if (targetAmount > 0) {
      const remaining = Math.max(targetAmount - savedAmount, 0);
      return `Sharp sharp! You don save ${formatNaira(amount)} for ${goalName}. ` +
        `Na ${formatNaira(savedAmount)} you don reach, out of ${formatNaira(targetAmount)}. ` +
        `${formatNaira(remaining)} remain — you fit do am!`;
    }
    return `Sharp sharp! You don save ${formatNaira(amount)}. Your Kolo balance na ${formatNaira(savedAmount)} now. Continue like that.`;
  },

  koloBalance: ({ savedAmount }) =>
    `Your Kolo balance na ${formatNaira(savedAmount)} as we dey talk. Save small small, e go add up.`,

  debtQuery: ({ debts, total }) => {
    if (!debts.length) return `Nobody owe you for now o — your book clean.`;
    const list = debts.map(d => `${d.customer_name} dey owe ${formatNaira(d.amount)}`).join(', ');
    return `People wey owe you na — ${list}. Altogether, dem owe you ${formatNaira(total)}.`;
  },

  debtRecorded: ({ customerName, amount }) =>
    `I don write am — ${customerName} dey owe you ${formatNaira(amount)}. No worry, I go help you remember.`,

  stockQuery: ({ stock }) => {
    if (!stock.length) return `You never add any goods come your stock yet.`;
    const list = stock.map(s => `${s.item} — ${s.quantity} remain`).join(', ');
    return `Na this dey your stock — ${list}.`;
  },

  lowStockAlert: ({ item, quantity }) =>
    `Oya o, ${item} wan finish — na only ${quantity} remain. Time to restock before e finish for hand.`,

  restockRecorded: ({ item, quantity }) =>
    `Correct. I don add ${quantity} ${item} come your stock.`,

  dailySummary: ({ todayTotal, todayProfit, salesCount }) =>
    `Today, you sell ${salesCount} ${salesCount === 1 ? 'time' : 'times'}. Total na ${formatNaira(todayTotal)}, ` +
    `profit na ${formatNaira(todayProfit)}. Na correct work, continue like that!`,

  unknown: () =>
    `I no sabi wetin you talk o. Try talk am like "I sell rice for 5000" or "I save 1000".`,

  costPriceSet: ({ item, amount }) =>
    `Noted. Cost price for ${item} na ${formatNaira(amount)} now. If you wan sell am below that, I go talk to you.`,

  belowCostWarning: ({ item, costPrice }) =>
    `Abeg no do that one! That price go put you for loss for ${item}. Your cost price na ${formatNaira(costPrice)}.`,

  capitalSet: ({ amount }) =>
    `OK, your capital na ${formatNaira(amount)} now. If you dey spend too fast, I go give you signal.`,

  overspendingWarning: ({ daysLeft }) =>
    `Oya, watch how you dey spend — at this rate, your money fit finish in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}. Slow down small.`,

  restockPrediction: ({ item, daysLeft, restockByDate }) => {
    if (daysLeft === null) return `I never see enough history for ${item} to fit calculate when you go restock.`;
    return `Based on how you dey sell, ${item} go finish in like ${daysLeft} days. Restock am before ${restockByDate}.`;
  },

  reconcileBalanced: ({ total }) =>
    `Everything balance correct! Cash, POS and transfer add up to ${formatNaira(total)} — e match wetin you sell today. Una try!`,

  reconcileMismatch: ({ counted, expected, difference }) =>
    `Hmm, something no balance o — you count ${formatNaira(counted)} but your sales show ${formatNaira(expected)}. ${formatNaira(difference)} dey miss. Check well well.`,

  taskForDay: ({ day, task }) =>
    `Day ${day}: ${task}`,

  onboardingComplete: () =>
    `Oya, you don finish your first 90 days! You don build correct habit now — no relax, continue the good work.`,

  businessEvaluation: ({ name, minCost, maxCost, successRate, firstBuy, successFactors }) => {
    const factorsList = successFactors.map((f, i) => `${i + 1}) ${f}`).join(' ');
    return `${name} — na wetin you need to know. Money to start am dey range from ${formatNaira(minCost)} to ${formatNaira(maxCost)}, depending on how big you wan start. ` +
      `Roughly, about ${successRate} percent of people wey try this kind business dey succeed. ` +
      `First thing to buy — ${firstBuy}. Wetin go determine if you go succeed: ${factorsList}`;
  },

  businessNotFound: () =>
    `I never get correct data for that one yet, but make I tell you small advice: start small with wetin you get, ` +
    `write down every sale and every expense from day one, and only grow am after you don prove say the idea sweet for small scale first.`,

  lifeStages: ({ stages }) =>
    `Every business dey pass through 5 stage — ${stages.map((s, i) => `${i + 1}) ${s}`).join(', ')}. ` +
    `Tell me which one you dey, make I guide you well.`,
};

module.exports = responses;
