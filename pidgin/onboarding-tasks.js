// First 90 Days Business Guide — one task per day.
// Days 1-30 are explicit, hand-written tasks for the riskiest early period.
// Days 31-90 cycle through reinforcement habits, since the biggest failure
// risk is in the first month; later days just need consistency, not novelty.

const explicitTasks = [
  'set your prices for your top 5 products',
  'record your opening stock for everything you sell',
  'save your first 500 naira in Kolo',
  'record every single sale today, no matter how small',
  'write down your cost price for your 3 best-selling items',
  'check if any of your prices are below your cost price',
  'record all your expenses today — transport, food, everything',
  'count your cash at the end of the day and compare to your sales',
  'name one savings goal — what are you saving for?',
  'tell BUYNA about any customer who owes you money',
  'check your stock — which item is almost finished?',
  'restock the item that is running lowest',
  'set a daily savings target, even if it is small',
  'review this week — which day made the most profit, and why?',
  'ask 3 customers what they wish your shop also sold',
  'record your sales by voice today instead of writing — practice it',
  'check your Kolo balance and see your progress',
  'if anyone owes you money for more than a week, follow up today',
  'review your expenses this week — what can you cut?',
  'set a capital amount so BUYNA can warn you about overspending',
  'check which item sells fastest — is your stock matching that speed?',
  'compare this week profit to last week — better or worse?',
  'thank a loyal customer today, even with just kind words',
  'review every price again — has any cost from your supplier changed?',
  'set a goal-based Kolo for something specific — new equipment, rent, stock',
  'do a full stock count — does what you have match what BUYNA shows?',
  'check today profit before you close — record it even if business was slow',
  'plan tomorrow stock needs based on what is selling',
  'review one full month of your records — what pattern do you see?',
  'celebrate — you have built one full month of real business habits',
];

const reinforcementTasks = [
  'record every sale today, no matter how small — consistency is the habit',
  'save something in Kolo today, even if it is just 100 naira',
  'check your stock levels before you close today',
  'review your expenses — are you spending on things you do not need?',
  'follow up on anyone who owes you money',
  'check your daily summary before you go home',
  'compare today profit to your average — are you above or below?',
  'check if any price needs adjusting because supplier cost changed',
  'review your Kolo progress — how close are you to your goal?',
  'take 2 minutes to plan tomorrow before you close today',
];

function getTaskForDay(day) {
  if (day < 1) day = 1;
  if (day <= explicitTasks.length) {
    return explicitTasks[day - 1];
  }
  if (day > 90) return null;
  return reinforcementTasks[(day - explicitTasks.length - 1) % reinforcementTasks.length];
}

module.exports = { getTaskForDay, TOTAL_DAYS: 90 };
